from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.predict import get_current_snapshot, forecast_next_24h, load_metadata
from app.config import MODEL_PATH, FEATURE_COLS_PATH, METADATA_PATH

app = FastAPI(
    title="AirSafeNet AI Server",
    version="2.0.0",
    description="Time-series AI server giữ nguyên model hiện tại của AirSafeNet",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_GROUPS = {"normal", "child", "elderly", "respiratory", "pregnant"}


@app.get("/")
def root():
    return {
        "message": "AirSafeNet AI Server running",
        "docs": "/docs",
        "health": "/health",
        "current": "/forecast/current?user_group=normal",
        "forecast24h": "/forecast/24h?user_group=normal",
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
def forecast_current(
    user_group: str = Query(default="normal", description="normal | child | elderly | respiratory | pregnant")
):
    group = (user_group or "normal").strip().lower()
    if group not in VALID_GROUPS:
        raise HTTPException(status_code=400, detail="user_group không hợp lệ")

    try:
        return get_current_snapshot(group)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


@app.get("/forecast/24h")
def forecast_24h(
    user_group: str = Query(default="normal", description="normal | child | elderly | respiratory | pregnant")
):
    group = (user_group or "normal").strip().lower()
    if group not in VALID_GROUPS:
        raise HTTPException(status_code=400, detail="user_group không hợp lệ")

    try:
        return forecast_next_24h(group)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))