namespace airsafenet_backend.DTOs.Air
{
    public class AiHistoryResponse
    {
        [JsonPropertyName("generated_at")]
        public string GeneratedAt { get; set; } = string.Empty;

        [JsonPropertyName("days")]
        public int Days { get; set; }

        [JsonPropertyName("hours")]
        public int Hours { get; set; }

        [JsonPropertyName("user_group")]
        public string UserGroup { get; set; } = "normal";

        [JsonPropertyName("history")]
        public List<AiHistoryItem> History { get; set; } = new();
    }
}
