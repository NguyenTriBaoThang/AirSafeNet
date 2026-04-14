using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Assistant;
using airsafenet_backend.Models;
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
        private readonly GeminiChatService _geminiChatService;
        private readonly AssistantTimeResolverService _timeResolverService;

        public AssistantController(
            AppDbContext db,
            AiService aiService,
            AssistantDomainService domainService,
            GeminiChatService geminiChatService,
            AssistantTimeResolverService timeResolverService)
        {
            _db = db;
            _aiService = aiService;
            _domainService = domainService;
            _geminiChatService = geminiChatService;
            _timeResolverService = timeResolverService;
        }

        [HttpPost("conversations")]
        public async Task<IActionResult> CreateConversation()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var conversation = new ChatConversation
            {
                UserId = userId.Value,
                Title = "Cuộc trò chuyện mới",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.ChatConversations.Add(conversation);
            await _db.SaveChangesAsync();

            return Ok(new CreateConversationResponse
            {
                ConversationId = conversation.Id,
                Title = conversation.Title,
                CreatedAt = conversation.CreatedAt,
                UpdatedAt = conversation.UpdatedAt
            });
        }

        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations([FromQuery] string sort = "recent")
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var query = _db.ChatConversations
                .AsNoTracking()
                .Where(x => x.UserId == userId.Value)
                .Select(x => new ConversationListItemResponse
                {
                    ConversationId = x.Id,
                    Title = x.Title,
                    IsPinned = x.IsPinned,
                    HasUnreadAssistantMessage = x.HasUnreadAssistantMessage,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt,
                    MessageCount = x.Messages.Count,
                    LastMessageAt = x.Messages
                        .OrderByDescending(m => m.CreatedAt)
                        .Select(m => (DateTime?)m.CreatedAt)
                        .FirstOrDefault(),
                    LastMessageRole = x.Messages
                        .OrderByDescending(m => m.CreatedAt)
                        .Select(m => m.Role)
                        .FirstOrDefault(),
                    LastMessagePreview = x.Messages
                        .OrderByDescending(m => m.CreatedAt)
                        .Select(m => m.Content.Length > 80 ? m.Content.Substring(0, 80) + "..." : m.Content)
                        .FirstOrDefault()
                });

            query = sort?.ToLower() switch
            {
                "oldest" => query
                    .OrderByDescending(x => x.IsPinned)
                    .ThenBy(x => x.CreatedAt),

                "title" => query
                    .OrderByDescending(x => x.IsPinned)
                    .ThenBy(x => x.Title),

                _ => query
                    .OrderByDescending(x => x.IsPinned)
                    .ThenByDescending(x => x.LastMessageAt ?? x.UpdatedAt)
            };

            var conversations = await query.ToListAsync();
            return Ok(conversations);
        }

        [HttpGet("conversations/{conversationId:int}")]
        public async Task<IActionResult> GetConversationDetail(int conversationId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var conversation = await _db.ChatConversations
                .AsNoTracking()
                .Include(x => x.Messages.OrderBy(m => m.CreatedAt))
                .FirstOrDefaultAsync(x => x.Id == conversationId && x.UserId == userId.Value);

            if (conversation == null)
            {
                return NotFound(new { message = "Không tìm thấy hội thoại." });
            }

            return Ok(new ConversationDetailResponse
            {
                ConversationId = conversation.Id,
                Title = conversation.Title,
                CreatedAt = conversation.CreatedAt,
                UpdatedAt = conversation.UpdatedAt,
                Messages = conversation.Messages
                    .OrderBy(x => x.CreatedAt)
                    .Select(x => new ConversationMessageResponse
                    {
                        MessageId = x.Id,
                        Role = x.Role,
                        Content = x.Content,
                        UserGroup = x.UserGroup,
                        CurrentAqi = x.CurrentAqi,
                        CurrentPm25 = x.CurrentPm25,
                        SourceUserMessageId = x.SourceUserMessageId,
                        RegeneratedCount = x.RegeneratedCount,
                        CreatedAt = x.CreatedAt,
                        UpdatedAt = x.UpdatedAt
                    })
                    .ToList()
            });
        }

        [HttpDelete("conversations/{conversationId:int}")]
        public async Task<IActionResult> DeleteConversation(int conversationId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var conversation = await _db.ChatConversations
                .FirstOrDefaultAsync(x => x.Id == conversationId && x.UserId == userId.Value);

            if (conversation == null)
            {
                return NotFound(new { message = "Không tìm thấy hội thoại." });
            }

            _db.ChatConversations.Remove(conversation);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] AssistantChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(new { message = "Message không được để trống." });
            }

            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var userGroup = await GetCurrentUserGroupAsync(userId.Value);
            var conversation = await ResolveConversationAsync(userId.Value, request.ConversationId);

            var userMessage = new ChatMessage
            {
                ConversationId = conversation.Id,
                Role = "user",
                Content = request.Message.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _db.ChatMessages.Add(userMessage);
            await _db.SaveChangesAsync();

            var inDomain = _domainService.IsInDomain(request.Message);

            if (!inDomain)
            {
                var blockedAnswer =
                    "Mình chỉ hỗ trợ các câu hỏi liên quan đến chất lượng không khí, AQI/PM2.5, dự báo và khuyến nghị sức khỏe trong AirSafeNet.";

                var assistantMessageBlocked = new ChatMessage
                {
                    ConversationId = conversation.Id,
                    Role = "assistant",
                    Content = blockedAnswer,
                    UserGroup = userGroup,
                    SourceUserMessageId = userMessage.Id,
                    RegeneratedCount = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = null
                };

                _db.ChatMessages.Add(assistantMessageBlocked);

                if (conversation.Title == "Cuộc trò chuyện mới")
                {
                    try
                    {
                        conversation.Title = await _geminiChatService.GenerateConversationTitleAsync(request.Message);
                    }
                    catch
                    {
                        conversation.Title = BuildConversationTitle(request.Message);
                    }
                }

                conversation.HasUnreadAssistantMessage = true;
                conversation.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                return Ok(new AssistantChatResponse
                {
                    InDomain = false,
                    Answer = blockedAnswer,
                    ConversationId = conversation.Id
                });
            }

            var current = await _aiService.GetCurrentAsync(userGroup);
            var forecast = await _aiService.GetForecastRangeAsync(userGroup, 1);

            if (current == null || forecast == null || forecast.Forecast.Count == 0)
            {
                return StatusCode(500, new
                {
                    message = "Không lấy được dữ liệu từ AI Server để hỗ trợ trả lời."
                });
            }

            var nowLocal = DateTime.Now;

            var forecastMatch = _timeResolverService.MatchForecast(
                request.Message,
                forecast.Forecast,
                nowLocal
            );

            var matched = forecastMatch.Item ?? forecast.Forecast
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

Phân tích thời gian từ câu hỏi:
- Matched phrase: {forecastMatch.MatchedPhrase ?? "không xác định rõ"}
- Target time: {forecastMatch.TargetTime?.ToString("yyyy-MM-dd HH:mm") ?? "không xác định"}
- Is fallback: {forecastMatch.IsFallback}

Mốc forecast được chọn gần nhất:
- Time: {matched.Time}
- AQI: {matched.PredAqi}
- PM2.5: {matched.PredPm25}
- Risk: {matched.RiskProfile}
- Recommendation: {matched.RecommendationProfile}

Câu hỏi người dùng:
{request.Message}

Yêu cầu trả lời:
- nếu người dùng hỏi một mốc thời gian cụ thể, hãy trả lời bám sát mốc đó
- nói rõ nếu hệ thống đang dùng mốc gần nhất do không xác định được thời gian chính xác
- trả lời bằng tiếng Việt, tự nhiên, ngắn gọn, dễ hiểu
""";

            var answer = await _geminiChatService.GenerateAssistantAnswerAsync(
                systemPrompt,
                userPrompt
            );

            var assistantMessage = new ChatMessage
            {
                ConversationId = conversation.Id,
                Role = "assistant",
                Content = answer,
                UserGroup = userGroup,
                CurrentAqi = current.PredAqi,
                CurrentPm25 = current.PredPm25,
                SourceUserMessageId = userMessage.Id,
                RegeneratedCount = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = null
            };

            _db.ChatMessages.Add(assistantMessage);

            if (conversation.Title == "Cuộc trò chuyện mới")
            {
                try
                {
                    conversation.Title = await _geminiChatService.GenerateConversationTitleAsync(request.Message);
                }
                catch
                {
                    conversation.Title = BuildConversationTitle(request.Message);
                }
            }

            conversation.HasUnreadAssistantMessage = true;
            conversation.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new AssistantChatResponse
            {
                InDomain = true,
                Answer = answer,
                ConversationId = conversation.Id,
                Source = new
                {
                    userGroup,
                    currentAqi = current.PredAqi,
                    currentPm25 = current.PredPm25,
                    matchedPhrase = forecastMatch.MatchedPhrase,
                    targetTime = forecastMatch.TargetTime,
                    isFallback = forecastMatch.IsFallback,
                    matchedForecastTime = matched.Time,
                    matchedForecastAqi = matched.PredAqi,
                    matchedForecastPm25 = matched.PredPm25
                }
            });
        }

        [HttpPut("conversations/{conversationId:int}/rename")]
        public async Task<IActionResult> RenameConversation(int conversationId, [FromBody] RenameConversationRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var title = request.Title?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(title))
            {
                return BadRequest(new { message = "Tiêu đề không được để trống." });
            }

            if (title.Length > 200)
            {
                return BadRequest(new { message = "Tiêu đề quá dài." });
            }

            var conversation = await _db.ChatConversations
                .FirstOrDefaultAsync(x => x.Id == conversationId && x.UserId == userId.Value);

            if (conversation == null)
            {
                return NotFound(new { message = "Không tìm thấy hội thoại." });
            }

            conversation.Title = title;
            conversation.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                conversationId = conversation.Id,
                title = conversation.Title,
                updatedAt = conversation.UpdatedAt
            });
        }

        private int? GetCurrentUserId()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(userIdValue, out var userId) ? userId : null;
        }

        private async Task<string> GetCurrentUserGroupAsync(int userId)
        {
            var preferences = await _db.UserPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            return preferences?.UserGroup ?? "normal";
        }

        private async Task<ChatConversation> ResolveConversationAsync(int userId, int? conversationId)
        {
            if (conversationId.HasValue)
            {
                var existing = await _db.ChatConversations
                    .FirstOrDefaultAsync(x => x.Id == conversationId.Value && x.UserId == userId);

                if (existing != null)
                {
                    return existing;
                }
            }

            var conversation = new ChatConversation
            {
                UserId = userId,
                Title = "Cuộc trò chuyện mới",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.ChatConversations.Add(conversation);
            await _db.SaveChangesAsync();

            return conversation;
        }

        private static string BuildConversationTitle(string message)
        {
            var text = message.Trim();
            return text.Length <= 60 ? text : $"{text[..60]}...";
        }

        [HttpPut("conversations/{conversationId:int}/pin")]
        public async Task<IActionResult> PinConversation(int conversationId, [FromBody] PinConversationRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var conversation = await _db.ChatConversations
                .FirstOrDefaultAsync(x => x.Id == conversationId && x.UserId == userId.Value);

            if (conversation == null)
            {
                return NotFound(new { message = "Không tìm thấy hội thoại." });
            }

            conversation.IsPinned = request.IsPinned;
            conversation.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                conversationId = conversation.Id,
                isPinned = conversation.IsPinned,
                updatedAt = conversation.UpdatedAt
            });
        }

        [HttpPut("conversations/{conversationId:int}/read")]
        public async Task<IActionResult> MarkConversationAsRead(int conversationId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var conversation = await _db.ChatConversations
                .FirstOrDefaultAsync(x => x.Id == conversationId && x.UserId == userId.Value);

            if (conversation == null)
            {
                return NotFound(new { message = "Không tìm thấy hội thoại." });
            }

            conversation.HasUnreadAssistantMessage = false;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                conversationId = conversation.Id,
                hasUnreadAssistantMessage = conversation.HasUnreadAssistantMessage
            });
        }

        [HttpPost("regenerate")]
        public async Task<IActionResult> Regenerate([FromBody] RegenerateAssistantRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var conversation = await _db.ChatConversations
                .FirstOrDefaultAsync(x => x.Id == request.ConversationId && x.UserId == userId.Value);

            if (conversation == null)
            {
                return NotFound(new { message = "Không tìm thấy hội thoại." });
            }

            var assistantMessage = await _db.ChatMessages
                .FirstOrDefaultAsync(x =>
                    x.Id == request.AssistantMessageId &&
                    x.ConversationId == request.ConversationId &&
                    x.Role == "assistant");

            if (assistantMessage == null)
            {
                return NotFound(new { message = "Không tìm thấy assistant message." });
            }

            ChatMessage? sourceUserMessage = null;

            if (assistantMessage.SourceUserMessageId.HasValue)
            {
                sourceUserMessage = await _db.ChatMessages.FirstOrDefaultAsync(x =>
                    x.Id == assistantMessage.SourceUserMessageId.Value &&
                    x.ConversationId == request.ConversationId &&
                    x.Role == "user");
            }

            // fallback cho dữ liệu cũ chưa có SourceUserMessageId
            if (sourceUserMessage == null)
            {
                sourceUserMessage = await _db.ChatMessages
                    .Where(x =>
                        x.ConversationId == request.ConversationId &&
                        x.Role == "user" &&
                        x.CreatedAt <= assistantMessage.CreatedAt)
                    .OrderByDescending(x => x.CreatedAt)
                    .FirstOrDefaultAsync();
            }

            if (sourceUserMessage == null)
            {
                return BadRequest(new { message = "Không xác định được câu hỏi nguồn để regenerate." });
            }

            var userGroup = await GetCurrentUserGroupAsync(userId.Value);

            var inDomain = _domainService.IsInDomain(sourceUserMessage.Content);
            if (!inDomain)
            {
                var blockedAnswer =
                    "Mình chỉ hỗ trợ các câu hỏi liên quan đến chất lượng không khí, AQI/PM2.5, dự báo và khuyến nghị sức khỏe trong AirSafeNet.";

                assistantMessage.Content = blockedAnswer;
                assistantMessage.UserGroup = userGroup;
                assistantMessage.CurrentAqi = null;
                assistantMessage.CurrentPm25 = null;
                assistantMessage.SourceUserMessageId = sourceUserMessage.Id;
                assistantMessage.RegeneratedCount += 1;
                assistantMessage.UpdatedAt = DateTime.UtcNow;

                conversation.HasUnreadAssistantMessage = true;
                conversation.UpdatedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                return Ok(new RegenerateAssistantResponse
                {
                    ConversationId = conversation.Id,
                    AssistantMessageId = assistantMessage.Id,
                    Answer = assistantMessage.Content,
                    RegeneratedCount = assistantMessage.RegeneratedCount,
                    UpdatedAt = assistantMessage.UpdatedAt ?? DateTime.UtcNow
                });
            }

            var current = await _aiService.GetCurrentAsync(userGroup);
            var forecast = await _aiService.GetForecastRangeAsync(userGroup, 1);

            if (current == null || forecast == null || forecast.Forecast.Count == 0)
            {
                return StatusCode(500, new
                {
                    message = "Không lấy được dữ liệu từ AI Server để hỗ trợ regenerate."
                });
            }

            var nowLocal = DateTime.Now;

            var forecastMatch = _timeResolverService.MatchForecast(
                sourceUserMessage.Content,
                forecast.Forecast,
                nowLocal
            );

            var matched = forecastMatch.Item ?? forecast.Forecast
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

Phân tích thời gian từ câu hỏi:
- Matched phrase: {forecastMatch.MatchedPhrase ?? "không xác định rõ"}
- Target time: {forecastMatch.TargetTime?.ToString("yyyy-MM-dd HH:mm") ?? "không xác định"}
- Is fallback: {forecastMatch.IsFallback}

Mốc forecast được chọn gần nhất:
- Time: {matched.Time}
- AQI: {matched.PredAqi}
- PM2.5: {matched.PredPm25}
- Risk: {matched.RiskProfile}
- Recommendation: {matched.RecommendationProfile}

Câu hỏi người dùng:
{sourceUserMessage.Content}

Yêu cầu trả lời:
- nếu người dùng hỏi một mốc thời gian cụ thể, hãy trả lời bám sát mốc đó
- nói rõ nếu hệ thống đang dùng mốc gần nhất do không xác định được thời gian chính xác
- trả lời bằng tiếng Việt, tự nhiên, ngắn gọn, dễ hiểu
""";

            var answer = await _geminiChatService.GenerateAssistantAnswerAsync(systemPrompt, userPrompt);

            assistantMessage.Content = answer;
            assistantMessage.UserGroup = userGroup;
            assistantMessage.CurrentAqi = current.PredAqi;
            assistantMessage.CurrentPm25 = current.PredPm25;
            assistantMessage.SourceUserMessageId = sourceUserMessage.Id;
            assistantMessage.RegeneratedCount += 1;
            assistantMessage.UpdatedAt = DateTime.UtcNow;

            conversation.HasUnreadAssistantMessage = true;
            conversation.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new RegenerateAssistantResponse
            {
                ConversationId = conversation.Id,
                AssistantMessageId = assistantMessage.Id,
                Answer = answer,
                RegeneratedCount = assistantMessage.RegeneratedCount,
                UpdatedAt = assistantMessage.UpdatedAt ?? DateTime.UtcNow,
                Source = new
                {
                    userGroup,
                    currentAqi = current.PredAqi,
                    currentPm25 = current.PredPm25,
                    matchedPhrase = forecastMatch.MatchedPhrase,
                    targetTime = forecastMatch.TargetTime,
                    isFallback = forecastMatch.IsFallback,
                    matchedForecastTime = matched.Time,
                    matchedForecastAqi = matched.PredAqi,
                    matchedForecastPm25 = matched.PredPm25
                }
            });
        }
    }
}