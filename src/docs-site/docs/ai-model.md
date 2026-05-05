---
id: ai-model
title: AI Model
sidebar_label: AI Model
---

# AI Model & Forecasting

## Ensemble Model

Three models combined with **dynamic Inverse-MAE weighting**:

| Model | Features | Min Weight |
|-------|----------|-----------|
| **Random Forest** | Lag + rolling + weather + cyclical | 30% (floor) |
| **ARIMA** | Auto-order via AIC grid p∈[0,3] q∈[0,2] | Dynamic |
| **XGBoost Lite** | Lag 1/2/3/6/12h — trained at runtime | Dynamic |

### Weighting Formula

```
w_i = (1 / MAE_i) / Σ(1 / MAE_j)   with   w_RF ≥ 0.30

PM2.5_final = w_RF × pred_RF + w_ARIMA × pred_ARIMA + w_XGB × pred_XGB
```

Weights recompute every 60-minute cycle based on one-step-ahead MAE against the last 6 hours of actual observations.

**Delta clamping:** `MAX_HOURLY_DELTA = 12.0 µg/m³` prevents implausible step-wise jumps in multi-step iterative forecasts.

---

## Feature Engineering

| Group | Features |
|-------|---------|
| **Cyclical time** | `sin/cos(hour)`, `sin/cos(day_of_week)`, `sin/cos(month)` |
| **Lag features** | `pm25_lag_1h`, `_2h`, `_3h`, `_6h`, `_12h`, `_24h` |
| **Rolling stats** | `pm25_roll_mean_3h`, `_6h`, `_24h` |
| **Diff features** | `pm25_diff_1h`, `_3h` |
| **Weather** | `temperature`, `humidity`, `wind_speed`, `wind_direction`, `pressure`, `CO`, `NO₂` |

Total: **157 features**

---

## Training Results

Training data: **01/01/2024 → 02/04/2026** (19,752 hourly points, TPHCM)

### Cross-Validation (TimeSeriesSplit — 5 folds)

| Model | CV MAE | CV RMSE | CV R² |
|-------|--------|---------|-------|
| **ExtraTrees** | **1.167** | **2.210** | **0.9693** |
| XGBoost | 1.503 | 2.771 | 0.9533 |
| Random Forest | 1.777 | 2.957 | 0.9397 |
| Baseline (last hour) | 2.895 | 4.552 | 0.8809 |

### Test Set (3,951 points — unseen)

| Model | MAE (µg/m³) | RMSE (µg/m³) | R² |
|-------|-------------|--------------|-----|
| ExtraTrees | 0.292 | 0.564 | **0.9982** |
| XGBoost | 0.265 | 0.509 | 0.9985 |
| Random Forest | 0.283 | 0.621 | 0.9978 |

**All AI models outperform the naive baseline by 6–7× on RMSE.**

---

## Adding / Updating a Model

1. Train in Google Colab (see `src/airsafenet_ai/notebooks/`)
2. Export `model.pkl` + `metadata.json`
3. Place in `src/airsafenet_ai/models/`
4. Restart the AI server or call `POST /admin/compute`
5. Verify via `GET /health` and `GET /model/info`

See [MODEL_VERSIONING.md](https://github.com/NguyenTriBaoThang/AirSafeNet/blob/main/MODEL_VERSIONING.md) for naming conventions.

---

## Anomaly Detection

| Parameter | Value |
|-----------|-------|
| Spike threshold | +20 µg/m³ within 6-hour lookback |
| Cooldown | 2 hours between alerts |
| XAI method | Feature importance × delta → top 3 factors |
| Storage | `data/anomaly_log.json` |
| Alert trigger | POST to .NET `/api/notification/check-and-alert` |
