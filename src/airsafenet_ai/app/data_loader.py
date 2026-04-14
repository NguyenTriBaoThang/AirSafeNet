from __future__ import annotations

import pandas as pd
import requests

from app.config import LAT, LON, TIMEZONE, HISTORY_HOURS


def _days_from_hours(hours: int) -> int:
    return max(3, min(92, int(hours / 24) + 3))


def fetch_air_quality(
    latitude: float | None = None,
    longitude: float | None = None,
    past_hours: int = HISTORY_HOURS,
    forecast_days: int = 7
) -> pd.DataFrame:
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": latitude if latitude is not None else LAT,
        "longitude": longitude if longitude is not None else LON,
        "hourly": ",".join([
            "pm2_5",
            # ... (no changes to the rest of the list)
            "pm10",
            "carbon_monoxide",
            "nitrogen_dioxide",
            "sulphur_dioxide",
            "ozone",
            "aerosol_optical_depth",
            "dust",
            "uv_index",
        ]),
        "past_days": _days_from_hours(past_hours),
        "forecast_days": forecast_days,
        "timezone": TIMEZONE,
    }
    resp = requests.get(url, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()["hourly"]
    df = pd.DataFrame(data)
    df["time"] = pd.to_datetime(df["time"])
    return df.sort_values("time").reset_index(drop=True)


def fetch_weather(
    latitude: float | None = None,
    longitude: float | None = None,
    past_hours: int = HISTORY_HOURS,
    forecast_days: int = 7
) -> pd.DataFrame:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude if latitude is not None else LAT,
        "longitude": longitude if longitude is not None else LON,
        "hourly": ",".join([
            "temperature_2m",
            # ...
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "rain",
            "surface_pressure",
            "cloud_cover",
            "wind_speed_10m",
            "wind_direction_10m",
        ]),
        "past_days": _days_from_hours(past_hours),
        "forecast_days": forecast_days,
        "timezone": TIMEZONE,
    }
    resp = requests.get(url, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()["hourly"]
    df = pd.DataFrame(data)
    df["time"] = pd.to_datetime(df["time"])
    return df.sort_values("time").reset_index(drop=True)


def load_merged_dataset(
    latitude: float | None = None,
    longitude: float | None = None,
    past_hours: int = HISTORY_HOURS,
    forecast_days: int = 7
) -> pd.DataFrame:
    air = fetch_air_quality(latitude=latitude, longitude=longitude, past_hours=past_hours, forecast_days=forecast_days)
    weather = fetch_weather(latitude=latitude, longitude=longitude, past_hours=past_hours, forecast_days=forecast_days)

    df = pd.merge(air, weather, on="time", how="inner").sort_values("time").reset_index(drop=True)

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
    return df