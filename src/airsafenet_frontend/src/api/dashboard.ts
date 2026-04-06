import { http } from "./http";
import type {
  DashboardChartResponse,
  DashboardDays,
  DashboardFullResponse,
  DashboardMode,
  DashboardSummaryResponse,
} from "../types/dashboard";

function buildQuery(days: DashboardDays, mode: DashboardMode) {
  const params = new URLSearchParams({
    days: String(days),
    mode,
  });

  return `?${params.toString()}`;
}

export async function getDashboardSummaryApi(days: DashboardDays = 1) {
  return http<DashboardSummaryResponse>(`/api/dashboard/summary?days=${days}`, {
    method: "GET",
    auth: true,
  });
}

export async function getDashboardChartApi(
  days: DashboardDays = 1,
  mode: DashboardMode = "forecast"
) {
  return http<DashboardChartResponse>(
    `/api/dashboard/chart${buildQuery(days, mode)}`,
    {
      method: "GET",
      auth: true,
    }
  );
}

export async function getDashboardFullApi(
  days: DashboardDays = 1,
  mode: DashboardMode = "forecast"
) {
  return http<DashboardFullResponse>(
    `/api/dashboard/full${buildQuery(days, mode)}`,
    {
      method: "GET",
      auth: true,
    }
  );
}