import { http } from "./http";
import type { AdminCacheStatus, AdminComputeResult } from "../types/admin";

export async function triggerComputeApi(force = true): Promise<AdminComputeResult> {
  return http<AdminComputeResult>(
    `/api/admin/compute?force=${force}`,
    { method: "POST", auth: true }
  );
}

export async function getCacheStatusApi(): Promise<AdminCacheStatus> {
  return http<AdminCacheStatus>(
    "/api/admin/cache/status",
    { method: "GET", auth: true }
  );
}

export async function clearCacheApi(): Promise<{ message: string; deleted_files: string[] }> {
  return http<{ message: string; deleted_files: string[] }>(
    "/api/admin/cache/clear",
    { method: "DELETE", auth: true }
  );
}
