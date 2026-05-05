---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
sidebar_position: 1
---

# Getting Started

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Docker Desktop** | ≥ 24.0 | Recommended for quickest setup |
| **Docker Compose** | ≥ 2.0 | Included with Docker Desktop |
| Node.js | ≥ 18 | Only for manual frontend setup |
| .NET SDK | 8.0 | Only for manual backend setup |
| Python | 3.11 | Only for manual AI server setup |

---

## Quick Start — Docker (recommended)

```bash
# 1. Clone repository
git clone https://github.com/NguyenTriBaoThang/AirSafeNet.git
cd AirSafeNet

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start all services
docker compose up -d --build
```

Once running:

| Service | URL |
|---------|-----|
| **Web Dashboard** | http://localhost:5173 |
| **Backend Swagger** | http://localhost:7276/swagger |
| **AI Server Docs** | http://localhost:8000/docs |
| **AI Health Check** | http://localhost:8000/health |

To stop:

```bash
docker compose down
```

---

## Manual Setup

<details>
<summary>Frontend (React + Vite)</summary>

```bash
cd src/airsafenet_frontend
cp .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:7276
npm install
npm run dev
# → http://localhost:5173
```

</details>

<details>
<summary>Backend (ASP.NET Core 8)</summary>

```bash
cd src/airsafenet_backend
dotnet restore
dotnet ef database update
dotnet run
# → http://localhost:7276/swagger
```

</details>

<details>
<summary>AI Server (FastAPI Python)</summary>

```bash
cd src/airsafenet_ai
python -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\activate

pip install -r requirements.txt
# Optional — Ensemble model support:
pip install statsmodels xgboost

cp .env.example .env
uvicorn app.api:app --reload --host 0.0.0.0 --port 8000
```

Place your trained model at `src/airsafenet_ai/models/model.pkl`

</details>

---

## First Login

1. Open http://localhost:5173
2. Click **Register** and create an account
3. Go to **Preferences** → set your health group (Child, Elderly, Respiratory, Pregnant, or General)
4. Return to **Dashboard** — the system will load the latest cached forecast

:::tip
On first startup, the AI Server automatically triggers a background compute cycle. This takes 3–8 minutes. The `/health` endpoint reports `"cache_fresh": true` when ready.
:::

## Next Steps

- [Configure environment variables](./configuration)
- [Understand the architecture](./architecture)
- [Explore AI model details](./ai-model)
- [Docker & production guide](./docker)
