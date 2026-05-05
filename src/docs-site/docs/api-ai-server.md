---
id: api-ai-server
title: AI Server API
sidebar_label: AI Server
---

# AI Server API

Base URL: `http://localhost:8000`

Interactive docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

## Endpoints

### GET /health
Returns service status and cache metadata.

```json
{
  "status": "ok",
  "model_exists": true,
  "forecast_cache_exists": true,
  "last_compute": "2026-04-28T10:00:00+00:00",
  "cache_fresh": true,
  "compute_running": false,
  "scheduler": { "running": true, "next_run": "2026-04-28T11:00:00+00:00" }
}
```

### GET /forecast/current
Query: `?profile=general`

Returns current PM2.5, AQI, risk level, recommendation, and weather data.

### GET /forecast/range
Query: `?days=7&profile=general`

Returns hourly PM2.5 and AQI forecast for up to 7 days.

### GET /history
Query: `?days=30&profile=general`

Returns hourly historical PM2.5 data for up to 30 days.

### GET /anomaly/latest
Returns the most recent anomaly detection event if any.

### POST /admin/compute
Requires header: `X-Admin-Key: your_admin_key`

Triggers a background recompute of all cache files.
