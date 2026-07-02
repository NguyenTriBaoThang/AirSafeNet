namespace airsafenet_backend.DTOs.Dashboard
{
    public class DataSourceHealthResponse
    {
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public string OverallStatus { get; set; } = "estimated";
        public string ActiveLabel { get; set; } = "estimated";
        public int OverallConfidence { get; set; } = 60;
        public bool IsStale { get; set; }
        public string FreshnessLabel { get; set; } = "Không rõ độ mới dữ liệu";
        public string PrimarySource { get; set; } = "AirSafeNet AI cache";
        public List<DataSourceStatusResponse> Sources { get; set; } = new();
    }

    public class DataSourceStatusResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string DataLabel { get; set; } = "estimated";
        public string Status { get; set; } = "unknown";
        public DateTime? UpdatedAt { get; set; }
        public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
        public int? FreshnessMinutes { get; set; }
        public int Confidence { get; set; } = 50;
        public bool IsPrimary { get; set; }
        public bool IsFallback { get; set; }
        public bool IsConfigured { get; set; } = true;
        public string Detail { get; set; } = string.Empty;
        public string Attribution { get; set; } = string.Empty;
        public string Endpoint { get; set; } = string.Empty;
        public string NextStep { get; set; } = string.Empty;
        public List<string> Variables { get; set; } = new();
    }
}