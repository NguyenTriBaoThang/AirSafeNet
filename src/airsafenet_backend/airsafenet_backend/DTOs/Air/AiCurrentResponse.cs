using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Air
{
    public class AiCurrentResponse
    {
        [JsonPropertyName("pred_pm25")]
        public double PredPm25 { get; set; }

        [JsonPropertyName("pred_aqi")]
        public int PredAqi { get; set; }

        [JsonPropertyName("aqi_category")]
        public string AqiCategory { get; set; } = string.Empty;

        [JsonPropertyName("risk_profile")]
        public string RiskProfile { get; set; } = string.Empty;

        [JsonPropertyName("recommendation_profile")]
        public string RecommendationProfile { get; set; } = string.Empty;

        [JsonPropertyName("observed_pm25")]
        public double ObservedPm25 { get; set; }

        [JsonPropertyName("wind_speed")]
        public double? WindSpeed { get; set; }

        [JsonPropertyName("wind_direction")]
        public double? WindDirection { get; set; }

        [JsonPropertyName("humidity")]
        public double? Humidity { get; set; }

        [JsonPropertyName("temperature")]
        public double? Temperature { get; set; }

        [JsonPropertyName("pressure")]
        public double? Pressure { get; set; }

        [JsonPropertyName("uv_index")]
        public double? UvIndex { get; set; }

        [JsonPropertyName("cloud_cover")]
        public double? CloudCover { get; set; }
    }
}
