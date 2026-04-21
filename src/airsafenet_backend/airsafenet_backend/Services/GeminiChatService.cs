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
                    temperature = 0.5,      
                    maxOutputTokens = 800  
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

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Gemini error body: {Body}", body);
                return "Xin lỗi, mình đang gặp sự cố kết nối. Bạn thử lại sau một chút nhé! 🙏";
            }

            try
            {
                return ExtractTextFromResponse(body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi parse Gemini response. Body: {Body}", body[..Math.Min(500, body.Length)]);
                return "Xin lỗi, mình chưa thể xử lý câu trả lời lúc này. Bạn thử lại sau nhé!";
            }
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

            if (root.TryGetProperty("error", out var errorProp))
            {
                var errMsg = errorProp.TryGetProperty("message", out var em)
                    ? em.GetString() : "Unknown Gemini error";
                throw new Exception($"Gemini API error: {errMsg}");
            }

            if (!root.TryGetProperty("candidates", out var candidates) ||
                candidates.ValueKind != JsonValueKind.Array ||
                candidates.GetArrayLength() == 0)
            {
                // ── promptFeedback bị block (safety filter) ──────────────────
                if (root.TryGetProperty("promptFeedback", out var feedback) &&
                    feedback.TryGetProperty("blockReason", out var reason))
                {
                    return "Xin lỗi, câu hỏi của bạn không thể được xử lý do bộ lọc nội dung. Vui lòng thử lại với câu hỏi khác.";
                }
                throw new Exception($"Không tìm thấy candidates trong phản hồi Gemini. Body: {body[..Math.Min(500, body.Length)]}");
            }

            var firstCandidate = candidates[0];

            if (firstCandidate.TryGetProperty("finishReason", out var finishReason))
            {
                var reason = finishReason.GetString();
                if (reason is "SAFETY" or "RECITATION")
                {
                    return "Xin lỗi, mình không thể trả lời câu hỏi này. Vui lòng thử lại với cách diễn đạt khác.";
                }
            }

            if (!firstCandidate.TryGetProperty("content", out var content) ||
                !content.TryGetProperty("parts", out var parts) ||
                parts.ValueKind != JsonValueKind.Array ||
                parts.GetArrayLength() == 0)
            {
                return "Xin lỗi, mình chưa thể trả lời lúc này. Bạn thử lại sau nhé!";
            }

            var texts = new List<string>();
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textElement))
                {
                    var text = textElement.GetString();
                    if (!string.IsNullOrWhiteSpace(text))
                        texts.Add(text);
                }
            }

            var result = string.Join("\n", texts).Trim();

            if (string.IsNullOrWhiteSpace(result))
                return "Xin lỗi, mình chưa thể tạo câu trả lời lúc này. Bạn thử lại sau nhé!";

            return result;
        }
    }
}