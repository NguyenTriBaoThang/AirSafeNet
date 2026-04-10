using System.Linq;

namespace airsafenet_backend.Services
{
    public class AssistantDomainService
    {
        private static readonly string[] Keywords =
        {
            "aqi", "pm2.5", "pm25", "bụi mịn", "không khí", "ô nhiễm",
            "dự báo", "forecast", "ra ngoài", "ngoài trời", "trong nhà",
            "trẻ em", "người già", "hô hấp", "khẩu trang", "chất lượng không khí",
            "bụi", "khói", "sức khỏe", "công viên", "đá bóng", "chạy bộ"
        };

        public bool IsInDomain(string message)
        {
            if (string.IsNullOrWhiteSpace(message)) return false;

            var text = message.Trim().ToLowerInvariant();
            return Keywords.Any(k => text.Contains(k));
        }
    }
}