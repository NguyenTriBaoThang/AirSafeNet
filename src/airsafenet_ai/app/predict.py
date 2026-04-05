from __future__ import annotations

import json
import joblib
import pandas as pd

from app.aqi import pm25_to_aqi, get_risk_level, get_recommendation
from app.config import MODEL_PATH, METADATA_PATH, HISTORY_HOURS
from app.data_loader import load_merged_dataset
from app.features import build_latest_feature_vector

model = joblib.load(MODEL_PATH)


def load_metadata() -> dict:
    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _predict_one(history_df: pd.DataFrame, user_group: str) -> dict:
    X_latest = build_latest_feature_vector(history_df)
    pred_pm25 = float(model.predict(X_latest)[0])
    pred_pm25 = max(0.0, pred_pm25)

    aqi = pm25_to_aqi(pred_pm25)
    risk = get_risk_level(aqi, user_group)
    recommendation = get_recommendation(risk)

    return {
        "pm25": round(pred_pm25, 2),
        "aqi": int(aqi),
        "risk": risk,
        "recommendation": recommendation,
    }


def get_current_snapshot(user_group: str = "normal") -> dict:
    df = load_merged_dataset(hours=HISTORY_HOURS, forecast_days=2)
    history = df[df["time"] <= pd.Timestamp.now().tz_localize(None)].copy()

    if history.empty:
        raise ValueError("Không có history để dự đoán current.")

    last_row = history.iloc[-1]
    pred = _predict_one(history, user_group)

    return {
        "time": str(pd.Timestamp(last_row["time"]).isoformat()),
        "observed_pm25": round(float(last_row.get("pm2_5", 0) or 0), 2),
        "observed_temp": round(float(last_row.get("temp", 0) or 0), 2),
        "observed_humidity": round(float(last_row.get("humidity", 0) or 0), 2),
        "observed_wind_speed": round(float(last_row.get("wind_speed", 0) or 0), 2),
        **pred,
        "user_group": user_group,
    }


def forecast_range(days: int = 1, user_group: str = "normal") -> dict:
    days = max(1, min(days, 7))

    df = load_merged_dataset(hours=HISTORY_HOURS, forecast_days=max(days, 2))
    now = pd.Timestamp.now().tz_localize(None)

    history = df[df["time"] <= now].copy().reset_index(drop=True)
    future_exog = df[df["time"] > now].copy().reset_index(drop=True)

    target_hours = days * 24
    future_exog = future_exog.head(target_hours)

    if len(history) < 30:
        raise ValueError("History chưa đủ để build lag/rolling.")
    if future_exog.empty:
        raise ValueError("Không có future exogenous data để forecast.")

    rows = []

    for i in range(len(future_exog)):
        pred = _predict_one(history, user_group)

        future_row = future_exog.iloc[i].copy()
        future_row["pm2_5"] = pred["pm25"]

        history = pd.concat([history, pd.DataFrame([future_row])], ignore_index=True)

        rows.append({
            "time": str(pd.Timestamp(future_row["time"]).isoformat()),
            "pm25": pred["pm25"],
            "aqi": pred["aqi"],
            "risk": pred["risk"],
            "recommendation": pred["recommendation"],
            "user_group": user_group,
        })

    return {
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "days": days,
        "hours": len(rows),
        "user_group": user_group,
        "forecast": rows,
    }


def history_range(days: int = 7, user_group: str = "normal") -> dict:
    days = max(1, min(days, 30))

    df = load_merged_dataset(hours=max(days * 24 + 24, HISTORY_HOURS), forecast_days=1)
    now = pd.Timestamp.now().tz_localize(None)

    hist = df[df["time"] <= now].copy().reset_index(drop=True)
    hist = hist.tail(days * 24).copy()

    rows = []
    for _, row in hist.iterrows():
        observed_pm25 = float(row.get("pm2_5", 0) or 0)
        aqi = pm25_to_aqi(observed_pm25)
        risk = get_risk_level(aqi, user_group)
        recommendation = get_recommendation(risk)

        rows.append({
            "time": str(pd.Timestamp(row["time"]).isoformat()),
            "pm25": round(observed_pm25, 2),
            "aqi": int(aqi),
            "risk": risk,
            "recommendation": recommendation,
            "user_group": user_group,
        })

    return {
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "days": days,
        "hours": len(rows),
        "user_group": user_group,
        "history": rows,
    }