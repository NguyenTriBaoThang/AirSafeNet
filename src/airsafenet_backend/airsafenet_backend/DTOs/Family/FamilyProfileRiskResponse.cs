namespace airsafenet_backend.DTOs.Family
{
    public class FamilyProfileRiskResponse
    {
        public FamilyProfileResponse Profile { get; set; } = new();
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
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}
