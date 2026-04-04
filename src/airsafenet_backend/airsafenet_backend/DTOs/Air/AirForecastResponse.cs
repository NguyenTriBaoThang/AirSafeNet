namespace airsafenet_backend.DTOs.Air
{
    public class AirForecastResponse
    {
        public string UserGroup { get; set; } = "normal";
        public DateTime GeneratedAt { get; set; }
        public int Hours { get; set; }
        public List<AirForecastItemResponse> Forecast { get; set; } = new();
    }
}
