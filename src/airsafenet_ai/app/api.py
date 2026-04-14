from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import FEATURE_COLS_PATH, METADATA_PATH, MODEL_PATH
from app.predict import (
    forecast_range_payload,
    get_current_snapshot,
    history_range_payload,
    load_metadata,
)

app = FastAPI(
    title="AirSafeNet AI Server",
    version="4.0.0",
    description="AI server bám sát logic forecast_df trong Colab",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_PROFILES = {"general", "children", "elderly", "respiratory"}


def normalize_profile(profile: str) -> str:
    p = (profile or "general").strip().lower()
    if p not in VALID_PROFILES:
        raise HTTPException(status_code=400, detail=f"profile không hợp lệ. Chọn: {sorted(VALID_PROFILES)}")
    return p


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
def forecast_current(
    profile: str = Query(default="general"),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None)
):
    try:
        return get_current_snapshot(
            user_group=normalize_profile(profile),
            latitude=lat,
            longitude=lon
        )
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


@app.get("/forecast/range")
def forecast_range(
    days: int = Query(default=1, ge=1, le=7),
    profile: str = Query(default="general"),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None)
):
    try:
        return forecast_range_payload(
            days=days,
            profile=normalize_profile(profile),
            latitude=lat,
            longitude=lon
        )
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


@app.get("/history")
def history(
    days: int = Query(default=7, ge=1, le=30),
    profile: str = Query(default="general"),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None)
):
    try:
        return history_range_payload(
            days=days,
            profile=normalize_profile(profile),
            latitude=lat,
            longitude=lon
        )
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))