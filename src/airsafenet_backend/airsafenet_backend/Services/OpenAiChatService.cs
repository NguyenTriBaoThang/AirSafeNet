using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace airsafenet_backend.Services
{
    public class OpenAiChatService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<OpenAiChatService> _logger;

        public OpenAiChatService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<OpenAiChatService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string> GenerateAssistantAnswerAsync(string systemPrompt, string userPrompt)
        {
            var apiKey = _configuration["OpenAI:ApiKey"];
            var model = _configuration["OpenAI:Model"] ?? "gpt-5-mini";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("Thiếu cấu hình OpenAI:ApiKey.");
            }

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                "https://api.openai.com/v1/responses"
            );

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var payload = new
            {
                model = model,
                input = new object[]
                {
                    new
                    {
                        role = "system",
                        content = new object[]
                        {
                            new { type = "input_text", text = systemPrompt }
                        }
                    },
                    new
                    {
                        role = "user",
                        content = new object[]
                        {
                            new { type = "input_text", text = userPrompt }
                        }
                    }
                }
            };

            request.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            using var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("OpenAI status: {StatusCode}", (int)response.StatusCode);
            _logger.LogInformation("OpenAI raw body: {Body}", body);

            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"OpenAI error: {(int)response.StatusCode} - {body}");
            }

            return ExtractTextFromResponse(body);
        }

        private static string ExtractTextFromResponse(string body)
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            if (root.TryGetProperty("output_text", out var outputTextElement))
            {
                var outputText = outputTextElement.GetString();
                if (!string.IsNullOrWhiteSpace(outputText))
                {
                    return outputText;
                }
            }

            if (root.TryGetProperty("output", out var outputArray) &&
                outputArray.ValueKind == JsonValueKind.Array)
            {
                foreach (var outputItem in outputArray.EnumerateArray())
                {
                    if (!outputItem.TryGetProperty("content", out var contentArray) ||
                        contentArray.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    foreach (var contentItem in contentArray.EnumerateArray())
                    {
                        if (contentItem.TryGetProperty("type", out var typeElement) &&
                            typeElement.GetString() == "output_text" &&
                            contentItem.TryGetProperty("text", out var textElement))
                        {
                            var text = textElement.GetString();
                            if (!string.IsNullOrWhiteSpace(text))
                            {
                                return text;
                            }
                        }
                    }
                }
            }

            throw new Exception($"Không parse được nội dung phản hồi từ OpenAI. Raw body: {body}");
        }
    }
}