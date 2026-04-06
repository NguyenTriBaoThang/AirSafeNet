using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Air
{
    public class AiCurrentResponse
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;

        [JsonPropertyName("observed_pm25")]
        public double ObservedPm25 { get; set; }

        [JsonPropertyName("observed_temp")]
        public double ObservedTemp { get; set; }

        [JsonPropertyName("observed_humidity")]
        public double ObservedHumidity { get; set; }

        [JsonPropertyName("observed_wind_speed")]
        public double ObservedWindSpeed { get; set; }

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

        [JsonPropertyName("user_group")]
        public string UserGroup { get; set; } = "general";
    }
}
