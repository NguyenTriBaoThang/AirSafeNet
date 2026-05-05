---
id: api
title: API Reference
sidebar_label: Overview
---

# API Reference

AirSafeNet exposes two separate APIs.

## AI Server — `http://localhost:8000`

Interactive docs: **http://localhost:8000/docs**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | ❌ | Service health + cache status |
| `GET` | `/model/info` | ❌ | Model version + metrics |
| `GET` | `/forecast/current?profile=general` | ❌ | Current PM2.5 + AQI |
| `GET` | `/forecast/range?days=7&profile=general` | ❌ | 7-day hourly forecast |
| `GET` | `/history?days=30&profile=general` | ❌ | 30-day history |
| `GET` | `/districts/current` | ❌ | 22-district AQI heatmap |
| `GET` | `/anomaly/latest` | ❌ | Latest spike detection |
| `GET` | `/anomaly/history` | ❌ | Full anomaly log |
| `POST` | `/admin/compute` | ✅ Admin key | Trigger cache recompute |

**Profile values:** `general` · `children` · `elderly` · `respiratory`

### Example Response — `/forecast/current`

```json
{
  "pred_pm25": 42.7,
  "pred_aqi": 118,
  "aqi_category": "Unhealthy for Sensitive Groups",
  "risk_profile": "UNHEALTHY_SENSITIVE",
  "recommendation_profile": "Nhóm nhạy cảm nên hạn chế hoạt động ngoài trời...",
  "observed_pm25": 38.2,
  "temperature": 32.5,
  "humidity": 78.0,
  "wind_speed": 3.2,
  "uv_index": 7.1
}
```

---

## Backend — `http://localhost:7276`

Swagger UI: **http://localhost:7276/swagger**

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login → JWT token |
| `GET` | `/api/auth/me` | Current user info |

### Air Quality
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/air/current` | Current AQI for user's group |
| `GET` | `/api/air/forecast?days=7` | 7-day forecast |
| `GET` | `/api/air/history?days=30` | 30-day history |
| `GET` | `/api/air/explain` | Weather + AI explanation |

### Activity
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/activity` | List schedules |
| `POST` | `/api/activity` | Create schedule |
| `PUT` | `/api/activity/{id}` | Update schedule |
| `DELETE` | `/api/activity/{id}` | Delete schedule |
| `GET` | `/api/activity/forecast` | Risk-scored activities for today |

### AI Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/assistant/conversations` | List conversations |
| `POST` | `/api/assistant/chat` | Send message + get response |
| `POST` | `/api/assistant/regenerate` | Regenerate last response |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/compute` | Trigger AI cache recompute |
| `GET` | `/api/admin/cache-status` | Cache metadata + scheduler |

:::note
All `/api/*` endpoints (except `/api/auth/*` and `/api/air/public/*`) require a valid JWT token in the `Authorization: Bearer <token>` header.
:::
