from __future__ import annotations

import csv
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

from app.config import DATA_DIR, TIMEZONE
from app.predict import (
    _predict_pm25_from_history,
    load_metadata,
)
from app.aqi import pm25_to_aqi
from app.profiles import aqi_to_category, risk_for_profile, recommendation_from_aqi
from app.data_loader import load_merged_dataset
from app.config import HISTORY_HOURS

logger = logging.getLogger(__name__)

DISTRICT_CSV = DATA_DIR / "district_cache.csv"

# ── 22 Quận/Huyện TP.HCM ──────────────────────────────────────────────────────
DISTRICTS: list[dict[str, Any]] = [
    # ── Nội thành ──────────────────────────────────────────────────────────
    { "id": "q1",   "name": "Quận 1",  "type": "Quận", "lat": 10.7769, "lon": 106.7009, "area": "Trung tâm",  "pop": 146986 },
    { "id": "q3",   "name": "Quận 3",  "type": "Quận", "lat": 10.7849, "lon": 106.6898, "area": "Trung tâm",  "pop": 193938 },
    { "id": "q4",   "name": "Quận 4",  "type": "Quận", "lat": 10.7580, "lon": 106.7047, "area": "Nam TT",     "pop": 181667 },
    { "id": "q5",   "name": "Quận 5",  "type": "Quận", "lat": 10.7537, "lon": 106.6600, "area": "Tây TT",     "pop": 171919 },
    { "id": "q6",   "name": "Quận 6",  "type": "Quận", "lat": 10.7485, "lon": 106.6328, "area": "Tây",        "pop": 251436 },
    { "id": "q8",   "name": "Quận 8",  "type": "Quận", "lat": 10.7236, "lon": 106.6333, "area": "Tây Nam",    "pop": 434277 },
    { "id": "q10",  "name": "Quận 10", "type": "Quận", "lat": 10.7746, "lon": 106.6676, "area": "Trung tâm",  "pop": 228316 },
    { "id": "q11",  "name": "Quận 11", "type": "Quận", "lat": 10.7631, "lon": 106.6519, "area": "Tây TT",     "pop": 228995 },
    { "id": "q_pn", "name": "Phú Nhuận","type": "Quận","lat": 10.7986, "lon": 106.6800, "area": "Bắc TT",     "pop": 168249 },
    { "id": "q_bt", "name": "Bình Thạnh","type":"Quận","lat": 10.8127, "lon": 106.7081, "area": "Đông Bắc TT","pop": 498008 },
    { "id": "q7",   "name": "Quận 7",  "type": "Quận", "lat": 10.7322, "lon": 106.7224, "area": "Nam",        "pop": 382726 },
    { "id": "q9",   "name": "Quận 9",  "type": "Quận", "lat": 10.8420, "lon": 106.7864, "area": "Đông",       "pop": 310007 },
    { "id": "q12",  "name": "Quận 12", "type": "Quận", "lat": 10.8631, "lon": 106.6476, "area": "Bắc",        "pop": 549040 },
    { "id": "q_gv", "name": "Gò Vấp",  "type": "Quận", "lat": 10.8384, "lon": 106.6651, "area": "Bắc TT",    "pop": 676233 },
    { "id": "q_tb", "name": "Tân Bình","type": "Quận", "lat": 10.8015, "lon": 106.6517, "area": "Tây Bắc TT","pop": 495266 },
    { "id": "q_tp", "name": "Tân Phú", "type": "Quận", "lat": 10.7893, "lon": 106.6286, "area": "Tây",        "pop": 474198 },
    { "id": "q_btn","name": "Bình Tân","type": "Quận", "lat": 10.7657, "lon": 106.6017, "area": "Tây",        "pop": 754743 },
    { "id": "q_td", "name": "Thủ Đức","type": "Thành phố","lat": 10.8561,"lon": 106.7729,"area": "Đông",      "pop": 1013795},
    # ── Ngoại thành ──────────────────────────────────────────────────────────
    { "id": "h_bc", "name": "Bình Chánh","type":"Huyện","lat": 10.6866,"lon": 106.5673, "area": "Tây Nam",    "pop": 726615 },
    { "id": "h_hm", "name": "Hóc Môn", "type":"Huyện", "lat": 10.8911, "lon": 106.5965, "area": "Tây Bắc",   "pop": 497812 },
    { "id": "h_nb", "name": "Nhà Bè",  "type":"Huyện", "lat": 10.6928, "lon": 106.7374, "area": "Nam",        "pop": 216260 },
    { "id": "h_cc", "name": "Củ Chi",  "type":"Huyện", "lat": 11.0128, "lon": 106.4938, "area": "Bắc",        "pop": 452000 },
    { "id": "h_cn", "name": "Cần Giờ", "type":"Huyện", "lat": 10.4100, "lon": 106.9600, "area": "Nam biển",   "pop": 73094  },
]


def _fetch_weather_for(lat: float, lon: float) -> dict[str, float]:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,"
        "wind_direction_10m,surface_pressure,uv_index,cloud_cover"
        f"&timezone={TIMEZONE}"
        "&wind_speed_unit=kmh"
    )
    resp = requests.get(url, timeout=10)
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
        "observed_at":    str(c.get("time", "")),
    }


def _predict_district(
    district: dict[str, Any],
    history_df,          
    weather: dict[str, float],
) -> dict[str, Any]:
    import pandas as pd
    import numpy as np

    modified_history = history_df.copy()
    last_idx = modified_history.index[-1]

    col_map = {
        "temperature":    ["temp", "temperature_2m"],
        "humidity":       ["humidity", "relative_humidity_2m"],
        "wind_speed":     ["wind_speed", "wind_speed_10m"],
        "wind_direction": ["wind_dir", "wind_direction_10m"],
        "pressure":       ["pressure", "surface_pressure"],
        "uv_index":       ["uv_index"],
        "cloud_cover":    ["cloud_cover"],
    }

    for w_key, col_candidates in col_map.items():
        for col in col_candidates:
            if col in modified_history.columns:
                modified_history.at[last_idx, col] = weather[w_key]
                break

    pred_pm25 = _predict_pm25_from_history(modified_history)
    pred_aqi  = pm25_to_aqi(pred_pm25)

    return {
        "id":                    district["id"],
        "name":                  district["name"],
        "type":                  district["type"],
        "area":                  district["area"],
        "lat":                   district["lat"],
        "lon":                   district["lon"],
        "population":            district["pop"],
        "pred_pm25":             round(float(pred_pm25), 2),
        "pred_aqi":              int(pred_aqi),
        "aqi_category":          aqi_to_category(pred_aqi),
        "risk_general":          risk_for_profile(pred_aqi, "general"),
        "risk_children":         risk_for_profile(pred_aqi, "children"),
        "risk_elderly":          risk_for_profile(pred_aqi, "elderly"),
        "risk_respiratory":      risk_for_profile(pred_aqi, "respiratory"),
        "recommendation":        recommendation_from_aqi(pred_aqi, "general"),
        "temperature":           round(weather["temperature"], 1),
        "humidity":              round(weather["humidity"], 1),
        "wind_speed":            round(weather["wind_speed"], 1),
        "wind_direction":        round(weather["wind_direction"], 1),
        "uv_index":              round(weather["uv_index"], 1),
        "cloud_cover":           round(weather["cloud_cover"], 1),
        "computed_at":           datetime.now(timezone.utc).isoformat(),
    }


def compute_district_heatmap(max_workers: int = 8) -> list[dict[str, Any]]:
    import pandas as pd

    logger.info("=== DISTRICT HEATMAP COMPUTE START ===")
    t0 = time.time()

    logger.info("Load history dataset...")
    full_df = load_merged_dataset(past_hours=HISTORY_HOURS, forecast_days=1)
    now = pd.Timestamp.now().tz_localize(None)
    history_df = full_df[full_df["time"] <= now].copy().reset_index(drop=True)

    if history_df.empty:
        raise ValueError("History data trống, không thể tính district heatmap.")

    logger.info("History loaded: %d rows. Fetch weather 23 quận song song...", len(history_df))

    weather_map: dict[str, dict] = {}
    errors: list[str] = []

    def fetch_one(d: dict) -> tuple[str, dict]:
        w = _fetch_weather_for(d["lat"], d["lon"])
        return d["id"], w

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(fetch_one, d): d for d in DISTRICTS}
        for future in as_completed(futures):
            d = futures[future]
            try:
                did, weather = future.result()
                weather_map[did] = weather
                logger.debug("Weather OK: %s (T=%.1f°C, RH=%.0f%%)",
                             d["name"], weather["temperature"], weather["humidity"])
            except Exception as e:
                logger.warning("Weather fetch lỗi %s: %s — dùng fallback", d["name"], e)
                errors.append(d["id"])
                # Fallback: dùng weather trung tâm HCMC
                weather_map[d["id"]] = {
                    "temperature": 30.0, "humidity": 70.0, "wind_speed": 5.0,
                    "wind_direction": 180.0, "pressure": 1010.0,
                    "uv_index": 5.0, "cloud_cover": 40.0, "observed_at": "",
                }

    logger.info("Weather fetch done. %d OK, %d fallback", len(DISTRICTS) - len(errors), len(errors))

    results = []
    for d in DISTRICTS:
        try:
            weather = weather_map[d["id"]]
            result  = _predict_district(d, history_df, weather)
            results.append(result)
            logger.debug("Predict %s: AQI=%d, PM2.5=%.1f",
                        d["name"], result["pred_aqi"], result["pred_pm25"])
        except Exception as e:
            logger.error("Predict lỗi %s: %s", d["name"], e)

    if results:
        _write_district_csv(results)
        logger.info("Ghi %d quận → %s", len(results), DISTRICT_CSV)

    elapsed = round(time.time() - t0, 2)
    logger.info("=== DISTRICT HEATMAP DONE: %d quận, %.2fs ===", len(results), elapsed)
    return results


def _write_district_csv(results: list[dict[str, Any]]) -> None:
    """Ghi district_cache.csv — đơn giản, đọc nhanh."""
    if not results:
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    fieldnames = list(results[0].keys())

    with open(DISTRICT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)


def read_district_cache() -> list[dict[str, Any]]:
    """Đọc CSV cache — trả về list dict cho API endpoint."""
    if not DISTRICT_CSV.exists():
        raise FileNotFoundError("district_cache.csv chưa có. Gọi /admin/districts/compute trước.")

    results = []
    with open(DISTRICT_CSV, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            for key in ["pred_pm25", "temperature", "humidity", "wind_speed",
                        "wind_direction", "uv_index", "cloud_cover", "lat", "lon"]:
                if key in row:
                    try: row[key] = float(row[key])
                    except (ValueError, TypeError): pass
            for key in ["pred_aqi", "population"]:
                if key in row:
                    try: row[key] = int(row[key])
                    except (ValueError, TypeError): pass
            results.append(row)
    return results


def district_cache_exists() -> bool:
    return DISTRICT_CSV.exists()


def get_district_cache_info() -> dict[str, Any]:
    if not DISTRICT_CSV.exists():
        return {"exists": False}
    stat = DISTRICT_CSV.stat()
    return {
        "exists":      True,
        "size_kb":     round(stat.st_size / 1024, 1),
        "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "district_count": sum(1 for _ in open(DISTRICT_CSV)) - 1,
    }