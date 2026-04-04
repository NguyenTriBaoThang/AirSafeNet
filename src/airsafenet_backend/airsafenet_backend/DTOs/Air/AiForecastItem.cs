using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Air
{
    public class AiForecastItem
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;

        [JsonPropertyName("pm25")]
        public double Pm25 { get; set; }

        [JsonPropertyName("aqi")]
        public int Aqi { get; set; }

        [JsonPropertyName("risk")]
        public string Risk { get; set; } = string.Empty;

        [JsonPropertyName("recommendation")]
        public string Recommendation { get; set; } = string.Empty;

        [JsonPropertyName("user_group")]
        public string UserGroup { get; set; } = "normal";
    }
}
