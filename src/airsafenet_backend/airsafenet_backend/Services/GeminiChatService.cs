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

            if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "xx")
            {
                // Fallback message when API Key is not configured
                var fallbackAnswer = "Chào bạn! Hiện tại mình đang hoạt động ở chế độ ngoại tuyến (Offline Mode) do chưa có kết nối API. \n\n" +
                                     "Dựa vào thông tin hệ thống, mình thấy chỉ số AQI hiện tại là rất quan trọng. Bạn nên theo dõi sát sao và đeo khẩu trang khi ra ngoài nếu chỉ số vượt ngưỡng 100 nhé! \n\n" +
                                     "(Ghi chú: Để kích hoạt trí tuệ nhân tạo thực thụ, vui lòng cập nhật Gemini API Key trong cấu hình).";
                return fallbackAnswer;
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

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Gemini error body: {Body}", body);
                
                if ((int)response.StatusCode == 429)
                {
                    return "Hệ thống AI đang nhận được quá nhiều yêu cầu cùng lúc (Rate Limit). Vui lòng thử lại sau vài giây nhé!";
                }
                
                if ((int)response.StatusCode >= 500)
                {
                    return "Dịch vụ AI hiện đang gặp sự cố từ phía máy chủ Google. Mình sẽ hoạt động lại ngay khi dịch vụ ổn định.";
                }

                return $"Hiện mình chưa thể trả lời do lỗi kết nối AI ({(int)response.StatusCode}). Bạn thử lại sau nhé!";
            }

            return ExtractTextFromResponse(body);
        }

        public async Task<string> GenerateConversationTitleAsync(string userMessage)
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            var model = _configuration["Gemini:Model"] ?? "gemini-2.5-flash";

            if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "xx")
            {
                return "Trò chuyện ngoại tuyến";
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

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini title error: {StatusCode} - {Body}", (int)response.StatusCode, body);
                return "Cuộc trò chuyện mới";
            }

            try
            {
                var title = ExtractTextFromResponse(body).Trim();
                if (string.IsNullOrWhiteSpace(title)) return "Cuộc trò chuyện mới";
                
                title = title.Replace("\"", "").Trim();
                return title.Length <= 200 ? title : title[..200];
            }
            catch
            {
                return "Cuộc trò chuyện mới";
            }
        }

        private static string ExtractTextFromResponse(string body)
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            if (!root.TryGetProperty("candidates", out var candidates) ||
                candidates.ValueKind != JsonValueKind.Array ||
                candidates.GetArrayLength() == 0)
            {
                // Better handling for safety filters or blocked responses
                if (root.TryGetProperty("promptFeedback", out var feedback))
                {
                    return "[Nội dung bị từ chối do chính sách an toàn của Gemini. Vui lòng hỏi câu hỏi khác.]";
                }
                return "[Không có phản hồi từ AI. Có thể do giới hạn về an toàn hoặc kỹ thuật.]";
            }

            var firstCandidate = candidates[0];

            // Kiểm tra finishReason
            if (firstCandidate.TryGetProperty("finishReason", out var reason) && reason.GetString() == "SAFETY")
            {
                return "[Nội dung bị cắt ngang do vi phạm chính sách an toàn của AI.]";
            }

            if (!firstCandidate.TryGetProperty("content", out var content) ||
                !content.TryGetProperty("parts", out var parts) ||
                parts.ValueKind != JsonValueKind.Array)
            {
                return "[AI phản hồi không đúng định dạng. Vui lòng thử lại.]";
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