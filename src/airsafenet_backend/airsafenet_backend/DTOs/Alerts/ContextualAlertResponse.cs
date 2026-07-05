namespace airsafenet_backend.DTOs.Alerts
{
    public class ContextualAlertResponse
    {
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public string UserGroup { get; set; } = "normal";
        public string DataLabel { get; set; } = "forecast";
        public string PrimarySource { get; set; } = "AirSafeNet AI cache";
        public int SourceConfidence { get; set; } = 70;
        public bool IsFallback { get; set; }
        public string StatusMessage { get; set; } = string.Empty;
        public List<ContextualAlertItemResponse> Alerts { get; set; } = new();
    }

    public class ContextualAlertItemResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Severity { get; set; } = "watch";
        public string Category { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string RecommendedAction { get; set; } = string.Empty;
        public string Trigger { get; set; } = "forecast";
        public string TriggerLabel { get; set; } = "Forecast";
        public DateTime? TargetTime { get; set; }
        public DateTime? RecommendedTime { get; set; }
        public int Aqi { get; set; }
        public double Pm25 { get; set; }
        public int Confidence { get; set; }
        public string DataLabel { get; set; } = "forecast";
        public List<string> Evidence { get; set; } = new();
    }
}
