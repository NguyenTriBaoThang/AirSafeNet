# airsafenet_ai — FastAPI AI Server

> AI inference, caching, anomaly detection and district heatmap for AirSafeNet.

Part of the [AirSafeNet](../../README.md) monorepo.

---

## Overview

This service is the brain of AirSafeNet. It loads a trained ML model, runs an **APScheduler job every 60 minutes** to recompute forecasts, writes results to CSV/JSON cache files, and exposes a REST API for the backend to consume.

All user-facing endpoints read from **pre-computed cache** — no per-request inference. This ensures sub-millisecond response times and keeps the model decoupled from request traffic.

---

## Architecture

```
APScheduler (60 min)
    └── run_compute()
        ├── build_ensemble_forecast_df(days=7)  → forecast_cache.csv
        ├── history_range_payload(days=30)       → history_cache.csv
        └── get_ensemble_current_snapshot()      → current_cache.json

FastAPI endpoints
    ├── GET /forecast/current   ← reads current_cache.json
    ├── GET /forecast/range     ← reads forecast_cache.csv
    ├── GET /history            ← reads history_cache.csv
    ├── GET /districts/current  ← reads district_cache.csv
    └── GET /anomaly/latest     ← reads anomaly_log.json
```

---

## Project Structure

```
airsafenet_ai/
├── app/
│   ├── api.py                  # FastAPI routes + lifespan
│   ├── predict.py              # Main RF model inference
│   ├── ensemble_predict.py     # Ensemble: RF + ARIMA + XGBoost
│   ├── cache_manager.py        # 60-min cache pipeline
│   ├── anomaly_detector.py     # Spike detection + XAI
│   ├── districts.py            # 22-district parallel heatmap
│   ├── scheduler.py            # APScheduler job management
│   ├── features.py             # Feature engineering (lag, rolling, cyclical)
│   ├── data_loader.py          # Open-Meteo + OpenAQ data fetch
│   ├── aqi.py                  # EPA PM2.5 → AQI breakpoints
│   ├── profiles.py             # Risk profiles (Vietnamese recommendations)
│   └── config.py               # Constants (LAT, LON, paths)
├── models/                     # Trained model artifacts (.pkl)
├── data/                       # Runtime cache (CSV / JSON)
├── notebooks/                  # Google Colab training notebooks
├── Dockerfile
└── requirements.txt
```

---

## API Endpoints

Base URL: `http://localhost:8000`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ❌ | Service info |
| `GET` | `/health` | ❌ | Health + cache status |
| `GET` | `/model/info` | ❌ | Model metadata |
| `GET` | `/forecast/current` | ❌ | Current PM2.5 + AQI (cached) |
| `GET` | `/forecast/range` | ❌ | Forecast (days=1–7, profile) |
| `GET` | `/history` | ❌ | History (days=1–30, profile) |
| `GET` | `/districts/current` | ❌ | 22-district AQI heatmap |
| `GET` | `/anomaly/latest` | ❌ | Latest spike detection result |
| `GET` | `/anomaly/history` | ❌ | Full anomaly log |
| `GET` | `/anomaly/check` | ❌ | Run anomaly check on demand |
| `POST` | `/admin/compute` | ✅ Admin | Trigger cache recompute |

> Interactive docs: `http://localhost:8000/docs`

### Query Parameters

**`/forecast/range`**
```
days=1    # 1-7 days of hourly forecast
profile=general    # general | children | elderly | respiratory
```

**`/history`**
```
days=7    # 1-30 days of hourly history
profile=general
```

### Example Responses

**`GET /forecast/current?profile=general`**
```json
{
  "pred_pm25": 42.7,
  "pred_aqi": 118,
  "aqi_category": "Unhealthy for Sensitive Groups",
  "risk_profile": "UNHEALTHY_SENSITIVE",
  "recommendation_profile": "Nhóm nhạy cảm nên hạn chế hoạt động ngoài trời...",
  "observed_pm25": 38.2,
  "temperature": 32.5,
  "humidity": 78.0,
  "wind_speed": 3.2,
  "uv_index": 7.1
}
```

**`GET /health`**
```json
{
  "status": "ok",
  "model_exists": true,
  "forecast_cache_exists": true,
  "last_compute": "2026-04-28T10:00:00+00:00",
  "last_compute_status": "ok",
  "compute_running": false,
  "scheduler": { "running": true, "next_run": "2026-04-28T11:00:00+00:00" }
}
```

---

## Ensemble Model

Three models combined with **dynamic inverse-MAE weighting**:

| Model | Description | Min weight |
|-------|-------------|-----------|
| **Random Forest** | Main model, feature-rich | 30% (floor) |
| **ARIMA** | Auto-order time-series (AIC grid) | Dynamic |
| **XGBoost Lite** | Lag-only, trained at runtime | Dynamic |

Weights are recomputed every 60-minute cycle based on one-step-ahead MAE against the last 6 hours of observations.

**Install optional ensemble deps:**
```bash
pip install statsmodels xgboost
```

If not installed → graceful fallback to main model only, no errors.

---

## Anomaly Detection

- **SPIKE_THRESHOLD**: 20 µg/m³ increase within 6 hours
- **LOOKBACK**: 6 hours of history
- **COOLDOWN**: 2 hours between alerts
- **XAI**: Feature importance × delta → top contributing factors

Anomaly events are stored in `data/anomaly_log.json` and trigger an alert via `.NET /api/notification/check-and-alert`.

---

## Local Development

### 1. Create virtual environment

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt

# Optional: Ensemble model support
pip install statsmodels xgboost
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit OPENAQ_API_KEY and ADMIN_API_KEY
```

### 4. Add model file

Place your trained model at:
```
models/model.pkl
models/metadata.json     # optional but recommended
```

### 5. Run server

```bash
uvicorn app.api:app --reload --host 0.0.0.0 --port 8000
```

On first start, if no cache exists, the server automatically triggers a background compute. This takes **3–8 minutes** depending on your machine.

---

## Docker

```bash
# From repo root
docker compose up -d ai_server

# View logs
docker compose logs -f ai_server
```

Model and data are persisted in Docker volumes:
- `ai_models` → `/app/models`
- `ai_data` → `/app/data`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAQ_API_KEY` | ✅ | — | OpenAQ API key |
| `ADMIN_API_KEY` | ✅ | — | Admin endpoint protection |
| `BACKEND_BASE_URL` | ❌ | `https://localhost:7276` | .NET backend URL for alert push |
| `INTERNAL_KEY` | ❌ | — | Internal request auth key |

---

## Adding / Updating a Model

1. Train in Google Colab (see `notebooks/`)
2. Export `model.pkl` + `metadata.json`
3. Place in `models/`
4. Restart the server or call `POST /admin/compute`
5. Check `/model/info` to verify

See [MODEL_VERSIONING.md](../../MODEL_VERSIONING.md) for versioning conventions.

---

## Dependencies

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
scikit-learn==1.6.1
pandas==2.2.2
numpy==1.26.4
joblib==1.4.2
requests==2.32.3

# Optional (Ensemble)
statsmodels
xgboost
```
