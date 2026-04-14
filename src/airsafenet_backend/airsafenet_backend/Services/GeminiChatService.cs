using System.Text;
using System.Text.Json;

namespace airsafenet_backend.Services
{
    public class GeminiChatService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GeminiChatService> _logger;

        public GeminiChatService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<GeminiChatService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string> GenerateAssistantAnswerAsync(string systemPrompt, string userPrompt)
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            var model = _configuration["Gemini:Model"] ?? "gemini-2.5-flash";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("Thiếu cấu hình Gemini:ApiKey.");
            }

            var url =
                $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            var payload = new
            {
                systemInstruction = new
                {
                    parts = new object[]
                    {
                        new { text = systemPrompt }
                    }
                },
                contents = new object[]
                {
                    new
                    {
                        role = "user",
                        parts = new object[]
                        {
                            new { text = userPrompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.4,
                    maxOutputTokens = 500
                }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            using var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("Gemini status: {StatusCode}", (int)response.StatusCode);
            _logger.LogInformation("Gemini raw body: {Body}", body);

            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Gemini error: {(int)response.StatusCode} - {body}");
            }

            return ExtractTextFromResponse(body);
        }

        public async Task<string> GenerateConversationTitleAsync(string userMessage)
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            var model = _configuration["Gemini:Model"] ?? "gemini-2.5-flash";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("Thiếu cấu hình Gemini:ApiKey.");
            }

            var url =
                $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            var systemPrompt = """
Bạn tạo tiêu đề rất ngắn cho cuộc trò chuyện trong ứng dụng AirSafeNet.

Yêu cầu:
- chỉ trả về đúng 1 tiêu đề
- tiếng Việt
- dài tối đa 8 từ
- không dùng dấu ngoặc kép
- không thêm dấu chấm cuối câu
- rõ chủ đề câu hỏi
- không viết chung chung như "Câu hỏi mới" hay "Trò chuyện"
""";

            var userPrompt = $"""
Câu hỏi đầu tiên của người dùng:
{userMessage}

Hãy tạo tiêu đề ngắn cho hội thoại.
""";

            var payload = new
            {
                systemInstruction = new
                {
                    parts = new object[]
                    {
                        new { text = systemPrompt }
                    }
                },
                contents = new object[]
                {
                    new
                    {
                        role = "user",
                        parts = new object[]
                        {
                            new { text = userPrompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.2,
                    maxOutputTokens = 50
                }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            using var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("Gemini title status: {StatusCode}", (int)response.StatusCode);
            _logger.LogInformation("Gemini title raw body: {Body}", body);

            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Gemini title error: {(int)response.StatusCode} - {body}");
            }

            var title = ExtractTextFromResponse(body).Trim();

            if (string.IsNullOrWhiteSpace(title))
            {
                return "Cuộc trò chuyện mới";
            }

            title = title.Replace("\"", "").Trim();

            return title.Length <= 200 ? title : title[..200];
        }

        private static string ExtractTextFromResponse(string body)
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            if (!root.TryGetProperty("candidates", out var candidates) ||
                candidates.ValueKind != JsonValueKind.Array ||
                candidates.GetArrayLength() == 0)
            {
                throw new Exception($"Không tìm thấy candidates trong phản hồi Gemini. Raw body: {body}");
            }

            var firstCandidate = candidates[0];

            if (!firstCandidate.TryGetProperty("content", out var content) ||
                !content.TryGetProperty("parts", out var parts) ||
                parts.ValueKind != JsonValueKind.Array)
            {
                throw new Exception($"Không tìm thấy content.parts trong phản hồi Gemini. Raw body: {body}");
            }

            var texts = new List<string>();

            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textElement))
                {
                    var text = textElement.GetString();
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        texts.Add(text);
                    }
                }
            }

            var result = string.Join("\n", texts).Trim();

            if (string.IsNullOrWhiteSpace(result))
            {
                throw new Exception($"Gemini không trả về text hợp lệ. Raw body: {body}");
            }

            return result;
        }
    }
}