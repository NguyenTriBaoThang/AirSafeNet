using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
using airsafenet_backend.DTOs.Dashboard;
using airsafenet_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Services
{
    public class ForecastAccuracyService
    {
        private readonly AppDbContext _db;
        private readonly AiCachedService _aiService;
        private readonly ILogger<ForecastAccuracyService> _logger;

        private const int MinLeadHours = 12;
        private const int MaxLeadHours = 36;
        private const int MinMatchedHours = 3;
        private const double Pm25Tolerance = 10.0;
        private const int AqiTolerance = 25;

        public ForecastAccuracyService(
            AppDbContext db,
            AiCachedService aiService,
            ILogger<ForecastAccuracyService> logger)
        {
            _db = db;
            _aiService = aiService;
            _logger = logger;
        }

        public async Task RecordSnapshotAsync(string userGroup, AiRangeResponse forecast)
        {
            if (forecast.Forecast.Count == 0) return;

            var issuedAt = ParseDateTime(forecast.GeneratedAt) ?? DateTime.UtcNow;
            var targets = forecast.Forecast
                .Select(x => new { Item = x, Target = ParseDateTime(x.Time) })
                .Where(x => x.Target.HasValue)
                .Select(x => new { x.Item, Target = RoundToHour(x.Target!.Value) })
                .ToList();

            if (targets.Count == 0) return;

            var targetTimes = targets.Select(x => x.Target).Distinct().ToList();
            var existingTargets = await _db.ForecastSnapshots
                .AsNoTracking()
                .Where(x => x.UserGroup == userGroup && x.IssuedAt == issuedAt && targetTimes.Contains(x.TargetTime))
                .Select(x => x.TargetTime)
                .ToListAsync();

            var existingSet = existingTargets.ToHashSet();
            var now = DateTime.UtcNow;
            var snapshots = targets
                .Where(x => !existingSet.Contains(x.Target))
                .Select(x => new ForecastSnapshot
                {
                    UserGroup = userGroup,
                    IssuedAt = issuedAt,
                    TargetTime = x.Target,
                    PredictedPm25 = x.Item.PredPm25,
                    PredictedAqi = x.Item.PredAqi,
                    Risk = x.Item.RiskProfile,
                    Recommendation = x.Item.RecommendationProfile,
                    ForecastHorizonHours = Math.Max(0, (int)Math.Round((x.Target - issuedAt).TotalHours)),
                    SnapshotCreatedAt = now,
                })
                .ToList();

            if (snapshots.Count == 0) return;

            _db.ForecastSnapshots.AddRange(snapshots);
            await _db.SaveChangesAsync();

            await CleanupOldSnapshotsAsync(userGroup);
            _logger.LogInformation(
                "Recorded {Count} forecast snapshots for {UserGroup} issued at {IssuedAt}",
                snapshots.Count,
                userGroup,
                issuedAt);
        }

        public async Task<ForecastAccuracyResponse> GetAccuracyAsync(string userGroup)
        {
            var history = await _aiService.GetHistoryAsync(userGroup, 3);
            if (history == null || history.History.Count == 0)
            {
                return BuildCollectingResponse(userGroup, 0, "Chưa có history thực tế để so sánh forecast.");
            }

            var actualPoints = history.History
                .Select(x => new { Item = x, Time = ParseDateTime(x.Time) })
                .Where(x => x.Time.HasValue)
                .Select(x => new ActualPoint(
                    RoundToHour(x.Time!.Value),
                    x.Item.Pm25,
                    x.Item.Aqi))
                .GroupBy(x => x.Time)
                .Select(g => g.OrderByDescending(x => x.Time).First())
                .Where(x => x.Time <= DateTime.UtcNow.AddMinutes(15))
                .OrderBy(x => x.Time)
                .ToList();

            if (actualPoints.Count == 0)
            {
                var snapshotCount = await _db.ForecastSnapshots.CountAsync(x => x.UserGroup == userGroup);
                return BuildCollectingResponse(userGroup, snapshotCount, "History chưa có điểm thực tế đã xảy ra.");
            }

            var windowStart = actualPoints.Max(x => x.Time).AddHours(-24);
            actualPoints = actualPoints.Where(x => x.Time >= windowStart).ToList();

            var minTarget = actualPoints.Min(x => x.Time);
            var maxTarget = actualPoints.Max(x => x.Time);
            var snapshots = await _db.ForecastSnapshots
                .AsNoTracking()
                .Where(x =>
                    x.UserGroup == userGroup &&
                    x.TargetTime >= minTarget &&
                    x.TargetTime <= maxTarget)
                .ToListAsync();

            var pairs = new List<ForecastAccuracyPointResponse>();
            foreach (var actual in actualPoints)
            {
                var candidate = snapshots
                    .Where(x => x.TargetTime == actual.Time)
                    .Select(x => new { Snapshot = x, LeadHours = (actual.Time - x.IssuedAt).TotalHours })
                    .Where(x => x.LeadHours >= MinLeadHours && x.LeadHours <= MaxLeadHours)
                    .OrderBy(x => Math.Abs(x.LeadHours - 24))
                    .FirstOrDefault();

                if (candidate == null) continue;

                var pm25Error = Math.Abs(candidate.Snapshot.PredictedPm25 - actual.Pm25);
                var aqiError = Math.Abs(candidate.Snapshot.PredictedAqi - actual.Aqi);
                pairs.Add(new ForecastAccuracyPointResponse
                {
                    TargetTime = actual.Time,
                    ForecastIssuedAt = candidate.Snapshot.IssuedAt,
                    LeadHours = Math.Round(candidate.LeadHours, 1),
                    PredictedPm25 = Math.Round(candidate.Snapshot.PredictedPm25, 1),
                    ActualPm25 = Math.Round(actual.Pm25, 1),
                    Pm25Error = Math.Round(pm25Error, 1),
                    PredictedAqi = candidate.Snapshot.PredictedAqi,
                    ActualAqi = actual.Aqi,
                    AqiError = aqiError,
                    WithinTolerance = pm25Error <= Pm25Tolerance || aqiError <= AqiTolerance,
                });
            }

            if (pairs.Count < MinMatchedHours)
            {
                return BuildCollectingResponse(
                    userGroup,
                    snapshots.Count,
                    $"Đã lưu {snapshots.Count} snapshot nhưng mới match được {pairs.Count} giờ; cần ít nhất {MinMatchedHours} giờ để chấm điểm.",
                    pairs);
            }

            var pm25Errors = pairs.Select(x => x.Pm25Error).ToList();
            var aqiErrors = pairs.Select(x => (double)x.AqiError).ToList();
            var pm25Mae = pm25Errors.Average();
            var aqiMae = aqiErrors.Average();
            var pm25Rmse = Math.Sqrt(pm25Errors.Select(x => x * x).Average());
            var withinPct = pairs.Count(x => x.WithinTolerance) * 100.0 / pairs.Count;
            var bias = pairs.Average(x => x.PredictedPm25 - x.ActualPm25);
            var score = Math.Clamp(100 - (pm25Mae * 3.1) - (aqiMae * 0.18), 0, 100);
            var trend = ComputeTrend(pairs);
            var (label, tone) = Reliability(score, withinPct);

            return new ForecastAccuracyResponse
            {
                HasEnoughData = true,
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow,
                ComparisonStart = pairs.Min(x => x.TargetTime),
                ComparisonEnd = pairs.Max(x => x.TargetTime),
                MatchedHours = pairs.Count,
                SnapshotCount = snapshots.Count,
                AccuracyScore = Math.Round(score, 0),
                Pm25Mae = Math.Round(pm25Mae, 1),
                Pm25Rmse = Math.Round(pm25Rmse, 1),
                AqiMae = Math.Round(aqiMae, 1),
                WithinTolerancePct = Math.Round(withinPct, 0),
                BiasPm25 = Math.Round(bias, 1),
                ReliabilityLabel = label,
                ReliabilityTone = tone,
                Trend = trend,
                Summary = BuildSummary(score, pm25Mae, bias, trend, pairs.Count),
                Points = pairs.OrderByDescending(x => x.TargetTime).Take(12).ToList(),
            };
        }

        private async Task CleanupOldSnapshotsAsync(string userGroup)
        {
            var cutoff = DateTime.UtcNow.AddDays(-10);
            await _db.ForecastSnapshots
                .Where(x => x.UserGroup == userGroup && x.TargetTime < cutoff)
                .ExecuteDeleteAsync();
        }

        private static ForecastAccuracyResponse BuildCollectingResponse(
            string userGroup,
            int snapshotCount,
            string summary,
            List<ForecastAccuracyPointResponse>? pairs = null)
        {
            return new ForecastAccuracyResponse
            {
                HasEnoughData = false,
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow,
                SnapshotCount = snapshotCount,
                MatchedHours = pairs?.Count ?? 0,
                ReliabilityLabel = "Đang thu thập dữ liệu",
                ReliabilityTone = "collecting",
                Summary = summary,
                Points = pairs?.OrderByDescending(x => x.TargetTime).Take(12).ToList() ?? new(),
            };
        }

        private static string ComputeTrend(List<ForecastAccuracyPointResponse> pairs)
        {
            var ordered = pairs.OrderBy(x => x.TargetTime).ToList();
            var half = ordered.Count / 2;
            if (half < 2) return "stable";

            var first = ordered.Take(half).Average(x => x.Pm25Error);
            var last = ordered.Skip(half).Average(x => x.Pm25Error);
            if (last < first - 1.5) return "better";
            if (last > first + 1.5) return "worse";
            return "stable";
        }

        private static (string Label, string Tone) Reliability(double score, double withinPct)
        {
            if (score >= 85 && withinPct >= 80) return ("Rất đáng tin", "excellent");
            if (score >= 70) return ("Đáng tin", "good");
            if (score >= 55) return ("Cần theo dõi", "watch");
            return ("Độ lệch cao", "low");
        }

        private static string BuildSummary(double score, double pm25Mae, double bias, string trend, int count)
        {
            var biasText = Math.Abs(bias) < 1
                ? "model gần như không bị lệch hướng"
                : bias > 0
                    ? $"model đang dự báo cao hơn thực tế khoảng {Math.Abs(bias):0.0} µg/m³"
                    : $"model đang dự báo thấp hơn thực tế khoảng {Math.Abs(bias):0.0} µg/m³";
            var trendText = trend switch
            {
                "better" => "sai số đang giảm dần",
                "worse" => "sai số đang tăng dần",
                _ => "sai số ổn định",
            };

            return $"Score {score:0}/100 từ {count} giờ match; MAE PM2.5 {pm25Mae:0.0} µg/m³, {biasText}, {trendText}.";
        }

        private static DateTime? ParseDateTime(string value)
        {
            if (DateTime.TryParse(value, out var dt))
            {
                return dt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
                    : dt.ToUniversalTime();
            }
            return null;
        }

        private static DateTime RoundToHour(DateTime value)
        {
            var utc = value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime();
            return new DateTime(utc.Year, utc.Month, utc.Day, utc.Hour, 0, 0, DateTimeKind.Utc);
        }

        private sealed record ActualPoint(DateTime Time, double Pm25, int Aqi);
    }
}