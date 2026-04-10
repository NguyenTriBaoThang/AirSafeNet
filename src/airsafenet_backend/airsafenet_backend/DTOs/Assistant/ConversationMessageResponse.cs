namespace airsafenet_backend.DTOs.Assistant
{
    public class ConversationMessageResponse
    {
        public int MessageId { get; set; }
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? UserGroup { get; set; }
        public double? CurrentAqi { get; set; }
        public double? CurrentPm25 { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
