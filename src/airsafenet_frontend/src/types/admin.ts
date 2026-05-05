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

export type DistrictCacheInfo = {
  exists: boolean;
  size_kb?: number;
  modified_at?: string;
  district_count?: number;
};

export type AdminDistrictStatus = {
  running: boolean;
  cache_info: DistrictCacheInfo;
};

export type AdminDistrictResult = {
  status: "running" | "ok" | "error";
  message: string;
};

export type AnomalyXai = {
  summary:     string;
  confidence:  number;
  top_factors: Array<{
    feature:     string;
    label:       string;
    delta:       number;
    direction:   string;
    explanation: string;
    importance:  number;
  }>;
};

export type AnomalyEvent = {
  spike_pm25:     number;
  from_pm25:      number;
  to_pm25:        number;
  spike_time:     string;
  severity:       "critical" | "warning";
  aqi_after:      number;
  risk_after:     string;
  recommendation: string;
  xai?:           AnomalyXai;
  created_at:     string;
};

export type AdminAnomalyResult =
  | { detected: false }
  | { detected: true;  severity: "critical" | "warning"; anomaly: AnomalyEvent }
  | { skipped: true;   reason: string; elapsed_hours: number; detected?: false };