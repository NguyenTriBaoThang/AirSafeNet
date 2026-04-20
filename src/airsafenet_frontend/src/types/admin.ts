export type ComputeStatus = "ok" | "error" | "running" | "never";

export type CacheMeta = {
  status: ComputeStatus;
  computed_at: string | null;
  error: string | null;
};

export type CacheFileDetail = {
  exists: boolean;
  size_kb?: number;
  modified_at?: string;
};

export type CacheFiles = {
  forecast_csv: CacheFileDetail;
  history_csv: CacheFileDetail;
  current_json: CacheFileDetail;
};

export type SchedulerInfo = {
  running: boolean;
  next_run: string | null;
  interval_minutes: number;
};

export type AdminCacheStatus = {
  cache_meta: CacheMeta | undefined;       
  compute_running: boolean | undefined;  
  files: CacheFiles | undefined;
  scheduler: SchedulerInfo | undefined;
  model?: {
    exists: boolean;
    feature_cols_exists: boolean;
    metadata?: Record<string, unknown>;
  };
};

export type AdminComputeResult = {
  message: string;
  status: ComputeStatus;
  computed_at?: string;
  elapsed_seconds?: number;
  forecast_rows?: number;
  history_rows?: number;
  skipped?: boolean;
  error?: string;
};
