import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearCacheApi,
  getCacheStatusApi,
  triggerComputeApi,
} from "../api/admin";
import type { AdminCacheStatus, AdminComputeResult } from "../types/admin";

const POLL_INTERVAL_MS = 3000;

type UseAdminCacheResult = {
  status: AdminCacheStatus | null;
  loadingStatus: boolean;
  computing: boolean;
  lastResult: AdminComputeResult | null;
  errorMsg: string | null;
  fetchStatus: () => Promise<void>;
  triggerCompute: (force?: boolean) => Promise<void>;
  clearCache: () => Promise<void>;
};

function isRunning(data: AdminCacheStatus | null): boolean {
  if (!data) return false;

  return data.compute_running === true
    || data.cache_meta?.status === "running";
}

export function useAdminCache(): UseAdminCacheResult {
  const [status, setStatus]         = useState<AdminCacheStatus | null>(null);
  const [loadingStatus, setLoading] = useState(true);
  const [computing, setComputing]   = useState(false);
  const [lastResult, setLastResult] = useState<AdminComputeResult | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const pollRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((onDone?: (fresh: AdminCacheStatus) => void) => {
    if (pollRef.current) return; 
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await getCacheStatusApi();
        setStatus(fresh);
        if (!isRunning(fresh)) {
          stopPolling();
          setComputing(false);
          onDone?.(fresh);
        }
      } catch {
        // ignore poll errors
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  // ── fetch status ────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getCacheStatusApi();
      setStatus(data);
      setErrorMsg(null);

      if (isRunning(data)) {
        setComputing(true);
        startPolling();
      } else {
        stopPolling();
        setComputing(false);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Không tải được trạng thái cache"
      );
    } finally {
      setLoading(false);
    }
  }, [startPolling, stopPolling]);

  // ── trigger compute ─────────────────────────────────────────────────────

  const triggerCompute = useCallback(async (force = true) => {
    setComputing(true);
    setErrorMsg(null);
    setLastResult(null);

    try {
      const result = await triggerComputeApi(force);
      setLastResult(result);

      if (result.status === "running") {
        startPolling((fresh) => {
          setLastResult(prev => ({
            ...prev!,
            status: fresh?.cache_meta?.status ?? "ok",
            message:
              fresh?.cache_meta?.status === "ok"
                ? "Tính toán hoàn thành."
                : fresh?.cache_meta?.error ?? "Hoàn thành.",
          }));
        });
      } else {
        stopPolling();
        setComputing(false);
        await fetchStatus();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Compute thất bại");
      setComputing(false);
      stopPolling();
    }
  }, [fetchStatus, startPolling, stopPolling]);

  // ── clear cache ─────────────────────────────────────────────────────────

  const clearCache = useCallback(async () => {
    setErrorMsg(null);
    try {
      await clearCacheApi();
      await fetchStatus();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Xóa cache thất bại");
    }
  }, [fetchStatus]);

  // ── mount ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStatus();
    return () => stopPolling();
  }, [fetchStatus, stopPolling]);

  return {
    status,
    loadingStatus,
    computing,
    lastResult,
    errorMsg,
    fetchStatus,
    triggerCompute,
    clearCache,
  };
}
