import { http } from "./http";
import type {
  AdminCacheStatus,
  AdminComputeResult,
  AdminDistrictStatus,
  AdminDistrictResult,
} from "../types/admin";

export async function getCacheStatusApi(): Promise<AdminCacheStatus> {
  return http<AdminCacheStatus>("/api/admin/cache/status", { method: "GET", auth: true });
}

export async function triggerComputeApi(force = true): Promise<AdminComputeResult> {
  return http<AdminComputeResult>(`/api/admin/compute?force=${force}`, { method: "POST", auth: true });
}

export async function clearCacheApi(): Promise<void> {
  return http<void>("/api/admin/cache/clear", { method: "DELETE", auth: true });
}

export async function triggerDistrictComputeApi(): Promise<AdminDistrictResult> {
  return http<AdminDistrictResult>("/api/admin/districts/compute", { method: "POST", auth: true });
}

export async function getDistrictStatusApi(): Promise<AdminDistrictStatus> {
  return http<AdminDistrictStatus>("/api/admin/districts/status", { method: "GET", auth: true });
}
