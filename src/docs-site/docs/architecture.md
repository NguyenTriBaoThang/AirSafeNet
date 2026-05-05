---
id: architecture
title: System Architecture
sidebar_label: Architecture
---

# System Architecture

## Overview

AirSafeNet uses a **3-layer architecture** with a cache-based AI pipeline:

```
External APIs (Open-Meteo + OpenAQ)
         ↓
   AI Server — FastAPI :8000
   Ensemble Model | APScheduler 60min | Anomaly | Heatmap
         ↓  REST/JSON
   Backend — ASP.NET Core 8 :7276
   JWT Auth | Activity | Notifications | AI Assistant
         ↓  REST/JWT          ↘ PostgreSQL 16
   Frontend — React 18 :5173
   Dashboard | Activity | Heatmap | Assistant | Guide
```

---

## Core Principle: Cache-Based Architecture

The most important design decision: **the AI model never runs per-request**.

```
APScheduler
    └── run_compute() every 60 min
        ├── build_ensemble_forecast_df(days=7) → forecast_cache.csv
        ├── history_range_payload(days=30)      → history_cache.csv
        └── get_ensemble_current_snapshot()     → current_cache.json

All endpoints READ from cache → response time < 50ms
```

Benefits:
- Zero latency for users — no model inference on request
- Stable even under high traffic
- Admin can trigger manual recompute anytime via `POST /api/admin/compute`

---

## Layer 1 — AI Server (FastAPI)

| Module | File | Purpose |
|--------|------|---------|
| API routes | `app/api.py` | All FastAPI endpoints |
| Main model | `app/predict.py` | Random Forest inference |
| Ensemble | `app/ensemble_predict.py` | RF + ARIMA + XGBoost |
| Cache pipeline | `app/cache_manager.py` | 60-min compute cycle |
| Anomaly | `app/anomaly_detector.py` | Spike detection + XAI |
| Heatmap | `app/districts.py` | 22-district parallel compute |
| Scheduler | `app/scheduler.py` | APScheduler job |
| Features | `app/features.py` | Lag, rolling, cyclical |
| Data | `app/data_loader.py` | Open-Meteo + OpenAQ fetch |

## Layer 2 — Backend (ASP.NET Core 8)

| Controller | Endpoint prefix | Purpose |
|------------|-----------------|---------|
| AirController | `/api/air` | Current, forecast, history, explain |
| DashboardController | `/api/dashboard` | Summary, chart, full |
| ActivityController | `/api/activity` | CRUD + risk scoring |
| AnomalyController | `/api/anomaly` | Proxy to Python |
| NotificationController | `/api/notification` | Alert dispatch + history |
| AssistantController | `/api/assistant` | Gemini AI chat |
| AdminController | `/api/admin` | Cache trigger, status |

## Layer 3 — Frontend (React 18)

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | AQI + forecast + anomaly |
| Activity | `/activity` | Smart planner |
| Heatmap | `/heatmap` | 22-district SVG map |
| Assistant | `/assistant` | AI chat |
| Guide | `/guide` | PM2.5 education |
| Preferences | `/preferences` | Health group settings |
| Admin | `/admin` | Cache management |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `Users` | Accounts + JWT auth |
| `UserPreferences` | Health group, notification settings |
| `UserActivitySchedules` | Personal activity calendar |
| `ChatConversations` | AI assistant history |
| `ChatMessages` | Message content + metadata |
| `AlertLogs` | Notification dispatch records |
