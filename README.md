# AirSafeNet

> AI-powered air quality early warning and decision-support platform for Ho Chi Minh City.

AirSafeNet is a student innovation project that applies AI and Big Data to forecast PM2.5 trends, estimate AQI risk, and provide practical health recommendations through a web dashboard and modular API architecture.

## Project Vision

Most people only notice air pollution after it has already become harmful. AirSafeNet aims to move from passive observation to early warning by transforming environmental data into usable alerts, forecast insights, and clearer decision support.

## Key Features

- PM2.5 prediction from trained AI model
- AQI conversion and risk labeling
- Personalized recommendations for sensitive groups
- FastAPI AI server for inference
- ASP.NET Core backend for orchestration
- React dashboard for visualization
- Competition-ready documentation and demo structure

## High-Level Architecture

```text
Historical / Open Air Quality Data
            +
      Weather Data Sources
                |
                v
        Google Colab Training
                |
                v
        Export trained model
             (model.pkl)
                |
                v
          FastAPI AI Server
      (/health, /model/info, /predict)
                |
                v
        ASP.NET Core Web API
                |
                v
          React / Vite Frontend
```

## Suggested Repository Structure

```text
AirSafeNet/
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── assets/
│   ├── screenshots/
│   └── diagrams/
├── docs/
├── src/
├── ai/
├── scripts/
├── .env.example
├── .gitignore
├── ARCHITECTURE.md
├── BRANCHING.md
├── COMPETITION_SUBMISSION.md
├── CONTRIBUTING.md
├── DEMO_SCRIPT.md
├── MODEL_VERSIONING.md
├── RELEASE_TEMPLATE.md
├── SECURITY.md
├── SUPPORT.md
└── README.md
```

## Quick Start

### 1. Clone repository

```bash
git clone https://github.com/NguyenTriBaoThang/AirSafeNet.git
cd AirSafeNet
```

### 2. Configure environment

Copy `.env.example` to `.env` and adjust values if needed.

### 3. Run AI server

```bash
cd ai
pip install -r requirements.txt
uvicorn app.api:app --reload --port 8000
```

### 4. Run backend

```bash
cd src/AirSafeNet.Api
dotnet run
```

### 5. Run frontend

```bash
cd src/AirSafeNet.Web
npm install
npm run dev
```

## Documentation Index

- [Architecture](ARCHITECTURE.md)
- [Branching Strategy](BRANCHING.md)
- [Competition Submission Guide](COMPETITION_SUBMISSION.md)
- [Demo Script](DEMO_SCRIPT.md)
- [Model Versioning](MODEL_VERSIONING.md)
- [Contributing](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Support](SUPPORT.md)

## Suggested GitHub Topics

`air-quality` `aqi` `pm25` `ai` `big-data` `fastapi` `aspnet-core` `react` `environment` `hcmc`

## Project Status

This repository is structured as a competition-ready starter and documentation foundation for the AirSafeNet project. Implementation modules can be added incrementally without losing repository clarity.

## Maintainer Notes

Recommended next steps after uploading these files:

1. Add project description and topics on GitHub
2. Upload project logo and screenshots into `assets/`
3. Add actual AI server code under `ai/`
4. Add ASP.NET Core backend under `src/AirSafeNet.Api/`
5. Add React frontend under `src/AirSafeNet.Web/`
6. Create release tags for stable demo milestones
