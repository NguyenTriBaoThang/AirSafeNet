using airsafenet_backend.DTOs.Profiles;

namespace airsafenet_backend.Services
{
    public static class UserProfileRuleService
    {
        private static readonly IReadOnlyList<UserProfileRuleResponse> Rules = new List<UserProfileRuleResponse>
        {
            new()
            {
                Id = "normal",
                Label = "Người dùng phổ thông",
                ShortLabel = "Phổ thông",
                Description = "Người trưởng thành khỏe mạnh, sinh hoạt ngoài trời mức vừa.",
                AiProfile = "general",
                RecommendedNotifyThreshold = 100,
                SensitivityMultiplier = 1.0,
                MaskRule = "KF94 khi AQI >= 100; N95/KN95 khi AQI >= 150 hoặc phải ở ngoài trời lâu.",
                OutdoorRule = "Có thể sinh hoạt bình thường khi AQI tốt; giảm thời gian ngoài trời khi AQI vượt 100.",
                AlertRule = "Cảnh báo từ AQI 100, nhấn mạnh giờ AQI thấp hơn nếu có hoạt động ngoài trời.",
                ActivityAdvice = "Ưu tiên khung giờ AQI thấp và tránh vận động mạnh khi không khí xấu.",
                MaxOutdoorGoodMinutes = 120,
                MaxOutdoorModerateMinutes = 90,
                MaxOutdoorSensitiveMinutes = 45,
                MaxOutdoorUnhealthyMinutes = 30,
                MaxOutdoorVeryUnhealthyMinutes = 15,
                KeyActions = new()
                {
                    "Đổi giờ nếu AQI > 150.",
                    "Đeo KF94/N95 khi đi đường lâu hoặc ở khu vực đông xe.",
                    "Giữ hoạt động mạnh dưới 30 phút khi AQI > 100.",
                },
            },
            new()
            {
                Id = "child_school",
                Label = "Trẻ em đi học",
                ShortLabel = "Trẻ đi học",
                Description = "Trẻ đi học, có ra chơi, thể dục hoặc di chuyển qua khu vực đông xe.",
                AiProfile = "children",
                RecommendedNotifyThreshold = 75,
                SensitivityMultiplier = 1.45,
                MaskRule = "KF94/N95 khi đi học nếu AQI >= 75; N95 khi AQI >= 120 hoặc đường đông xe.",
                OutdoorRule = "Giảm ra chơi/thể dục ngoài trời khi AQI > 75; chuyển vào trong nhà khi AQI > 120.",
                AlertRule = "Cảnh báo sớm trước giờ đi học, giờ ra chơi và hoạt động thể thao của trẻ.",
                ActivityAdvice = "Cho trẻ đi thẳng vào lớp, tránh đứng lâu ngoài cổng trường và giảm vận động ngoài trời.",
                MaxOutdoorGoodMinutes = 90,
                MaxOutdoorModerateMinutes = 45,
                MaxOutdoorSensitiveMinutes = 25,
                MaxOutdoorUnhealthyMinutes = 15,
                MaxOutdoorVeryUnhealthyMinutes = 0,
                KeyActions = new()
                {
                    "Dời thể dục/đá bóng sang khung AQI thấp hơn.",
                    "Giảm ra chơi ngoài trời còn 15-20 phút khi AQI > 100.",
                    "Nhắc trẻ mang KF94/N95 khi đi qua đường đông xe.",
                },
            },
            new()
            {
                Id = "elderly",
                Label = "Người cao tuổi",
                ShortLabel = "Cao tuổi",
                Description = "Người lớn tuổi, dễ bị ảnh hưởng tim mạch/hô hấp khi ô nhiễm tăng.",
                AiProfile = "elderly",
                RecommendedNotifyThreshold = 80,
                SensitivityMultiplier = 1.35,
                MaskRule = "KF94/N95 khi AQI >= 80; N95/KN95 khi AQI >= 120 nếu phải đi bộ/đi chợ.",
                OutdoorRule = "Ưu tiên đi bộ nhẹ ở giờ AQI thấp; tránh đứng ngoài trời lâu khi AQI > 100.",
                AlertRule = "Cảnh báo trước giờ đi bộ, đi chợ, khám bệnh hoặc lịch ra ngoài.",
                ActivityAdvice = "Đi chậm, nghỉ giữa chặng và vào trong nhà ngay nếu chóng mặt, tức ngực hoặc khó thở.",
                MaxOutdoorGoodMinutes = 60,
                MaxOutdoorModerateMinutes = 40,
                MaxOutdoorSensitiveMinutes = 25,
                MaxOutdoorUnhealthyMinutes = 15,
                MaxOutdoorVeryUnhealthyMinutes = 0,
                KeyActions = new()
                {
                    "Dời đi bộ/đi chợ sang giờ AQI thấp.",
                    "Đi cùng người thân khi AQI > 120.",
                    "Đeo KF94/N95 và giảm thời gian ngoài trời còn dưới 20 phút.",
                },
            },
            new()
            {
                Id = "asthma",
                Label = "Người có hen/suyễn",
                ShortLabel = "Hen/suyễn",
                Description = "Người có hen, suyễn hoặc bệnh hô hấp dễ kích phát bởi PM2.5.",
                AiProfile = "respiratory",
                RecommendedNotifyThreshold = 50,
                SensitivityMultiplier = 1.6,
                MaskRule = "N95/KN95 khi AQI >= 50; tránh khẩu trang lỏng khi PM2.5 tăng nhanh.",
                OutdoorRule = "Hạn chế ngoài trời từ AQI 50; tránh ra ngoài khi AQI > 100 nếu không cần thiết.",
                AlertRule = "Cảnh báo rất sớm khi PM2.5 tăng, AQI trung bình hoặc có lịch ra ngoài.",
                ActivityAdvice = "Mang thuốc theo chỉ định, theo dõi triệu chứng và dừng hoạt động khi khò khè/khó thở.",
                MaxOutdoorGoodMinutes = 45,
                MaxOutdoorModerateMinutes = 25,
                MaxOutdoorSensitiveMinutes = 15,
                MaxOutdoorUnhealthyMinutes = 0,
                MaxOutdoorVeryUnhealthyMinutes = 0,
                KeyActions = new()
                {
                    "Ở trong nhà khi PM2.5 spike trong 1-2 giờ tới.",
                    "Đeo N95/KN95 khi bắt buộc ra ngoài.",
                    "Mang thuốc theo chỉ định và giảm di chuyển còn dưới 15-25 phút.",
                },
            },
            new()
            {
                Id = "outdoor_athlete",
                Label = "Người tập thể thao ngoài trời",
                ShortLabel = "Thể thao ngoài trời",
                Description = "Người chạy bộ, đá bóng, đạp xe hoặc tập cường độ cao ngoài trời.",
                AiProfile = "general",
                RecommendedNotifyThreshold = 100,
                SensitivityMultiplier = 1.25,
                MaskRule = "N95/KF94 khi di chuyển; không tập nặng ở mức AQI buộc phải đeo khẩu trang lọc tốt.",
                OutdoorRule = "Chỉ tập nặng khi AQI tốt/trung bình thấp; giảm cường độ hoặc dời giờ khi AQI > 100.",
                AlertRule = "Cảnh báo trước khung tập, gợi ý đổi giờ và giới hạn thời lượng theo cường độ.",
                ActivityAdvice = "Dời buổi tập sang giờ AQI thấp, giữ cường độ nhẹ hoặc chuyển vào trong nhà.",
                MaxOutdoorGoodMinutes = 90,
                MaxOutdoorModerateMinutes = 60,
                MaxOutdoorSensitiveMinutes = 30,
                MaxOutdoorUnhealthyMinutes = 15,
                MaxOutdoorVeryUnhealthyMinutes = 0,
                KeyActions = new()
                {
                    "Dời chạy bộ/đá bóng sang khung AQI thấp nhất.",
                    "Giảm thời lượng còn 30 phút khi AQI > 100.",
                    "Chuyển vào trong nhà khi AQI > 150 hoặc PM2.5 spike.",
                },
            },
            new()
            {
                Id = "motorbike_commuter",
                Label = "Người đi làm bằng xe máy",
                ShortLabel = "Đi xe máy",
                Description = "Người đi học/đi làm bằng xe máy, phơi nhiễm trực tiếp với bụi đường và khí thải.",
                AiProfile = "general",
                RecommendedNotifyThreshold = 90,
                SensitivityMultiplier = 1.3,
                MaskRule = "N95/KN95 ôm kín khi AQI >= 90; thay khẩu trang nếu ẩm/bẩn sau khi đi đường dài.",
                OutdoorRule = "Giảm thời gian trên đường, chọn tuyến ít kẹt xe và tránh đứng lâu sau xe tải/xe buýt.",
                AlertRule = "Cảnh báo trước giờ commute, gợi ý dời giờ hoặc chọn tuyến ít rủi ro hơn.",
                ActivityAdvice = "Đi sớm/muộn hơn giờ cao điểm, tránh tuyến đông xe và rửa mặt sau khi đến nơi.",
                MaxOutdoorGoodMinutes = 90,
                MaxOutdoorModerateMinutes = 60,
                MaxOutdoorSensitiveMinutes = 30,
                MaxOutdoorUnhealthyMinutes = 20,
                MaxOutdoorVeryUnhealthyMinutes = 0,
                KeyActions = new()
                {
                    "Đeo N95/KN95 khi chạy xe qua trục đường đông.",
                    "Dời giờ đi làm nếu PM2.5 tăng mạnh trong 1-2 giờ.",
                    "Giữ commute ngoài trời dưới 20-30 phút khi AQI cao.",
                },
            },
            new()
            {
                Id = "pregnant",
                Label = "Phụ nữ mang thai",
                ShortLabel = "Thai phụ",
                Description = "Thai phụ cần giảm phơi nhiễm tích lũy và tránh hoạt động ngoài trời khi AQI tăng.",
                AiProfile = "children",
                RecommendedNotifyThreshold = 75,
                SensitivityMultiplier = 1.4,
                MaskRule = "KF94/N95 khi AQI >= 75; N95/KN95 khi AQI >= 120 nếu bắt buộc ra ngoài.",
                OutdoorRule = "Ưu tiên trong nhà; tránh đứng ngoài trời lâu và tránh đường đông xe.",
                AlertRule = "Cảnh báo sớm khi AQI vượt trung bình, PM2.5 spike hoặc có lịch di chuyển.",
                ActivityAdvice = "Dời lịch ra ngoài sang giờ AQI thấp, đi ngắn và nghỉ ngay nếu mệt/khó thở.",
                MaxOutdoorGoodMinutes = 60,
                MaxOutdoorModerateMinutes = 35,
                MaxOutdoorSensitiveMinutes = 20,
                MaxOutdoorUnhealthyMinutes = 10,
                MaxOutdoorVeryUnhealthyMinutes = 0,
                KeyActions = new()
                {
                    "Dời lịch khám/di chuyển sang giờ AQI thấp nếu linh hoạt.",
                    "Đeo KF94/N95 khi ra ngoài và tránh đứng chờ lâu.",
                    "Giữ hoạt động ngoài trời dưới 20 phút khi AQI > 100.",
                },
            },
        };

        private static readonly Dictionary<string, string> Aliases = new(StringComparer.OrdinalIgnoreCase)
        {
            ["children"] = "child_school",
            ["child"] = "child_school",
            ["student"] = "child_school",
            ["school_child"] = "child_school",
            ["child_school"] = "child_school",
            ["elderly"] = "elderly",
            ["respiratory"] = "asthma",
            ["asthma"] = "asthma",
            ["hen"] = "asthma",
            ["suyen"] = "asthma",
            ["outdoor_athlete"] = "outdoor_athlete",
            ["athlete"] = "outdoor_athlete",
            ["runner"] = "outdoor_athlete",
            ["motorbike_commuter"] = "motorbike_commuter",
            ["commuter"] = "motorbike_commuter",
            ["motorbike"] = "motorbike_commuter",
            ["pregnant"] = "pregnant",
            ["normal"] = "normal",
            ["general"] = "normal",
        };

        public static IReadOnlyList<UserProfileRuleResponse> GetAll() => Rules;

        public static UserProfileRuleResponse GetRule(string? userGroup)
        {
            var normalized = NormalizeGroup(userGroup);
            return Rules.FirstOrDefault(x => x.Id == normalized) ?? Rules[0];
        }

        public static string NormalizeGroup(string? userGroup)
        {
            var value = (userGroup ?? "normal").Trim().ToLowerInvariant();
            return Aliases.TryGetValue(value, out var normalized) ? normalized : "normal";
        }

        public static bool IsSensitive(string? userGroup) =>
            GetRule(userGroup).SensitivityMultiplier > 1.0;

        public static string Label(string? userGroup) => GetRule(userGroup).Label;

        public static string ShortLabel(string? userGroup) => GetRule(userGroup).ShortLabel;

        public static string ToAiProfile(string? userGroup) => GetRule(userGroup).AiProfile;

        public static int GetMaxOutdoorMinutes(string? userGroup, string risk)
        {
            var rule = GetRule(userGroup);
            return risk.ToUpperInvariant() switch
            {
                "GOOD" => rule.MaxOutdoorGoodMinutes,
                "MODERATE" => rule.MaxOutdoorModerateMinutes,
                "UNHEALTHY_SENSITIVE" => rule.MaxOutdoorSensitiveMinutes,
                "UNHEALTHY" => rule.MaxOutdoorUnhealthyMinutes,
                "VERY_UNHEALTHY" or "HAZARDOUS" => rule.MaxOutdoorVeryUnhealthyMinutes,
                _ => rule.MaxOutdoorModerateMinutes,
            };
        }
    }
}