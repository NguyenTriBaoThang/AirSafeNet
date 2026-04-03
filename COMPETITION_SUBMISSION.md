# Competition Submission Guide

## 1. Project Identity

**Project name:** AirSafeNet  
**Working title:** AirSafeNet – Ứng dụng AI và Big Data xây dựng hệ thống dự báo, cảnh báo và hỗ trợ quyết định chất lượng không khí tại TP.HCM

**Suggested category:** Giải pháp công nghệ giám sát, cảnh báo chất lượng không khí.

---

## 2. Problem Statement

Air pollution, especially PM2.5, is a serious challenge in large urban areas such as Ho Chi Minh City. Citizens usually see air quality information only after pollution levels have already worsened. This limits proactive response, especially for vulnerable groups such as children, the elderly, and people with respiratory conditions.

AirSafeNet addresses this gap by combining open environmental data, AI-based forecasting, and user-friendly digital alerts into a single prototype system.

---

## 3. Proposed Solution

AirSafeNet is an AI-powered digital platform that:

- collects and processes air quality and weather data
- predicts PM2.5 trends
- converts PM2.5 into AQI-based risk indicators
- generates health-oriented recommendations
- visualizes forecast information through a dashboard and API

The project is designed as a practical prototype that can evolve into a wider urban clean-air decision support platform.

---

## 4. Core Innovation

### 4.1 Forecasting instead of only displaying
Most simple dashboards only show current values. AirSafeNet focuses on early warning by forecasting likely short-term PM2.5 conditions.

### 4.2 Personalized warning logic
The system adapts warnings and recommendations for vulnerable groups such as children and older adults.

### 4.3 Modular architecture
Training, serving, backend orchestration, and frontend visualization are separated. This makes the system easier to maintain and extend.

### 4.4 Competition-ready prototype
The project is intentionally designed to include technical demo value, social impact framing, and expansion potential.

---

## 5. Technology Stack

### AI Layer
- Python
- Google Colab for experimentation and training
- scikit-learn model serving
- FastAPI for AI endpoints

### Backend Layer
- ASP.NET Core Web API

### Frontend Layer
- React + TypeScript + Vite

### Data Layer
- Open-Meteo air quality and weather APIs
- exported historical CSVs

### Tooling
- GitHub
- Markdown docs
- GitHub Actions (planned)

---

## 6. Prototype Scope

Current scope:

- PM2.5 prediction from trained model
- AQI conversion
- risk classification
- recommendation generation
- AI server endpoint
- competition-ready documentation

Planned extensions:

- district-level heatmap
- richer forecast charts
- scenario simulation
- integration with official and local sensor sources

---

## 7. Intended Beneficiaries

Primary beneficiaries:

- students
- families
- urban residents
- sensitive groups

Secondary beneficiaries:

- schools
- community organizations
- local authorities
- environmental communication initiatives

---

## 8. Expected Impact

### Environmental Impact
- improves visibility of air quality risks
- supports cleaner-air awareness and planning

### Social Impact
- helps users make safer daily decisions
- raises awareness among young people and communities
- supports health-sensitive communication

### Educational Impact
- demonstrates applied AI for environmental protection
- encourages student innovation in clean-air solutions

---

## 9. Feasibility

AirSafeNet is feasible because:

- it uses accessible open data
- training can be done in Google Colab
- serving can be done with lightweight Python APIs
- the system is modular and can be demoed without requiring large infrastructure

Risks remain around data quality, generalization, and long-term operational deployment, but the prototype is realistic and implementable.

---

## 10. Submission Assets Checklist

Use this checklist before submission:

- [ ] proposal PDF completed
- [ ] slide deck completed
- [ ] README updated
- [ ] architecture diagram ready
- [ ] demo script rehearsed
- [ ] model metrics documented
- [ ] screenshots prepared
- [ ] repository cleaned and organized
- [ ] `.env.example` present
- [ ] no secrets or private keys in repo

---

## 11. Suggested Demo Package

Recommended package for judges or mentors:

- README
- architecture diagram
- short demo video
- screenshots of dashboard
- API example responses
- short model explanation
- competition summary slide deck

---

## 12. Suggested 3-Minute Pitch Structure

### Minute 1
- problem of urban PM2.5
- why current information is often reactive instead of proactive

### Minute 2
- how AirSafeNet works
- AI server + dashboard + warning logic
- user-group-aware recommendations

### Minute 3
- expected impact
- feasibility
- next steps for pilot deployment or expansion

---

## 13. Suggested Long-Form Submission Structure

1. Project overview
2. Problem context
3. Gap in existing solutions
4. AirSafeNet solution
5. Technical architecture
6. AI workflow
7. Innovation points
8. Feasibility and implementation plan
9. Social and environmental impact
10. Future roadmap

---

## 14. Final Positioning Statement

AirSafeNet should be presented not only as a dashboard, but as an **AI-enabled early warning and decision-support prototype for cleaner urban air**.
