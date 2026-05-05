---
id: api-backend
title: Backend API
sidebar_label: Backend
---

# Backend API

Base URL: `http://localhost:7276`

Swagger UI: **[http://localhost:7276/swagger](http://localhost:7276/swagger)**

All endpoints except `/api/auth/*` require `Authorization: Bearer <token>`.

## Authentication

### POST /api/auth/register
```json
{ "fullName": "Nguyen Van A", "email": "a@example.com", "password": "Passw0rd!" }
```

### POST /api/auth/login
```json
{ "email": "a@example.com", "password": "Passw0rd!" }
```
Response: `{ "token": "eyJ...", "expiresAt": "..." }`

## Activity Risk Score Formula

```
riskScore = base(AQI) × groupMultiplier × intensityMultiplier × outdoorMultiplier
```

| Factor | Values |
|--------|--------|
| `groupMultiplier` | normal=1.0, child=1.15, elderly=1.25, respiratory=1.45, pregnant=1.2 |
| `intensityMultiplier` | low=1.0, moderate=1.15, high=1.40 |
| `outdoorMultiplier` | outdoor=1.0, indoor=0.3 |
