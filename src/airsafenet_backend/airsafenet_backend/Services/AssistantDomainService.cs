namespace airsafenet_backend.Services
{
    public class AssistantDomainService
    {
        // Mở rộng keywords — bao gồm câu hỏi thực tế người dùng hay hỏi
        private static readonly string[] Keywords =
        {
            // Chỉ số không khí
            "aqi", "pm2.5", "pm25", "pm10", "bụi mịn", "bụi",
            "không khí", "ô nhiễm", "chất lượng",

            // Dự báo & thời gian
            "dự báo", "forecast", "hôm nay", "hôm qua", "ngày mai",
            "sáng nay", "chiều nay", "tối nay", "sáng mai", "chiều mai",
            "tuần này", "cuối tuần", "thứ", "giờ", "lúc",

            // Hoạt động ngoài trời
            "ra ngoài", "ngoài trời", "trong nhà", "công viên",
            "chạy bộ", "tập thể dục", "tập gym", "đạp xe", "bơi lội",
            "đi bộ", "cắm trại", "dã ngoại", "picnic",
            "đưa con", "đón con", "đưa trẻ",

            // Sức khỏe & nhóm nhạy cảm
            "sức khỏe", "trẻ em", "trẻ con", "em bé", "trẻ nhỏ",
            "người già", "người cao tuổi", "ông bà",
            "hô hấp", "hen suyễn", "hen", "phổi", "bệnh phổi",
            "tim mạch", "dị ứng", "mắt", "da",
            "mang thai", "bà bầu", "thai kỳ",

            // Biện pháp bảo vệ
            "khẩu trang", "máy lọc", "cửa sổ", "thông gió", "điều hòa",
            "bảo vệ", "phòng ngừa", "an toàn",

            // Câu hỏi chung về thời tiết liên quan
            "thời tiết", "gió", "mưa", "nắng", "nhiệt độ", "độ ẩm",
            "uv", "tia uv", "áp suất",

            // Từ khóa câu hỏi tự nhiên
            "có nên", "nên không", "được không", "ổn không", "an toàn không",
            "nguy hiểm", "rủi ro", "cảnh báo", "khuyến nghị", "khuyến cáo",
            "hiện tại", "bây giờ", "đang", "mức độ",

            // Giải thích hệ thống
            "airsafenet", "air safe", "hệ thống", "dữ liệu", "chỉ số",
            "mức", "ngưỡng", "tiêu chuẩn", "who", "epa",
        };

        public bool IsInDomain(string message)
        {
            if (string.IsNullOrWhiteSpace(message)) return false;

            var text = message.Trim().ToLowerInvariant();

            // Câu hỏi rất ngắn (≤ 10 ký tự) → cho qua, để Gemini xử lý
            if (text.Length <= 10) return true;

            return Keywords.Any(k => text.Contains(k));
        }
    }
}