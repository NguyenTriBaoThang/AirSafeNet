using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
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
        private readonly AiCachedService _aiService;
        private readonly AssistantDomainService _domainService;
        private readonly GeminiChatService _geminiChatService;
        private readonly AssistantTimeResolverService _timeResolverService;

        public AssistantController(
            AppDbContext db,
            AiCachedService aiService,
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

            bool hasLiveData = current != null && forecast != null && forecast.Forecast.Count > 0;

            var nowLocal = DateTime.Now;
            string nowStr = nowLocal.ToString("HH:mm, dd/MM/yyyy");

            AiForecastItem? matched = null;
            AssistantTimeResolverService.ForecastMatchResult? forecastMatch = null;

            if (hasLiveData)
            {
                forecastMatch = _timeResolverService.MatchForecast(
                    request.Message,
                    forecast!.Forecast,
                    nowLocal
                );
                matched = forecastMatch.Item ?? forecast.Forecast
                    .OrderByDescending(x => x.PredAqi)
                    .First();
            }

            var systemPrompt = $"""
Bạn là AirSafeNet Assistant — trợ lý ảo thông minh về chất lượng không khí tại TP. Hồ Chí Minh.

PHẠM VI TRẢ LỜI:
Chỉ trả lời các chủ đề: AQI, PM2.5, bụi mịn, ô nhiễm không khí, dự báo thời tiết không khí,
mức độ rủi ro sức khỏe, khuyến nghị hoạt động (chạy bộ, đưa trẻ ra ngoài, đeo khẩu trang...),
nhóm người nhạy cảm (trẻ em, người cao tuổi, người bệnh hô hấp), giải thích dữ liệu AirSafeNet.

Nếu câu hỏi ngoài phạm vi → từ chối lịch sự: "Mình chỉ hỗ trợ về chất lượng không khí và sức khỏe môi trường."

CÁCH TRẢ LỜI (quan trọng):
- Ưu tiên tuyệt đối số liệu trong context, KHÔNG tự bịa
- Trả lời bằng tiếng Việt, TỰ NHIÊN như người thật, thân thiện, ấm áp
- Ngắn gọn, thực tế, dễ hiểu — tránh liệt kê gạch đầu dòng quá nhiều
- Đưa ra khuyến nghị cụ thể phù hợp nhóm "{userGroup}"
- Nếu AQI tốt → khích lệ ra ngoài. Nếu AQI cao → nhắc nhở cụ thể cách bảo vệ
- Giờ hiện tại: {nowStr}

{(hasLiveData ? "" : "LƯU Ý: Hệ thống chưa có dữ liệu real-time. Trả lời dựa trên kiến thức chung về không khí TP.HCM.")}
""";

            // ── User prompt với context đầy đủ ────────────────────────────────
            string contextBlock;
            if (hasLiveData)
            {
                var riskViet = current!.RiskProfile switch
                {
                    "GOOD" => "Tốt",
                    "MODERATE" => "Trung bình",
                    "UNHEALTHY_SENSITIVE" => "Không tốt cho nhóm nhạy cảm",
                    "UNHEALTHY" => "Không tốt",
                    "VERY_UNHEALTHY" => "Rất không tốt",
                    "HAZARDOUS" => "Nguy hiểm",
                    _ => current.RiskProfile
                };

                var groupViet = userGroup switch
                {
                    "children" => "Trẻ em",
                    "elderly" => "Người cao tuổi",
                    "respiratory" => "Người có bệnh hô hấp",
                    _ => "Người bình thường"
                };

                var windDirText = current.WindDirection.HasValue
                    ? WindDirectionToText(current.WindDirection.Value)
                    : "—";

                var uvText = current.UvIndex.HasValue ? UvIndexToText(current.UvIndex.Value) : "—";

                var next6 = forecast!.Forecast
                    .Take(24)
                    .Where((_, i) => i % 4 == 0)
                    .Take(6)
                    .Select(x =>
                    {
                        var t = System.DateTime.TryParse(x.Time, out var dt)
                            ? dt.ToString("HH:mm dd/MM")
                            : x.Time;
                        var rv = x.RiskProfile switch
                        {
                            "GOOD" => "Tốt",
                            "MODERATE" => "TB",
                            "UNHEALTHY_SENSITIVE" => "Nhạy cảm",
                            "UNHEALTHY" => "Kém",
                            "VERY_UNHEALTHY" => "Rất kém",
                            "HAZARDOUS" => "Nguy hiểm",
                            _ => x.RiskProfile
                        };
                        return $"  {t}: AQI {x.PredAqi}, PM2.5 {x.PredPm25:F1} ({rv})";
                    });

                contextBlock = $"""
[DỮ LIỆU THỰC TẾ AIRSAFENET — CẬP NHẬT LÚC {nowStr}]
Địa điểm: TP. Hồ Chí Minh
Nhóm người dùng: {groupViet}

═══ CHẤT LƯỢNG KHÔNG KHÍ HIỆN TẠI ═══
AQI:       {current.PredAqi} — {riskViet}
PM2.5:     {current.PredPm25:F1} µg/m³  (WHO năm: 5 | WHO 24h: 15 | QCVN: 25)
Khuyến nghị cho {groupViet}: {current.RecommendationProfile}

═══ THỜI TIẾT THỰC TẾ (Open-Meteo) ═══
🌡 Nhiệt độ:    {current.Temperature?.ToString("F1") ?? "—"} °C
💧 Độ ẩm:      {current.Humidity?.ToString("F0") ?? "—"} %
💨 Gió:        {current.WindSpeed?.ToString("F1") ?? "—"} km/h, hướng {windDirText}
🔵 Áp suất:    {current.Pressure?.ToString("F1") ?? "—"} hPa
☀️ UV Index:    {current.UvIndex?.ToString("F1") ?? "—"} — {uvText}
☁️ Mây:        {current.CloudCover?.ToString("F0") ?? "—"} %

═══ DỰ BÁO 24H TỚI (mỗi 4 giờ) ═══
{string.Join("\n", next6)}

═══ MỐC LIÊN QUAN ĐẾN CÂU HỎI ═══
Thời điểm: {matched!.Time}
AQI: {matched.PredAqi} — PM2.5: {matched.PredPm25:F1} µg/m³
Mức độ: {matched.RiskProfile}
Khuyến nghị: {matched.RecommendationProfile}
{(forecastMatch?.IsFallback == true ? "(Không xác định được thời gian chính xác → dùng mốc gần nhất)" : "")}
""";
            }
            else
            {
                contextBlock = $"""
[THÔNG BÁO HỆ THỐNG]
Dữ liệu real-time chưa sẵn sàng (cache đang khởi tạo).
Thời điểm hiện tại: {nowStr}
Nhóm người dùng: {userGroup}
Hãy trả lời dựa trên kiến thức chung về không khí TP.HCM,
và nhắc người dùng xem dashboard sau khi hệ thống hoàn tất khởi tạo (5-8 phút).
""";
            }

            var userPrompt = $"""
{contextBlock}

Câu hỏi của người dùng:
{request.Message}
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
                CurrentAqi = hasLiveData ? current!.PredAqi : (int?)null,
                CurrentPm25 = hasLiveData ? current!.PredPm25 : (double?)null,
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
                Source = hasLiveData ? (object)new
                {
                    userGroup,
                    currentAqi = current!.PredAqi,
                    currentPm25 = current.PredPm25,
                    matchedPhrase = forecastMatch!.MatchedPhrase,
                    targetTime = forecastMatch.TargetTime,
                    isFallback = forecastMatch.IsFallback,
                    matchedForecastTime = matched!.Time,
                    matchedForecastAqi = matched.PredAqi,
                    matchedForecastPm25 = matched.PredPm25,
                } : new { userGroup, note = "no live data" }
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

            bool hasLiveDataRegen = current != null && forecast != null && forecast.Forecast.Count > 0;
            var nowLocalRegen = DateTime.Now;
            string nowStrRegen = nowLocalRegen.ToString("HH:mm, dd/MM/yyyy");

            AiForecastItem? matchedRegen = null;
            AssistantTimeResolverService.ForecastMatchResult? forecastMatchRegen = null;

            if (hasLiveDataRegen)
            {
                forecastMatchRegen = _timeResolverService.MatchForecast(
                    sourceUserMessage.Content,
                    forecast!.Forecast,
                    nowLocalRegen
                );
                matchedRegen = forecastMatchRegen.Item ?? forecast.Forecast
                    .OrderByDescending(x => x.PredAqi)
                    .First();
            }

            var groupVietRegen = userGroup switch
            {
                "children" => "Trẻ em",
                "elderly" => "Người cao tuổi",
                "respiratory" => "Người có bệnh hô hấp",
                _ => "Người bình thường"
            };

            var systemPromptRegen = $"""
Bạn là AirSafeNet Assistant — trợ lý ảo thông minh về chất lượng không khí tại TP. Hồ Chí Minh.

PHẠM VI TRẢ LỜI:
Chỉ trả lời các chủ đề: AQI, PM2.5, bụi mịn, ô nhiễm không khí, dự báo thời tiết không khí,
mức độ rủi ro sức khỏe, khuyến nghị hoạt động, nhóm nhạy cảm, giải thích dữ liệu AirSafeNet.

CÁCH TRẢ LỜI:
- Ưu tiên tuyệt đối số liệu trong context, KHÔNG tự bịa
- Trả lời bằng tiếng Việt, tự nhiên như người thật, thân thiện, ấm áp
- Đây là lần regenerate — hãy trả lời theo góc độ hoặc cách diễn đạt KHÁC so với lần trước
- Nhóm người dùng: {groupVietRegen}. Thời điểm: {nowStrRegen}
{(hasLiveDataRegen ? "" : "LƯU Ý: Dữ liệu real-time chưa sẵn sàng, trả lời dựa trên kiến thức chung.")}
""";

            string contextBlockRegen = hasLiveDataRegen
                ? $"""
[DỮ LIỆU THỰC TẾ AIRSAFENET — CẬP NHẬT LÚC {nowStrRegen}]
Địa điểm: TP. Hồ Chí Minh | Nhóm: {groupVietRegen}

═══ CHẤT LƯỢNG KHÔNG KHÍ HIỆN TẠI ═══
AQI: {current!.PredAqi} | PM2.5: {current.PredPm25:F1} µg/m³
Khuyến nghị: {current.RecommendationProfile}

═══ THỜI TIẾT THỰC TẾ ═══
Nhiệt độ: {current.Temperature?.ToString("F1") ?? "—"} °C | Độ ẩm: {current.Humidity?.ToString("F0") ?? "—"} %
Gió: {current.WindSpeed?.ToString("F1") ?? "—"} km/h hướng {(current.WindDirection.HasValue ? WindDirectionToText(current.WindDirection.Value) : "—")}
UV Index: {current.UvIndex?.ToString("F1") ?? "—"} — {(current.UvIndex.HasValue ? UvIndexToText(current.UvIndex.Value) : "—")}
Áp suất: {current.Pressure?.ToString("F1") ?? "—"} hPa | Mây: {current.CloudCover?.ToString("F0") ?? "—"} %

═══ MỐC LIÊN QUAN ĐẾN CÂU HỎI ═══
Thời điểm: {matchedRegen!.Time}
AQI: {matchedRegen.PredAqi} | PM2.5: {matchedRegen.PredPm25:F1} µg/m³
Mức độ: {matchedRegen.RiskProfile} | Khuyến nghị: {matchedRegen.RecommendationProfile}
"""
                : $"[Dữ liệu real-time chưa sẵn sàng — Thời điểm: {nowStrRegen}]";

            var userPromptRegen = $"""
{contextBlockRegen}

Câu hỏi của người dùng:
{sourceUserMessage.Content}
""";

            var answer = await _geminiChatService.GenerateAssistantAnswerAsync(systemPromptRegen, userPromptRegen);

            assistantMessage.Content = answer;
            assistantMessage.UserGroup = userGroup;
            assistantMessage.CurrentAqi = hasLiveDataRegen ? current!.PredAqi : null;
            assistantMessage.CurrentPm25 = hasLiveDataRegen ? current!.PredPm25 : null;
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
                Source = hasLiveDataRegen ? (object)new
                {
                    userGroup,
                    currentAqi = current!.PredAqi,
                    currentPm25 = current.PredPm25,
                    matchedPhrase = forecastMatchRegen?.MatchedPhrase,
                    targetTime = forecastMatchRegen?.TargetTime,
                    isFallback = forecastMatchRegen?.IsFallback ?? true,
                    matchedForecastTime = matchedRegen?.Time,
                    matchedForecastAqi = matchedRegen?.PredAqi,
                    matchedForecastPm25 = matchedRegen?.PredPm25,
                } : new { userGroup, note = "no live data" }
            });
        }
        private static string WindDirectionToText(double degrees)
        {
            return ((degrees % 360 + 360) % 360) switch
            {
                >= 337.5 or < 22.5 => "Bắc (N)",
                >= 22.5 and < 67.5 => "Đông Bắc (NE)",
                >= 67.5 and < 112.5 => "Đông (E)",
                >= 112.5 and < 157.5 => "Đông Nam (SE)",
                >= 157.5 and < 202.5 => "Nam (S)",
                >= 202.5 and < 247.5 => "Tây Nam (SW)",
                >= 247.5 and < 292.5 => "Tây (W)",
                _ => "Tây Bắc (NW)",
            };
        }

        private static string UvIndexToText(double uv)
        {
            return uv switch
            {
                < 3 => $"{uv:F1} (Thấp — an toàn ra ngoài)",
                < 6 => $"{uv:F1} (Trung bình — đeo kem chống nắng)",
                < 8 => $"{uv:F1} (Cao — hạn chế 10h–14h)",
                < 11 => $"{uv:F1} (Rất cao — tránh nắng trực tiếp)",
                _ => $"{uv:F1} (Cực độ — ở trong nhà)",
            };
        }
    }
}