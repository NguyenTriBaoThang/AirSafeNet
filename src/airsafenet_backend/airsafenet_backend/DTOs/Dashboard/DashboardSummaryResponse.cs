namespace airsafenet_backend.DTOs.Dashboard
{
    public class DashboardSummaryResponse
    {
        public double Pm25 { get; set; }
        public int Aqi { get; set; }
        public string Risk { get; set; } = string.Empty;
        public string Recommendation { get; set; } = string.Empty;
        public string PreferredLocation { get; set; } = string.Empty;
        public string UserGroup { get; set; } = "normal";
        public DateTime GeneratedAt { get; set; }

        public double CurrentPm25 { get; set; }
        public int CurrentAqi { get; set; }
        public string CurrentRisk { get; set; } = string.Empty;
        public string CurrentRecommendation { get; set; } = string.Empty;

        public double MaxPm25Next24h { get; set; }
        public int MaxAqiNext24h { get; set; }
        public string PeakRiskNext24h { get; set; } = string.Empty;
        public DateTime? PeakTime { get; set; }

        public int WarningCount { get; set; }
        public int DangerCount { get; set; }
    }
}
