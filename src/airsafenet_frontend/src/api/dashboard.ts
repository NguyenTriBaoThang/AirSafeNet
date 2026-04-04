import { http } from "./http";
import type {
  DashboardChartResponse,
  DashboardFullResponse,
  DashboardSummaryResponse,
} from "../types/dashboard";

export async function getDashboardSummaryApi() {
  return http<DashboardSummaryResponse>("/api/dashboard/summary", {
    method: "GET",
    auth: true,
  });
}

export async function getDashboardChartApi() {
  return http<DashboardChartResponse>("/api/dashboard/chart", {
    method: "GET",
    auth: true,
  });
}

export async function getDashboardFullApi() {
  return http<DashboardFullResponse>("/api/dashboard/full", {
    method: "GET",
    auth: true,
  });
}