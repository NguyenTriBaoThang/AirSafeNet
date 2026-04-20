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

logger = logging.getLogger(__name__)

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "airsafenet-admin-secret")
VALID_PROFILES = set(ALL_PROFILES)

# ── Lock để tránh 2 compute chạy song song ────────────────────────────────────
_compute_lock = threading.Lock()
_compute_running = False


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


# ── Background compute wrapper ────────────────────────────────────────────────

def _run_compute_background(force: bool) -> None:
    """Chạy compute trong thread riêng, cập nhật cache_meta khi xong."""
    global _compute_running
    try:
        run_compute(force=force)
    except Exception as e:
        logger.error("Background compute thất bại: %s", e)
    finally:
        _compute_running = False


# ── Lifecycle ─────────────────────────────────────────────────────────────────

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


# ── App ───────────────────────────────────────────────────────────────────────

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


#  PUBLIC — đọc từ cache

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


#  ADMIN — X-Admin-Key required

@app.post("/admin/compute")
def admin_compute(
    force: bool = Query(default=True),
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    """
    ✅ FIX v5.1: Chạy compute trong BACKGROUND THREAD.
    Trả về {"status":"running"} NGAY LẬP TỨC — không block.
    Frontend polling /admin/cache/status mỗi 3s để biết khi nào xong.
    """
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

    if not _compute_running and meta.get("status") == "running":
        if FORECAST_CSV.exists() and HISTORY_CSV.exists() and CURRENT_JSON.exists():
            meta["status"] = "ok"
            from app.cache_manager import write_meta as _write_meta
            _write_meta("ok")
        else:
            meta["status"] = "error"
            meta["error"] = "Server restart trong khi đang tính. Vui lòng tính lại."

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