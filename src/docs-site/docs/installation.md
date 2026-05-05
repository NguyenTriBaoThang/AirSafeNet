---
id: installation
title: Installation
sidebar_label: Installation
---

# Installation

## Requirements

- **Docker** ≥ 24 & **Docker Compose** ≥ 2 (recommended)
- Or: Node.js ≥ 18, .NET SDK 8.0, Python 3.11

## Step 1 — Clone

```bash
git clone https://github.com/NguyenTriBaoThang/AirSafeNet.git
cd AirSafeNet
```

## Step 2 — Environment

```bash
cp .env.example .env
```

Required variables:
- `POSTGRES_PASSWORD` — any strong password
- `JWT_SECRET` — at least 32 characters
- `ADMIN_KEY` — any string
- `OPENAQ_API_KEY` — get free at [explore.openaq.org](https://explore.openaq.org/register)

Optional:
- `TELEGRAM_BOT_TOKEN` — for Telegram alerts
- `SMTP_*` — for email alerts
- `GEMINI_API_KEY` — for AI Assistant

## Step 3 — Start

```bash
docker compose up -d --build
```

First build takes 3–5 minutes. Subsequent starts: ~30 seconds.

## Step 4 — Verify

```bash
# Check all containers running
docker compose ps

# Check AI server cache
curl http://localhost:8000/health
```

Expected health response:
```json
{
  "status": "ok",
  "model_exists": true,
  "forecast_cache_exists": true,
  "compute_running": false
}
```

:::info
If `forecast_cache_exists` is `false`, the AI server is still computing its first cache. Wait 3–8 minutes and refresh.
:::

## Troubleshooting

**Backend can't connect to database:**
```bash
docker compose logs db
# Wait for "database system is ready to accept connections"
docker compose restart backend
```

**AI server import error:**
```bash
docker compose logs ai_server
# Usually a missing package — rebuild the image
docker compose up -d --build ai_server
```

**Frontend shows blank page:**
```bash
# Check VITE_API_BASE_URL in .env
docker compose logs frontend
```
