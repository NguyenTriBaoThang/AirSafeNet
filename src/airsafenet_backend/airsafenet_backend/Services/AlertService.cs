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
                "Alert check: AQI={Aqi} — {Count} user vượt ngưỡng",
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
                    Channel = channel,
                    SentToEmail = emailSent ? pref.NotifyEmail : null,
                    SentToTelegramChatId = telegramSent ? pref.TelegramChatId : null,
                    IsRead = false,
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
                        "Alert sent → User {UserId} | Channel={Channel} | AQI={Aqi}",
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
            int userId, int page = 1, int pageSize = 20)
        {
            return await _db.AlertLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new AlertLogDto
                {
                    Id = x.Id,
                    Aqi = x.Aqi,
                    Pm25 = x.Pm25,
                    Risk = x.Risk,
                    Message = x.Message,
                    Channel = x.Channel,
                    SentToEmail = x.SentToEmail,
                    SentToTelegramChatId = x.SentToTelegramChatId,
                    IsRead = x.IsRead,
                    Success = x.Success,
                    CreatedAt = x.CreatedAt,
                })
                .ToListAsync();
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
            await _db.AlertLogs
                .Where(x => x.UserId == userId && !x.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsRead, true));
        }
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public class AlertLogDto
    {
        public int Id { get; set; }
        public int Aqi { get; set; }
        public double Pm25 { get; set; }
        public string Risk { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Channel { get; set; } = string.Empty;
        public string? SentToEmail { get; set; }
        public string? SentToTelegramChatId { get; set; }
        public bool IsRead { get; set; }
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
