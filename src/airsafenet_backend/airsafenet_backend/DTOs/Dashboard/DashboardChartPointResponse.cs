namespace airsafenet_backend.DTOs.Dashboard
{
    public class DashboardChartPointResponse
    {
        public DateTime Time { get; set; }
        public double Pm25 { get; set; }
        public int Aqi { get; set; }
        public string Risk { get; set; } = string.Empty;
        public string Recommendation { get; set; } = string.Empty;
        public string ColorKey { get; set; } = string.Empty; // green, yellow, orange, red, purple, maroon
    }
}
