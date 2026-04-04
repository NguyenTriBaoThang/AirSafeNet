namespace airsafenet_backend.DTOs.Dashboard
{
    public class DashboardFullResponse
    {
        public DashboardSummaryResponse Summary { get; set; } = new();
        public DashboardChartResponse Chart { get; set; } = new();
    }
}
