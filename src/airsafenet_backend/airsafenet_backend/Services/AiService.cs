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

        public async Task<AiRangeResponse?> GetForecastRangeAsync(string userGroup, int days)
        {
            var group = string.IsNullOrWhiteSpace(userGroup) ? "normal" : userGroup.Trim().ToLower();
            days = Math.Clamp(days, 1, 7);

            var url = $"{GetBaseUrl()}/forecast/range?days={days}&user_group={group}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new Exception($"AI Server forecast range error: {response.StatusCode} - {errorText}");
            }

            return await response.Content.ReadFromJsonAsync<AiRangeResponse>();
        }

        public async Task<AiHistoryResponse?> GetHistoryAsync(string userGroup, int days)
        {
            var group = string.IsNullOrWhiteSpace(userGroup) ? "normal" : userGroup.Trim().ToLower();
            days = Math.Clamp(days, 1, 30);

            var url = $"{GetBaseUrl()}/history?days={days}&user_group={group}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new Exception($"AI Server history error: {response.StatusCode} - {errorText}");
            }

            return await response.Content.ReadFromJsonAsync<AiHistoryResponse>();
        }
    }
}