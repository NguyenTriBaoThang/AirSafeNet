---
id: cache-system
title: Cache System
sidebar_label: Cache System
---

# Cache System

## How It Works

```
APScheduler (60 min)
    └── run_compute(force=False)
        ├── fetch weather + air quality data
        ├── build_ensemble_forecast_df(days=7)
        │       → src/airsafenet_ai/data/forecast_cache.csv
        ├── history_range_payload(days=30)
        │       → src/airsafenet_ai/data/history_cache.csv
        ├── get_ensemble_current_snapshot(profile)
        │       → src/airsafenet_ai/data/current_cache.json
        ├── compute_district_heatmap()
        │       → src/airsafenet_ai/data/district_cache.csv
        └── check_anomaly()
                → src/airsafenet_ai/data/anomaly_log.json
```

## Cache Freshness

The cache is considered fresh for **70 minutes** after the last compute. If stale, endpoints still return the last cached data with a `cache_stale: true` flag.

## Manual Trigger

```bash
# Via API (requires admin key)
curl -X POST http://localhost:8000/admin/compute \
  -H "X-Admin-Key: your_admin_key"

# Or via .NET backend
curl -X POST http://localhost:7276/api/admin/compute \
  -H "Authorization: Bearer your_jwt_token"
```

## Cache Files

| File | Content | Updated |
|------|---------|---------|
| `forecast_cache.csv` | 7-day hourly forecast × 4 profiles | Every 60 min |
| `history_cache.csv` | 30-day hourly history × 4 profiles | Every 60 min |
| `current_cache.json` | Current snapshot × 4 profiles | Every 60 min |
| `district_cache.csv` | 22-district current AQI | Every 60 min |
| `anomaly_log.json` | Spike detection events | Per event |
