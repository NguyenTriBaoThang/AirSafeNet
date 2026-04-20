from __future__ import annotations

import json
import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from app.config import DATA_DIR
from app.predict import (
    build_forecast_df,
    get_current_snapshot,
    history_range_payload,
)
from app.profiles import aqi_to_category, recommendation_from_aqi, risk_for_profile

logger = logging.getLogger(__name__)

# ── Đường dẫn cache ───────────────────────────────────────────────────────────

FORECAST_CSV   = DATA_DIR / "forecast_cache.csv"
HISTORY_CSV    = DATA_DIR / "history_cache.csv"
CURRENT_JSON   = DATA_DIR / "current_cache.json"
CACHE_META     = DATA_DIR / "cache_meta.json"

ALL_PROFILES = ["general", "children", "elderly", "respiratory"]

# ── Metadata helpers ──────────────────────────────────────────────────────────

def read_meta() -> dict[str, Any]:
    """Đọc metadata cache. Trả về dict rỗng nếu chưa có."""
    try:
        if CACHE_META.exists():
            return json.loads(CACHE_META.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def write_meta(status: str, error: str | None = None) -> None:
    """Ghi metadata sau mỗi lần compute."""
    meta = {
        "status": status,
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "forecast_csv": str(FORECAST_CSV),
        "history_csv": str(HISTORY_CSV),
        "current_json": str(CURRENT_JSON),
        "error": error,
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def cache_is_fresh(max_age_minutes: int = 70) -> bool:
    """Kiểm tra cache có còn mới không (dùng để skip nếu vừa tính xong)."""
    meta = read_meta()
    if meta.get("status") != "ok":
        return False
    computed_at_str = meta.get("computed_at")
    if not computed_at_str:
        return False
    try:
        computed_at = datetime.fromisoformat(computed_at_str)
        age = (datetime.now(timezone.utc) - computed_at).total_seconds() / 60
        return age < max_age_minutes
    except Exception:
        return False

# ── Core compute ──────────────────────────────────────────────────────────────

def run_compute(force: bool = False) -> dict[str, Any]:
    if not force and cache_is_fresh(max_age_minutes=55):
        logger.info("Cache còn mới, bỏ qua compute.")
        return {**read_meta(), "skipped": True}

    started_at = datetime.now(timezone.utc)
    logger.info("Bắt đầu compute cache... (force=%s)", force)

    write_meta("running")

    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        # ── 1. Forecast CSV (7 ngày, tất cả profile) ─────────────────────────
        logger.info("Tính forecast 7 ngày...")
        forecast_rows = []

        forecast_df = build_forecast_df(days=7)

        for profile in ALL_PROFILES:
            risk_col = f"risk_{profile}"
            reco_col = f"recommendation_{profile}"

            if risk_col not in forecast_df.columns:
                risk_col = "risk_general"
            if reco_col not in forecast_df.columns:
                reco_col = "recommendation_general"

            for _, row in forecast_df.iterrows():
                forecast_rows.append({
                    "time":            str(pd.Timestamp(row["time"]).isoformat()),
                    "pred_pm25":       round(float(row["pred_pm25"]), 4),
                    "pred_aqi":        int(row["pred_aqi"]),
                    "aqi_category":    row["aqi_category"],
                    "risk_profile":    row[risk_col],
                    "recommendation_profile":  row[reco_col],
                    "profile":         profile,
                })

        forecast_out = pd.DataFrame(forecast_rows)
        forecast_out.to_csv(FORECAST_CSV, index=False, encoding="utf-8")
        logger.info("Đã ghi %s dòng vào %s", len(forecast_out), FORECAST_CSV)

        # ── 2. History CSV (30 ngày, tất cả profile) ─────────────────────────
        logger.info("Tính history 30 ngày...")
        history_rows = []

        for profile in ALL_PROFILES:
            payload = history_range_payload(days=30, profile=profile)
            for item in payload["history"]:
                history_rows.append({
                    "time":           item["time"],
                    "pm25":           round(float(item["pm25"]), 4),
                    "aqi":            int(item["aqi"]),
                    "aqi_category":   item["aqi_category"],
                    "risk_profile":   item["risk_profile"],
                    "recommendation_profile": item["recommendation_profile"],
                    "profile":        profile,
                })

        history_out = pd.DataFrame(history_rows)
        history_out.to_csv(HISTORY_CSV, index=False, encoding="utf-8")
        logger.info("Đã ghi %s dòng vào %s", len(history_out), HISTORY_CSV)

        # ── 3. Current snapshot JSON (tất cả profile) ────────────────────────
        logger.info("Tính current snapshot...")
        current_data: dict[str, Any] = {}
        for profile in ALL_PROFILES:
            snapshot = get_current_snapshot(user_group=profile)
            current_data[profile] = snapshot

        CURRENT_JSON.write_text(
            json.dumps(current_data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info("Đã ghi current snapshot vào %s", CURRENT_JSON)

        # ── Done ──────────────────────────────────────────────────────────────
        elapsed = round(
            (datetime.now(timezone.utc) - started_at).total_seconds(), 2
        )
        write_meta("ok")
        logger.info("Compute hoàn thành trong %.2fs", elapsed)

        return {
            "status": "ok",
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "elapsed_seconds": elapsed,
            "forecast_rows": len(forecast_out),
            "history_rows": len(history_out),
            "profiles": ALL_PROFILES,
            "skipped": False,
        }

    except Exception as exc:
        error_msg = traceback.format_exc()
        logger.error("Compute thất bại: %s", error_msg)
        write_meta("error", error=str(exc))
        raise


# ── Read helpers (dùng cho /forecast/cached, /history/cached...) ─────────────

def read_forecast_cache(profile: str = "general") -> list[dict]:
    """Đọc forecast từ CSV cache, filter theo profile."""
    if not FORECAST_CSV.exists():
        raise FileNotFoundError("Chưa có forecast cache. Admin cần chạy compute.")

    df = pd.read_csv(FORECAST_CSV, encoding="utf-8")
    df = df[df["profile"] == profile]

    return df.to_dict(orient="records")


def read_history_cache(profile: str = "general") -> list[dict]:
    """Đọc history từ CSV cache, filter theo profile."""
    if not HISTORY_CSV.exists():
        raise FileNotFoundError("Chưa có history cache. Admin cần chạy compute.")

    df = pd.read_csv(HISTORY_CSV, encoding="utf-8")
    df = df[df["profile"] == profile]

    return df.to_dict(orient="records")


def read_current_cache(profile: str = "general") -> dict[str, Any]:
    """Đọc current snapshot từ JSON cache."""
    if not CURRENT_JSON.exists():
        raise FileNotFoundError("Chưa có current cache. Admin cần chạy compute.")

    data = json.loads(CURRENT_JSON.read_text(encoding="utf-8"))

    if profile not in data:
        profile = "general"

    return data[profile]
