namespace airsafenet_backend.DTOs.Assistant
{
    public class CreateConversationResponse
    {
        public int ConversationId { get; set; }
        public string Title { get; set; } = "Cuộc trò chuyện mới";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
