---
id: docker
title: Docker Guide
sidebar_label: Docker & Deploy
---

# Docker & Deployment

## Services

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `airsafenet_frontend` | Nginx + React | 5173 | Web dashboard |
| `airsafenet_backend` | ASP.NET Core 8 | 7276 | REST API |
| `airsafenet_ai` | Python 3.11 + FastAPI | 8000 | AI inference |
| `airsafenet_db` | PostgreSQL 16 | Internal | Database |
| `airsafenet_nginx` | Nginx Alpine | 80/443 | Reverse proxy (prod) |

## Commands

```bash
# Development (hot reload)
docker compose up -d

# Development with logs
docker compose up

# Production (with Nginx reverse proxy)
docker compose --profile prod up -d

# Production with registry images
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Rebuild after code changes
docker compose up -d --build frontend

# View logs
docker compose logs -f ai_server

# Stop + remove containers
docker compose down

# Stop + remove volumes (full reset)
docker compose down -v
```

## Persistent Volumes

| Volume | Mount | Contents |
|--------|-------|---------|
| `postgres_data` | `/var/lib/postgresql/data` | Database |
| `ai_data` | `/app/data` | Forecast/history CSV cache |
| `ai_models` | `/app/models` | Trained model .pkl files |
| `backend_data` | `/app/data` | Backend file storage |

## Development Override

`docker-compose.override.yml` is automatically loaded in development:
- Frontend: Vite dev server with hot reload on port 5173
- Backend: `dotnet watch` auto-restart
- AI Server: `uvicorn --reload` auto-restart
- Database: port 5432 exposed for pgAdmin/DBeaver

## Production Deploy

```bash
# Tag and push images
git tag v1.0.0
git push origin v1.0.0
# → GitHub Actions auto-builds and pushes to ghcr.io

# Pull and run on server
export TAG=v1.0.0
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
