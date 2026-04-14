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

# Load model 1 lần duy nhất khi import
MODEL = joblib.load(MODEL_PATH)

# ── Hằng số điều chỉnh forecast ──────────────────────────────────────────────

# Giới hạn mức thay đổi PM2.5 tối đa mỗi giờ (µg/m³).
# Thực tế PM2.5 HCMC thường dao động 0–5 µg/m³/giờ trong điều kiện bình thường,
# tối đa ~15 µg/m³/giờ khi có sự kiện đặc biệt (đốt rơm, kẹt xe nặng).
MAX_HOURLY_DELTA = 12.0

# Giới hạn tuyệt đối cho PM2.5 dự báo (µg/m³)
PM25_MIN = 0.0
PM25_MAX = 300.0

# Số giờ lịch sử tối thiểu để model hoạt động ổn định
MIN_HISTORY_ROWS = 30


def load_metadata() -> dict[str, Any]:
    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


# ── Core prediction helpers ───────────────────────────────────────────────────

def _predict_pm25_from_history(history_df: pd.DataFrame) -> float:
    """
    Dự báo PM2.5 cho timestep ngay sau history_df dựa trên latest_feature_vector.
    Dùng cho get_current_snapshot() — không có future exogenous.
    """
    X = latest_feature_vector(history_df)
    pred = float(MODEL.predict(X)[0])
    return float(np.clip(pred, PM25_MIN, PM25_MAX))


def _predict_pm25_with_exogenous(
    working_history: pd.DataFrame,
    future_row: pd.Series,
    step_index: int,
    prev_pred_pm25: float | None = None,
) -> float:
    """
    Dự báo PM2.5 cho 1 bước forecast với đầy đủ weather exogenous features.

    1. Dùng build_feature_vector_for_step() thay vì latest_feature_vector()
       → Weather features (temp, humidity, wind...) lấy từ future_row thật,
         không phải từ history bị stale.
    2. MAX_HOURLY_DELTA clipping: ngăn model nhảy quá xa so với giờ trước
       → Loại bỏ "flat loop" do feedback loop cộng hưởng.
    3. Hard clip [PM25_MIN, PM25_MAX] để đảm bảo range hợp lý.

    Args:
        working_history: lịch sử đã bao gồm các predicted rows trước đó
        future_row: Series chứa weather exogenous của timestep cần predict
        step_index: 0-based index của bước forecast
        prev_pred_pm25: PM2.5 predicted ở bước liền trước (để clamp delta)
    """
    X = build_feature_vector_for_step(working_history, future_row, step_index)
    raw_pred = float(MODEL.predict(X)[0])

    # Clamp delta so với bước liền trước
    if prev_pred_pm25 is not None:
        delta = raw_pred - prev_pred_pm25
        delta_clamped = float(np.clip(delta, -MAX_HOURLY_DELTA, MAX_HOURLY_DELTA))
        pred = prev_pred_pm25 + delta_clamped
    else:
        pred = raw_pred

    return float(np.clip(pred, PM25_MIN, PM25_MAX))


# ── Profile columns ───────────────────────────────────────────────────────────

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


# ── Main forecast builder ─────────────────────────────────────────────────────

def build_forecast_df(days: int = 1) -> pd.DataFrame:
    """
    Build forecast DataFrame cho N ngày tới.

    Pipeline (đã fix):
    ┌─────────────────────────────────────────────────────────────────────┐
    │  Bước gốc (bị flat):                                                │
    │    working_history ──► latest_feature_vector ──► pred_pm25          │
    │         ▲                                             │             │
    │         └──── append(next_row, pm2_5=pred_pm25) ◄─────┘             │
    │    → lag/roll features chỉ thấy pred_pm25 lặp đi lặp lại            │
    │                                                                     │
    │  Bước mới (đã fix):                                                 │
    │    working_history ──► build_feature_vector_for_step(               │
    │         ▲                  future_row=future_df[i],  ← weather thật │
    │         │                  step_index=i              ← horizon info  │
    │         │               ) ──► raw_pred                               │
    │         │                        │                                   │
    │         │               delta_clamp(raw_pred, prev_pred)             │
    │         │                        │                                   │
    │         └──── append(future_row, pm2_5=pred_pm25) ◄─────────────────┘
    │    → Weather features thật + PM2.5 lag có variation tự nhiên        │
    └─────────────────────────────────────────────────────────────────────┘
    """
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

    # Lấy observed PM2.5 cuối cùng làm anchor cho bước đầu tiên
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

        # ── Cập nhật working_history với row mới ──────────────────────────
        # Quan trọng: dùng TOÀN BỘ weather từ future_row (temp, humidity,
        # wind, pressure...) chứ không chỉ gán pm2_5. Đây là điểm khác biệt
        # cốt lõi so với bản gốc.
        next_row = future_row.copy()
        next_row["pm2_5"] = pred_pm25
        # pm10 thường tương quan cao với pm2_5, ước lượng để lag features đúng
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


# ── Current snapshot ──────────────────────────────────────────────────────────

def get_current_snapshot(user_group: str = "general") -> dict[str, Any]:
    """
    Snapshot hiện tại: dùng toàn bộ history để predict PM2.5 ngay bây giờ.
    """
    full_df = load_merged_dataset(past_hours=HISTORY_HOURS, forecast_days=2)
    now = pd.Timestamp.now().tz_localize(None)

    history_df = full_df[full_df["time"] <= now].copy().reset_index(drop=True)
    if history_df.empty:
        raise ValueError("Không có current history data.")

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


# ── Payload builders ──────────────────────────────────────────────────────────

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