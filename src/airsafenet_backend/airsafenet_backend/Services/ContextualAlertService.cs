using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
using airsafenet_backend.DTOs.Alerts;
using airsafenet_backend.DTOs.Dashboard;
using airsafenet_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Services
{
    public class ContextualAlertService
    {
        private readonly AppDbContext _db;
        private readonly AiCachedService _aiService;
        private readonly DataSourceHealthService _dataSourceService;
        private readonly ILogger<ContextualAlertService> _logger;

        private const int MaxAlerts = 6;

        public ContextualAlertService(
            AppDbContext db,
            AiCachedService aiService,
            DataSourceHealthService dataSourceService,
            ILogger<ContextualAlertService> logger)
        {
            _db = db;
            _aiService = aiService;
            _dataSourceService = dataSourceService;
            _logger = logger;
        }

        public async Task<ContextualAlertResponse> GetContextualAlertsAsync(
            int userId,
            CancellationToken cancellationToken = default)
        {
            var now = DateTime.Now;

            var prefs = await _db.UserPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
            var userGroup = prefs?.UserGroup ?? "normal";

            var schedules = await _db.UserActivitySchedules
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.IsActive)
                .ToListAsync(cancellationToken);

            var familyProfiles = await _db.FamilyProfiles
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.NotifyEnabled)
                .ToListAsync(cancellationToken);

            var response = new ContextualAlertResponse
            {
                GeneratedAt = DateTime.UtcNow,
                UserGroup = userGroup,
            };

            AiRangeResponse? forecast = null;
            AiHistoryResponse? history = null;
            try
            {
                forecast = await _aiService.GetForecastRangeAsync(userGroup, 1);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cannot load forecast for contextual alerts");
            }

            try
            {
                history = await _aiService.GetHistoryAsync(userGroup, 7);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cannot load 7-day history for contextual alerts");
            }

            if (forecast?.Forecast == null || forecast.Forecast.Count == 0)
            {
                response.IsFallback = true;
                response.DataLabel = "stale";
                response.SourceConfidence = 35;
                response.StatusMessage = "Forecast cache chưa sẵn sàng nên chưa sinh được cảnh báo ngữ cảnh.";
                return response;
            }

            var points = ParseForecast(forecast.Forecast)
                .OrderBy(x => x.Time)
                .ToList();

            var generatedAt = DateTime.TryParse(forecast.GeneratedAt, out var parsedGeneratedAt)
                ? parsedGeneratedAt
                : DateTime.UtcNow;

            var source = await BuildSourceHealthAsync(generatedAt, points.Count, cancellationToken);
            response.DataLabel = source.ActiveLabel;
            response.PrimarySource = source.PrimarySource;
            response.SourceConfidence = source.OverallConfidence;
            response.IsFallback = source.IsStale || source.OverallStatus is "fallback" or "stale";
            response.StatusMessage = source.IsStale
                ? $"Dữ liệu đang stale ({source.FreshnessLabel}); cảnh báo chỉ nên dùng như tham khảo."
                : "Cảnh báo được sinh từ forecast hiện tại, lịch hoạt động và hồ sơ sức khỏe.";

            var alerts = new List<ContextualAlertItemResponse>();

            AddScheduleAlerts(alerts, schedules, points, now, userGroup, source);
            AddFamilyProfileAlerts(alerts, familyProfiles, points, now, source);
            AddPm25SpikeAlert(alerts, points, now, source);
            AddSevenDayTrendAlert(alerts, points, history, now, source);

            response.Alerts = alerts
                .GroupBy(x => $"{x.Category}:{x.TargetTime:yyyyMMddHH}")
                .Select(g => g
                    .OrderByDescending(x => SeverityRank(x.Severity))
                    .ThenByDescending(x => x.Confidence)
                    .First())
                .OrderByDescending(x => SeverityRank(x.Severity))
                .ThenBy(x => x.TargetTime ?? DateTime.MaxValue)
                .Take(MaxAlerts)
                .ToList();

            return response;
        }

        private async Task<DataSourceHealthResponse> BuildSourceHealthAsync(
            DateTime generatedAt,
            int pointCount,
            CancellationToken cancellationToken)
        {
            try
            {
                return await _dataSourceService.BuildDashboardSourceAsync(
                    "forecast",
                    generatedAt,
                    pointCount,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cannot build source health for contextual alerts");
                return new DataSourceHealthResponse
                {
                    GeneratedAt = DateTime.UtcNow,
                    OverallStatus = "fallback",
                    ActiveLabel = "forecast",
                    OverallConfidence = 62,
                    IsStale = false,
                    FreshnessLabel = "Không kiểm tra được nguồn phụ",
                    PrimarySource = "AirSafeNet AI cache",
                };
            }
        }

        private static void AddScheduleAlerts(
            List<ContextualAlertItemResponse> alerts,
            IEnumerable<UserActivitySchedule> schedules,
            IReadOnlyList<ForecastPoint> points,
            DateTime now,
            string userGroup,
            DataSourceHealthResponse source)
        {
            foreach (var schedule in schedules)
            {
                var targetTime = NextOccurrence(schedule, now);
                if (targetTime == null || targetTime.Value > now.AddHours(24)) continue;

                var point = NearestPoint(points, targetTime.Value);
                if (point == null) continue;

                var score = ActivityRiskScore(point, schedule, userGroup);
                var isSchool = IsSchoolActivity(schedule.Name) || userGroup.Equals("child", StringComparison.OrdinalIgnoreCase);
                var isExercise = IsExerciseActivity(schedule.Name) || schedule.Intensity.Equals("high", StringComparison.OrdinalIgnoreCase);
                var isRespiratory = userGroup.Equals("respiratory", StringComparison.OrdinalIgnoreCase);
                var shouldAlert =
                    schedule.IsOutdoor &&
                    targetTime.Value <= now.AddHours(8) &&
                    (score >= 40 || point.Aqi >= 95 || point.Pm25 >= 30);

                if (!shouldAlert && !(isRespiratory && schedule.IsOutdoor && score >= 32)) continue;

                var category = isSchool
                    ? "school"
                    : isRespiratory
                        ? "respiratory-schedule"
                        : isExercise
                            ? "exercise"
                            : "outdoor-schedule";
                var title = BuildScheduleTitle(schedule, category);
                var best = FindBetterPoint(points, now, point, targetTime.Value);
                var severity = SeverityFor(point.Aqi, point.Pm25, score);

                alerts.Add(new ContextualAlertItemResponse
                {
                    Id = $"schedule-{schedule.Id}-{targetTime.Value:yyyyMMddHHmm}",
                    Severity = severity,
                    Category = category,
                    Title = title,
                    Reason = BuildScheduleReason(schedule, point, userGroup, targetTime.Value, score),
                    RecommendedAction = BuildScheduleAction(schedule, category, point, targetTime.Value, best),
                    Trigger = "forecast",
                    TriggerLabel = "Forecast + lịch cá nhân",
                    TargetTime = targetTime.Value,
                    RecommendedTime = best?.Time,
                    Aqi = point.Aqi,
                    Pm25 = Math.Round(point.Pm25, 1),
                    Confidence = AdjustConfidence(source.OverallConfidence, severity == "critical" ? 6 : 2),
                    DataLabel = source.ActiveLabel,
                    Evidence = new List<string>
                    {
                        $"Lịch: {schedule.Name} lúc {FormatTime(targetTime.Value)}, {schedule.DurationMinutes} phút.",
                        $"AQI {point.Aqi}, PM2.5 {point.Pm25:0.0} µg/m³ tại khung gần nhất.",
                        $"Nhóm sức khỏe: {GroupLabel(userGroup)}; cường độ {IntensityLabel(schedule.Intensity)}.",
                    },
                });
            }
        }

        private static void AddFamilyProfileAlerts(
            List<ContextualAlertItemResponse> alerts,
            IEnumerable<FamilyProfile> familyProfiles,
            IReadOnlyList<ForecastPoint> points,
            DateTime now,
            DataSourceHealthResponse source)
        {
            var nextSixHours = points
                .Where(x => x.Time >= now.AddMinutes(-30) && x.Time <= now.AddHours(6))
                .OrderByDescending(x => x.Aqi)
                .ThenByDescending(x => x.Pm25)
                .ToList();

            if (nextSixHours.Count == 0) return;

            var peak = nextSixHours.First();
            var best = FindBetterPoint(points, now, peak, peak.Time);

            foreach (var profile in familyProfiles.Take(4))
            {
                var group = profile.UserGroup.ToLowerInvariant();
                if (group is not ("child" or "elderly" or "respiratory" or "pregnant")) continue;

                var threshold = Math.Min(Math.Max(profile.NotifyThreshold, 75), 150);
                if (peak.Aqi < threshold && peak.Pm25 < 30) continue;

                var category = group switch
                {
                    "child" => "family-child-school",
                    "respiratory" => "family-respiratory",
                    "elderly" => "family-elderly",
                    "pregnant" => "family-pregnant",
                    _ => "family-sensitive",
                };

                alerts.Add(new ContextualAlertItemResponse
                {
                    Id = $"family-{profile.Id}-{peak.Time:yyyyMMddHH}",
                    Severity = SeverityFor(peak.Aqi, peak.Pm25, peak.Aqi >= 150 ? 65 : 45),
                    Category = category,
                    Title = BuildFamilyTitle(profile),
                    Reason = $"{profile.DisplayName} thuộc nhóm {GroupLabel(profile.UserGroup)}; forecast trong 6 giờ tới lên AQI {peak.Aqi}, PM2.5 {peak.Pm25:0.0} µg/m³.",
                    RecommendedAction = BuildFamilyAction(profile, best),
                    Trigger = "forecast",
                    TriggerLabel = "Forecast + Family Profile",
                    TargetTime = peak.Time,
                    RecommendedTime = best?.Time,
                    Aqi = peak.Aqi,
                    Pm25 = Math.Round(peak.Pm25, 1),
                    Confidence = AdjustConfidence(source.OverallConfidence, 1),
                    DataLabel = source.ActiveLabel,
                    Evidence = new List<string>
                    {
                        $"Hồ sơ: {profile.DisplayName} - {GroupLabel(profile.UserGroup)}.",
                        $"Ngưỡng cá nhân: AQI {profile.NotifyThreshold}.",
                        $"Đỉnh 6 giờ tới: {FormatTime(peak.Time)}.",
                    },
                });
            }
        }

        private static void AddPm25SpikeAlert(
            List<ContextualAlertItemResponse> alerts,
            IReadOnlyList<ForecastPoint> points,
            DateTime now,
            DataSourceHealthResponse source)
        {
            var baseline = points
                .Where(x => x.Time >= now.AddMinutes(-60))
                .OrderBy(x => Math.Abs((x.Time - now).TotalMinutes))
                .FirstOrDefault();
            if (baseline == null) return;

            var horizon = points
                .Where(x => x.Time > baseline.Time && x.Time <= baseline.Time.AddHours(2))
                .OrderByDescending(x => x.Pm25 - baseline.Pm25)
                .FirstOrDefault();
            if (horizon == null) return;

            var delta = horizon.Pm25 - baseline.Pm25;
            var relative = baseline.Pm25 <= 0 ? 1 : delta / baseline.Pm25;
            if (delta < 10 || relative < 0.25) return;

            var stayInsideUntil = points
                .Where(x => x.Time > horizon.Time && x.Time <= horizon.Time.AddHours(6))
                .OrderBy(x => x.Time)
                .FirstOrDefault(x => x.Pm25 <= baseline.Pm25 + 5 || x.Aqi <= Math.Max(80, baseline.Aqi));

            var until = stayInsideUntil?.Time ?? horizon.Time.AddHours(2);

            alerts.Add(new ContextualAlertItemResponse
            {
                Id = $"pm25-spike-{horizon.Time:yyyyMMddHH}",
                Severity = horizon.Aqi >= 150 || horizon.Pm25 >= 45 ? "warning" : "watch",
                Category = "pm25-spike",
                Title = "PM2.5 tăng bất thường trong 1-2 giờ tới",
                Reason = $"PM2.5 dự kiến tăng {delta:0.0} µg/m³ từ {baseline.Pm25:0.0} lên {horizon.Pm25:0.0} µg/m³ quanh {FormatTime(horizon.Time)}.",
                RecommendedAction = $"Ở trong nhà đến {FormatTime(until)}; nếu bắt buộc ra ngoài, đeo N95/KN95 và tránh vận động mạnh.",
                Trigger = "real-time spike",
                TriggerLabel = "PM2.5 spike forecast",
                TargetTime = horizon.Time,
                RecommendedTime = until,
                Aqi = horizon.Aqi,
                Pm25 = Math.Round(horizon.Pm25, 1),
                Confidence = AdjustConfidence(source.OverallConfidence, 4),
                DataLabel = source.ActiveLabel,
                Evidence = new List<string>
                {
                    $"Mốc hiện tại: {FormatTime(baseline.Time)}, PM2.5 {baseline.Pm25:0.0} µg/m³.",
                    $"Mốc spike: {FormatTime(horizon.Time)}, PM2.5 {horizon.Pm25:0.0} µg/m³.",
                    $"Biên độ tăng: {delta:0.0} µg/m³ trong tối đa 2 giờ.",
                },
            });
        }

        private static void AddSevenDayTrendAlert(
            List<ContextualAlertItemResponse> alerts,
            IReadOnlyList<ForecastPoint> points,
            AiHistoryResponse? history,
            DateTime now,
            DataSourceHealthResponse source)
        {
            if (history?.History == null || history.History.Count < 12) return;

            var historyPoints = ParseHistory(history.History).ToList();
            if (historyPoints.Count < 12) return;

            var today = points
                .Where(x => x.Time >= now.AddMinutes(-30) && x.Time <= now.AddHours(24))
                .Take(24)
                .ToList();
            if (today.Count < 6) return;

            var todayAvg = today.Average(x => x.Pm25);
            var sevenDayAvg = historyPoints.Average(x => x.Pm25);
            var diff = todayAvg - sevenDayAvg;
            if (diff < 8 && todayAvg < sevenDayAvg * 1.2) return;

            var peak = today.OrderByDescending(x => x.Pm25).First();
            var best = FindBestPoint(points, now);
            var severity = todayAvg >= 35 || diff >= 15 ? "warning" : "watch";

            alerts.Add(new ContextualAlertItemResponse
            {
                Id = $"trend-7day-{now:yyyyMMdd}",
                Severity = severity,
                Category = "seven-day-trend",
                Title = "Hôm nay xấu hơn trung bình 7 ngày",
                Reason = $"PM2.5 trung bình 24h hôm nay khoảng {todayAvg:0.0} µg/m³, cao hơn trung bình 7 ngày {sevenDayAvg:0.0} µg/m³.",
                RecommendedAction = best == null
                    ? "Giữ hoạt động ngoài trời dưới 30 phút và đeo N95/KF94 nếu phải ra ngoài."
                    : $"Giữ hoạt động ngoài trời dưới 30 phút; ưu tiên khung {FormatTime(best.Time)} và đeo N95/KF94 nếu AQI vượt 100.",
                Trigger = "forecast",
                TriggerLabel = "Forecast vs 7-day baseline",
                TargetTime = peak.Time,
                RecommendedTime = best?.Time,
                Aqi = peak.Aqi,
                Pm25 = Math.Round(peak.Pm25, 1),
                Confidence = AdjustConfidence(source.OverallConfidence, historyPoints.Count >= 48 ? 3 : -4),
                DataLabel = source.ActiveLabel,
                Evidence = new List<string>
                {
                    $"Trung bình hôm nay: PM2.5 {todayAvg:0.0} µg/m³.",
                    $"Trung bình 7 ngày: PM2.5 {sevenDayAvg:0.0} µg/m³.",
                    $"Đỉnh hôm nay quanh {FormatTime(peak.Time)}.",
                },
            });
        }

        private static IEnumerable<ForecastPoint> ParseForecast(IEnumerable<AiForecastItem> items)
        {
            foreach (var item in items)
            {
                if (!DateTime.TryParse(item.Time, out var time)) continue;
                yield return new ForecastPoint(
                    time,
                    item.PredPm25,
                    item.PredAqi,
                    item.RiskProfile,
                    item.RecommendationProfile);
            }
        }

        private static IEnumerable<ForecastPoint> ParseHistory(IEnumerable<AiHistoryItem> items)
        {
            foreach (var item in items)
            {
                if (!DateTime.TryParse(item.Time, out var time)) continue;
                yield return new ForecastPoint(
                    time,
                    item.Pm25,
                    item.Aqi,
                    item.RiskProfile,
                    item.RecommendationProfile);
            }
        }

        private static DateTime? NextOccurrence(UserActivitySchedule schedule, DateTime now)
        {
            for (var dayOffset = 0; dayOffset <= 1; dayOffset++)
            {
                var date = now.Date.AddDays(dayOffset);
                if (!RunsOnDay(schedule, ToDayNumber(date.DayOfWeek))) continue;

                var start = date
                    .AddHours(schedule.HourOfDay)
                    .AddMinutes(schedule.Minute);
                var end = start.AddMinutes(schedule.DurationMinutes);

                if (end >= now.AddMinutes(-10) && start <= now.AddHours(24))
                    return start;
            }

            return null;
        }

        private static bool RunsOnDay(UserActivitySchedule schedule, int dayNumber)
        {
            return schedule.DaysOfWeek
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(x => int.TryParse(x, out var value) ? value : -1)
                .Contains(dayNumber);
        }

        private static int ToDayNumber(DayOfWeek dayOfWeek) =>
            dayOfWeek == DayOfWeek.Sunday ? 7 : (int)dayOfWeek;

        private static ForecastPoint? NearestPoint(
            IReadOnlyList<ForecastPoint> points,
            DateTime target)
        {
            return points
                .OrderBy(x => Math.Abs((x.Time - target).TotalMinutes))
                .FirstOrDefault();
        }

        private static ForecastPoint? FindBetterPoint(
            IReadOnlyList<ForecastPoint> points,
            DateTime now,
            ForecastPoint current,
            DateTime targetTime)
        {
            var candidates = points
                .Where(x => x.Time >= now.AddMinutes(30) && x.Time <= now.AddHours(24))
                .Where(x => Math.Abs((x.Time - targetTime).TotalMinutes) >= 45)
                .OrderBy(x => x.Aqi)
                .ThenBy(x => x.Pm25)
                .ThenBy(x => Math.Abs((x.Time - targetTime).TotalMinutes))
                .ToList();

            return candidates.FirstOrDefault(x =>
                       x.Aqi <= current.Aqi - 10 ||
                       x.Pm25 <= current.Pm25 - 5 ||
                       x.Aqi <= 80)
                   ?? candidates.FirstOrDefault();
        }

        private static ForecastPoint? FindBestPoint(
            IReadOnlyList<ForecastPoint> points,
            DateTime now)
        {
            return points
                .Where(x => x.Time >= now.AddMinutes(30) && x.Time <= now.AddHours(24))
                .OrderBy(x => x.Aqi)
                .ThenBy(x => x.Pm25)
                .ThenBy(x => x.Time)
                .FirstOrDefault();
        }

        private static double ActivityRiskScore(
            ForecastPoint point,
            UserActivitySchedule schedule,
            string userGroup)
        {
            var baseScore = AqiToRiskScore(point.Aqi);
            var groupMultiplier = userGroup.ToLowerInvariant() switch
            {
                "child" => 1.4,
                "elderly" => 1.3,
                "respiratory" => 1.5,
                "pregnant" => 1.35,
                _ => 1.0,
            };
            var intensityMultiplier = schedule.Intensity.ToLowerInvariant() switch
            {
                "high" => 1.4,
                "moderate" => 1.15,
                _ => 1.0,
            };
            var outdoorMultiplier = schedule.IsOutdoor ? 1.0 : 0.35;

            return Math.Min(100, baseScore * groupMultiplier * intensityMultiplier * outdoorMultiplier);
        }

        private static double AqiToRiskScore(int aqi) => aqi switch
        {
            <= 50 => aqi * 0.4,
            <= 100 => 20 + (aqi - 50) * 0.4,
            <= 150 => 40 + (aqi - 100) * 0.4,
            <= 200 => 60 + (aqi - 150) * 0.3,
            <= 300 => 75 + (aqi - 200) * 0.15,
            _ => Math.Min(100, 90 + (aqi - 300) * 0.1),
        };

        private static string SeverityFor(int aqi, double pm25, double score)
        {
            if (aqi >= 200 || pm25 >= 55 || score >= 75) return "critical";
            if (aqi >= 150 || pm25 >= 35 || score >= 60) return "warning";
            if (aqi >= 100 || pm25 >= 25 || score >= 40) return "watch";
            return "info";
        }

        private static int SeverityRank(string severity) => severity switch
        {
            "critical" => 4,
            "warning" => 3,
            "watch" => 2,
            "info" => 1,
            _ => 0,
        };

        private static int AdjustConfidence(int sourceConfidence, int delta) =>
            Math.Clamp(sourceConfidence + delta, 35, 96);

        private static string BuildScheduleTitle(
            UserActivitySchedule schedule,
            string category)
        {
            return category switch
            {
                "school" => "Trẻ em sắp đi học: cần đổi cách di chuyển",
                "respiratory-schedule" => "Lịch ra ngoài của người bệnh hô hấp đang rủi ro",
                "exercise" => $"{schedule.Name}: rủi ro phơi nhiễm khi vận động mạnh",
                _ => $"{schedule.Name}: hoạt động ngoài trời cần điều chỉnh",
            };
        }

        private static string BuildScheduleReason(
            UserActivitySchedule schedule,
            ForecastPoint point,
            string userGroup,
            DateTime targetTime,
            double score)
        {
            return $"{schedule.Name} lúc {FormatTime(targetTime)} là hoạt động {(schedule.IsOutdoor ? "ngoài trời" : "trong nhà")}; forecast gần khung này AQI {point.Aqi}, PM2.5 {point.Pm25:0.0} µg/m³, risk score cá nhân {score:0}/100 cho {GroupLabel(userGroup)}.";
        }

        private static string BuildScheduleAction(
            UserActivitySchedule schedule,
            string category,
            ForecastPoint point,
            DateTime targetTime,
            ForecastPoint? best)
        {
            var bestTime = best == null ? null : FormatTime(best.Time);
            var shortDuration = Math.Min(30, Math.Max(15, schedule.DurationMinutes));

            if (category == "school")
            {
                if (bestTime != null && point.Aqi >= 120)
                    return $"Cho trẻ đeo N95/KF94 khi đi học; dời hoạt động thể dục/ra chơi ngoài trời sang {bestTime} và tránh đứng ngoài cổng trường lâu.";
                return "Cho trẻ đeo KF94/N95 nếu phải đi qua đường đông xe; giảm ra chơi ngoài trời còn 15-20 phút.";
            }

            if (category == "respiratory-schedule")
            {
                if (bestTime != null)
                    return $"Ở trong nhà đến {bestTime}; nếu bắt buộc ra ngoài lúc {FormatTime(targetTime)}, đeo N95/KN95, mang thuốc theo chỉ định và đi ngắn dưới 30 phút.";
                return $"Nếu bắt buộc ra ngoài lúc {FormatTime(targetTime)}, đeo N95/KN95 và giảm thời lượng còn {shortDuration} phút.";
            }

            if (category == "exercise")
            {
                if (bestTime != null)
                    return $"Dời {schedule.Name.ToLower()} sang {bestTime}; nếu vẫn làm lúc {FormatTime(targetTime)}, giảm thời lượng còn {shortDuration} phút và giữ cường độ thấp.";
                return $"Giảm thời lượng còn {shortDuration} phút, tránh chạy nước rút/đá bóng cường độ cao và đeo N95 khi AQI vượt 100.";
            }

            if (bestTime != null)
                return $"Dời sang {bestTime}; nếu không đổi được, đeo N95/KF94 và giảm thời lượng ngoài trời còn {shortDuration} phút.";

            return $"Đeo N95/KF94, đi tuyến ngắn nhất và giảm thời lượng ngoài trời còn {shortDuration} phút.";
        }

        private static string BuildFamilyTitle(FamilyProfile profile)
        {
            return profile.UserGroup.ToLowerInvariant() switch
            {
                "child" => $"{profile.DisplayName}: chú ý giờ đi học/hoạt động ngoài trời",
                "respiratory" => $"{profile.DisplayName}: hạn chế lịch ra ngoài vì hô hấp nhạy cảm",
                "elderly" => $"{profile.DisplayName}: nên đổi giờ đi bộ/đi chợ",
                "pregnant" => $"{profile.DisplayName}: ưu tiên tránh khung AQI cao",
                _ => $"{profile.DisplayName}: cảnh báo nhóm nhạy cảm",
            };
        }

        private static string BuildFamilyAction(
            FamilyProfile profile,
            ForecastPoint? best)
        {
            var bestTime = best == null ? null : FormatTime(best.Time);
            return profile.UserGroup.ToLowerInvariant() switch
            {
                "child" when bestTime != null =>
                    $"Nếu sắp đi học, cho {profile.DisplayName} đeo N95/KF94, đi thẳng vào lớp; dời thể dục/đá bóng ngoài trời sang {bestTime}.",
                "child" =>
                    $"Cho {profile.DisplayName} đeo N95/KF94 khi đi học và giảm ra chơi ngoài trời còn 15-20 phút.",
                "respiratory" when bestTime != null =>
                    $"Nếu {profile.DisplayName} có lịch ra ngoài, ở trong nhà đến {bestTime}; khi bắt buộc đi, đeo N95/KN95 và mang thuốc theo chỉ định.",
                "respiratory" =>
                    $"Giữ {profile.DisplayName} trong nhà nếu có thể; khi ra ngoài phải đeo N95/KN95 và đi dưới 30 phút.",
                "elderly" when bestTime != null =>
                    $"Dời việc đi bộ/đi chợ của {profile.DisplayName} sang {bestTime}; nếu phải đi ngay, đi chậm dưới 30 phút và đeo KF94/N95.",
                "pregnant" when bestTime != null =>
                    $"Dời lịch ra ngoài sang {bestTime}; nếu phải đi, đeo N95/KF94 và tránh đứng ngoài trời lâu.",
                _ =>
                    "Hạn chế ngoài trời, đeo N95/KF94 nếu phải di chuyển và theo dõi triệu chứng bất thường.",
            };
        }

        private static bool IsSchoolActivity(string value) =>
            ContainsAny(value, "đi học", "di hoc", "school", "lớp", "lop", "trường", "truong", "đón con", "don con");

        private static bool IsExerciseActivity(string value) =>
            ContainsAny(value, "chạy", "chay", "run", "jog", "đá bóng", "da bong", "football", "soccer", "tập", "tap", "gym", "thể dục", "the duc");

        private static bool ContainsAny(string value, params string[] needles)
        {
            return needles.Any(needle => value.Contains(needle, StringComparison.OrdinalIgnoreCase));
        }

        private static string GroupLabel(string userGroup) => userGroup.ToLowerInvariant() switch
        {
            "child" => "trẻ em",
            "elderly" => "người cao tuổi",
            "respiratory" => "người bệnh hô hấp",
            "pregnant" => "phụ nữ mang thai",
            _ => "người dùng phổ thông",
        };

        private static string IntensityLabel(string intensity) => intensity.ToLowerInvariant() switch
        {
            "high" => "cao",
            "low" => "nhẹ",
            _ => "vừa",
        };

        private static string FormatTime(DateTime value) =>
            value.ToString("HH:mm");

        private sealed record ForecastPoint(
            DateTime Time,
            double Pm25,
            int Aqi,
            string Risk,
            string Recommendation);
    }
}
