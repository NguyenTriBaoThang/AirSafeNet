namespace airsafenet_backend.DTOs.Assistant
{
    public class ConversationListItemResponse
    {
        public int ConversationId { get; set; }
        public string Title { get; set; } = string.Empty;
        public bool IsPinned { get; set; }
        public bool HasUnreadAssistantMessage { get; set; }
        public string? LastMessageRole { get; set; }
        public string? LastMessagePreview { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int MessageCount { get; set; }
    }
}
