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

        /// "telegram" | "email" | "both"
        [MaxLength(20)]
        public string Channel { get; set; } = "email";

        /// Email đã gửi (để hiển thị + tạo link mailto)
        [MaxLength(150)]
        public string? SentToEmail { get; set; }

        /// Telegram Chat ID đã gửi
        [MaxLength(50)]
        public string? SentToTelegramChatId { get; set; }

        /// User đã đọc thông báo này chưa
        public bool IsRead { get; set; } = false;

        /// Gửi thành công không
        public bool Success { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}
