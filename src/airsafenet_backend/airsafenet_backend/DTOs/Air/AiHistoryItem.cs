using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Air
{
    public class AiHistoryItem
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;

        [JsonPropertyName("pm25")]
        public double Pm25 { get; set; }

        [JsonPropertyName("aqi")]
        public int Aqi { get; set; }

        [JsonPropertyName("aqi_category")]
        public string AqiCategory { get; set; } = string.Empty;

        [JsonPropertyName("risk_profile")]
        public string RiskProfile { get; set; } = string.Empty;

        [JsonPropertyName("recommendation_profile")]
        public string RecommendationProfile { get; set; } = string.Empty;

        [JsonPropertyName("profile")]
        public string Profile { get; set; } = "general";
    }
}
