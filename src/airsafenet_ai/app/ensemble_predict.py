from __future__ import annotations

import logging
import warnings
from typing import Any

import numpy as np
import pandas as pd

from app.aqi import pm25_to_aqi
from app.config import HISTORY_HOURS
from app.data_loader import load_merged_dataset
from app.predict import (
    MAX_HOURLY_DELTA,
    MIN_HISTORY_ROWS,
    PM25_MAX,
    PM25_MIN,
    build_forecast_df,
    get_current_snapshot,
)
from app.profiles import aqi_to_category, recommendation_from_aqi, risk_for_profile

logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore")

_HIGH_STD = 3.0    
_LOW_STD  = 8.0 
_W_FLOOR  = 0.30  


class _ArimaModel:

    def __init__(self) -> None:
        self._res:      Any   = None
        self._last:     float = 15.0
        self.available: bool  = False

    def fit(self, series: pd.Series) -> "_ArimaModel":
        values = series.dropna().values.astype(float)
        if len(values) < 12:
            self._last = float(values[-1]) if len(values) else 15.0
            return self
        self._last = float(values[-1])
        try:
            from statsmodels.tsa.arima.model import ARIMA
            best_aic, best_ord = np.inf, (2, 1, 2)
            for p in range(0, 4):
                for q in range(0, 3):
                    try:
                        m = ARIMA(values, order=(p, 1, q)).fit(
                            method_kwargs={"warn_convergence": False}
                        )
                        if m.aic < best_aic:
                            best_aic, best_ord = m.aic, (p, 1, q)
                    except Exception:
                        continue
            self._res = ARIMA(values, order=best_ord).fit(
                method_kwargs={"warn_convergence": False}
            )
            self.available = True
            logger.debug("ARIMA order=%s AIC=%.2f", best_ord, best_aic)
        except ImportError:
            logger.warning("statsmodels không có — ARIMA dùng naive forecast")
        except Exception as e:
            logger.warning("ARIMA fit lỗi: %s", e)
        return self

    def predict(self, steps: int = 1) -> list[float]:
        if not self.available or self._res is None:
            return [
                float(np.clip(
                    self._last * (0.98 ** i) + 15.0 * (1 - 0.98 ** i),
                    PM25_MIN, PM25_MAX,
                ))
                for i in range(steps)
            ]
        try:
            fc = self._res.forecast(steps=steps)
            return [float(np.clip(v, PM25_MIN, PM25_MAX)) for v in fc]
        except Exception as e:
            logger.warning("ARIMA predict lỗi: %s", e)
            return [self._last] * steps


class _XGBLiteModel:

    _LAGS = [1, 2, 3, 6, 12]

    def __init__(self) -> None:
        self._model:    Any   = None
        self._last:     float = 15.0
        self.available: bool  = False

    def _feat(self, buf: np.ndarray, idx: int) -> np.ndarray | None:
        if idx < max(self._LAGS):
            return None
        return np.array([buf[idx - lag] for lag in self._LAGS]).reshape(1, -1)

    def fit(self, series: pd.Series) -> "_XGBLiteModel":
        values = series.dropna().values.astype(float)
        if len(values) < 15:
            self._last = float(values[-1]) if len(values) else 15.0
            return self
        self._last = float(values[-1])
        try:
            from xgboost import XGBRegressor
            X, y = [], []
            for i in range(max(self._LAGS), len(values) - 1):
                f = self._feat(values, i)
                if f is not None:
                    X.append(f[0])
                    y.append(values[i + 1])
            if len(X) < 5:
                return self
            self._model = XGBRegressor(
                n_estimators=100, max_depth=4, learning_rate=0.1,
                subsample=0.8, random_state=42, verbosity=0,
            )
            self._model.fit(np.array(X), np.array(y))
            self.available = True
            logger.debug("XGBLite fit OK: %d samples", len(X))
        except ImportError:
            logger.warning("xgboost không có — XGBLite dùng naive forecast")
        except Exception as e:
            logger.warning("XGBLite fit lỗi: %s", e)
        return self

    def predict_steps(self, history_series: pd.Series, steps: int = 1) -> list[float]:
        buf = list(history_series.dropna().values.astype(float))
        if not self.available or self._model is None:
            last = buf[-1] if buf else self._last
            return [float(np.clip(last, PM25_MIN, PM25_MAX))] * steps

        results: list[float] = []
        for _ in range(steps):
            f = self._feat(np.array(buf), len(buf) - 1)
            if f is None:
                pred = buf[-1]
            else:
                try:
                    pred = float(np.clip(self._model.predict(f)[0], PM25_MIN, PM25_MAX))
                except Exception:
                    pred = buf[-1]
            results.append(pred)
            buf.append(pred)
        return results


def _dynamic_weights(
    obs:         np.ndarray, 
    main_preds:  list[float],
    arima_preds: list[float],
    xgb_preds:   list[float],
) -> dict[str, float]:
    n = min(len(obs), len(main_preds), len(arima_preds), len(xgb_preds))
    if n < 2:
        return {"main": 0.55, "arima": 0.25, "xgb": 0.20}

    o = obs[-n:]
    eps = 1e-6

    mae_main  = float(np.mean(np.abs(np.array(main_preds[:n])  - o)))
    mae_arima = float(np.mean(np.abs(np.array(arima_preds[:n]) - o)))
    mae_xgb   = float(np.mean(np.abs(np.array(xgb_preds[:n])  - o)))
    logger.debug("Rolling MAE — main=%.3f arima=%.3f xgb=%.3f", mae_main, mae_arima, mae_xgb)

    inv  = {"main": 1/(mae_main+eps), "arima": 1/(mae_arima+eps), "xgb": 1/(mae_xgb+eps)}
    tot  = sum(inv.values())
    w    = {k: v/tot for k, v in inv.items()}

    if w["main"] < _W_FLOOR:
        deficit = _W_FLOOR - w["main"]
        w["main"] = _W_FLOOR
        biggest = max(["arima", "xgb"], key=lambda k: w[k])
        w[biggest] = max(0.05, w[biggest] - deficit)
        tot2 = sum(w.values())
        w = {k: v/tot2 for k, v in w.items()}

    return {k: round(v, 4) for k, v in w.items()}


def _confidence_meta(preds: list[float]) -> dict[str, Any]:
    arr = np.array(preds)
    std = float(np.std(arr))
    rng = float(np.ptp(arr))

    conf = max(0.0, min(100.0, 100.0 - (std / _LOW_STD) * 60.0))
    agreement = (
        "high"   if std <= _HIGH_STD else
        "medium" if std <= _LOW_STD  else
        "low"
    )
    return {
        "confidence":       round(conf, 1),
        "uncertainty_band": round(std * 1.96, 2),
        "agreement":        agreement,
        "model_std":        round(std, 3),
    }


def _fit_and_weights(
    pm25_series: pd.Series,
) -> tuple["_ArimaModel", "_XGBLiteModel", dict[str, float]]:
    arima = _ArimaModel().fit(pm25_series)
    xgb   = _XGBLiteModel().fit(pm25_series)

    eval_n = min(6, len(pm25_series) - 2)
    hist   = pm25_series.values.astype(float)

    if eval_n >= 2:
        obs_eval = hist[-eval_n:]
        main_eval  = [hist[max(0, len(hist) - eval_n - 1 + i)] for i in range(eval_n)]
        arima_eval = arima.predict(steps=eval_n)
        xgb_eval   = xgb.predict_steps(pm25_series.iloc[:-eval_n], steps=eval_n)
        weights    = _dynamic_weights(obs_eval, main_eval, arima_eval, xgb_eval)
    else:
        weights = {"main": 0.55, "arima": 0.25, "xgb": 0.20}

    logger.info(
        "Ensemble weights: main=%.2f arima=%.2f xgb=%.2f | ARIMA=%s XGB=%s",
        weights["main"], weights["arima"], weights["xgb"],
        arima.available, xgb.available,
    )
    return arima, xgb, weights


def get_ensemble_current_snapshot(user_group: str = "general") -> dict[str, Any]:
    main_snap = get_current_snapshot(user_group)
    main_pm25 = float(main_snap["pred_pm25"])

    try:
        full_df    = load_merged_dataset(past_hours=HISTORY_HOURS, forecast_days=1)
        now        = pd.Timestamp.now().tz_localize(None)
        history_df = full_df[full_df["time"] <= now].copy().reset_index(drop=True)

        if len(history_df) < MIN_HISTORY_ROWS:
            raise ValueError(f"Không đủ history ({len(history_df)} rows)")

        pm25_col    = "pm2_5" if "pm2_5" in history_df.columns else "pm25"
        pm25_series = history_df[pm25_col].dropna()

        arima, xgb, weights = _fit_and_weights(pm25_series)

        arima_pm25 = arima.predict(steps=1)[0]
        xgb_pm25   = xgb.predict_steps(pm25_series, steps=1)[0]

        ens_pm25 = float(np.clip(
            weights["main"]  * main_pm25  +
            weights["arima"] * arima_pm25 +
            weights["xgb"]   * xgb_pm25,
            PM25_MIN, PM25_MAX,
        ))
        ens_aqi = pm25_to_aqi(ens_pm25)
        conf    = _confidence_meta([main_pm25, arima_pm25, xgb_pm25])

        logger.info(
            "Ensemble current [%s]: main=%.2f arima=%.2f xgb=%.2f → %.2f "
            "(conf=%.0f%% %s)",
            user_group, main_pm25, arima_pm25, xgb_pm25, ens_pm25,
            conf["confidence"], conf["agreement"],
        )

        return {
            **main_snap,
            "pred_pm25":              round(ens_pm25, 6),
            "pred_aqi":               int(ens_aqi),
            "aqi_category":           aqi_to_category(ens_aqi),
            "risk_profile":           risk_for_profile(ens_aqi, user_group),
            "recommendation_profile": recommendation_from_aqi(ens_aqi, user_group),
            "ensemble": {
                "method":           "weighted_average",
                "main_pm25":        round(main_pm25,  2),
                "arima_pm25":       round(arima_pm25, 2),
                "xgb_pm25":         round(xgb_pm25,  2),
                "weights":          weights,
                "arima_available":  arima.available,
                "xgb_available":    xgb.available,
                **conf,
            },
        }

    except Exception as exc:
        logger.warning("Ensemble current fallback → main only: %s", exc)
        return {
            **main_snap,
            "ensemble": {
                "method":           "main_only",
                "main_pm25":        round(main_pm25, 2),
                "arima_pm25":       None,
                "xgb_pm25":         None,
                "weights":          {"main": 1.0, "arima": 0.0, "xgb": 0.0},
                "arima_available":  False,
                "xgb_available":    False,
                "confidence":       70.0,
                "uncertainty_band": 0.0,
                "agreement":        "unknown",
                "model_std":        0.0,
            },
        }


def build_ensemble_forecast_df(days: int = 7) -> pd.DataFrame:
    try:
        full_df    = load_merged_dataset(past_hours=HISTORY_HOURS, forecast_days=max(days, 2))
        now        = pd.Timestamp.now().tz_localize(None)
        history_df = full_df[full_df["time"] <= now].copy().reset_index(drop=True)

        if len(history_df) < MIN_HISTORY_ROWS:
            raise ValueError("Không đủ history")

        pm25_col    = "pm2_5" if "pm2_5" in history_df.columns else "pm25"
        pm25_series = history_df[pm25_col].dropna()
        n_steps     = min(days * 24, 168)

        arima, xgb, weights = _fit_and_weights(pm25_series)

        arima_preds = arima.predict(steps=n_steps)
        xgb_preds   = xgb.predict_steps(pm25_series, steps=n_steps)

        main_df = build_forecast_df(days=days)

        ensemble_extra: list[dict] = []
        prev_ens: float | None = None

        for i, (_, row) in enumerate(main_df.iterrows()):
            main_pm25  = float(row["pred_pm25"])
            arima_pm25 = arima_preds[i] if i < len(arima_preds) else main_pm25
            xgb_pm25   = xgb_preds[i]   if i < len(xgb_preds)   else main_pm25

            raw = (
                weights["main"]  * main_pm25  +
                weights["arima"] * arima_pm25 +
                weights["xgb"]   * xgb_pm25
            )

            if prev_ens is not None:
                delta    = float(np.clip(raw - prev_ens, -MAX_HOURLY_DELTA, MAX_HOURLY_DELTA))
                ens_pm25 = float(np.clip(prev_ens + delta, PM25_MIN, PM25_MAX))
            else:
                ens_pm25 = float(np.clip(raw, PM25_MIN, PM25_MAX))

            prev_ens = ens_pm25
            conf     = _confidence_meta([main_pm25, arima_pm25, xgb_pm25])

            ensemble_extra.append({
                "ens_pm25":         ens_pm25,
                "main_pm25":        round(main_pm25,  2),
                "arima_pm25":       round(arima_pm25, 2),
                "xgb_pm25":         round(xgb_pm25,  2),
                **conf,
            })

        extra_df = pd.DataFrame(ensemble_extra)

        from app.aqi import pm25_to_aqi as _aqi
        main_df = main_df.copy().reset_index(drop=True)
        main_df["pred_pm25"] = extra_df["ens_pm25"].values
        main_df["pred_aqi"]  = main_df["pred_pm25"].apply(lambda v: int(_aqi(v)))
        main_df["aqi_category"] = main_df["pred_aqi"].apply(aqi_to_category)

        for profile in ["general", "children", "elderly", "respiratory"]:
            main_df[f"risk_{profile}"] = main_df["pred_aqi"].apply(
                lambda x, p=profile: risk_for_profile(int(x), p)
            )
            main_df[f"recommendation_{profile}"] = main_df["pred_aqi"].apply(
                lambda x, p=profile: recommendation_from_aqi(int(x), p)
            )

        for col in ["confidence", "uncertainty_band", "agreement", "model_std",
                    "main_pm25", "arima_pm25", "xgb_pm25"]:
            main_df[col] = extra_df[col].values

        avg_conf = float(extra_df["confidence"].mean())
        logger.info(
            "Ensemble forecast df: %d steps weights=%s avg_conf=%.1f%% ARIMA=%s XGB=%s",
            len(main_df), weights, avg_conf, arima.available, xgb.available,
        )
        return main_df

    except Exception as exc:
        logger.warning("Ensemble forecast fallback → main only: %s", exc)
        df = build_forecast_df(days=days)
        df["confidence"]       = 70.0
        df["uncertainty_band"] = 0.0
        df["agreement"]        = "unknown"
        df["model_std"]        = 0.0
        df["main_pm25"]        = df["pred_pm25"]
        df["arima_pm25"]       = None
        df["xgb_pm25"]         = None
        return df
