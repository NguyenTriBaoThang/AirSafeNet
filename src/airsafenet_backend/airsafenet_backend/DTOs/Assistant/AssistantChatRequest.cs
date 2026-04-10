namespace airsafenet_backend.DTOs.Assistant
{
    public class AssistantChatRequest
    {
        public int? ConversationId { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
