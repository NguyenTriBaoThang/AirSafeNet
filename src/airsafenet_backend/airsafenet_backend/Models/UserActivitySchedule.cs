using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace airsafenet_backend.Models
{
    /// Lịch hoạt động của người dùng — dùng để tính risk score theo forecast.
    ///
    /// Ví dụ:
    ///   - "Đi làm" lúc 07:00, ngoài trời, 30 phút
    ///   - "Đón con" lúc 17:00, ngoài trời, 20 phút
    ///   - "Tập thể dục" lúc 06:00, ngoài trời, 45 phút

    public class UserActivitySchedule
    {
        public int Id { get; set; }

        [ForeignKey(nameof(User))]
        public int UserId { get; set; }

        /// Tên hoạt động, VD: "Đi làm", "Đón con", "Tập thể dục"
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// Emoji icon đại diện, VD: "🏃", "🚗", "👶"
        [MaxLength(10)]
        public string Icon { get; set; } = "📅";

        /// Giờ bắt đầu trong ngày (0-23)
        [Range(0, 23)]
        public int HourOfDay { get; set; }

        /// Phút bắt đầu (0 hoặc 30)
        [Range(0, 59)]
        public int Minute { get; set; } = 0;

        /// Thời lượng (phút), VD: 30, 45, 60
        [Range(5, 240)]
        public int DurationMinutes { get; set; } = 30;

        /// Ngoài trời hay trong nhà
        public bool IsOutdoor { get; set; } = true;

        /// Cường độ hoạt động: low | moderate | high
        [MaxLength(20)]
        public string Intensity { get; set; } = "moderate";

        /// Các ngày trong tuần: "1,2,3,4,5" = thứ 2-6, "6,7" = cuối tuần
        [MaxLength(20)]
        public string DaysOfWeek { get; set; } = "1,2,3,4,5";

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}
