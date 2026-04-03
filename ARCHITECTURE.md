# AirSafeNet Architecture

## 1. Overview

AirSafeNet is an AI-powered air quality early warning platform designed to support monitoring, forecasting, and communication around PM2.5 and AQI risks in Ho Chi Minh City. The system combines data ingestion, AI forecasting, backend APIs, and a web dashboard into one competition-ready prototype.

The architecture is designed around four core layers:

1. Data layer
2. AI layer
3. Application layer
4. Presentation layer

---

## 2. High-Level Architecture

```text
Open-Meteo / Open Data / Historical CSV
                |
                v
         Data Processing Layer
      (cleaning, merging, features)
                |
                v
          AI Model Training
       (Google Colab / Notebook)
                |
                v
        Export trained model (.pkl)
                |
                v
         FastAPI AI Server Layer
     (/predict, /health, /model/info)
                |
                v
       ASP.NET Core Backend API
  (/api/aqi/current, /api/aqi/forecast)
                |
                v
       React / Vite Web Dashboard
  (charts, cards, forecast, warnings)
```

---

## 3. Main Components

### 3.1 Data Sources

AirSafeNet can use one or more of the following data sources:

- Open-Meteo Air Quality API
- Open-Meteo Weather API
- Historical CSV exported from notebooks
- Official or semi-official open environmental datasets
- Future integration: local sensors / IoT devices / station feeds

Main variables:

- PM2.5
- PM10
- Carbon monoxide
- Nitrogen dioxide
- Ozone
- Sulphur dioxide
- Temperature
- Humidity
- Wind speed
- Wind direction
- Precipitation

### 3.2 AI Training Layer

The AI model is trained separately in Google Colab.

Responsibilities:

- collect historical data
- clean and merge air quality + weather data
- create lag features and time-based features
- evaluate candidate models
- export final model artifact (`model.pkl`)
- export metadata such as features, metrics, and training period

### 3.3 AI Serving Layer

The trained model is deployed through a FastAPI server.

Responsibilities:

- load model artifact
- receive prediction requests
- validate request payload
- generate PM2.5 prediction
- convert PM2.5 to AQI
- map AQI to risk level
- generate recommendation text
- return JSON for backend consumption

Suggested endpoints:

- `GET /health`
- `GET /model/info`
- `POST /predict`

### 3.4 Backend Layer

The ASP.NET Core backend acts as an orchestration and business logic layer.

Responsibilities:

- call AI server
- cache recent predictions if needed
- normalize data for frontend
- expose stable API contracts
- manage settings and future user profiles
- integrate authentication if needed later

Suggested endpoints:

- `GET /api/aqi/current`
- `GET /api/aqi/forecast`
- `POST /api/aqi/predict`

### 3.5 Frontend Layer

The React frontend is used for visualization and interaction.

Responsibilities:

- display AQI and PM2.5 cards
- show forecast charts
- show risk indicators
- provide user-group specific warnings
- support demo-friendly presentation for judges and mentors

Main screens:

- Home / Overview
- Forecast Dashboard
- Risk Alerts
- About / Project Info

---

## 4. Data Flow

### 4.1 Training Flow

```text
Raw air quality + weather data
        -> preprocessing
        -> feature engineering
        -> model training
        -> evaluation
        -> model selection
        -> export model.pkl + metadata.json
```

### 4.2 Inference Flow

```text
Frontend request
    -> ASP.NET Core backend
    -> FastAPI AI Server
    -> load model.pkl
    -> inference
    -> PM2.5 -> AQI -> risk -> recommendation
    -> backend response
    -> frontend visualization
```

---

## 5. AI Feature Design

Example feature groups:

### Time Features
- hour
- day of week
- month

### Air Quality Features
- pm2_5
- pm10
- carbon_monoxide
- nitrogen_dioxide
- ozone
- sulphur_dioxide

### Weather Features
- temperature_2m
- relative_humidity_2m
- wind_speed_10m
- wind_direction_10m
- precipitation

### Lag / Rolling Features
- pm2_5_lag_1
- pm2_5_lag_3
- pm2_5_lag_6
- pm2_5_lag_12
- pm2_5_lag_24
- pm2_5_roll_mean_3
- pm2_5_roll_mean_6
- pm2_5_roll_mean_24

---

## 6. Output Design

The AI server should return a compact JSON format such as:

```json
{
  "pm25": 42.7,
  "aqi": 118,
  "risk": "UNHEALTHY_SENSITIVE",
  "recommendation": "Sensitive groups should limit prolonged outdoor activity."
}
```

For extended forecast:

```json
{
  "hours": 24,
  "forecast": [
    {
      "forecast_time": "2026-04-04T10:00:00",
      "pred_pm25": 42.7,
      "pred_aqi": 118,
      "risk_level": "UNHEALTHY_SENSITIVE"
    }
  ]
}
```

---

## 7. Deployment Strategy

### Local Development
- AI server runs on FastAPI + Uvicorn
- backend runs on ASP.NET Core
- frontend runs on Vite

### Demo Environment
- AI server can run on a VM or local machine
- backend can proxy AI calls
- frontend can be deployed to Vercel, GitHub Pages, or local demo machine

### Future Production Direction
- containerize AI server and backend
- add scheduled data refresh
- add model version registry
- add monitoring and logging

---

## 8. Non-Functional Goals

### Reliability
- stable API contract
- graceful error handling
- fallback responses for AI unavailability

### Maintainability
- separate training and serving
- explicit versioning for models
- modular documentation

### Scalability
- easy replacement of model
- potential multi-city support later
- possible integration with IoT and maps

### Explainability
- store feature list and training metadata
- include model metrics in documentation
- keep competition presentation aligned with implementation

---

## 9. Risks and Constraints

- forecast quality depends on source data quality
- model may drift over time if environment changes
- Open APIs may have rate limits or coverage limitations
- proxy AQI conversion from PM2.5 is useful for prototype, but future work should align more closely with official reporting methodology

---

## 10. Future Enhancements

- multi-model comparison in production
- district-level heatmap
- personalized profiles
- mobile notifications
- integration with official monitoring stations
- explainable AI summaries
- scenario simulation for policy or community actions

---

## 11. Summary

AirSafeNet is intentionally structured as a modular system:

- train once in Colab
- serve predictions through FastAPI
- orchestrate through ASP.NET Core
- visualize through React

This architecture keeps the project easy to demo, easy to document, and easy to extend into a more complete clean-air digital platform.
