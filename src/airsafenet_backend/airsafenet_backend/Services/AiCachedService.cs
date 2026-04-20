using System.Net.Http.Json;
using System.Text.Json;
using airsafenet_backend.DTOs.Air;
using airsafenet_backend.DTOs.Admin;

namespace airsafenet_backend.Services
{
    public class AiCachedService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AiCachedService> _logger;

        private static readonly JsonSerializerOptions _jsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        };

        public AiCachedService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<AiCachedService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        private string GetBaseUrl() =>
            _configuration["AiServer:BaseUrl"] ?? "http://localhost:8000";

        public async Task<AiCurrentResponse?> GetCurrentAsync(string userGroup)
        {
            var profile = ProfileMapper.ToAiProfile(userGroup);
            var response = await _httpClient.GetAsync(
                $"{GetBaseUrl()}/forecast/current?profile={profile}");

            if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
                return null;

            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AiCurrentResponse>(body, _jsonOpts);
        }


        public async Task<AiRangeResponse?> GetForecastRangeAsync(string userGroup, int days)
        {
            var profile = ProfileMapper.ToAiProfile(userGroup);
            days = Math.Clamp(days, 1, 7);
            var response = await _httpClient.GetAsync(
                $"{GetBaseUrl()}/forecast/range?days={days}&profile={profile}");

            if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
                return null;

            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AiRangeResponse>(body, _jsonOpts);
        }


        public async Task<AiHistoryResponse?> GetHistoryAsync(string userGroup, int days)
        {
            var profile = ProfileMapper.ToAiProfile(userGroup);
            days = Math.Clamp(days, 1, 30);
            var response = await _httpClient.GetAsync(
                $"{GetBaseUrl()}/history?days={days}&profile={profile}");

            if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
                return null;

            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<AiHistoryResponse>(body, _jsonOpts);
        }


        public async Task<AdminComputeResponse> TriggerComputeAsync(bool force = true)
        {
            var adminKey = _configuration["AiServer:AdminKey"]
                ?? throw new InvalidOperationException("Thiếu AiServer:AdminKey.");

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{GetBaseUrl()}/admin/compute?force={force}");
            request.Headers.Add("X-Admin-Key", adminKey);

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.SendAsync(request, cts.Token);
            }
            catch (TaskCanceledException)
            {
                _logger.LogWarning("Trigger compute timeout 10s — coi như đang chạy.");
                return new AdminComputeResponse
                {
                    Status = "running",
                    Message = "Đã kích hoạt. Đang xử lý, vui lòng chờ...",
                };
            }

            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                throw new Exception($"Compute error {response.StatusCode}: {body}");

            return JsonSerializer.Deserialize<AdminComputeResponse>(body, _jsonOpts)
                ?? new AdminComputeResponse { Status = "running", Message = "Đang xử lý..." };
        }

        public async Task<AdminCacheStatusResponse> GetCacheStatusAsync()
        {
            var adminKey = _configuration["AiServer:AdminKey"]
                ?? throw new InvalidOperationException("Thiếu AiServer:AdminKey.");

            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"{GetBaseUrl()}/admin/cache/status");
            request.Headers.Add("X-Admin-Key", adminKey);

            var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new Exception($"Cache status error {response.StatusCode}: {body}");

            return JsonSerializer.Deserialize<AdminCacheStatusResponse>(body, _jsonOpts)
                ?? new AdminCacheStatusResponse();
        }

        public async Task<object> ClearCacheAsync()
        {
            var adminKey = _configuration["AiServer:AdminKey"]
                ?? throw new InvalidOperationException("Thiếu AiServer:AdminKey.");

            using var request = new HttpRequestMessage(
                HttpMethod.Delete,
                $"{GetBaseUrl()}/admin/cache/clear");
            request.Headers.Add("X-Admin-Key", adminKey);

            var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new Exception($"Clear cache error {response.StatusCode}: {body}");

            return JsonSerializer.Deserialize<object>(body)
                ?? new { message = "Cache cleared" };
        }
    }
}
