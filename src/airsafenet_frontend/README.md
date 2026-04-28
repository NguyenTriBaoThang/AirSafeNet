# airsafenet_frontend — React + TypeScript + Vite

> Web dashboard for AirSafeNet — air quality visualization, activity planning, and AI assistant.

Part of the [AirSafeNet](../../README.md) monorepo.

---

## Overview

A single-page application (SPA) built with React 18 and TypeScript. The frontend communicates exclusively with the ASP.NET Core backend via a typed HTTP client with JWT Bearer authentication.

---

## Project Structure

```
airsafenet_frontend/
├── src/
│   ├── api/
│   │   ├── http.ts              # Base fetch wrapper (JWT + JSON auto-stringify)
│   │   ├── auth.ts              # register / login / me / logout
│   │   ├── air.ts               # current / forecast / history / explain
│   │   ├── dashboard.ts         # summary / chart / full (days + mode)
│   │   ├── assistant.ts         # conversations CRUD / chat / pin / rename / regenerate
│   │   └── preferences.ts       # get / update user preferences
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          # AppHeader + SidebarNav + main content
│   │   │   ├── AppHeader.tsx         # Top bar with user info + logout
│   │   │   ├── SidebarNav.tsx        # Navigation sidebar
│   │   │   └── AppFooter.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── SummaryCard.tsx           # AQI/PM2.5 summary card
│   │   │   ├── ForecastChart.tsx         # Recharts line chart (forecast/history)
│   │   │   ├── ForecastTable.tsx         # Tabular forecast data
│   │   │   ├── ForecastVsActualChart.tsx # MAE / RMSE / accuracy%
│   │   │   ├── GoldenHoursWidget.tsx     # Top-3 best activity hours
│   │   │   ├── HealthScoreWidget.tsx     # 0–100 health score
│   │   │   ├── AiExplainPanel.tsx        # Weather + AI explanation
│   │   │   ├── AlertHistoryPanel.tsx     # Notification history
│   │   │   ├── AnomalyBanner.tsx         # Real-time spike alert (polls 5 min)
│   │   │   ├── WhoComparisonChart.tsx    # PM2.5 vs WHO guidelines
│   │   │   ├── ImpactEstimateWidget.tsx  # World Bank cost model
│   │   │   ├── DashboardFilters.tsx      # 1/3/7 days + forecast/history toggle
│   │   │   ├── RiskBadge.tsx             # Colored risk level chip
│   │   │   ├── EnsembleBadge.tsx         # Ensemble model confidence
│   │   │   ├── ExposureScoreWidget.tsx   # WHO dose budget progress
│   │   │   ├── CompoundRiskPanel.tsx     # PM2.5 × weather compound risk
│   │   │   ├── SafetyStreakWidget.tsx    # Streak counter + 11 badges
│   │   │   ├── GoldenHourPicker.tsx      # 24h AQI heatmap picker
│   │   │   ├── WeeklyRiskMatrix.tsx      # Activity × day-of-week matrix
│   │   │   ├── WeeklyPlannerView.tsx     # 7×24 drag-and-drop grid
│   │   │   ├── SmartScheduleOptimizer.tsx # AI top-3 slot suggestion
│   │   │   ├── PatternInsightWidget.tsx  # 30-day pattern detection
│   │   │   ├── ExposureLogWidget.tsx     # 30-day exposure bar chart
│   │   │   ├── HealthProfilePanel.tsx    # Borg scale + mask + max outdoor
│   │   │   ├── DoseBudgetMeter.tsx       # WHO dose budget in activity modal
│   │   │   └── SpikeInterruptAlert.tsx   # Real-time spike overlay
│   │   │
│   │   ├── assistant/
│   │   │   ├── ConversationList.tsx      # Grouped: Pinned/Today/Yesterday/Older
│   │   │   ├── ConversationMenu.tsx      # Pin/rename/delete dropdown
│   │   │   ├── ChatBubble.tsx            # User/assistant message bubble
│   │   │   ├── StreamingAssistantMessage.tsx  # Typewriter effect
│   │   │   ├── AssistantMarkdown.tsx     # ReactMarkdown + syntax highlight
│   │   │   ├── MessageActions.tsx        # Copy/share/export/regenerate
│   │   │   └── MessageStatusBadges.tsx   # Updated-at + regen count
│   │   │
│   │   └── common/
│   │       ├── SectionHeader.tsx    # eyebrow / title / description / rightSlot
│   │       ├── StatusChip.tsx       # neutral/success/warning/danger/info chips
│   │       ├── Toast.tsx            # Toast notification (3s auto-dismiss)
│   │       ├── ToastProvider.tsx
│   │       ├── useToast.ts
│   │       ├── AppIcon.tsx          # Icon set for AQI/trend/alert/settings
│   │       ├── EmptyState.tsx
│   │       ├── DashboardSkeleton.tsx
│   │       └── LoadingSkeleton.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx               # Landing page with hero + features
│   │   ├── Login.tsx              # JWT login form
│   │   ├── Register.tsx           # Registration form
│   │   ├── Dashboard.tsx          # Main AQI dashboard
│   │   ├── ImpactPage.tsx         # WHO comparison + cost impact
│   │   ├── HeatmapPage.tsx        # 22-district SVG heatmap
│   │   ├── ActivityPage.tsx       # Personal activity scheduler (full-featured)
│   │   ├── GuidePage.tsx          # PM2.5 educational guide
│   │   ├── AssistantPage.tsx      # AI chat assistant
│   │   ├── UserPreferences.tsx    # Notification + health group settings
│   │   ├── PresentationPage.tsx   # 5-slide auto-cycle presentation
│   │   └── AdminPage.tsx          # Admin: cache trigger + scheduler status
│   │
│   ├── types/
│   │   ├── auth.ts                # LoginRequest, RegisterRequest, UserResponse
│   │   ├── air.ts                 # AirPredictResponse, AirForecastResponse
│   │   ├── dashboard.ts           # DashboardSummaryResponse, ChartPointResponse
│   │   ├── preferences.ts         # UserPreferencesResponse, UpdateRequest
│   │   └── assistant.ts           # ConversationListItem, ChatMessage
│   │
│   ├── styles/
│   │   └── theme.css              # Global dark theme CSS variables + utilities
│   │
│   ├── App.tsx                    # Routes + guards (PrivateRoute, AdminRoute)
│   └── main.tsx                   # React entry point
│
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
└── Dockerfile
```

---

## Routes

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | `Home` | ❌ | Landing page |
| `/login` | `Login` | ❌ | Login form |
| `/register` | `Register` | ❌ | Registration |
| `/dashboard` | `Dashboard` | ✅ | Main AQI dashboard |
| `/impact` | `ImpactPage` | ✅ | WHO + cost impact |
| `/heatmap` | `HeatmapPage` | ✅ | 22-district map |
| `/activity` | `ActivityPage` | ✅ | Activity scheduler |
| `/assistant` | `AssistantPage` | ✅ | AI chat |
| `/preferences` | `UserPreferences` | ✅ | Settings |
| `/guide` | `GuidePage` | ✅ | PM2.5 education |
| `/presentation` | `PresentationPage` | ✅ | Auto-slide (no AppShell) |
| `/admin` | `AdminPage` | ✅ Admin | Admin panel |

---

## Key Patterns

### HTTP Client (`api/http.ts`)
```typescript
// Auto-adds JWT Bearer header
// Auto JSON.stringify objects
// Throws typed errors with status code

const data = await http<ForecastResponse>('/api/air/forecast?days=7', {
  method: 'GET',
  auth: true,
});
```

### Toast Notifications
```typescript
const { showToast } = useToast();
showToast('Data refreshed', 'success');  // auto-dismiss 3s
```

### Custom Hooks
| Hook | Description |
|------|-------------|
| `useTypewriter` | Streaming text animation (speed + chunk config) |
| `useAiExplain` | Fetch + cache weather explanation |
| `useAdminCache` | Poll admin cache status every 3s |
| `usePopulationData` | World Bank API + 24h localStorage cache |

---

## Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set VITE_API_BASE_URL=https://localhost:7276

# Start dev server (hot reload)
npm run dev
```

App runs at: `http://localhost:5173`

---

## Docker

```bash
# From repo root
docker compose up -d frontend
docker compose logs -f frontend
```

Production build is served by Nginx on port 80 (mapped to 5173).

---

## Available Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm run lint       # ESLint check
npx tsc --noEmit   # TypeScript type check
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | ✅ | Backend URL (e.g. `http://localhost:7276`) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build tool | Vite 5 |
| Routing | react-router-dom v6 |
| Charts | Recharts |
| Markdown | ReactMarkdown + remark-gfm |
| Code highlighting | react-syntax-highlighter |
| HTTP client | Native fetch (custom wrapper) |
| Auth | JWT stored in `localStorage` (`airsafenet_token`) |
| Styling | Custom CSS (dark theme, CSS variables) |
