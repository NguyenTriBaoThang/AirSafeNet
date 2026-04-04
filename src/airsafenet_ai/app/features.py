from __future__ import annotations

import json
import numpy as np
import pandas as pd

from app.config import FEATURE_COLS_PATH


def load_feature_columns() -> list[str]:
    with open(FEATURE_COLS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def cyclical_features(series: pd.Series, period: int):
    radians = 2 * np.pi * series / period
    return np.sin(radians), np.cos(radians)


def build_features(input_df: pd.DataFrame) -> pd.DataFrame:
    data = input_df.copy().sort_values("time").reset_index(drop=True)

    data["hour"] = data["time"].dt.hour
    data["dayofweek"] = data["time"].dt.dayofweek
    data["month"] = data["time"].dt.month
    data["day"] = data["time"].dt.day
    data["is_weekend"] = data["dayofweek"].isin([5, 6]).astype(int)

    data["hour_sin"], data["hour_cos"] = cyclical_features(data["hour"], 24)
    data["dow_sin"], data["dow_cos"] = cyclical_features(data["dayofweek"], 7)
    data["month_sin"], data["month_cos"] = cyclical_features(data["month"], 12)

    numeric_base_cols = [
        "pm2_5",
        "pm10",
        "co",
        "no2",
        "so2",
        "o3",
        "aerosol_optical_depth",
        "dust",
        "uv_index",
        "temp",
        "humidity",
        "apparent_temp",
        "precipitation",
        "rain",
        "pressure",
        "cloud_cover",
        "wind_speed",
        "wind_dir",
    ]

    existing_numeric = [c for c in numeric_base_cols if c in data.columns]

    for col in existing_numeric:
        data[f"{col}_roll3"] = data[col].rolling(3).mean()
        data[f"{col}_roll6"] = data[col].rolling(6).mean()
        data[f"{col}_roll12"] = data[col].rolling(12).mean()
        data[f"{col}_roll24"] = data[col].rolling(24).mean()

    lag_cols = ["pm2_5", "pm10", "co", "no2", "o3", "temp", "humidity", "wind_speed", "pressure"]
    lag_candidates = [c for c in lag_cols if c in data.columns]

    for col in lag_candidates:
        for lag in [1, 2, 3, 6, 12, 24]:
            data[f"{col}_lag_{lag}"] = data[col].shift(lag)

    data["pm2_5_diff_1"] = data["pm2_5"].diff(1)
    data["pm2_5_diff_3"] = data["pm2_5"].diff(3)
    data["pm2_5_diff_24"] = data["pm2_5"].diff(24)

    return data


def build_latest_feature_vector(history_df: pd.DataFrame) -> pd.DataFrame:
    feature_cols = load_feature_columns()
    feat_df = build_features(history_df)

    latest = feat_df.iloc[[-1]].copy()

    missing_cols = [c for c in feature_cols if c not in latest.columns]
    for col in missing_cols:
        latest[col] = 0.0

    latest = latest[feature_cols].copy()

    latest = latest.fillna(method="ffill", axis=1).fillna(0.0)
    return latest