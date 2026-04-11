namespace airsafenet_backend.DTOs.Assistant
{
    public class RegenerateAssistantResponse
    {
        public int ConversationId { get; set; }
        public int AssistantMessageId { get; set; }
        public string Answer { get; set; } = string.Empty;
        public object? Source { get; set; }
        public int RegeneratedCount { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
