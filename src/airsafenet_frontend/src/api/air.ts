import { http } from "./http";
import type { DashboardDays } from "../types/dashboard";
import type {
  AirForecastResponse,
  AirPredictRequest,
  AirPredictResponse,
} from "../types/air";

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

export async function getHistoryAirApi(days: number = 7) {
  return http(`/api/air/history?days=${days}`, {
    method: "GET",
    auth: true,
  });
}

export async function predictAirApi(payload: AirPredictRequest) {
  return http<AirPredictResponse>("/api/air/predict", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}