using airsafenet_backend.DTOs.Air;
using airsafenet_backend.DTOs.Profiles;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace airsafenet_backend.Services
{
    public class AssistantIntentAction
    {
        public string Type { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string? Route { get; set; }
        public string? Prompt { get; set; }
    }

    public class AssistantIntentContext
    {
        public string Intent { get; set; } = "air_quality";
        public string ModuleName { get; set; } = "Air Quality Management";
        public int DurationMinutes { get; set; } = 30;
        public double? DoseEstimateUg { get; set; }
        public double? DoseBudgetPercent { get; set; }
        public int? MaxOutdoorMinutes { get; set; }
        public string RecommendationFocus { get; set; } = "Đưa ra khuyến nghị theo AQI/PM2.5 và nhóm sức khỏe.";
        public List<string> ModuleHints { get; set; } = new();
        public List<AssistantIntentAction> Actions { get; set; } = new();
        public string SystemInstruction { get; set; } = string.Empty;
        public string PromptContext { get; set; } = string.Empty;
    }

    public class AssistantIntentService
    {
        private const double WhoDailyDoseBudgetUg = 225.0;

        public AssistantIntentContext Build(string message, string userGroup, AiForecastItem? matchedForecast)
        {
            var normalized = Normalize(message);
            var rule = UserProfileRuleService.GetRule(userGroup);
            var intent = DetectIntent(normalized);
            var duration = DetectDurationMinutes(normalized, DefaultDuration(intent));
            var exposureMultiplier = ExposureMultiplier(intent, normalized);

            var context = new AssistantIntentContext
            {
                Intent = intent,
                ModuleName = ModuleName(intent),
                DurationMinutes = duration,
                RecommendationFocus = RecommendationFocus(intent),
                ModuleHints = ModuleHints(intent),
                Actions = BuildActions(intent, message)
            };

            if (matchedForecast != null)
            {
                var dose = matchedForecast.PredPm25 * (duration / 60.0) * exposureMultiplier * rule.SensitivityMultiplier;
                context.DoseEstimateUg = Math.Round(dose, 1);
                context.DoseBudgetPercent = Math.Round(dose / WhoDailyDoseBudgetUg * 100.0, 1);
                context.MaxOutdoorMinutes = UserProfileRuleService.GetMaxOutdoorMinutes(userGroup, matchedForecast.RiskProfile);
            }

            context.SystemInstruction = BuildSystemInstruction(context, rule);
            context.PromptContext = BuildPromptContext(context, rule, matchedForecast);
            return context;
        }

        public string BuildRuleBasedAnswer(
            string userGroup,
            AiCurrentResponse? current,
            AiForecastItem? matchedForecast,
            AssistantIntentContext intent,
            bool hasLiveData,
            DateTime nowLocal)
        {
            var rule = UserProfileRuleService.GetRule(userGroup);
            var label = rule.Label;

            if (!hasLiveData || matchedForecast == null)
            {
                return $"Mình chưa có dữ liệu real-time đủ mới nên sẽ trả lời theo rule an toàn. Với hồ sơ {label}, nếu cần ra ngoài hãy ưu tiên khung giờ ít xe, theo dõi lại dashboard sau 5-8 phút, đeo khẩu trang lọc tốt khi AQI trên ngưỡng {rule.RecommendedNotifyThreshold}, và giảm thời lượng ngoài trời còn 15-30 phút nếu thấy bụi hoặc khó thở.";
            }

            var timeText = FormatForecastTime(matchedForecast.Time);
            var riskText = RiskText(matchedForecast.RiskProfile);
            var action = ActionByRisk(intent.Intent, matchedForecast.PredAqi, matchedForecast.PredPm25, rule.MaxOutdoorModerateMinutes);
            var doseText = intent.DoseBudgetPercent.HasValue
                ? $" Dose budget dự kiến khoảng {intent.DoseBudgetPercent:0.#}% ({intent.DoseEstimateUg:0.#} µg PM2.5) cho {intent.DurationMinutes} phút."
                : string.Empty;
            var maxTimeText = intent.MaxOutdoorMinutes.HasValue
                ? $" Giới hạn ngoài trời gợi ý cho nhóm này: khoảng {intent.MaxOutdoorMinutes} phút."
                : string.Empty;

            return $"Mình đang dùng {intent.ModuleName}. Mốc liên quan là {timeText}: AQI {matchedForecast.PredAqi}, PM2.5 {matchedForecast.PredPm25:0.#} µg/m³, mức {riskText}. Với {label}, {action} {rule.MaskRule}{doseText}{maxTimeText}";
        }

        private static string DetectIntent(string text)
        {
            if (ContainsAny(text, "truong", "di hoc", "the duc", "san truong", "ra choi", "su kien", "doan hoi", "hoc sinh", "con em", "tre em", "tre nho"))
            {
                return "school_family_safety";
            }

            if (ContainsAny(text, "tu ", " den ", "tuyen duong", "duong di", "lo trinh", "route", "xe may", "xe buyt", "xe bus", "di lam", "di hoc bang", "o to", "di bo", "dap xe"))
            {
                return "commute_clean_route";
            }

            if (ContainsAny(text, "chay bo", "da bong", "tap the duc", "tap ngoai troi", "the thao", "dap xe", "di bo", "van dong"))
            {
                return "activity_simulator";
            }

            if (ContainsAny(text, "co2", "phat thai", "net zero", "netzero", "xe dap", "di chung", "giam phat thai", "xanh"))
            {
                return "net_zero_mobility";
            }

            if (ContainsAny(text, "canh bao", "nhac", "thong bao", "alert"))
            {
                return "contextual_alert";
            }

            if (ContainsAny(text, "dose", "ngan sach", "phoi nhiem", "pm2.5 trong ngay", "bao nhieu phan tram"))
            {
                return "dose_budget";
            }

            return "air_quality";
        }

        private static List<string> ModuleHints(string intent) => intent switch
        {
            "school_family_safety" => new()
            {
                "School Green Safety Mode: tổ chức, đổi giờ, chuyển trong nhà hoặc chuẩn bị khẩu trang.",
                "Family Profiles: áp rule riêng cho trẻ em, hen/suyễn, người cao tuổi, thai phụ.",
                "Dose Budget: ước tính phần trăm phơi nhiễm PM2.5 trong ngày."
            },
            "commute_clean_route" => new()
            {
                "Commute Safety Planner: so sánh rủi ro theo giờ đi học/đi làm.",
                "Clean Map: ưu tiên tuyến ít ô nhiễm và clean corridor.",
                "Net Zero Mobility: cân bằng CO2, thời gian và phơi nhiễm PM2.5."
            },
            "activity_simulator" => new()
            {
                "What-if Activity Simulator: chạy bộ, đi học, đi làm, đá bóng theo thời lượng/quận/hồ sơ.",
                "Daily Safety Briefing: gợi ý giờ nên ra ngoài và giờ nên tránh.",
                "Dose Budget: tính phần trăm ngân sách phơi nhiễm bị tiêu hao."
            },
            "net_zero_mobility" => new()
            {
                "Net Zero Mobility: so sánh xe máy, ô tô, xe buýt, đi bộ, xe đạp, đi chung xe.",
                "Cleanest Route Score: không chọn xe đạp khi AQI cao dù CO2 thấp.",
                "Impact Dashboard: ghi nhận kg CO2 avoided và phút phơi nhiễm giảm."
            },
            "contextual_alert" => new()
            {
                "Contextual Alert: cảnh báo theo lịch ra ngoài và nhóm sức khỏe.",
                "Alert Inbox: lưu lý do cảnh báo và hành động khuyến nghị.",
                "Forecast Accuracy Score: tăng độ tin cậy cho cảnh báo."
            },
            "dose_budget" => new()
            {
                "WHO Dose Budget: quy đổi PM2.5 theo thời lượng và độ nhạy sức khỏe.",
                "Family Profiles: nhân hệ số nhạy cảm theo trẻ em, hen/suyễn, thai phụ.",
                "What-if Activity Simulator: so sánh nếu làm bây giờ hoặc dời giờ."
            },
            _ => new()
            {
                "Air Quality Management: biến AQI/PM2.5 thành lời khuyên hành động.",
                "Daily Safety Briefing: giờ nên ra ngoài, giờ nên tránh, khẩu trang và dose budget.",
                "Trust & Explainability: nói rõ nguồn dữ liệu, độ tin cậy và mode forecast/realtime."
            }
        };

        private static List<AssistantIntentAction> BuildActions(string intent, string originalMessage)
        {
            var findCleanerPrompt = $"Tìm 3 khung giờ sạch hơn cho yêu cầu này: {originalMessage}";
            var routePrompt = $"So sánh tuyến đường ít ô nhiễm hơn cho yêu cầu này: {originalMessage}";
            var alertPrompt = $"Tạo cảnh báo theo ngữ cảnh cho yêu cầu này: {originalMessage}";

            var actions = new List<AssistantIntentAction>
            {
                new() { Type = "create_alert", Label = "Tạo cảnh báo", Route = "/activity", Prompt = alertPrompt },
                new() { Type = "open_map", Label = "Xem trên bản đồ", Route = "/heatmap" },
                new() { Type = "find_cleaner_time", Label = "Tìm giờ sạch hơn", Prompt = findCleanerPrompt },
                new() { Type = "compare_route", Label = "So sánh tuyến đường", Route = "/clean-map", Prompt = routePrompt }
            };

            if (intent == "school_family_safety")
            {
                actions.Insert(1, new AssistantIntentAction
                {
                    Type = "open_school_mode",
                    Label = "Mở lịch hoạt động",
                    Route = "/activity",
                    Prompt = "Mở School Green Safety Mode và kiểm tra hoạt động ngoài trời cho học sinh."
                });
            }

            if (intent == "net_zero_mobility" || intent == "commute_clean_route")
            {
                actions.Add(new AssistantIntentAction
                {
                    Type = "open_impact",
                    Label = "Xem tác động CO2",
                    Route = "/impact"
                });
            }

            return actions;
        }

        private static string BuildSystemInstruction(AssistantIntentContext context, UserProfileRuleResponse rule)
        {
            return $"""
CÁC MODULE THỰC TẾ CỦA AIRSAFENET:
- Intent đã nhận diện: {context.Intent}
- Module nên ưu tiên: {context.ModuleName}
- Hồ sơ hiện tại: {rule.Label}; ngưỡng cảnh báo gợi ý AQI {rule.RecommendedNotifyThreshold}; hệ số nhạy cảm x{rule.SensitivityMultiplier:0.##}
- Khi trả lời, hãy nối trực tiếp với module phù hợp: School/Family/Dose Budget/Commute/Clean Map/Net Zero/Alert Inbox.
- Câu trả lời phải có hành động cụ thể: dời giờ, đeo khẩu trang, giảm thời lượng, chuyển trong nhà, xem bản đồ hoặc tạo cảnh báo.
- Nếu hỏi về trẻ em đi học, thể dục, sự kiện ngoài trời: trả lời theo School Green Safety Mode + Family Profiles + Dose Budget.
- Nếu hỏi đường đi A-B hoặc phương tiện: trả lời theo Commute Safety Planner + Clean Map + Net Zero Mobility.
""";
        }

        private static string BuildPromptContext(AssistantIntentContext context, UserProfileRuleResponse rule, AiForecastItem? matchedForecast)
        {
            var doseLine = context.DoseBudgetPercent.HasValue
                ? $"Dose budget dự kiến: {context.DoseBudgetPercent:0.#}% ({context.DoseEstimateUg:0.#} µg PM2.5) cho {context.DurationMinutes} phút."
                : "Dose budget dự kiến: chưa tính được vì thiếu forecast khớp mốc giờ.";

            var maxLine = context.MaxOutdoorMinutes.HasValue
                ? $"Giới hạn ngoài trời theo rule hồ sơ: khoảng {context.MaxOutdoorMinutes} phút ở mức rủi ro này."
                : "Giới hạn ngoài trời: dùng rule thận trọng 15-30 phút nếu AQI cao.";

            var forecastLine = matchedForecast != null
                ? $"Mốc forecast dùng cho intent: {matchedForecast.Time}; AQI {matchedForecast.PredAqi}; PM2.5 {matchedForecast.PredPm25:0.#}; risk {matchedForecast.RiskProfile}."
                : "Mốc forecast dùng cho intent: chưa có dữ liệu.";

            return $"""
[NGỮ CẢNH MODULE AIRSAFENET]
Intent: {context.Intent}
Module: {context.ModuleName}
Trọng tâm khuyến nghị: {context.RecommendationFocus}
Hồ sơ: {rule.Label}
Rule khẩu trang: {rule.MaskRule}
Rule ngoài trời: {rule.OutdoorRule}
{forecastLine}
{doseLine}
{maxLine}
Module liên quan:
- {string.Join("\n- ", context.ModuleHints)}
""";
        }

        private static string RecommendationFocus(string intent) => intent switch
        {
            "school_family_safety" => "Quyết định tổ chức/đổi giờ/chuyển trong nhà cho hoạt động trường học và trẻ em.",
            "commute_clean_route" => "So sánh giờ đi, tuyến đường và phương tiện để giảm phơi nhiễm PM2.5.",
            "activity_simulator" => "Đánh giá rủi ro hoạt động ngoài trời hiện tại và đề xuất khung giờ tốt hơn.",
            "net_zero_mobility" => "Cân bằng sức khỏe với CO2 phát thải theo phương tiện.",
            "contextual_alert" => "Tạo cảnh báo có lý do và hành động cụ thể theo ngữ cảnh.",
            "dose_budget" => "Ước tính phần trăm dose budget PM2.5 bị tiêu hao.",
            _ => "Biến dữ liệu AQI/PM2.5 thành lời khuyên hành động."
        };

        private static string ModuleName(string intent) => intent switch
        {
            "school_family_safety" => "School Green Safety Mode + Family Profiles",
            "commute_clean_route" => "Commute Safety Planner + Clean Map",
            "activity_simulator" => "What-if Activity Simulator",
            "net_zero_mobility" => "Net Zero Mobility",
            "contextual_alert" => "Contextual Alert + Alert Inbox",
            "dose_budget" => "WHO Dose Budget",
            _ => "Air Quality Management"
        };

        private static int DefaultDuration(string intent) => intent switch
        {
            "school_family_safety" => 45,
            "commute_clean_route" => 35,
            "activity_simulator" => 60,
            "net_zero_mobility" => 35,
            "dose_budget" => 45,
            _ => 30
        };

        private static double ExposureMultiplier(string intent, string text)
        {
            var multiplier = intent switch
            {
                "activity_simulator" => 1.8,
                "commute_clean_route" => 1.35,
                "school_family_safety" => 1.2,
                "net_zero_mobility" => 1.1,
                _ => 1.0
            };

            if (ContainsAny(text, "chay bo", "da bong", "the thao", "cuong do cao")) multiplier += 0.35;
            if (ContainsAny(text, "xe may", "duong dong", "ket xe")) multiplier += 0.25;
            if (ContainsAny(text, "trong nha", "indoor")) multiplier *= 0.35;
            if (ContainsAny(text, "xe buyt", "xe bus", "o to")) multiplier *= 0.75;

            return Math.Clamp(multiplier, 0.3, 2.4);
        }

        private static int DetectDurationMinutes(string text, int fallback)
        {
            var match = Regex.Match(text, @"\b(\d{1,3})\s*(phut|p|min|minute|minutes)\b");
            if (!match.Success) return fallback;
            return int.TryParse(match.Groups[1].Value, out var minutes)
                ? Math.Clamp(minutes, 5, 240)
                : fallback;
        }

        private static string ActionByRisk(string intent, int aqi, double pm25, int moderateMinutes)
        {
            if (aqi >= 151 || pm25 >= 55)
            {
                return intent == "school_family_safety"
                    ? "nên chuyển hoạt động ngoài trời vào trong nhà hoặc hoãn sang giờ khác."
                    : "nên tránh hoạt động ngoài trời, dời lịch hoặc rút ngắn tối đa.";
            }

            if (aqi >= 101 || pm25 >= 35)
            {
                return intent == "activity_simulator"
                    ? "nên giảm cường độ, rút thời lượng còn khoảng 30 phút và chọn giờ sạch hơn."
                    : "nên đeo khẩu trang lọc tốt, giảm thời gian ngoài trời và tránh đường đông xe.";
            }

            if (aqi >= 76 || pm25 >= 25)
            {
                return "có thể thực hiện nhưng nên theo dõi triệu chứng, tránh vận động quá lâu và ưu tiên khung giờ AQI thấp hơn.";
            }

            return $"có thể ra ngoài tương đối ổn; vẫn nên giữ thời lượng trong khoảng {moderateMinutes} phút nếu thuộc nhóm nhạy cảm.";
        }

        private static string FormatForecastTime(string value)
        {
            return DateTime.TryParse(value, out var dt) ? dt.ToString("HH:mm dd/MM") : value;
        }

        private static string RiskText(string risk) => risk switch
        {
            "GOOD" => "tốt",
            "MODERATE" => "trung bình",
            "UNHEALTHY_SENSITIVE" => "không tốt cho nhóm nhạy cảm",
            "UNHEALTHY" => "không tốt",
            "VERY_UNHEALTHY" => "rất xấu",
            "HAZARDOUS" => "nguy hiểm",
            _ => risk
        };

        private static bool ContainsAny(string text, params string[] needles) => needles.Any(text.Contains);

        private static string Normalize(string value)
        {
            var lower = (value ?? string.Empty).Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(lower.Length);
            foreach (var c in lower)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(c);
                }
            }
            return builder.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}