namespace airsafenet_backend.DTOs.Dashboard
{
    public class DashboardChartResponse
    {
        public string UserGroup { get; set; } = "normal";
        public DateTime GeneratedAt { get; set; }
        public int Hours { get; set; }
        public List<DashboardChartPointResponse> Points { get; set; } = new();
    }
}
