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

        public async Task<AiServerResponse?> PredictAsync(AiPredictRequest request)
        {
            var aiBaseUrl = _configuration["AiServer:BaseUrl"] ?? "http://localhost:8000";
            var url = $"{aiBaseUrl}/predict";

            var response = await _httpClient.PostAsJsonAsync(url, request);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                throw new Exception($"AI Server error: {response.StatusCode} - {errorText}");
            }

            return await response.Content.ReadFromJsonAsync<AiServerResponse>();
        }
    }
}
