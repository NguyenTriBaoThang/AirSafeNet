import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UserPreferences from "./pages/UserPreferences";
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

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/preferences"
          element={
            <PrivateRoute>
              <UserPreferences />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}