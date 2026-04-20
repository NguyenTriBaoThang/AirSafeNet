using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Admin
{
    public class AdminCacheStatusResponse
    {
        [JsonPropertyName("cache_meta")]
        public CacheMetaInfo? CacheMeta { get; set; }

        [JsonPropertyName("compute_running")]
        public bool ComputeRunning { get; set; }

        [JsonPropertyName("files")]
        public CacheFilesInfo? Files { get; set; }

        [JsonPropertyName("scheduler")]
        public SchedulerInfo? Scheduler { get; set; }
    }

    public class CacheMetaInfo
    {
        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("computed_at")]
        public string? ComputedAt { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }

    public class CacheFilesInfo
    {
        [JsonPropertyName("forecast_csv")]
        public CacheFileDetail? ForecastCsv { get; set; }

        [JsonPropertyName("history_csv")]
        public CacheFileDetail? HistoryCsv { get; set; }

        [JsonPropertyName("current_json")]
        public CacheFileDetail? CurrentJson { get; set; }
    }

    public class CacheFileDetail
    {
        [JsonPropertyName("exists")]
        public bool Exists { get; set; }

        [JsonPropertyName("size_kb")]
        public double? SizeKb { get; set; }

        [JsonPropertyName("modified_at")]
        public string? ModifiedAt { get; set; }
    }

    public class SchedulerInfo
    {
        [JsonPropertyName("running")]
        public bool Running { get; set; }

        [JsonPropertyName("next_run")]
        public string? NextRun { get; set; }

        [JsonPropertyName("interval_minutes")]
        public int IntervalMinutes { get; set; }
    }
}
