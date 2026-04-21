using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace airsafenet_backend.Models
{
    public class AlertLog
    {
        public int Id { get; set; }

        [ForeignKey(nameof(User))]
        public int? UserId { get; set; }

        public int Aqi { get; set; }

        public double Pm25 { get; set; }

        [MaxLength(50)]
        public string Risk { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Message { get; set; } = string.Empty;

        /// <summary>"telegram" | "email" | "both"</summary>
        [MaxLength(20)]
        public string Channel { get; set; } = "email";

        /// <summary>Email đã gửi (để hiển thị + tạo link mailto)</summary>
        [MaxLength(150)]
        public string? SentToEmail { get; set; }

        /// <summary>Telegram Chat ID đã gửi</summary>
        [MaxLength(50)]
        public string? SentToTelegramChatId { get; set; }

        /// <summary>User đã đọc thông báo này chưa</summary>
        public bool IsRead { get; set; } = false;

        /// <summary>Gửi thành công không</summary>
        public bool Success { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}
