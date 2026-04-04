using System.Net.Http.Json;
using airsafenet_backend.DTOs.Air;

namespace airsafenet_backend.Services
{
    public class AiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        private string GetBaseUrl()
        {
            return _configuration["AiServer:BaseUrl"] ?? "http://localhost:8000";
        }

        public async Task<AiCurrentResponse?> GetCurrentAsync(string userGroup)
        {
            var group = string.IsNullOrWhiteSpace(userGroup) ? "normal" : userGroup.Trim().ToLower();
            var url = $"{GetBaseUrl()}/forecast/current?user_group={group}";

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new Exception($"AI Server current error: {response.StatusCode} - {errorText}");
            }

            return await response.Content.ReadFromJsonAsync<AiCurrentResponse>();
        }

        public async Task<AiForecast24hResponse?> GetForecast24hAsync(string userGroup)
        {
            var group = string.IsNullOrWhiteSpace(userGroup) ? "normal" : userGroup.Trim().ToLower();
            var url = $"{GetBaseUrl()}/forecast/24h?user_group={group}";

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new Exception($"AI Server forecast error: {response.StatusCode} - {errorText}");
            }

            return await response.Content.ReadFromJsonAsync<AiForecast24hResponse>();
        }
    }
}
