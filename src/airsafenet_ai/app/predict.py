from __future__ import annotations

import json
from typing import Any

import joblib
import pandas as pd

from app.aqi import pm25_to_aqi
from app.config import MODEL_PATH, METADATA_PATH, HISTORY_HOURS
from app.data_loader import load_merged_dataset
from app.features import latest_feature_vector
from app.profiles import aqi_to_category, recommendation_from_aqi, risk_for_profile

MODEL = joblib.load(MODEL_PATH)


def load_metadata() -> dict[str, Any]:
    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _predict_pm25_from_history(history_df: pd.DataFrame) -> float:
    X = latest_feature_vector(history_df)
    pred = float(MODEL.predict(X)[0])
    return max(0.0, pred)


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
    full_df = load_merged_dataset(past_hours=HISTORY_HOURS, forecast_days=max(days, 2))

    now = pd.Timestamp.now().tz_localize(None)

    history_df = full_df[full_df["time"] <= now].copy().reset_index(drop=True)
    future_df = full_df[full_df["time"] > now].copy().reset_index(drop=True).head(days * 24)

    if len(history_df) < 30:
        raise ValueError("History chưa đủ để build feature cho model hiện tại.")
    if future_df.empty:
        raise ValueError("Không có future hourly data.")

    rows = []

    working_history = history_df.copy()

    for i in range(len(future_df)):
        future_row = future_df.iloc[i].copy()

        pred_pm25 = _predict_pm25_from_history(working_history)
        pred_aqi = pm25_to_aqi(pred_pm25)
        aqi_category = aqi_to_category(pred_aqi)

        rows.append({
            "time": pd.Timestamp(future_row["time"]),
            "pred_pm25": round(pred_pm25, 6),
            "pred_aqi": int(pred_aqi),
            "aqi_category": aqi_category,
        })

        # dùng future exogenous thật cho từng giờ
        next_row = future_row.copy()
        next_row["pm2_5"] = pred_pm25

        working_history = pd.concat(
            [working_history, pd.DataFrame([next_row])],
            ignore_index=True,
        )

    forecast_df = pd.DataFrame(rows)
    forecast_df = _build_profile_columns(forecast_df)
    return forecast_df


def get_current_snapshot(user_group: str = "general") -> dict[str, Any]:
    full_df = load_merged_dataset(past_hours=HISTORY_HOURS, forecast_days=2)
    now = pd.Timestamp.now().tz_localize(None)

    history_df = full_df[full_df["time"] <= now].copy().reset_index(drop=True)
    if history_df.empty:
        raise ValueError("Không có current history.")

    pred_pm25 = _predict_pm25_from_history(history_df)
    pred_aqi = pm25_to_aqi(pred_pm25)

    latest = history_df.iloc[-1]

    return {
        "time": str(pd.Timestamp(latest["time"]).isoformat()),
        "observed_pm25": round(float(latest.get("pm2_5", 0) or 0), 2),
        "observed_temp": round(float(latest.get("temp", 0) or 0), 2),
        "observed_humidity": round(float(latest.get("humidity", 0) or 0), 2),
        "observed_wind_speed": round(float(latest.get("wind_speed", 0) or 0), 2),
        "pred_pm25": round(pred_pm25, 6),
        "pred_aqi": int(pred_aqi),
        "aqi_category": aqi_to_category(pred_aqi),
        "risk_profile": risk_for_profile(pred_aqi, user_group),
        "recommendation_profile": recommendation_from_aqi(pred_aqi, user_group),
        "user_group": user_group,
    }


def forecast_range_payload(days: int = 1, profile: str = "general") -> dict[str, Any]:
    forecast_df = build_forecast_df(days=days)

    risk_col = f"risk_{profile}"
    reco_col = f"recommendation_{profile}"

    if risk_col not in forecast_df.columns:
        risk_col = "risk_general"
    if reco_col not in forecast_df.columns:
        reco_col = "recommendation_general"

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
    full_df = load_merged_dataset(past_hours=max(HISTORY_HOURS, days * 24 + 24), forecast_days=1)
    now = pd.Timestamp.now().tz_localize(None)

    hist_df = full_df[full_df["time"] <= now].copy().reset_index(drop=True).tail(days * 24)

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