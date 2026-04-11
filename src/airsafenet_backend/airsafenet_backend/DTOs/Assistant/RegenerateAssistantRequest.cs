namespace airsafenet_backend.DTOs.Assistant
{
    public class RegenerateAssistantRequest
    {
        public int ConversationId { get; set; }
        public int AssistantMessageId { get; set; }
    }
}
