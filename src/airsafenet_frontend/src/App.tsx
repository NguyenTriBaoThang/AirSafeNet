import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import React from "react";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ImpactPage from "./pages/ImpactPage";
import HeatmapPage from "./pages/HeatmapPage";
import PresentationPage from "./pages/PresentationPage";
import UserPreferencesPage from "./pages/UserPreferences";
import AssistantPage from "./pages/AssistantPage";
import AdminPage from "./pages/AdminPage";
import ActivityPage from "./pages/ActivityPage";
import GuidePage from "./pages/GuidePage";

import AppShell from "./components/layout/AppShell";
import { getAccessToken } from "./api/http";

// ── Types ────────────────────────────────────────────────────────────────

type JwtPayload = {
  exp?: number;
  role?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Payload = token.split(".")[1];
    const decoded = atob(base64Payload);
    const data: unknown = JSON.parse(decoded);

    if (typeof data === "object" && data !== null) {
      return data as JwtPayload;
    }

    return null;
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
}

function getRoleFromToken(token: string): string | null {
  const payload = parseJwt(token);
  if (!payload) return null;

  return (
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
    payload.role ??
    null
  );
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;

  return payload.exp * 1000 < Date.now();
}

// ── Route Guards ─────────────────────────────────────────────────────────

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = getAccessToken();

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = getAccessToken();

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />;
  }

  const role = getRoleFromToken(token);

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "Admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── App ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Private */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AppShell>
                <Dashboard />
              </AppShell>
            </PrivateRoute>
          }
        />

        <Route 
          path="/impact" 
          element={
            <PrivateRoute>
              <AppShell>
                <ImpactPage />
              </AppShell>
            </PrivateRoute>
          } 
        />

        <Route 
          path="/heatmap" 
          element={
            <PrivateRoute>
              <AppShell>
                <HeatmapPage />
              </AppShell>
            </PrivateRoute>
          } 
        />

        <Route 
          path="/presentation" 
          element={
            <PrivateRoute>
              <PresentationPage />
            </PrivateRoute>
          } 
        />

        <Route
          path="/preferences"
          element={
            <PrivateRoute>
              <AppShell>
                <UserPreferencesPage />
              </AppShell>
            </PrivateRoute>
          }
        />

        <Route
          path="/assistant"
          element={
            <PrivateRoute>
              <AppShell>
                <AssistantPage />
              </AppShell>
            </PrivateRoute>
          }
        />

        <Route
          path="/activity"
          element={
            <PrivateRoute>
              <AppShell>
                <ActivityPage />
              </AppShell>
            </PrivateRoute>
          }
        />

        <Route
          path="/guide"
          element={
            <PrivateRoute>
              <AppShell>
                <GuidePage />
              </AppShell>
            </PrivateRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AppShell>
                <AdminPage />
              </AppShell>
            </AdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}