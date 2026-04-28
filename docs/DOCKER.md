# Docker Setup Guide

Complete guide for running AirSafeNet with Docker Compose.

## Prerequisites

- Docker Desktop ≥ 24.0
- Docker Compose ≥ 2.0

## Quick Start

```bash
cp .env.example .env
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend Swagger | http://localhost:7276/swagger |
| AI Server Docs | http://localhost:8000/docs |
| AI Health | http://localhost:8000/health |

## Services

| Container | Image | Port |
|-----------|-------|------|
| `airsafenet_frontend` | React + Nginx | 5173 |
| `airsafenet_backend` | ASP.NET Core 8 | 7276 |
| `airsafenet_ai` | FastAPI Python | 8000 |
| `airsafenet_db` | PostgreSQL 16 | internal |

## Useful Commands

```bash
# View logs
docker compose logs -f ai_server

# Restart one service
docker compose restart backend

# Rebuild after code changes
docker compose up -d --build frontend

# Stop and remove volumes
docker compose down -v

# Production with Nginx reverse proxy
docker compose --profile prod up -d
```

## Persistent Data

| Volume | Purpose |
|--------|---------|
| `postgres_data` | PostgreSQL database |
| `ai_data` | Forecast/history CSV cache |
| `ai_models` | Trained model .pkl files |
| `backend_data` | Backend file storage |

## Environment Variables

See [.env.example](../.env.example) for all required variables.

## Troubleshooting

**AI server not starting:**
```bash
docker compose logs ai_server
# Check: model.pkl exists in models/ volume
```

**Backend can't connect to DB:**
```bash
docker compose logs db
# Wait for PostgreSQL healthcheck to pass
```

**Port conflicts:**
```bash
# Change ports in docker-compose.yml:
ports:
  - "YOUR_PORT:80"   # frontend
  - "YOUR_PORT:7276" # backend
  - "YOUR_PORT:8000" # ai server
```