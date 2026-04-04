using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.OpenMeteo
{
    public class OpenMeteoForecastResponse
    {
        [JsonPropertyName("hourly")]
        public OpenMeteoHourly? Hourly { get; set; }
    }

    public class OpenMeteoHourly
    {
        [JsonPropertyName("time")]
        public List<string> Time { get; set; } = new();

        [JsonPropertyName("pm2_5")]
        public List<double?> Pm25 { get; set; } = new();

        [JsonPropertyName("temperature_2m")]
        public List<double?> Temperature2m { get; set; } = new();

        [JsonPropertyName("relative_humidity_2m")]
        public List<double?> RelativeHumidity2m { get; set; } = new();

        [JsonPropertyName("wind_speed_10m")]
        public List<double?> WindSpeed10m { get; set; } = new();
    }
}
