import { http } from "./http";
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

export async function getForecastAirApi() {
  return http<AirForecastResponse>("/api/air/forecast", {
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