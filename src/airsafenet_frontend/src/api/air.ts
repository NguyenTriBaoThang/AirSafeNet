import { http } from "./http";
import type { DashboardDays } from "../types/dashboard";
import type { AirForecastResponse, AirPredictResponse } from "../types/air";

export async function getCurrentAirApi() {
  return http<AirPredictResponse>("/api/air/current", {
    method: "GET",
    auth: true,
  });
}

export async function getForecastAirApi(days: DashboardDays = 1) {
  return http<AirForecastResponse>(`/api/air/forecast?days=${days}`, {
    method: "GET",
    auth: true,
  });
}

export async function getHistoryAirApi(days = 7) {
  return http(`/api/air/history?days=${days}`, {
    method: "GET",
    auth: true,
  });
}