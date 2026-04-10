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

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ChatConversation? Conversation { get; set; }
    }
}
