using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Air
{
    public class AiRangeResponse
    {
        [JsonPropertyName("generated_at")]
        public string GeneratedAt { get; set; } = string.Empty;

        [JsonPropertyName("days")]
        public int Days { get; set; }

        [JsonPropertyName("hours")]
        public int Hours { get; set; }

        [JsonPropertyName("profile")]
        public string Profile { get; set; } = "general";

        [JsonPropertyName("forecast")]
        public List<AiForecastItem> Forecast { get; set; } = new();
    }
}
