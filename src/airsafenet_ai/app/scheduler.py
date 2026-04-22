from __future__ import annotations

import logging
import os
import requests
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.cache_manager import run_compute
from app.districts import compute_district_heatmap

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None
INTERVAL_MINUTES = 60

BACKEND_BASE_URL  = os.getenv("BACKEND_BASE_URL",  "https://localhost:7276")
INTERNAL_KEY      = os.getenv("INTERNAL_KEY",      "airsafenet-internal-2027")


def _trigger_alert_check() -> None:
    try:
        url = f"{BACKEND_BASE_URL}/api/notification/check-and-alert"
        resp = requests.post(
            url,
            headers={"X-Internal-Key": INTERNAL_KEY},
            timeout=15,
            verify=False,  
        )
        if resp.ok:
            data = resp.json()
            logger.info(
                "[Alert] check done: dispatched=%s telegram=%s email=%s skipped=%s",
                data.get("dispatched", 0),
                data.get("telegram_sent", 0),
                data.get("email_sent", 0),
                data.get("skipped", 0),
            )
        else:
            logger.warning("[Alert] Backend responded %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("[Alert] trigger thất bại (non-critical): %s", exc)


def _scheduled_job() -> None:
    logger.info(
        "[Scheduler] Job bắt đầu lúc %s",
        datetime.now(timezone.utc).isoformat(),
    )
    try:
        result = run_compute(force=False)
        if result.get("skipped"):
            logger.info("[Scheduler] Cache còn mới, bỏ qua compute.")
        else:
            logger.info(
                "[Scheduler] Compute xong. Elapsed=%.2fs, rows=%s",
                result.get("elapsed_seconds", 0),
                result.get("forecast_rows", 0),
            )
            _trigger_alert_check()
            try:
                compute_district_heatmap(max_workers=8)
                logger.info("[Scheduler] District heatmap OK")
            except Exception as exc:
                logger.warning("[Scheduler] District heatmap lỗi: %s", exc)

    except Exception as exc:
        logger.error("[Scheduler] Job thất bại: %s", exc)


def start_scheduler() -> BackgroundScheduler:
    global _scheduler

    if _scheduler is not None and _scheduler.running:
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
        func=_scheduled_job,
        trigger=IntervalTrigger(minutes=INTERVAL_MINUTES),
        id="cache_compute",
        name="AirSafeNet Cache Compute + Alert",
        replace_existing=True,
    )

    _scheduler.start()
    next_run = _scheduler.get_job("cache_compute").next_run_time
    logger.info(
        "Scheduler khởi động. Interval=%d phút. Lần chạy kế: %s",
        INTERVAL_MINUTES, next_run,
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
