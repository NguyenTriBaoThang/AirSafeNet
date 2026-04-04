from __future__ import annotations

import json
import joblib
import pandas as pd

from app.aqi import pm25_to_aqi, get_risk_level, get_recommendation
from app.config import MODEL_PATH, METADATA_PATH, FORECAST_HOURS, HISTORY_HOURS
from app.data_loader import load_merged_history
from app.features import build_latest_feature_vector

model = joblib.load(MODEL_PATH)


def load_metadata() -> dict:
    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _safe_float(value) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def _predict_one_from_history(history_df: pd.DataFrame, user_group: str = "normal") -> dict:
    X_latest = build_latest_feature_vector(history_df)
    pred_pm25 = float(model.predict(X_latest)[0])
    pred_pm25 = max(0.0, pred_pm25)

    pred_aqi = pm25_to_aqi(pred_pm25)
    risk = get_risk_level(pred_aqi, user_group)
    recommendation = get_recommendation(risk)

    return {
        "pm25": round(pred_pm25, 2),
        "aqi": int(pred_aqi),
        "risk": risk,
        "recommendation": recommendation,
    }


def get_current_snapshot(user_group: str = "normal") -> dict:
    history = load_merged_history(HISTORY_HOURS)

    if history.empty:
        raise ValueError("Không có dữ liệu history để dự đoán.")

    last_row = history.iloc[-1]

    prediction = _predict_one_from_history(history, user_group)

    return {
        "time": str(pd.Timestamp(last_row["time"]).isoformat()),
        "observed_pm25": round(_safe_float(last_row.get("pm2_5", 0)), 2),
        "observed_temp": round(_safe_float(last_row.get("temp", 0)), 2),
        "observed_humidity": round(_safe_float(last_row.get("humidity", 0)), 2),
        "observed_wind_speed": round(_safe_float(last_row.get("wind_speed", 0)), 2),
        **prediction,
        "user_group": user_group,
    }


def forecast_next_24h(user_group: str = "normal") -> dict:
    history = load_merged_history(HISTORY_HOURS)

    if len(history) < 30:
        raise ValueError("History chưa đủ để build lag/rolling features.")

    rows = []

    for _ in range(FORECAST_HOURS):
        prediction = _predict_one_from_history(history, user_group)

        last = history.iloc[-1].copy()
        next_time = pd.Timestamp(last["time"]) + pd.Timedelta(hours=1)

        # Giữ các external predictors gần nhất như một cách recursive forecast đơn giản
        new_row = last.copy()
        new_row["time"] = next_time
        new_row["pm2_5"] = prediction["pm25"]

        history = pd.concat([history, pd.DataFrame([new_row])], ignore_index=True)

        rows.append({
            "time": str(next_time.isoformat()),
            "pm25": prediction["pm25"],
            "aqi": prediction["aqi"],
            "risk": prediction["risk"],
            "recommendation": prediction["recommendation"],
            "user_group": user_group,
        })

    return {
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "hours": FORECAST_HOURS,
        "user_group": user_group,
        "forecast": rows,
    }