namespace airsafenet_backend.DTOs.Assistant
{
    public class ConversationDetailResponse
    {
        public int ConversationId { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<ConversationMessageResponse> Messages { get; set; } = new();
    }
}
