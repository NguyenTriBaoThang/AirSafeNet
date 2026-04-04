from __future__ import annotations

import requests
import pandas as pd

from app.config import LAT, LON, TIMEZONE, HISTORY_HOURS


def _get_past_days(hours: int) -> int:
    return max(3, min(92, int(hours / 24) + 3))


def fetch_air_quality_history(hours: int = HISTORY_HOURS) -> pd.DataFrame:
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "hourly": ",".join([
            "pm2_5",
            "pm10",
            "carbon_monoxide",
            "nitrogen_dioxide",
            "sulphur_dioxide",
            "ozone",
            "aerosol_optical_depth",
            "dust",
            "uv_index",
        ]),
        "past_days": _get_past_days(hours),
        "forecast_days": 2,
        "timezone": TIMEZONE,
    }

    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()
    data = response.json()

    hourly = data.get("hourly", {})
    df = pd.DataFrame(hourly)
    if df.empty:
        raise ValueError("Không lấy được dữ liệu air quality từ Open-Meteo.")

    df["time"] = pd.to_datetime(df["time"])
    df = df.sort_values("time").reset_index(drop=True)
    return df


def fetch_weather_history(hours: int = HISTORY_HOURS) -> pd.DataFrame:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "hourly": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "rain",
            "surface_pressure",
            "cloud_cover",
            "wind_speed_10m",
            "wind_direction_10m",
        ]),
        "past_days": _get_past_days(hours),
        "forecast_days": 2,
        "timezone": TIMEZONE,
    }

    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()
    data = response.json()

    hourly = data.get("hourly", {})
    df = pd.DataFrame(hourly)
    if df.empty:
        raise ValueError("Không lấy được dữ liệu weather từ Open-Meteo.")

    df["time"] = pd.to_datetime(df["time"])
    df = df.sort_values("time").reset_index(drop=True)
    return df


def load_merged_history(hours: int = HISTORY_HOURS) -> pd.DataFrame:
    air_df = fetch_air_quality_history(hours)
    weather_df = fetch_weather_history(hours)

    df = pd.merge(air_df, weather_df, on="time", how="inner").sort_values("time").reset_index(drop=True)

    rename_map = {
        "carbon_monoxide": "co",
        "nitrogen_dioxide": "no2",
        "sulphur_dioxide": "so2",
        "ozone": "o3",
        "temperature_2m": "temp",
        "relative_humidity_2m": "humidity",
        "apparent_temperature": "apparent_temp",
        "surface_pressure": "pressure",
        "wind_speed_10m": "wind_speed",
        "wind_direction_10m": "wind_dir",
    }

    df = df.rename(columns=rename_map)

    df = df.drop_duplicates(subset=["time"]).sort_values("time").reset_index(drop=True)

    # Chỉ giữ phần cần thiết cho history gần đây
    return df.tail(hours + 48).reset_index(drop=True)