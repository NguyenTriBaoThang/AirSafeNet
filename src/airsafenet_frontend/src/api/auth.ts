import { http, setAccessToken, clearAccessToken } from "./http";
import type {
  AuthResponse,
  LoginRequest,
  MeResponse,
  RegisterRequest,
} from "../types/auth";

export async function registerApi(payload: RegisterRequest) {
  const result = await http<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setAccessToken(result.token);
  return result;
}

export async function loginApi(payload: LoginRequest) {
  const result = await http<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setAccessToken(result.token);
  return result;
}

export async function meApi() {
  return http<MeResponse>("/api/auth/me", {
    method: "GET",
    auth: true,
  });
}

export function logoutApi() {
  clearAccessToken();
}