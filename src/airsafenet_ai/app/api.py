from __future__ import annotations

import logging
import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.cache_manager import (
    ALL_PROFILES, CURRENT_JSON, FORECAST_CSV, HISTORY_CSV,
    read_current_cache, read_forecast_cache, read_history_cache,
    read_meta, run_compute,
)
from app.config import FEATURE_COLS_PATH, MODEL_PATH
from app.predict import load_metadata
from app.scheduler import get_scheduler_status, start_scheduler, stop_scheduler
from app.anomaly_detector import (
    run_anomaly_detection, get_latest_anomaly,
    load_anomaly_log, SPIKE_THRESHOLD,
)
from app.districts import (
    compute_district_heatmap, read_district_cache,
    district_cache_exists, get_district_cache_info,
)

logger = logging.getLogger(__name__)

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "airsafenet-admin-secret")
VALID_PROFILES = set(ALL_PROFILES)

_compute_lock = threading.Lock()
_compute_running = False


BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "https://localhost:7276")
INTERNAL_KEY     = os.getenv("INTERNAL_KEY",     "airsafenet-internal-2027")


def _trigger_alert_check(anomaly_context: dict | None = None) -> None:
    try:
        import requests as _req
        url     = f"{BACKEND_BASE_URL}/api/notification/check-and-alert"
        headers = {"X-Internal-Key": INTERNAL_KEY, "Content-Type": "application/json"}
        body    = {"anomaly": anomaly_context} if anomaly_context else {}
        resp    = _req.post(url, headers=headers, json=body, timeout=15, verify=False)
        if resp.ok:
            data = resp.json()
            logger.info(
                "[Alert] dispatched=%s telegram=%s email=%s skipped=%s",
                data.get("dispatched", 0), data.get("telegram_sent", 0),
                data.get("email_sent", 0), data.get("skipped", 0),
            )
        else:
            logger.warning("[Alert] Backend %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("[Alert] trigger thất bại (non-critical): %s", exc)


def verify_admin(key: str) -> None:
    if key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Admin key không hợp lệ.")


def normalize_profile(profile: str) -> str:
    p = (profile or "general").strip().lower()
    if p not in VALID_PROFILES:
        raise HTTPException(
            status_code=400,
            detail=f"profile không hợp lệ. Chọn: {sorted(VALID_PROFILES)}",
        )
    return p


def _run_compute_background(force: bool) -> None:
    global _compute_running
    try:
        run_compute(force=force)
        logger.info("Compute xong, trigger alert check...")
        _trigger_alert_check()
        try:
            result = run_anomaly_detection()
            if result.get("detected") and result.get("severity") == "critical":
                anomaly = result["anomaly"]
                logger.warning(
                    "🚨 ANOMALY: spike=%.2f µg/m³, AQI=%d",
                    anomaly["spike_pm25"], anomaly["aqi_after"],
                )
                _trigger_alert_check(anomaly_context=anomaly)
            else:
                logger.info("Anomaly check: %s", result.get("severity", "none"))
        except Exception as exc:
            logger.warning("Anomaly detection lỗi (non-critical): %s", exc)
    except Exception as e:
        logger.error("Background compute thất bại: %s", e)
    finally:
        _compute_running = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AirSafeNet AI Server v5.1 khởi động...")
    start_scheduler()

    if not FORECAST_CSV.exists() or not HISTORY_CSV.exists():
        logger.info("Cache chưa có, tính lần đầu trong background...")
        t = threading.Thread(
            target=_run_compute_background, kwargs={"force": True}, daemon=True
        )
        t.start()

    yield
    stop_scheduler()
    logger.info("AirSafeNet AI Server đã dừng.")


app = FastAPI(
    title="AirSafeNet AI Server",
    version="5.1.0",
    description="Cache-based. Admin trigger → background thread → polling status.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "AirSafeNet AI Server v5.1", "docs": "/docs"}


@app.get("/health")
def health():
    meta = read_meta()
    return {
        "status": "ok",
        "model_exists": MODEL_PATH.exists(),
        "forecast_cache_exists": FORECAST_CSV.exists(),
        "history_cache_exists": HISTORY_CSV.exists(),
        "current_cache_exists": CURRENT_JSON.exists(),
        "last_compute": meta.get("computed_at"),
        "last_compute_status": meta.get("status"),
        "compute_running": _compute_running,
        "scheduler": get_scheduler_status(),
    }


@app.get("/model/info")
def model_info():
    return load_metadata()


@app.get("/forecast/current")
def forecast_current(profile: str = Query(default="general")):
    p = normalize_profile(profile)
    try:
        return read_current_cache(profile=p)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forecast/range")
def forecast_range(
    days: int = Query(default=1, ge=1, le=7),
    profile: str = Query(default="general"),
):
    p = normalize_profile(profile)
    try:
        rows = read_forecast_cache(profile=p)
        meta = read_meta()
        if days < 7:
            rows = rows[: days * 24]
        return {
            "generated_at": meta.get("computed_at"),
            "source": "cache",
            "days": days,
            "hours": len(rows),
            "profile": p,
            "forecast": rows,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history")
def history(
    days: int = Query(default=7, ge=1, le=30),
    profile: str = Query(default="general"),
):
    p = normalize_profile(profile)
    try:
        rows = read_history_cache(profile=p)
        meta = read_meta()
        if days < 30:
            rows = rows[-(days * 24):]
        return {
            "generated_at": meta.get("computed_at"),
            "source": "cache",
            "days": days,
            "hours": len(rows),
            "profile": p,
            "history": rows,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/compute")
def admin_compute(
    force: bool = Query(default=True),
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    verify_admin(x_admin_key)

    global _compute_running

    if _compute_running:
        return {
            "status": "running",
            "message": "Đang tính toán, vui lòng chờ...",
            "skipped": True,
        }

    with _compute_lock:
        if _compute_running:  
            return {"status": "running", "message": "Đang tính toán...", "skipped": True}
        _compute_running = True

    logger.info("Admin kích hoạt compute (force=%s) — chạy background thread", force)

    t = threading.Thread(
        target=_run_compute_background,
        kwargs={"force": force},
        daemon=True,
    )
    t.start()

    return {
        "status": "running",
        "message": "Đã kích hoạt tính toán. Đang xử lý trong background...",
        "skipped": False,
    }


@app.get("/admin/cache/status")
def admin_cache_status(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    verify_admin(x_admin_key)

    import datetime as dt

    meta = read_meta()

    if _compute_running:
        meta["status"] = "running"

    def file_info(path) -> dict:
        if path.exists():
            stat = path.stat()
            return {
                "exists": True,
                "size_kb": round(stat.st_size / 1024, 1),
                "modified_at": dt.datetime.fromtimestamp(
                    stat.st_mtime, tz=dt.timezone.utc
                ).isoformat(),
            }
        return {"exists": False}

    return {
        "cache_meta": meta,
        "compute_running": _compute_running,
        "files": {
            "forecast_csv": file_info(FORECAST_CSV),
            "history_csv": file_info(HISTORY_CSV),
            "current_json": file_info(CURRENT_JSON),
        },
        "scheduler": get_scheduler_status(),
        "model": {
            "exists": MODEL_PATH.exists(),
            "feature_cols_exists": FEATURE_COLS_PATH.exists(),
            "metadata": load_metadata(),
        },
    }


@app.delete("/admin/cache/clear")
def admin_cache_clear(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    verify_admin(x_admin_key)

    if _compute_running:
        raise HTTPException(
            status_code=409,
            detail="Đang tính toán, không thể xóa cache lúc này."
        )

    deleted = []
    for path in [FORECAST_CSV, HISTORY_CSV, CURRENT_JSON]:
        if path.exists():
            path.unlink()
            deleted.append(str(path.name))

    logger.warning("Admin xóa cache: %s", deleted)
    return {"message": "Cache đã xóa.", "deleted_files": deleted}


@app.get("/admin/scheduler/status")
def admin_scheduler_status(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    verify_admin(x_admin_key)
    return get_scheduler_status()


_district_running = False
_district_lock    = __import__("threading").Lock()


def _run_district_background() -> None:
    global _district_running
    try:
        compute_district_heatmap(max_workers=8)
    except Exception as e:
        logger.error("District compute thất bại: %s", e)
    finally:
        _district_running = False


@app.get("/districts/current")
def districts_current():
    try:
        data = read_district_cache()
        return {
            "source":       "district_cache",
            "cache_info":   get_district_cache_info(),
            "district_count": len(data),
            "districts":    data,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.warning(f"Cache lỗi, đang recompute: {e}")
        compute_district_heatmap()
        data = read_district_cache()
        return {
            "source": "recomputed",
            "districts": data
        }


@app.post("/admin/districts/compute")
def admin_districts_compute(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    verify_admin(x_admin_key)
    global _district_running

    if _district_running:
        return {"status": "running", "message": "District compute đang chạy, vui lòng chờ."}

    with _district_lock:
        if _district_running:
            return {"status": "running", "message": "District compute đang chạy."}
        _district_running = True

    __import__("threading").Thread(
        target=_run_district_background, daemon=True
    ).start()

    return {
        "status":  "running",
        "message": "Đã kích hoạt tính toán 22 quận/huyện trong background (~5-10s).",
    }


@app.get("/admin/districts/status")
def admin_districts_status(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    verify_admin(x_admin_key)
    return {
        "running":    _district_running,
        "cache_info": get_district_cache_info(),
    }


@app.get("/anomaly/latest")
def anomaly_latest():
    run_anomaly_detection()

    anomaly = get_latest_anomaly(hours=24)
    return {
        "has_anomaly": anomaly is not None,
        "anomaly":     anomaly,
        "threshold":   SPIKE_THRESHOLD,
    }


@app.get("/anomaly/history")
def anomaly_history(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    verify_admin(x_admin_key)
    log = load_anomaly_log()
    return {
        "count":   len(log),
        "entries": list(reversed(log)), 
    }


@app.post("/anomaly/check")
def anomaly_check_manual(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    verify_admin(x_admin_key)
    result = run_anomaly_detection(force=True)
    return result
