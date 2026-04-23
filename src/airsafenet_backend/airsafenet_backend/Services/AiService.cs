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
            var profile = ProfileMapper.ToAiProfile(userGroup);
            var url = $"{GetBaseUrl()}/forecast/current?profile={profile}";

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
            var profile = ProfileMapper.ToAiProfile(userGroup);
            days = Math.Clamp(days, 1, 7);

            var url = $"{GetBaseUrl()}/forecast/range?days={days}&profile={profile}";
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
            var profile = ProfileMapper.ToAiProfile(userGroup);
            days = Math.Clamp(days, 1, 30);

            var url = $"{GetBaseUrl()}/history?days={days}&profile={profile}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new Exception($"AI Server history error: {response.StatusCode} - {errorText}");
            }

            return await response.Content.ReadFromJsonAsync<AiHistoryResponse>();
        }

        public string GetAdminKey() =>
            _configuration["AiServer:AdminKey"] ?? "airsafenet-admin-secret";

        public async Task<(string body, int statusCode)> GetRawAsync(string path)
        {
            var response = await _httpClient.GetAsync($"{GetBaseUrl()}{path}");
            var body = await response.Content.ReadAsStringAsync();
            return (body, (int)response.StatusCode);
        }

        public async Task<(string body, int statusCode)> GetRawWithAdminKeyAsync(
            string path, string adminKey)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{GetBaseUrl()}{path}");
            request.Headers.Add("X-Admin-Key", adminKey);
            var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();
            return (body, (int)response.StatusCode);
        }

        public async Task<(string body, int statusCode)> PostRawWithAdminKeyAsync(
            string path, string adminKey)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{GetBaseUrl()}{path}");
            request.Headers.Add("X-Admin-Key", adminKey);
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            try
            {
                var response = await _httpClient.SendAsync(request, cts.Token);
                var body = await response.Content.ReadAsStringAsync();
                return (body, (int)response.StatusCode);
            }
            catch (TaskCanceledException)
            {
                return ("{\"status\":\"running\",\"message\":\"Triggered.\"}", 200);
            }
        }

        public async Task<(string body, int statusCode)> GetDistrictsRawAsync()
        {
            var url = $"{GetBaseUrl()}/districts/current";
            var response = await _httpClient.GetAsync(url);
            var body = await response.Content.ReadAsStringAsync();
            return (body, (int)response.StatusCode);
        }

        public async Task<(string body, int statusCode)> TriggerDistrictComputeRawAsync()
        {
            var adminKey = _configuration["AiServer:AdminKey"] ?? "airsafenet-admin-secret";

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{GetBaseUrl()}/admin/districts/compute");
            request.Headers.Add("X-Admin-Key", adminKey);

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            try
            {
                var response = await _httpClient.SendAsync(request, cts.Token);
                var body = await response.Content.ReadAsStringAsync();
                return (body, (int)response.StatusCode);
            }
            catch (TaskCanceledException)
            {
                return ("{\"status\":\"running\",\"message\":\"Đã kích hoạt tính toán 22 quận/huyện.\"}", 200);
            }
        }
    }
}