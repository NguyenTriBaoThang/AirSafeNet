---
id: configuration
title: Configuration
sidebar_label: Configuration
---

# Configuration

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# ── Database ──────────────────────────────
POSTGRES_USER=airsafenet
POSTGRES_PASSWORD=your_strong_password

# ── JWT Auth ──────────────────────────────
JWT_SECRET=your_min_32_char_secret_key

# ── Admin key ─────────────────────────────
ADMIN_KEY=your_admin_key

# ── External APIs ─────────────────────────
OPENAQ_API_KEY=your_openaq_key
# Open-Meteo: Free, no key needed

# ── Notifications ─────────────────────────
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password

# ── Frontend ──────────────────────────────
VITE_API_BASE_URL=http://localhost:7276
```

## Health Groups

| Value | Description |
|-------|-------------|
| `normal` | General population |
| `child` | Children (higher breathing rate) |
| `elderly` | Elderly (reduced lung function) |
| `respiratory` | Asthma, COPD, bronchitis |
| `pregnant` | Pregnant women |

## Notification Thresholds

Users can set their personal AQI alert threshold (0–500) in Preferences. The system sends alerts when PM2.5-derived AQI exceeds this value.

Default threshold: **100** (Unhealthy for Sensitive Groups)

## AI Server Config

Key constants in `src/airsafenet_ai/app/config.py`:

```python
LAT = 10.8231          # Ho Chi Minh City latitude
LON = 106.6297         # Ho Chi Minh City longitude
HISTORY_HOURS = 72     # Hours of history used for prediction
```

To deploy for another city, change `LAT` and `LON` — the model adapts automatically.
