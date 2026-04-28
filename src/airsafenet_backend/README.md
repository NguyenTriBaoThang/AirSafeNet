# airsafenet_backend — ASP.NET Core 8 Web API

> Backend orchestration layer for AirSafeNet — JWT auth, business logic, and AI server proxy.

Part of the [AirSafeNet](../../README.md) monorepo.

---

## Overview

The backend sits between the React frontend and the FastAPI AI server. It handles authentication, user data, activity scheduling, notification dispatch, and AI assistant conversations. All air quality data is served from the AI server's pre-computed cache via the `AiCachedService`.

---

## Project Structure

```
airsafenet_backend/
├── Controllers/
│   ├── AirController.cs          # /api/air — current, forecast, history, explain
│   ├── DashboardController.cs    # /api/dashboard — summary, chart, full
│   ├── ActivityController.cs     # /api/activity — CRUD + risk scoring
│   ├── AnomalyController.cs      # /api/anomaly — proxy to Python anomaly endpoints
│   ├── AdminController.cs        # /api/admin — compute trigger, cache status
│   ├── NotificationController.cs # /api/notification — alert dispatch + history
│   └── AssistantController.cs    # /api/assistant — AI chat conversations
├── Data/
│   ├── AppDbContext.cs           # EF Core DbContext
│   └── Migrations/               # EF migration files
├── DTOs/
│   ├── Air/                      # AirPredictResponse, AiForecastItem, etc.
│   ├── Dashboard/                # DashboardSummaryResponse, ChartPointResponse
│   ├── Notification/             # ActivityScheduleDto, AnomalyAlertRequest
│   └── Admin/                    # AdminComputeRequest, AdminCacheStatusResponse
├── Models/
│   ├── User.cs
│   ├── UserPreferences.cs
│   ├── UserActivitySchedule.cs
│   ├── ChatConversation.cs
│   ├── ChatMessage.cs
│   ├── AlertLog.cs
│   └── AirQualityLog.cs
├── Services/
│   ├── AiCachedService.cs        # Reads from AI server cache
│   ├── AirExplainService.cs      # Weather explain endpoint proxy
│   ├── AlertService.cs           # Telegram + Email dispatch
│   ├── GeminiChatService.cs      # Gemini AI assistant
│   └── OpenAiChatService.cs      # OpenAI fallback
├── Program.cs
├── appsettings.json
└── Dockerfile
```

---

## API Endpoints

Base URL: `https://localhost:7276`

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Register new account |
| `POST` | `/api/auth/login` | ❌ | Login → JWT token |
| `GET` | `/api/auth/me` | ✅ | Current user info |

### Air Quality
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/air/public/current` | ❌ | Public current AQI (no auth) |
| `GET` | `/api/air/current` | ✅ | Current AQI for user's group |
| `GET` | `/api/air/forecast?days=7` | ✅ | 7-day hourly forecast |
| `GET` | `/api/air/history?days=30` | ✅ | 30-day history |
| `GET` | `/api/air/explain` | ✅ | Weather + AI explanation |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/dashboard/summary` | ✅ | Summary card data |
| `GET` | `/api/dashboard/chart` | ✅ | Chart data points |
| `GET` | `/api/dashboard/full` | ✅ | Summary + chart combined |

### Activity Scheduling
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/activity` | ✅ | List user's activity schedules |
| `POST` | `/api/activity` | ✅ | Create new activity schedule |
| `PUT` | `/api/activity/{id}` | ✅ | Update activity schedule |
| `DELETE` | `/api/activity/{id}` | ✅ | Delete activity schedule |
| `GET` | `/api/activity/forecast` | ✅ | Risk-scored activities for today |

### Notifications & Alerts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/notification/history` | ✅ | Alert dispatch history |
| `POST` | `/api/notification/check-and-alert` | 🔑 Internal | Trigger alert dispatch |

### Anomaly
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/anomaly/latest` | ✅ | Latest anomaly detection |
| `GET` | `/api/anomaly/history` | ✅ | Anomaly log history |

### AI Assistant
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/assistant/conversations` | ✅ | List conversations |
| `POST` | `/api/assistant/conversations` | ✅ | Create conversation |
| `GET` | `/api/assistant/conversations/{id}` | ✅ | Get conversation detail |
| `DELETE` | `/api/assistant/conversations/{id}` | ✅ | Delete conversation |
| `POST` | `/api/assistant/chat` | ✅ | Send message + get response |
| `POST` | `/api/assistant/regenerate` | ✅ | Regenerate last response |
| `PUT` | `/api/assistant/conversations/{id}/pin` | ✅ | Pin/unpin conversation |
| `PUT` | `/api/assistant/conversations/{id}/rename` | ✅ | Rename conversation |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/admin/compute` | ✅ Admin | Trigger AI cache recompute |
| `GET` | `/api/admin/cache-status` | ✅ Admin | Cache metadata + scheduler status |
| `GET` | `/api/admin/districts` | ✅ Admin | Fetch district heatmap |

---

## Database Schema

### Key Tables

**Users** — Auth accounts with JWT
```
Id, FullName, Email, PasswordHash, Role, CreatedAt
```

**UserPreferences** — Per-user health settings
```
UserId, UserGroup, PreferredLocation,
NotifyEnabled, NotifyChannel, TelegramChatId, NotifyEmail, NotifyThreshold
```

**UserActivitySchedules** — Personal activity calendar
```
UserId, Name, Icon, HourOfDay, Minute, DurationMinutes,
IsOutdoor, Intensity, DaysOfWeek, IsActive
```

**ChatConversations / ChatMessages** — AI Assistant history
```
ConversationId, UserId, Title, IsPinned, MessageCount
MessageId, Role, Content, UserGroup, CurrentAqi, CurrentPm25
```

**AlertLogs** — Notification dispatch records
```
UserId, Aqi, Pm25, Risk, Message, Channel,
SentToEmail, SentToTelegramChatId, IsRead, Success
```

---

## Activity Risk Scoring

`GET /api/activity/forecast` computes a `riskScore` (0–100) per activity:

```
riskScore = base(AQI) × groupMultiplier × intensityMultiplier × outdoorMultiplier
```

| Factor | Values |
|--------|--------|
| `groupMultiplier` | normal=1.0, child=1.15, elderly=1.25, respiratory=1.45, pregnant=1.2 |
| `intensityMultiplier` | low=1.0, moderate=1.15, high=1.40 |
| `outdoorMultiplier` | outdoor=1.0, indoor=0.3 |

---

## Local Development

### Prerequisites
- .NET SDK 8.0
- PostgreSQL 16 (or SQLite for dev)

### Setup

```bash
cd src/airsafenet_backend

# Restore dependencies
dotnet restore

# Apply database migrations
dotnet ef database update

# Run with hot reload
dotnet watch run
```

Swagger UI: `https://localhost:7276/swagger`

---

## Docker

```bash
# From repo root
docker compose up -d backend
docker compose logs -f backend
```

---

## Configuration

**`appsettings.json`** — Key settings:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=db;Database=airsafenet;Username=...;Password=..."
  },
  "JwtSettings": {
    "Secret": "your_min_32_char_secret",
    "Issuer": "AirSafeNet",
    "Audience": "AirSafeNetUsers",
    "ExpiryDays": 7
  },
  "AiServer": {
    "BaseUrl": "http://ai_server:8000"
  },
  "AdminKey": "your_admin_key",
  "Gemini": {
    "ApiKey": "your_gemini_key",
    "Model": "gemini-2.5-flash"
  },
  "Telegram": {
    "BotToken": "your_telegram_bot_token"
  },
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "SmtpUser": "your@gmail.com",
    "SmtpPass": "your_app_password"
  }
}
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | ASP.NET Core 8.0 |
| ORM | Entity Framework Core 8 |
| Database | PostgreSQL 16 (prod) / SQLite (dev) |
| Auth | JWT Bearer Token |
| AI Chat | Google Gemini 2.5 Flash / OpenAI GPT |
| Notifications | Telegram Bot API + SMTP |
