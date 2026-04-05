import { http } from "./http";
import type {
  UpdateUserPreferencesRequest,
  UserPreferencesResponse,
} from "../types/preferences";

export async function getUserPreferencesApi() {
  return http<UserPreferencesResponse>("/api/userpreferences", {
    method: "GET",
    auth: true,
  });
}

export async function updateUserPreferencesApi(
  payload: UpdateUserPreferencesRequest
) {
  return http<UserPreferencesResponse>("/api/userpreferences", {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}