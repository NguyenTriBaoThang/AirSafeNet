namespace airsafenet_backend.DTOs.Air
{
    public class AirForecastItemResponse
    {
        public DateTime Time { get; set; }
        public double Pm25 { get; set; }
        public int Aqi { get; set; }
        public string Risk { get; set; } = string.Empty;
        public string Recommendation { get; set; } = string.Empty;
        public string UserGroup { get; set; } = "normal";
    }
}
