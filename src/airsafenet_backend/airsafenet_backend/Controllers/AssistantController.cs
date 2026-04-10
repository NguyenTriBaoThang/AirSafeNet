using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Assistant;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class AssistantController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AiService _aiService;
        private readonly AssistantDomainService _domainService;
        private readonly OpenAiChatService _openAiChatService;
        private readonly ILogger<AssistantController> _logger;

        public AssistantController(
            AppDbContext db,
            AiService aiService,
            AssistantDomainService domainService,
            OpenAiChatService openAiChatService,
            ILogger<AssistantController> logger)
        {
            _db = db;
            _aiService = aiService;
            _domainService = domainService;
            _openAiChatService = openAiChatService;
            _logger = logger;
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] AssistantChatRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Message))
                {
                    return BadRequest(new
                    {
                        message = "Message không được để trống."
                    });
                }

                var userGroup = await GetCurrentUserGroupAsync();
                if (userGroup == null)
                {
                    return Unauthorized(new
                    {
                        message = "Không xác định được người dùng hiện tại."
                    });
                }

                var inDomain = _domainService.IsInDomain(request.Message);

                if (!inDomain)
                {
                    return Ok(new AssistantChatResponse
                    {
                        InDomain = false,
                        Answer = "Mình chỉ hỗ trợ các câu hỏi liên quan đến chất lượng không khí, AQI/PM2.5, dự báo và khuyến nghị sức khỏe trong AirSafeNet."
                    });
                }

                var current = await _aiService.GetCurrentAsync(userGroup);
                var forecast = await _aiService.GetForecastRangeAsync(userGroup, 1);

                if (current == null || forecast == null || forecast.Forecast == null || forecast.Forecast.Count == 0)
                {
                    return StatusCode(500, new
                    {
                        message = "Không lấy được dữ liệu từ AI Server để hỗ trợ trả lời."
                    });
                }

                var matched = forecast.Forecast
                    .OrderByDescending(x => x.PredAqi)
                    .First();

                var systemPrompt = """
Bạn là trợ lý ảo của AirSafeNet.

Chỉ được trả lời các câu hỏi liên quan đến:
- chất lượng không khí
- AQI, PM2.5
- dự báo theo thời gian
- mức độ rủi ro sức khỏe liên quan ô nhiễm không khí
- khuyến nghị hoạt động ngoài trời / trong nhà
- giải thích dữ liệu AirSafeNet

Không được trả lời các câu hỏi ngoài phạm vi trên.
Nếu câu hỏi ngoài phạm vi, hãy từ chối ngắn gọn và lịch sự.

Khi trả lời:
- ưu tiên tuyệt đối dữ liệu trong context
- không tự bịa thêm số liệu
- nếu dữ liệu chưa đủ, nói rõ là chưa đủ dữ liệu
- trả lời tự nhiên, dễ hiểu, thân thiện
- ngắn gọn, thực tế, ưu tiên tính an toàn cho người dùng
""";

                var userPrompt = $"""
Ngữ cảnh hệ thống AirSafeNet:
- User group: {userGroup}
- Current AQI: {current.PredAqi}
- Current PM2.5: {current.PredPm25}
- Current risk: {current.RiskProfile}
- Current recommendation: {current.RecommendationProfile}

Mốc forecast nổi bật trong 24 giờ tới:
- Time: {matched.Time}
- AQI: {matched.PredAqi}
- PM2.5: {matched.PredPm25}
- Risk: {matched.RiskProfile}
- Recommendation: {matched.RecommendationProfile}

Câu hỏi người dùng:
{request.Message}

Hãy trả lời bằng tiếng Việt, tự nhiên, ngắn gọn, đúng với dữ liệu trên.
""";

                var answer = await _openAiChatService.GenerateAssistantAnswerAsync(
                    systemPrompt,
                    userPrompt
                );

                return Ok(new AssistantChatResponse
                {
                    InDomain = true,
                    Answer = answer,
                    Source = new
                    {
                        userGroup,
                        currentAqi = current.PredAqi,
                        currentPm25 = current.PredPm25,
                        matchedForecastTime = matched.Time,
                        matchedForecastAqi = matched.PredAqi,
                        matchedForecastPm25 = matched.PredPm25
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xử lý /api/assistant/chat");

                return StatusCode(500, new
                {
                    message = "Đã xảy ra lỗi khi xử lý trợ lý ảo.",
                    error = ex.Message
                });
            }
        }

        private async Task<string?> GetCurrentUserGroupAsync()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
            {
                return null;
            }

            var preferences = await _db.UserPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            return preferences?.UserGroup ?? "normal";
        }
    }
}