using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace airsafenet_backend.Models
{
    public class ChatMessage
    {
        public int Id { get; set; }

        [ForeignKey(nameof(ChatConversation))]
        public int ConversationId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "user"; // user | assistant

        [Required]
        public string Content { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? UserGroup { get; set; }

        public double? CurrentAqi { get; set; }

        public double? CurrentPm25 { get; set; }

        public int? SourceUserMessageId { get; set; }

        public int RegeneratedCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public ChatConversation? Conversation { get; set; }
    }
}
