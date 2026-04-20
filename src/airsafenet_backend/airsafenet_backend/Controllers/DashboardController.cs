using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Dashboard;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AiCachedService _aiService; 

        public DashboardController(AppDbContext db, AiCachedService aiService)
        {
            _db = db;
            _aiService = aiService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] int days = 1)
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var current = await _aiService.GetCurrentAsync(userGroup);
            var forecast = await _aiService.GetForecastRangeAsync(userGroup, days);

            if (current == null || forecast == null)
                return StatusCode(503, new { message = "Cache chưa sẵn sàng. Vui lòng chờ admin tính toán." });

            var peak = forecast.Forecast.OrderByDescending(x => x.PredAqi).FirstOrDefault();
            var warningCount = forecast.Forecast.Count(x =>
                AirRiskHelper.ToSeverity(x.RiskProfile) >= AirRiskHelper.ToSeverity("UNHEALTHY_SENSITIVE"));
            var dangerCount = forecast.Forecast.Count(x =>
                AirRiskHelper.ToSeverity(x.RiskProfile) >= AirRiskHelper.ToSeverity("UNHEALTHY"));

            return Ok(new DashboardSummaryResponse
            {
                CurrentPm25 = current.PredPm25,
                CurrentAqi = current.PredAqi,
                CurrentRisk = current.RiskProfile,
                CurrentRecommendation = current.RecommendationProfile,
                MaxPm25Next24h = peak?.PredPm25 ?? current.PredPm25,
                MaxAqiNext24h = peak?.PredAqi ?? current.PredAqi,
                PeakRiskNext24h = peak?.RiskProfile ?? current.RiskProfile,
                PeakTime = DateTime.TryParse(peak?.Time, out var pt) ? pt : null,
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow,
                WarningCount = warningCount,
                DangerCount = dangerCount,
            });
        }

        [HttpGet("chart")]
        public async Task<IActionResult> GetChart(
            [FromQuery] int days = 1,
            [FromQuery] string mode = "forecast")
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            if (mode.ToLower() == "history")
            {
                var history = await _aiService.GetHistoryAsync(userGroup, days);
                if (history == null)
                    return StatusCode(503, new { message = "Cache chưa sẵn sàng." });

                return Ok(new DashboardChartResponse
                {
                    UserGroup = userGroup,
                    GeneratedAt = DateTime.TryParse(history.GeneratedAt, out var g1) ? g1 : DateTime.UtcNow,
                    Hours = history.Hours,
                    Points = history.History.Select(x => new DashboardChartPointResponse
                    {
                        Time = DateTime.TryParse(x.Time, out var t) ? t : DateTime.UtcNow,
                        Pm25 = x.Pm25,
                        Aqi = x.Aqi,
                        Risk = x.RiskProfile,
                        Recommendation = x.RecommendationProfile,
                        ColorKey = AirRiskHelper.ToColorKey(x.RiskProfile),
                    }).ToList()
                });
            }
            else
            {
                var forecast = await _aiService.GetForecastRangeAsync(userGroup, days);
                if (forecast == null)
                    return StatusCode(503, new { message = "Cache chưa sẵn sàng." });

                return Ok(new DashboardChartResponse
                {
                    UserGroup = userGroup,
                    GeneratedAt = DateTime.TryParse(forecast.GeneratedAt, out var g2) ? g2 : DateTime.UtcNow,
                    Hours = forecast.Hours,
                    Points = forecast.Forecast.Select(x => new DashboardChartPointResponse
                    {
                        Time = DateTime.TryParse(x.Time, out var t) ? t : DateTime.UtcNow,
                        Pm25 = x.PredPm25,
                        Aqi = x.PredAqi,
                        Risk = x.RiskProfile,
                        Recommendation = x.RecommendationProfile,
                        ColorKey = AirRiskHelper.ToColorKey(x.RiskProfile),
                    }).ToList()
                });
            }
        }

        [HttpGet("full")]
        public async Task<IActionResult> GetFull(
            [FromQuery] int days = 1,
            [FromQuery] string mode = "forecast")
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var current = await _aiService.GetCurrentAsync(userGroup);
            if (current == null)
                return StatusCode(503, new { message = "Cache chưa sẵn sàng. Vui lòng chờ admin tính toán." });

            DashboardChartResponse chart;

            if (mode.ToLower() == "history")
            {
                var history = await _aiService.GetHistoryAsync(userGroup, days);
                if (history == null)
                    return StatusCode(503, new { message = "Cache chưa sẵn sàng." });

                chart = new DashboardChartResponse
                {
                    UserGroup = userGroup,
                    GeneratedAt = DateTime.TryParse(history.GeneratedAt, out var gh) ? gh : DateTime.UtcNow,
                    Hours = history.Hours,
                    Points = history.History.Select(x => new DashboardChartPointResponse
                    {
                        Time = DateTime.TryParse(x.Time, out var t) ? t : DateTime.UtcNow,
                        Pm25 = x.Pm25,
                        Aqi = x.Aqi,
                        Risk = x.RiskProfile,
                        Recommendation = x.RecommendationProfile,
                        ColorKey = AirRiskHelper.ToColorKey(x.RiskProfile),
                    }).ToList()
                };
            }
            else
            {
                var forecast = await _aiService.GetForecastRangeAsync(userGroup, days);
                if (forecast == null)
                    return StatusCode(503, new { message = "Cache chưa sẵn sàng." });

                chart = new DashboardChartResponse
                {
                    UserGroup = userGroup,
                    GeneratedAt = DateTime.TryParse(forecast.GeneratedAt, out var gf) ? gf : DateTime.UtcNow,
                    Hours = forecast.Hours,
                    Points = forecast.Forecast.Select(x => new DashboardChartPointResponse
                    {
                        Time = DateTime.TryParse(x.Time, out var t) ? t : DateTime.UtcNow,
                        Pm25 = x.PredPm25,
                        Aqi = x.PredAqi,
                        Risk = x.RiskProfile,
                        Recommendation = x.RecommendationProfile,
                        ColorKey = AirRiskHelper.ToColorKey(x.RiskProfile),
                    }).ToList()
                };
            }

            var peak = chart.Points.OrderByDescending(x => x.Aqi).FirstOrDefault();
            var warningCount = chart.Points.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY_SENSITIVE"));
            var dangerCount = chart.Points.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY"));

            var summary = new DashboardSummaryResponse
            {
                CurrentPm25 = current.PredPm25,
                CurrentAqi = current.PredAqi,
                CurrentRisk = current.RiskProfile,
                CurrentRecommendation = current.RecommendationProfile,
                MaxPm25Next24h = peak?.Pm25 ?? current.PredPm25,
                MaxAqiNext24h = peak?.Aqi ?? current.PredAqi,
                PeakRiskNext24h = peak?.Risk ?? current.RiskProfile,
                PeakTime = peak?.Time,
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow,
                WarningCount = warningCount,
                DangerCount = dangerCount,
            };

            return Ok(new DashboardFullResponse { Summary = summary, Chart = chart });
        }

        private async Task<string?> GetCurrentUserGroupAsync()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId)) return null;

            var prefs = await _db.UserPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            return prefs?.UserGroup ?? "normal";
        }
    }
}