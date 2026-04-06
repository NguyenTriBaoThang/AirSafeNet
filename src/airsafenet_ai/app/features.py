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
    feature_cols = load_feature_columns()
    feat_df = build_feature_frame(df)
    latest = feat_df.iloc[[-1]].copy()

    for col in feature_cols:
        if col not in latest.columns:
            latest[col] = 0.0

    latest = latest[feature_cols].copy()
    latest = latest.fillna(0.0)
    return latest