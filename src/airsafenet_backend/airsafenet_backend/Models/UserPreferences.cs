using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace airsafenet_backend.Models
{
    public class UserPreferences
    {
        public int Id { get; set; }

        [ForeignKey(nameof(User))]
        public int UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string UserGroup { get; set; } = "normal";

        [MaxLength(150)]
        public string PreferredLocation { get; set; } = "Ho Chi Minh City";

        public bool NotifyEnabled { get; set; } = true;

        /// <summary>Kênh nhận thông báo: "none" | "telegram" | "email" | "both"</summary>
        [MaxLength(20)]
        public string NotifyChannel { get; set; } = "none";

        /// <summary>Telegram Chat ID — lấy từ @userinfobot hoặc @RawDataBot</summary>
        [MaxLength(50)]
        public string? TelegramChatId { get; set; }

        /// <summary>Email nhận cảnh báo (có thể khác email đăng nhập)</summary>
        [MaxLength(150)]
        public string? NotifyEmail { get; set; }

        /// <summary>Ngưỡng AQI trigger cảnh báo. Default 100 = UNHEALTHY_SENSITIVE.</summary>
        public int NotifyThreshold { get; set; } = 100;

        /// <summary>Thời điểm gửi cảnh báo gần nhất — tránh spam</summary>
        public DateTime? LastAlertSentAt { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}