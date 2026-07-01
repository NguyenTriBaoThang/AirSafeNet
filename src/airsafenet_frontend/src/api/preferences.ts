import { http } from "./http";
import type {
  FamilyProfileResponse,
  FamilyProfileRiskResponse,
  UpdateUserPreferencesRequest,
  UpsertFamilyProfileRequest,
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

export async function getFamilyProfilesApi() {
  return http<FamilyProfileResponse[]>("/api/familyprofiles", {
    method: "GET",
    auth: true,
  });
}

export async function createFamilyProfileApi(payload: UpsertFamilyProfileRequest) {
  return http<FamilyProfileResponse>("/api/familyprofiles", {
    method: "POST",
    auth: true,
    body: payload,
  });
}

export async function updateFamilyProfileApi(
  id: number,
  payload: UpsertFamilyProfileRequest
) {
  return http<FamilyProfileResponse>(`/api/familyprofiles/${id}`, {
    method: "PUT",
    auth: true,
    body: payload,
  });
}

export async function deleteFamilyProfileApi(id: number) {
  return http<void>(`/api/familyprofiles/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getFamilyProfileRiskApi(id: number, days = 1) {
  return http<FamilyProfileRiskResponse>(`/api/familyprofiles/${id}/risk?days=${days}`, {
    method: "GET",
    auth: true,
  });
}