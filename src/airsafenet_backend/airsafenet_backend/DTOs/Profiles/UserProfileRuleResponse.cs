namespace airsafenet_backend.DTOs.Profiles
{
    public class UserProfileRuleResponse
    {
        public string Id { get; set; } = "normal";
        public string Label { get; set; } = "Người dùng phổ thông";
        public string ShortLabel { get; set; } = "Phổ thông";
        public string Description { get; set; } = string.Empty;
        public string AiProfile { get; set; } = "general";
        public int RecommendedNotifyThreshold { get; set; } = 100;
        public double SensitivityMultiplier { get; set; } = 1.0;
        public string MaskRule { get; set; } = string.Empty;
        public string OutdoorRule { get; set; } = string.Empty;
        public string AlertRule { get; set; } = string.Empty;
        public string ActivityAdvice { get; set; } = string.Empty;
        public int MaxOutdoorGoodMinutes { get; set; } = 120;
        public int MaxOutdoorModerateMinutes { get; set; } = 90;
        public int MaxOutdoorSensitiveMinutes { get; set; } = 45;
        public int MaxOutdoorUnhealthyMinutes { get; set; } = 30;
        public int MaxOutdoorVeryUnhealthyMinutes { get; set; } = 15;
        public List<string> KeyActions { get; set; } = new();
    }
}
