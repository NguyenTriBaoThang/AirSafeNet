from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.predict import (
    get_current_snapshot,
    forecast_range,
    history_range,
    load_metadata,
)
from app.config import MODEL_PATH, FEATURE_COLS_PATH, METADATA_PATH

app = FastAPI(
    title="AirSafeNet AI Server",
    version="3.0.0",
    description="AI server forecast current/range/history cho AirSafeNet",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_GROUPS = {"normal", "child", "elderly", "respiratory", "pregnant"}


def validate_group(user_group: str) -> str:
    group = (user_group or "normal").strip().lower()
    if group not in VALID_GROUPS:
        raise HTTPException(status_code=400, detail="user_group không hợp lệ")
    return group


@app.get("/")
def root():
    return {
        "message": "AirSafeNet AI Server running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_exists": MODEL_PATH.exists(),
        "feature_cols_exists": FEATURE_COLS_PATH.exists(),
        "metadata_exists": METADATA_PATH.exists(),
    }


@app.get("/model/info")
def model_info():
    return load_metadata()


@app.get("/forecast/current")
def forecast_current(user_group: str = Query(default="normal")):
    try:
        return get_current_snapshot(validate_group(user_group))
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


@app.get("/forecast/range")
def forecast_days(
    days: int = Query(default=1, ge=1, le=7),
    user_group: str = Query(default="normal"),
):
    try:
        return forecast_range(days=days, user_group=validate_group(user_group))
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


@app.get("/history")
def history(
    days: int = Query(default=7, ge=1, le=30),
    user_group: str = Query(default="normal"),
):
    try:
        return history_range(days=days, user_group=validate_group(user_group))
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))