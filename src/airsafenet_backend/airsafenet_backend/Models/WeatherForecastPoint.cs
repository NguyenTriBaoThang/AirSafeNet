namespace airsafenet_backend.Models
{
    public class WeatherForecastPoint
    {
        public DateTime Time { get; set; }
        public double Pm25 { get; set; }
        public double Temperature2m { get; set; }
        public double RelativeHumidity2m { get; set; }
        public double WindSpeed10m { get; set; }
    }
}
