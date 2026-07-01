using airsafenet_backend.Data;
using airsafenet_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Services
{
    /// Core alert logic:
    ///   1. Nhận AQI + PM2.5 + risk hiện tại từ AI Server cache
    ///   2. Tìm tất cả user bật notify + đúng ngưỡng
    ///   3. Anti-spam: chỉ gửi nếu chưa gửi trong 4 giờ
    ///   4. Dispatch qua Telegram / Email / both
    public class AlertService
    {
        private readonly AppDbContext _db;
        private readonly NotificationService _notify;
        private readonly ILogger<AlertService> _logger;

        private const int MIN_ALERT_INTERVAL_HOURS = 4;

        public AlertService(AppDbContext db, NotificationService notify, ILogger<AlertService> logger)
        {
            _db = db;
            _notify = notify;
            _logger = logger;
        }

        public async Task<AlertDispatchResult> DispatchAlertsAsync(
            int currentAqi, double currentPm25, string currentRisk, string recommendation)
        {
            var result = new AlertDispatchResult
            {
                Aqi = currentAqi,
                Pm25 = currentPm25,
                Risk = currentRisk,
            };

            var candidates = await _db.UserPreferences
                .AsNoTracking()
                .Include(x => x.User)
                .Where(x =>
                    x.NotifyEnabled &&
                    x.NotifyChannel != "none" &&
                    currentAqi >= x.NotifyThreshold)
                .ToListAsync();

            _logger.LogInformation(
                "Alert check: AQI={Aqi} - {Count} user vượt ngưỡng",
                currentAqi, candidates.Count);

            var cutoff = DateTime.UtcNow.AddHours(-MIN_ALERT_INTERVAL_HOURS);

            foreach (var pref in candidates)
            {
                if (pref.LastAlertSentAt.HasValue && pref.LastAlertSentAt.Value > cutoff)
                {
                    result.Skipped++;
                    continue;
                }

                var channel = pref.NotifyChannel.ToLower();
                var telegramSent = false;
                var emailSent = false;

                if ((channel is "telegram" or "both") && !string.IsNullOrWhiteSpace(pref.TelegramChatId))
                {
                    var msg = NotificationService.BuildTelegramMessage(
                        currentAqi, currentPm25, currentRisk, recommendation, pref.UserGroup);
                    telegramSent = await _notify.SendTelegramAsync(pref.TelegramChatId!, msg);
                    if (telegramSent) result.TelegramSent++;
                }

                if ((channel is "email" or "both") && !string.IsNullOrWhiteSpace(pref.NotifyEmail))
                {
                    var subject = NotificationService.BuildEmailSubject(currentAqi, currentRisk);
                    var html = NotificationService.BuildEmailHtml(
                        currentAqi, currentPm25, currentRisk, recommendation, pref.UserGroup);
                    emailSent = await _notify.SendEmailAsync(pref.NotifyEmail!, subject, html);
                    if (emailSent) result.EmailSent++;
                }

                var anySent = telegramSent || emailSent;

                var log = new AlertLog
                {
                    UserId = pref.UserId,
                    Aqi = currentAqi,
                    Pm25 = currentPm25,
                    Risk = currentRisk,
                    Message = recommendation,
                    AlertReason = BuildAlertReason(
                        currentAqi,
                        currentPm25,
                        currentRisk,
                        pref.NotifyThreshold,
                        pref.UserGroup),
                    RecommendedAction = BuildRecommendedAction(
                        currentAqi,
                        currentRisk,
                        recommendation,
                        pref.UserGroup),
                    Channel = channel,
                    SentToEmail = emailSent ? pref.NotifyEmail : null,
                    SentToTelegramChatId = telegramSent ? pref.TelegramChatId : null,
                    IsRead = false,
                    ReadAt = null,
                    Success = anySent,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.AlertLogs.Add(log);

                if (anySent)
                {
                    await _db.UserPreferences
                        .Where(x => x.UserId == pref.UserId)
                        .ExecuteUpdateAsync(s =>
                            s.SetProperty(x => x.LastAlertSentAt, DateTime.UtcNow));

                    result.Dispatched++;
                    _logger.LogInformation(
                        "Alert sent -> User {UserId} | Channel={Channel} | AQI={Aqi}",
                        pref.UserId, channel, currentAqi);
                }
            }

            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "Alert dispatch done: dispatched={D} telegram={T} email={E} skipped={S}",
                result.Dispatched, result.TelegramSent, result.EmailSent, result.Skipped);

            return result;
        }

        public async Task<List<AlertLogDto>> GetUserAlertHistoryAsync(
            int userId, int page = 1, int pageSize = 20, string status = "all")
        {
            var query = _db.AlertLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId);

            query = status.ToLower() switch
            {
                "unread" => query.Where(x => !x.IsRead && x.Success),
                "read" => query.Where(x => x.IsRead),
                "failed" => query.Where(x => !x.Success),
                _ => query,
            };

            var logs = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return logs.Select(x => new AlertLogDto
            {
                Id = x.Id,
                Aqi = x.Aqi,
                Pm25 = x.Pm25,
                Risk = x.Risk,
                Message = x.Message,
                AlertReason = string.IsNullOrWhiteSpace(x.AlertReason)
                    ? BuildAlertReason(x.Aqi, x.Pm25, x.Risk, null, null)
                    : x.AlertReason,
                RecommendedAction = string.IsNullOrWhiteSpace(x.RecommendedAction)
                    ? BuildRecommendedAction(x.Aqi, x.Risk, x.Message, null)
                    : x.RecommendedAction,
                Channel = x.Channel,
                SentToEmail = x.SentToEmail,
                SentToTelegramChatId = x.SentToTelegramChatId,
                IsRead = x.IsRead,
                ReadAt = x.ReadAt,
                Success = x.Success,
                CreatedAt = x.CreatedAt,
            }).ToList();
        }

        public async Task<AlertSummaryDto> GetUserAlertSummaryAsync(int userId)
        {
            var logs = await _db.AlertLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .ToListAsync();

            return new AlertSummaryDto
            {
                TotalSent = logs.Count(x => x.Success),
                TotalEmail = logs.Count(x => x.Success && (x.Channel == "email" || x.Channel == "both")),
                TotalTelegram = logs.Count(x => x.Success && (x.Channel == "telegram" || x.Channel == "both")),
                UnreadCount = logs.Count(x => !x.IsRead && x.Success),
                LastSentAt = logs.Where(x => x.Success)
                                     .OrderByDescending(x => x.CreatedAt)
                                     .Select(x => (DateTime?)x.CreatedAt)
                                     .FirstOrDefault(),
                LastSentEmail = logs.Where(x => x.Success && x.SentToEmail != null)
                                     .OrderByDescending(x => x.CreatedAt)
                                     .Select(x => x.SentToEmail)
                                     .FirstOrDefault(),
            };
        }

        public async Task MarkAllReadAsync(int userId)
        {
            var readAt = DateTime.UtcNow;
            await _db.AlertLogs
                .Where(x => x.UserId == userId && !x.IsRead)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.IsRead, true)
                    .SetProperty(x => x.ReadAt, readAt));
        }

        public async Task<bool> MarkReadAsync(int userId, int alertId)
        {
            var readAt = DateTime.UtcNow;
            var updated = await _db.AlertLogs
                .Where(x => x.UserId == userId && x.Id == alertId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.IsRead, true)
                    .SetProperty(x => x.ReadAt, readAt));

            return updated > 0;
        }

        private static string BuildAlertReason(
            int aqi,
            double pm25,
            string risk,
            int? threshold,
            string? userGroup)
        {
            var groupText = string.IsNullOrWhiteSpace(userGroup)
                ? "hồ sơ hiện tại"
                : GroupLabel(userGroup);
            var thresholdText = threshold.HasValue
                ? $" vượt ngưỡng cảnh báo AQI {threshold.Value}"
                : " vượt ngưỡng an toàn";

            if (aqi >= 200)
                return $"AQI {aqi}{thresholdText}; mức rủi ro rất cao cho {groupText}.";
            if (aqi >= 150)
                return $"AQI {aqi}{thresholdText}; không khí không tốt, PM2.5 {pm25:0.0} µg/m³.";
            if (risk == "UNHEALTHY_SENSITIVE" || aqi >= 100)
                return $"AQI {aqi}{thresholdText}; nhóm nhạy cảm có thể bị ảnh hưởng.";
            return $"AQI {aqi}{thresholdText}; hệ thống gửi cảnh báo theo cấu hình cá nhân.";
        }

        private static string BuildRecommendedAction(
            int aqi,
            string risk,
            string recommendation,
            string? userGroup)
        {
            var groupText = string.IsNullOrWhiteSpace(userGroup)
                ? "người dùng"
                : GroupLabel(userGroup).ToLower();

            if (aqi >= 200 || risk == "VERY_UNHEALTHY" || risk == "HAZARDOUS")
                return "Hạn chế ra ngoài, đóng cửa, bật lọc không khí nếu có và dùng khẩu trang N95/KN95 khi bắt buộc di chuyển.";
            if (aqi >= 150 || risk == "UNHEALTHY")
                return $"{Capitalize(groupText)} nên tránh hoạt động ngoài trời lâu; nếu phải đi, rút ngắn thời gian và đeo khẩu trang lọc tốt.";
            if (aqi >= 100 || risk == "UNHEALTHY_SENSITIVE")
                return $"{Capitalize(groupText)} nên giảm vận động mạnh ngoài trời và chọn khung giờ AQI thấp hơn.";
            if (!string.IsNullOrWhiteSpace(recommendation))
                return recommendation;
            return "Theo dõi dashboard và giữ cảnh báo bật nếu chất lượng không khí tiếp tục xấu đi.";
        }

        private static string GroupLabel(string userGroup) => userGroup.ToLower() switch
        {
            "child" => "trẻ em",
            "elderly" => "người cao tuổi",
            "respiratory" => "người bệnh hô hấp",
            "pregnant" => "thai phụ",
            _ => "người dùng phổ thông",
        };

        private static string Capitalize(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return value;
            return char.ToUpper(value[0]) + value[1..];
        }
    }

    // DTOs

    public class AlertLogDto
    {
        public int Id { get; set; }
        public int Aqi { get; set; }
        public double Pm25 { get; set; }
        public string Risk { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string AlertReason { get; set; } = string.Empty;
        public string RecommendedAction { get; set; } = string.Empty;
        public string Channel { get; set; } = string.Empty;
        public string? SentToEmail { get; set; }
        public string? SentToTelegramChatId { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public bool Success { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AlertSummaryDto
    {
        public int TotalSent { get; set; }
        public int TotalEmail { get; set; }
        public int TotalTelegram { get; set; }
        public int UnreadCount { get; set; }
        public DateTime? LastSentAt { get; set; }
        public string? LastSentEmail { get; set; }
    }

    public class AlertDispatchResult
    {
        public int Aqi { get; set; }
        public double Pm25 { get; set; }
        public string Risk { get; set; } = string.Empty;
        public int Dispatched { get; set; }
        public int TelegramSent { get; set; }
        public int EmailSent { get; set; }
        public int Skipped { get; set; }
    }
}