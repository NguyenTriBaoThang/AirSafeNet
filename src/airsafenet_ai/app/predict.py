from __future__ import annotations

import json
import logging
from typing import Any

import joblib
import numpy as np
import pandas as pd

from app.aqi import pm25_to_aqi
from app.config import MODEL_PATH, METADATA_PATH, HISTORY_HOURS
from app.data_loader import load_merged_dataset
from app.features import build_feature_vector_for_step, latest_feature_vector
from app.profiles import aqi_to_category, recommendation_from_aqi, risk_for_profile

logger = logging.getLogger(__name__)

MODEL = joblib.load(MODEL_PATH)

MAX_HOURLY_DELTA = 12.0

PM25_MIN = 0.0
PM25_MAX = 300.0

MIN_HISTORY_ROWS = 30


def load_metadata() -> dict[str, Any]:
    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _predict_pm25_from_history(history_df: pd.DataFrame) -> float:
    X = latest_feature_vector(history_df)
    pred = float(MODEL.predict(X)[0])
    return float(np.clip(pred, PM25_MIN, PM25_MAX))


def _predict_pm25_with_exogenous(
    working_history: pd.DataFrame,
    future_row: pd.Series,
    step_index: int,
    prev_pred_pm25: float | None = None,
) -> float:
    X = build_feature_vector_for_step(working_history, future_row, step_index)
    raw_pred = float(MODEL.predict(X)[0])

    if prev_pred_pm25 is not None:
        delta = raw_pred - prev_pred_pm25
        delta_clamped = float(np.clip(delta, -MAX_HOURLY_DELTA, MAX_HOURLY_DELTA))
        pred = prev_pred_pm25 + delta_clamped
    else:
        pred = raw_pred

    return float(np.clip(pred, PM25_MIN, PM25_MAX))


def _build_profile_columns(forecast_df: pd.DataFrame) -> pd.DataFrame:
    profiles = ["general", "children", "elderly", "respiratory"]
    for profile in profiles:
        forecast_df[f"risk_{profile}"] = forecast_df["pred_aqi"].apply(
            lambda x, p=profile: risk_for_profile(int(x), p)
        )
        forecast_df[f"recommendation_{profile}"] = forecast_df["pred_aqi"].apply(
            lambda x, p=profile: recommendation_from_aqi(int(x), p)
        )
    return forecast_df


def build_forecast_df(days: int = 1) -> pd.DataFrame:
    days = max(1, min(days, 7))
    full_df = load_merged_dataset(
        past_hours=HISTORY_HOURS,
        forecast_days=max(days, 2),
    )

    now = pd.Timestamp.now().tz_localize(None)
    history_df = full_df[full_df["time"] <= now].copy().reset_index(drop=True)
    future_df = (
        full_df[full_df["time"] > now]
        .copy()
        .reset_index(drop=True)
        .head(days * 24)
    )

    if len(history_df) < MIN_HISTORY_ROWS:
        raise ValueError(
            f"History chỉ có {len(history_df)} rows, cần ít nhất {MIN_HISTORY_ROWS}."
        )
    if future_df.empty:
        raise ValueError("Không có future hourly data từ API.")

    rows: list[dict] = []
    working_history = history_df.copy()
    prev_pred_pm25: float | None = None

    last_observed = float(history_df["pm2_5"].dropna().iloc[-1])
    prev_pred_pm25 = last_observed

    for i in range(len(future_df)):
        future_row = future_df.iloc[i].copy()

        pred_pm25 = _predict_pm25_with_exogenous(
            working_history=working_history,
            future_row=future_row,
            step_index=i,
            prev_pred_pm25=prev_pred_pm25,
        )
        pred_aqi = pm25_to_aqi(pred_pm25)
        aqi_category = aqi_to_category(pred_aqi)

        rows.append({
            "time": pd.Timestamp(future_row["time"]),
            "pred_pm25": round(pred_pm25, 6),
            "pred_aqi": int(pred_aqi),
            "aqi_category": aqi_category,
        })

        next_row = future_row.copy()
        next_row["pm2_5"] = pred_pm25
        if pd.isna(next_row.get("pm10")):
            next_row["pm10"] = pred_pm25 * 1.4

        working_history = pd.concat(
            [working_history, pd.DataFrame([next_row])],
            ignore_index=True,
        )

        prev_pred_pm25 = pred_pm25

        if i % 12 == 0:
            logger.debug(
                "Forecast step %d/%d | time=%s | pm25=%.2f | aqi=%d",
                i + 1, len(future_df),
                future_row["time"], pred_pm25, pred_aqi,
            )

    forecast_df = pd.DataFrame(rows)
    forecast_df = _build_profile_columns(forecast_df)
    return forecast_df


def _fetch_realtime_weather() -> dict[str, Any]:
    try:
        import requests
        from app.config import LAT, LON, TIMEZONE

        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={LAT}&longitude={LON}"
            "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,"
            "wind_direction_10m,surface_pressure,uv_index,cloud_cover"
            f"&timezone={TIMEZONE}"
            "&wind_speed_unit=kmh"
        )
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        c = resp.json().get("current", {})

        return {
            "temperature":    float(c.get("temperature_2m",       30.0)),
            "humidity":       float(c.get("relative_humidity_2m", 70.0)),
            "wind_speed":     float(c.get("wind_speed_10m",        5.0)),
            "wind_direction": float(c.get("wind_direction_10m",  180.0)),
            "pressure":       float(c.get("surface_pressure",   1010.0)),
            "uv_index":       float(c.get("uv_index",              5.0)),
            "cloud_cover":    float(c.get("cloud_cover",          40.0)),
            "observed_at":    c.get("time", ""),
        }
    except Exception as exc:
        logger.warning("_fetch_realtime_weather thất bại, dùng fallback history: %s", exc)
        return {}


def get_current_snapshot(user_group: str = "general") -> dict[str, Any]:
    full_df = load_merged_dataset(past_hours=HISTORY_HOURS, forecast_days=2)
    now = pd.Timestamp.now().tz_localize(None)

    history_df = full_df[full_df["time"] <= now].copy().reset_index(drop=True)
    if history_df.empty:
        raise ValueError("Không có current history data.")

    pred_pm25 = _predict_pm25_from_history(history_df)
    pred_aqi  = pm25_to_aqi(pred_pm25)
    latest    = history_df.iloc[-1]

    rt = _fetch_realtime_weather()

    def rw(rt_key: str, hist_key: str, default: float = 0.0) -> float:
        if rt_key in rt:
            return round(float(rt[rt_key]), 2)
        val = latest.get(hist_key, default)
        return round(float(val if not pd.isna(val) else default), 2)

    return {
        "pred_pm25":              round(pred_pm25, 6),
        "pred_aqi":               int(pred_aqi),
        "aqi_category":           aqi_to_category(pred_aqi),
        "risk_profile":           risk_for_profile(pred_aqi, user_group),
        "recommendation_profile": recommendation_from_aqi(pred_aqi, user_group),
        "user_group":             user_group,

        "observed_pm25":          round(float(latest.get("pm2_5", 0) or 0), 2),
        "time":                   str(pd.Timestamp(latest["time"]).isoformat()),

        "temperature":            rw("temperature",    "temp",       30.0),
        "humidity":               rw("humidity",       "humidity",   70.0),
        "wind_speed":             rw("wind_speed",     "wind_speed",  5.0),
        "wind_direction":         rw("wind_direction", "wind_dir",  180.0),  # ✅ mới
        "pressure":               rw("pressure",       "pressure", 1010.0),  # ✅ mới
        "uv_index":               rw("uv_index",       "uv_index",    5.0),  # ✅ mới
        "cloud_cover":            rw("cloud_cover",    "cloud_cover", 40.0), # ✅ mới
        "weather_observed_at":    rt.get("observed_at", ""),
        "weather_source":         "Open-Meteo Real-time" if rt else "History Fallback",
    }


def forecast_range_payload(days: int = 1, profile: str = "general") -> dict[str, Any]:
    forecast_df = build_forecast_df(days=days)

    risk_col = f"risk_{profile}" if f"risk_{profile}" in forecast_df.columns else "risk_general"
    reco_col = f"recommendation_{profile}" if f"recommendation_{profile}" in forecast_df.columns else "recommendation_general"

    items = []
    for _, row in forecast_df.iterrows():
        items.append({
            "time": str(pd.Timestamp(row["time"]).isoformat()),
            "pred_pm25": round(float(row["pred_pm25"]), 6),
            "pred_aqi": int(row["pred_aqi"]),
            "aqi_category": row["aqi_category"],
            "risk_profile": row[risk_col],
            "recommendation_profile": row[reco_col],
            "profile": profile,
        })

    return {
        "generated_at": str(pd.Timestamp.utcnow().isoformat()),
        "days": days,
        "hours": len(items),
        "profile": profile,
        "forecast": items,
    }


def history_range_payload(days: int = 7, profile: str = "general") -> dict[str, Any]:
    days = max(1, min(days, 30))
    full_df = load_merged_dataset(
        past_hours=max(HISTORY_HOURS, days * 24 + 24),
        forecast_days=1,
    )
    now = pd.Timestamp.now().tz_localize(None)
    hist_df = (
        full_df[full_df["time"] <= now]
        .copy()
        .reset_index(drop=True)
        .tail(days * 24)
    )

    items = []
    for _, row in hist_df.iterrows():
        observed_pm25 = float(row.get("pm2_5", 0) or 0)
        observed_aqi = pm25_to_aqi(observed_pm25)
        items.append({
            "time": str(pd.Timestamp(row["time"]).isoformat()),
            "pm25": round(observed_pm25, 6),
            "aqi": int(observed_aqi),
            "aqi_category": aqi_to_category(observed_aqi),
            "risk_profile": risk_for_profile(observed_aqi, profile),
            "recommendation_profile": recommendation_from_aqi(observed_aqi, profile),
            "profile": profile,
        })

    return {
        "generated_at": str(pd.Timestamp.utcnow().isoformat()),
        "days": days,
        "hours": len(items),
        "profile": profile,
        "history": items,
    }