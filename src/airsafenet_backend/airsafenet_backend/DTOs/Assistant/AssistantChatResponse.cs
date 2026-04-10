namespace airsafenet_backend.DTOs.Assistant
{
    public class AssistantChatResponse
    {
        public bool InDomain { get; set; }
        public string Answer { get; set; } = string.Empty;
        public int ConversationId { get; set; }
        public object? Source { get; set; }
    }
}
