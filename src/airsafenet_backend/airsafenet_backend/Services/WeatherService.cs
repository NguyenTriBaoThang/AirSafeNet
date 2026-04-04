using airsafenet_backend.DTOs.OpenMeteo;
using airsafenet_backend.Models;
using System.Net.Http.Json;
using System.Text.Json;

namespace airsafenet_backend.Services
{
    public class WeatherService
    {
        private readonly HttpClient _httpClient;

        public WeatherService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<Dictionary<string, double>> GetCurrentAsync()
        {
            var lat = 10.8231;
            var lon = 106.6297;

            var airUrl =
                $"https://air-quality-api.open-meteo.com/v1/air-quality" +
                $"?latitude={lat}&longitude={lon}" +
                $"&current=pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone" +
                $"&timezone=Asia%2FBangkok";

            var weatherUrl =
                $"https://api.open-meteo.com/v1/forecast" +
                $"?latitude={lat}&longitude={lon}" +
                $"&current=temperature_2m,relative_humidity_2m,wind_speed_10m" +
                $"&timezone=Asia%2FBangkok";

            var airResponse = await _httpClient.GetAsync(airUrl);
            airResponse.EnsureSuccessStatusCode();
            var airJson = await airResponse.Content.ReadAsStringAsync();

            var weatherResponse = await _httpClient.GetAsync(weatherUrl);
            weatherResponse.EnsureSuccessStatusCode();
            var weatherJson = await weatherResponse.Content.ReadAsStringAsync();

            using var airDoc = JsonDocument.Parse(airJson);
            using var weatherDoc = JsonDocument.Parse(weatherJson);

            var airCurrent = airDoc.RootElement.GetProperty("current");
            var weatherCurrent = weatherDoc.RootElement.GetProperty("current");

            double pm25 = airCurrent.GetProperty("pm2_5").GetDouble();
            double temperature = weatherCurrent.GetProperty("temperature_2m").GetDouble();
            double humidity = weatherCurrent.GetProperty("relative_humidity_2m").GetDouble();
            double wind = weatherCurrent.GetProperty("wind_speed_10m").GetDouble();

            return new Dictionary<string, double>
            {
                { "pm2_5", pm25 },
                { "temperature_2m", temperature },
                { "relative_humidity_2m", humidity },
                { "wind_speed_10m", wind },
                { "hour", DateTime.Now.Hour }
            };
        }

        public async Task<List<WeatherForecastPoint>> Get24HourForecastAsync()
        {
            var lat = 10.8231;
            var lon = 106.6297;

            var airUrl =
                $"https://air-quality-api.open-meteo.com/v1/air-quality" +
                $"?latitude={lat}&longitude={lon}" +
                $"&hourly=pm2_5" +
                $"&forecast_days=2" +
                $"&timezone=Asia%2FBangkok";

            var weatherUrl =
                $"https://api.open-meteo.com/v1/forecast" +
                $"?latitude={lat}&longitude={lon}" +
                $"&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m" +
                $"&forecast_days=2" +
                $"&timezone=Asia%2FBangkok";

            var airResponse = await _httpClient.GetAsync(airUrl);
            airResponse.EnsureSuccessStatusCode();

            var weatherResponse = await _httpClient.GetAsync(weatherUrl);
            weatherResponse.EnsureSuccessStatusCode();

            var airJson = await airResponse.Content.ReadAsStringAsync();
            var weatherJson = await weatherResponse.Content.ReadAsStringAsync();

            var airData = JsonSerializer.Deserialize<OpenMeteoForecastResponse>(airJson);
            var weatherData = JsonSerializer.Deserialize<OpenMeteoForecastResponse>(weatherJson);

            if (airData?.Hourly == null || weatherData?.Hourly == null)
            {
                throw new Exception("Không đọc được dữ liệu hourly từ Open-Meteo.");
            }

            var now = DateTime.Now;
            var points = new List<WeatherForecastPoint>();

            for (int i = 0; i < airData.Hourly.Time.Count; i++)
            {
                if (i >= weatherData.Hourly.Time.Count) break;

                if (!DateTime.TryParse(airData.Hourly.Time[i], out var time))
                    continue;

                if (time < now) continue;

                var pm25 = airData.Hourly.Pm25.ElementAtOrDefault(i) ?? 0;
                var temp = weatherData.Hourly.Temperature2m.ElementAtOrDefault(i) ?? 0;
                var humidity = weatherData.Hourly.RelativeHumidity2m.ElementAtOrDefault(i) ?? 0;
                var wind = weatherData.Hourly.WindSpeed10m.ElementAtOrDefault(i) ?? 0;

                points.Add(new WeatherForecastPoint
                {
                    Time = time,
                    Pm25 = pm25,
                    Temperature2m = temp,
                    RelativeHumidity2m = humidity,
                    WindSpeed10m = wind
                });

                if (points.Count >= 24)
                    break;
            }

            return points;
        }
    }
}