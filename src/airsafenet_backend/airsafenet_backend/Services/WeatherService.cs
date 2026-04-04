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
            // TP.HCM
            var lat = 10.8231;
            var lon = 106.6297;

            var url =
                $"https://air-quality-api.open-meteo.com/v1/air-quality" +
                $"?latitude={lat}&longitude={lon}" +
                $"&current=pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone" +
                $"&timezone=Asia%2FBangkok";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);

            var current = doc.RootElement.GetProperty("current");

            double pm25 = current.GetProperty("pm2_5").GetDouble();

            // Giả lập thêm dữ liệu thời tiết (Open-Meteo weather API riêng)
            // 👉 demo: bạn có thể mở rộng sau
            double temperature = 30;
            double humidity = 70;
            double wind = 2.5;

            return new Dictionary<string, double>
            {
                { "pm2_5", pm25 },
                { "temperature_2m", temperature },
                { "relative_humidity_2m", humidity },
                { "wind_speed_10m", wind },
                { "hour", DateTime.Now.Hour }
            };
        }
    }
}