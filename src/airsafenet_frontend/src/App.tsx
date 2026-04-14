import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import UserPreferencesPage from "./pages/UserPreferences";
import AssistantPage from "./pages/AssistantPage";
import AppShell from "./components/layout/AppShell";
import { getAccessToken } from "./api/http";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = getAccessToken();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
      </Routes>
    </BrowserRouter>
  );
}