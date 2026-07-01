namespace airsafenet_backend.DTOs.Dashboard
{
    public class ForecastAccuracyResponse
    {
        public bool HasEnoughData { get; set; }
        public string UserGroup { get; set; } = "normal";
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ComparisonStart { get; set; }
        public DateTime? ComparisonEnd { get; set; }
        public int MatchedHours { get; set; }
        public int SnapshotCount { get; set; }
        public double AccuracyScore { get; set; }
        public double Pm25Mae { get; set; }
        public double Pm25Rmse { get; set; }
        public double AqiMae { get; set; }
        public double WithinTolerancePct { get; set; }
        public double BiasPm25 { get; set; }
        public string ReliabilityLabel { get; set; } = "Đang thu thập";
        public string ReliabilityTone { get; set; } = "collecting";
        public string Trend { get; set; } = "stable";
        public string Summary { get; set; } = string.Empty;
        public string Method { get; set; } = "So sánh forecast phát hành 12-36 giờ trước với history thực tế theo từng giờ.";
        public List<ForecastAccuracyPointResponse> Points { get; set; } = new();
    }

    public class ForecastAccuracyPointResponse
    {
        public DateTime TargetTime { get; set; }
        public DateTime ForecastIssuedAt { get; set; }
        public double LeadHours { get; set; }
        public double PredictedPm25 { get; set; }
        public double ActualPm25 { get; set; }
        public double Pm25Error { get; set; }
        public int PredictedAqi { get; set; }
        public int ActualAqi { get; set; }
        public int AqiError { get; set; }
        public bool WithinTolerance { get; set; }
    }
}