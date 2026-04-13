from __future__ import annotations

import json
import numpy as np
import pandas as pd

from app.config import FEATURE_COLS_PATH


def load_feature_columns() -> list[str]:
    with open(FEATURE_COLS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _cyclical(series: pd.Series, period: int):
    radians = 2 * np.pi * series / period
    return np.sin(radians), np.cos(radians)


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build full feature frame từ merged dataframe (history + appended future rows).
    Không thay đổi so với bản gốc — giữ nguyên để tương thích với model đã train.
    """
    data = df.copy().sort_values("time").reset_index(drop=True)

    data["hour"] = data["time"].dt.hour
    data["dayofweek"] = data["time"].dt.dayofweek
    data["month"] = data["time"].dt.month
    data["day"] = data["time"].dt.day
    data["is_weekend"] = data["dayofweek"].isin([5, 6]).astype(int)

    data["hour_sin"], data["hour_cos"] = _cyclical(data["hour"], 24)
    data["dow_sin"], data["dow_cos"] = _cyclical(data["dayofweek"], 7)
    data["month_sin"], data["month_cos"] = _cyclical(data["month"], 12)

    base_cols = [
        "pm2_5", "pm10", "co", "no2", "so2", "o3",
        "aerosol_optical_depth", "dust", "uv_index",
        "temp", "humidity", "apparent_temp",
        "precipitation", "rain", "pressure",
        "cloud_cover", "wind_speed", "wind_dir",
    ]

    for col in base_cols:
        if col not in data.columns:
            data[col] = 0.0

        for w in [3, 6, 12, 24]:
            data[f"{col}_roll{w}"] = data[col].rolling(w).mean()

    lag_cols = ["pm2_5", "pm10", "co", "no2", "o3", "temp", "humidity", "wind_speed", "pressure"]
    for col in lag_cols:
        for lag in [1, 2, 3, 6, 12, 24]:
            data[f"{col}_lag_{lag}"] = data[col].shift(lag)

    data["pm2_5_diff_1"] = data["pm2_5"].diff(1)
    data["pm2_5_diff_3"] = data["pm2_5"].diff(3)
    data["pm2_5_diff_24"] = data["pm2_5"].diff(24)

    return data


def latest_feature_vector(df: pd.DataFrame) -> pd.DataFrame:
    """Lấy feature vector của row cuối cùng trong df."""
    feature_cols = load_feature_columns()
    feat_df = build_feature_frame(df)
    latest = feat_df.iloc[[-1]].copy()

    for col in feature_cols:
        if col not in latest.columns:
            latest[col] = 0.0

    latest = latest[feature_cols].copy()
    latest = latest.fillna(0.0)
    return latest


def build_feature_vector_for_step(
    working_history: pd.DataFrame,
    future_row: pd.Series,
    step_index: int,
) -> pd.DataFrame:
    """
    Build feature vector cho 1 bước forecast cụ thể.
    
    Khác với latest_feature_vector():
    - Append future_row (với exogenous weather thật) vào working_history TRƯỚC
      khi tính features → lag/rolling của pm2_5 dùng predicted values đúng,
      nhưng weather features (temp, humidity, wind...) dùng giá trị thật từ API.
    - Thêm 'forecast_horizon' feature nếu có trong feature_cols.
    
    Args:
        working_history: DataFrame lịch sử đã bao gồm các predicted rows trước đó
        future_row: Series chứa exogenous features (weather) của timestep cần predict
        step_index: index bước forecast (0-based), dùng làm horizon indicator
    """
    feature_cols = load_feature_columns()

    # Tạo một row tạm để tính features — pm2_5 chưa biết, dùng NaN
    # nhưng weather features lấy từ future_row thật
    temp_row = future_row.copy()
    if "pm2_5" not in temp_row or pd.isna(temp_row.get("pm2_5")):
        # Dùng giá trị trung bình của 3 giờ gần nhất làm placeholder
        # để rolling/lag không bị NaN hết — sẽ bị overwrite sau
        recent_pm25 = working_history["pm2_5"].dropna().tail(3).mean()
        temp_row["pm2_5"] = recent_pm25 if not pd.isna(recent_pm25) else 0.0

    combined = pd.concat(
        [working_history, pd.DataFrame([temp_row])],
        ignore_index=True,
    )

    feat_df = build_feature_frame(combined)
    latest = feat_df.iloc[[-1]].copy()

    # Thêm forecast_horizon nếu model được train với feature này
    if "forecast_horizon" in feature_cols:
        latest["forecast_horizon"] = step_index

    for col in feature_cols:
        if col not in latest.columns:
            latest[col] = 0.0

    latest = latest[feature_cols].copy()
    latest = latest.fillna(0.0)
    return latest
