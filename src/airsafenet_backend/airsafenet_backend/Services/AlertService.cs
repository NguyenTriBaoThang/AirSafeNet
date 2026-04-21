using airsafenet_backend.Data;
using airsafenet_backend.Services;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Services
{
    /// <summary>
    /// Core alert logic:
    ///   1. Nhận AQI + PM2.5 + risk hiện tại từ AI Server cache
    ///   2. Tìm tất cả user bật notify + đúng ngưỡng
    ///   3. Anti-spam: chỉ gửi nếu chưa gửi trong 4 giờ
    ///   4. Dispatch qua Telegram / Email / both
    /// </summary>
    public class AlertService
    {
        private readonly AppDbContext _db;
        private readonly NotificationService _notify;
        private readonly ILogger<AlertService> _logger;

        private const int MIN_ALERT_INTERVAL_HOURS = 4;

        public AlertService(
            AppDbContext db,
            NotificationService notify,
            ILogger<AlertService> logger)
        {
            _db = db;
            _notify = notify;
            _logger = logger;
        }

        public async Task<AlertDispatchResult> DispatchAlertsAsync(
            int currentAqi,
            double currentPm25,
            string currentRisk,
            string recommendation)
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
                    _logger.LogDebug(
                        "Skip user {UserId} — đã gửi {Ago:F1}h trước",
                        pref.UserId,
                        (DateTime.UtcNow - pref.LastAlertSentAt.Value).TotalHours);
                    result.Skipped++;
                    continue;
                }

                var sent = false;
                var channel = pref.NotifyChannel.ToLower();

                if ((channel == "telegram" || channel == "both")
                    && !string.IsNullOrWhiteSpace(pref.TelegramChatId))
                {
                    var msg = NotificationService.BuildTelegramMessage(
                        currentAqi, currentPm25, currentRisk, recommendation, pref.UserGroup);

                    var ok = await _notify.SendTelegramAsync(pref.TelegramChatId!, msg);
                    if (ok) { sent = true; result.TelegramSent++; }
                }

                if ((channel == "email" || channel == "both")
                    && !string.IsNullOrWhiteSpace(pref.NotifyEmail))
                {
                    var subject = NotificationService.BuildEmailSubject(currentAqi, currentRisk);
                    var html = NotificationService.BuildEmailHtml(
                        currentAqi, currentPm25, currentRisk, recommendation, pref.UserGroup);

                    var ok = await _notify.SendEmailAsync(pref.NotifyEmail!, subject, html);
                    if (ok) { sent = true; result.EmailSent++; }
                }

                if (sent)
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

            _logger.LogInformation(
                "Alert dispatch done: dispatched={D} telegram={T} email={E} skipped={S}",
                result.Dispatched, result.TelegramSent, result.EmailSent, result.Skipped);

            return result;
        }
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