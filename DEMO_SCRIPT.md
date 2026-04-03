# Demo Script

## 1. Demo Goal

The goal of this demo is to clearly show that AirSafeNet is more than a static dashboard. It is an AI-powered early warning prototype that can forecast PM2.5, estimate AQI risk, and communicate practical recommendations.

---

## 2. Demo Duration

Recommended duration: 3 to 5 minutes.

---

## 3. Demo Setup Checklist

Before presenting:

- AI server is running
- backend is running
- frontend is running
- sample prediction request is prepared
- screenshots available as backup
- internet connection tested if live API is needed
- fallback JSON response ready in case of server issues

---

## 4. Opening Script

Suggested opening:

> Today, most people only notice air pollution after the air has already become harmful. AirSafeNet is designed to move from passive observation to early warning, using AI to forecast PM2.5 and communicate risk in a way that people can actually use.

---

## 5. Demo Flow

### Step 1: Introduce the dashboard

Show:

- project home page or dashboard
- current PM2.5 / AQI summary card
- project identity and clean-air mission

Suggested narration:

> This dashboard is the user-facing layer of AirSafeNet. It helps users understand current and forecasted air-quality risk in a simple visual format.

### Step 2: Explain the AI architecture briefly

Show:

- architecture image or section from docs

Suggested narration:

> The model is trained in Google Colab using historical air quality and weather data. The trained model is exported and served by a FastAPI AI server, then integrated into the backend and web dashboard.

### Step 3: Trigger a prediction

Show one of the following:

- Swagger UI `/predict`
- backend route that calls the AI server
- frontend button that fetches forecast data

Suggested narration:

> When a prediction request is sent, the AI server loads the trained model, estimates PM2.5, converts it into AQI, and returns risk labels and recommendations.

### Step 4: Show response output

Highlight:

- predicted PM2.5
- AQI
- risk level
- recommendation

Suggested narration:

> The important point is not just a number. The system translates that prediction into understandable risk information and guidance for users.

### Step 5: Show sensitive-group logic

If available, compare:

- `normal`
- `child`
- `elderly`

Suggested narration:

> AirSafeNet can personalize warnings. For example, a child or older adult may receive a stricter recommendation than a general user.

### Step 6: Close with future potential

Suggested narration:

> This prototype can be extended into a district-level warning system, integrated with sensors, and used for schools, communities, or local environmental communication programs.

---

## 6. Live API Demo Example

### Request

```json
{
  "features": [35.0, 60.0, 400.0, 22.0, 15.0],
  "user_group": "child"
}
```

### Response

```json
{
  "pm25": 42.7,
  "aqi": 118,
  "risk": "UNHEALTHY_SENSITIVE",
  "recommendation": "Sensitive groups should limit prolonged outdoor activity."
}
```

Replace with your actual payload structure if your AI server uses different input.

---

## 7. Judge-Focused Emphasis Points

During demo, repeatedly connect back to these values:

- practical impact
- early warning
- user-centered communication
- feasibility
- modular technology design

---

## 8. Backup Plan

If live demo fails:

- show pre-recorded video
- show screenshots
- show sample response JSON
- explain system flow using architecture diagram

Never let the demo stop completely because of a technical issue.

---

## 9. Common Questions and Suggested Answers

### Q1. Why is this different from a normal AQI website?
Suggested answer:

> A normal AQI website often focuses on displaying current readings. AirSafeNet focuses on predictive warning, modular AI serving, and personalized recommendations.

### Q2. Is this feasible in Vietnam?
Suggested answer:

> Yes. The prototype uses accessible technologies, lightweight deployment, and open datasets, making it suitable for staged pilot development.

### Q3. Can it scale further?
Suggested answer:

> Yes. The architecture supports future integration with sensors, more locations, richer models, and community-facing interfaces.

---

## 10. Closing Statement

Suggested ending:

> AirSafeNet is our attempt to turn air-quality data into action. Instead of only showing pollution after it happens, we want to help people prepare, respond, and make safer choices earlier.
