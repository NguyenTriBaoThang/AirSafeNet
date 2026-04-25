from __future__ import annotations

import json
import logging
import traceback
from datetime import datetime, timezone
from typing import Any

import pandas as pd

from app.config import DATA_DIR
from app.predict import (
    get_current_snapshot,
    history_range_payload,
)
from app.profiles import aqi_to_category, recommendation_from_aqi, risk_for_profile

try:
    from app.ensemble_predict import (
        build_ensemble_forecast_df,
        get_ensemble_current_snapshot,
    )
    _ENSEMBLE = True
    logging.getLogger(__name__).info("Ensemble model ENABLED (statsmodels + xgboost available)")
except Exception as _e:
    from app.predict import build_forecast_df as build_ensemble_forecast_df 
    get_ensemble_current_snapshot = get_current_snapshot                       
    _ENSEMBLE = False
    logging.getLogger(__name__).warning(
        "Ensemble model DISABLED (fallback main only): %s\n"
        "Cài thư viện: pip install statsmodels xgboost", _e
    )

logger = logging.getLogger(__name__)


FORECAST_CSV = DATA_DIR / "forecast_cache.csv"
HISTORY_CSV  = DATA_DIR / "history_cache.csv"
CURRENT_JSON = DATA_DIR / "current_cache.json"
CACHE_META   = DATA_DIR / "cache_meta.json"

ALL_PROFILES = ["general", "children", "elderly", "respiratory"]


def read_meta() -> dict[str, Any]:
    try:
        if CACHE_META.exists():
            return json.loads(CACHE_META.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def write_meta(status: str, error: str | None = None) -> None:
    meta = {
        "status":       status,
        "computed_at":  datetime.now(timezone.utc).isoformat(),
        "forecast_csv": str(FORECAST_CSV),
        "history_csv":  str(HISTORY_CSV),
        "current_json": str(CURRENT_JSON),
        "ensemble":     _ENSEMBLE,
        "error":        error,
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def cache_is_fresh(max_age_minutes: int = 70) -> bool:
    meta = read_meta()
    if meta.get("status") != "ok":
        return False
    s = meta.get("computed_at")
    if not s:
        return False
    try:
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(s)).total_seconds() / 60
        return age < max_age_minutes
    except Exception:
        return False


def run_compute(force: bool = False) -> dict[str, Any]:
    if not force and cache_is_fresh(max_age_minutes=55):
        logger.info("Cache còn mới, bỏ qua compute.")
        return {**read_meta(), "skipped": True}

    started_at = datetime.now(timezone.utc)
    logger.info("Bắt đầu compute cache (ensemble=%s, force=%s)...", _ENSEMBLE, force)
    write_meta("running")

    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        logger.info("Tính forecast 7 ngày (ensemble=%s)...", _ENSEMBLE)
        forecast_rows = []

        forecast_df = build_ensemble_forecast_df(days=7)  

        _ens_cols = ["confidence", "uncertainty_band", "agreement", "model_std",
                     "main_pm25", "arima_pm25", "xgb_pm25"]

        for profile in ALL_PROFILES:
            risk_col = f"risk_{profile}" if f"risk_{profile}" in forecast_df.columns else "risk_general"
            reco_col = f"recommendation_{profile}" if f"recommendation_{profile}" in forecast_df.columns else "recommendation_general"

            for _, row in forecast_df.iterrows():
                r: dict[str, Any] = {
                    "time":                   str(pd.Timestamp(row["time"]).isoformat()),
                    "pred_pm25":              round(float(row["pred_pm25"]), 4),
                    "pred_aqi":               int(row["pred_aqi"]),
                    "aqi_category":           row["aqi_category"],
                    "risk_profile":           row[risk_col],
                    "recommendation_profile": row[reco_col],
                    "profile":                profile,
                }
                for col in _ens_cols:
                    val = row.get(col)
                    r[col] = round(float(val), 4) if isinstance(val, (int, float)) and not pd.isna(val) else val
                forecast_rows.append(r)

        forecast_out = pd.DataFrame(forecast_rows)
        forecast_out.to_csv(FORECAST_CSV, index=False, encoding="utf-8")
        logger.info("Đã ghi %d dòng vào %s", len(forecast_out), FORECAST_CSV)

        logger.info("Tính history 30 ngày...")
        history_rows = []
        for profile in ALL_PROFILES:
            payload = history_range_payload(days=30, profile=profile)
            for item in payload["history"]:
                history_rows.append({
                    "time":                   item["time"],
                    "pm25":                   round(float(item["pm25"]), 4),
                    "aqi":                    int(item["aqi"]),
                    "aqi_category":           item["aqi_category"],
                    "risk_profile":           item["risk_profile"],
                    "recommendation_profile": item["recommendation_profile"],
                    "profile":                profile,
                })

        history_out = pd.DataFrame(history_rows)
        history_out.to_csv(HISTORY_CSV, index=False, encoding="utf-8")
        logger.info("Đã ghi %d dòng vào %s", len(history_out), HISTORY_CSV)

        logger.info("Tính current snapshot (ensemble=%s)...", _ENSEMBLE)
        current_data: dict[str, Any] = {}
        for profile in ALL_PROFILES:
            current_data[profile] = get_ensemble_current_snapshot(user_group=profile)

        CURRENT_JSON.write_text(
            json.dumps(current_data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info("Đã ghi current snapshot vào %s", CURRENT_JSON)

        elapsed = round((datetime.now(timezone.utc) - started_at).total_seconds(), 2)
        write_meta("ok")
        logger.info("Compute hoàn thành trong %.2fs (ensemble=%s)", elapsed, _ENSEMBLE)

        return {
            "status":          "ok",
            "computed_at":     datetime.now(timezone.utc).isoformat(),
            "elapsed_seconds": elapsed,
            "forecast_rows":   len(forecast_out),
            "history_rows":    len(history_out),
            "profiles":        ALL_PROFILES,
            "ensemble":        _ENSEMBLE,
            "skipped":         False,
        }

    except Exception as exc:
        logger.error("Compute thất bại: %s", traceback.format_exc())
        write_meta("error", error=str(exc))
        raise


def read_forecast_cache(profile: str = "general") -> list[dict]:
    if not FORECAST_CSV.exists():
        raise FileNotFoundError("Chưa có forecast cache. Admin cần chạy compute.")
    df = pd.read_csv(FORECAST_CSV, encoding="utf-8")
    df = df[df["profile"] == profile]
    return df.to_dict(orient="records")


def read_history_cache(profile: str = "general") -> list[dict]:
    if not HISTORY_CSV.exists():
        raise FileNotFoundError("Chưa có history cache. Admin cần chạy compute.")
    df = pd.read_csv(HISTORY_CSV, encoding="utf-8")
    df = df[df["profile"] == profile]
    return df.to_dict(orient="records")


def read_current_cache(profile: str = "general") -> dict[str, Any]:
    if not CURRENT_JSON.exists():
        raise FileNotFoundError("Chưa có current cache. Admin cần chạy compute.")
    data = json.loads(CURRENT_JSON.read_text(encoding="utf-8"))
    return data.get(profile, data.get("general", {}))
