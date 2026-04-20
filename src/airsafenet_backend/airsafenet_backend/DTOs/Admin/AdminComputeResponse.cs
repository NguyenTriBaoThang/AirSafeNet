using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Admin
{
    public class AdminComputeResponse
    {
        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("computed_at")]
        public string? ComputedAt { get; set; }

        [JsonPropertyName("elapsed_seconds")]
        public double? ElapsedSeconds { get; set; }

        [JsonPropertyName("forecast_rows")]
        public int? ForecastRows { get; set; }

        [JsonPropertyName("history_rows")]
        public int? HistoryRows { get; set; }

        [JsonPropertyName("skipped")]
        public bool Skipped { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }
}
