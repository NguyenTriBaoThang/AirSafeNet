from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.cache_manager import run_compute

logger = logging.getLogger(__name__)

# ── Singleton scheduler ────────────────────────────────────────────────────────

_scheduler: BackgroundScheduler | None = None

INTERVAL_MINUTES = 60 

# ── Job function ───────────────────────────────────────────────────────────────

def _scheduled_compute_job() -> None:
    logger.info(
        "[Scheduler] Bắt đầu job tự động lúc %s",
        datetime.now(timezone.utc).isoformat(),
    )
    try:
        result = run_compute(force=False)
        if result.get("skipped"):
            logger.info("[Scheduler] Cache còn mới, bỏ qua lần này.")
        else:
            logger.info(
                "[Scheduler] Hoàn thành. Elapsed=%.2fs, forecast=%d rows, history=%d rows",
                result.get("elapsed_seconds", 0),
                result.get("forecast_rows", 0),
                result.get("history_rows", 0),
            )
    except Exception as exc:
        logger.error("[Scheduler] Job thất bại: %s", exc)


# ── Public API ─────────────────────────────────────────────────────────────────

def start_scheduler() -> BackgroundScheduler:
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        logger.warning("Scheduler đang chạy rồi, không khởi động lại.")
        return _scheduler

    _scheduler = BackgroundScheduler(
        job_defaults={
            "coalesce": True,     
            "max_instances": 1,     
            "misfire_grace_time": 120,  
        },
        timezone="Asia/Bangkok",
    )

    _scheduler.add_job(
        func=_scheduled_compute_job,
        trigger=IntervalTrigger(minutes=INTERVAL_MINUTES),
        id="cache_compute",
        name="AirSafeNet Cache Compute",
        replace_existing=True,
    )

    _scheduler.start()

    next_run = _scheduler.get_job("cache_compute").next_run_time
    logger.info(
        "Scheduler khởi động. Interval=%d phút. Lần chạy kế: %s",
        INTERVAL_MINUTES,
        next_run,
    )

    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler đã dừng.")
    _scheduler = None


def get_scheduler_status() -> dict:
    if _scheduler is None or not _scheduler.running:
        return {"running": False, "next_run": None, "interval_minutes": INTERVAL_MINUTES}

    job = _scheduler.get_job("cache_compute")
    return {
        "running": True,
        "next_run": job.next_run_time.isoformat() if job and job.next_run_time else None,
        "interval_minutes": INTERVAL_MINUTES,
    }
