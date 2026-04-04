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
        private readonly AiService _aiService;

        public DashboardController(AppDbContext db, AiService aiService)
        {
            _db = db;
            _aiService = aiService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null)
            {
                return Unauthorized();
            }

            var current = await _aiService.GetCurrentAsync(userGroup);
            var forecast = await _aiService.GetForecast24hAsync(userGroup);

            if (current == null || forecast == null)
            {
                return StatusCode(500, new { message = "Không lấy được dữ liệu dashboard từ AI Server." });
            }

            var peak = forecast.Forecast
                .OrderByDescending(x => x.Aqi)
                .FirstOrDefault();

            var warningCount = forecast.Forecast.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY_SENSITIVE"));

            var dangerCount = forecast.Forecast.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY"));

            var response = new DashboardSummaryResponse
            {
                CurrentPm25 = current.Pm25,
                CurrentAqi = current.Aqi,
                CurrentRisk = current.Risk,
                CurrentRecommendation = current.Recommendation,

                MaxPm25Next24h = peak?.Pm25 ?? current.Pm25,
                MaxAqiNext24h = peak?.Aqi ?? current.Aqi,
                PeakRiskNext24h = peak?.Risk ?? current.Risk,
                PeakTime = DateTime.TryParse(peak?.Time, out var peakTime) ? peakTime : null,

                UserGroup = current.UserGroup,
                GeneratedAt = DateTime.UtcNow,

                WarningCount = warningCount,
                DangerCount = dangerCount
            };

            return Ok(response);
        }

        [HttpGet("chart")]
        public async Task<IActionResult> GetChart()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null)
            {
                return Unauthorized();
            }

            var forecast = await _aiService.GetForecast24hAsync(userGroup);
            if (forecast == null)
            {
                return StatusCode(500, new { message = "Không lấy được dữ liệu chart từ AI Server." });
            }

            var response = new DashboardChartResponse
            {
                UserGroup = forecast.UserGroup,
                GeneratedAt = DateTime.TryParse(forecast.GeneratedAt, out var generatedAt)
                    ? generatedAt
                    : DateTime.UtcNow,
                Hours = forecast.Hours,
                Points = forecast.Forecast.Select(x => new DashboardChartPointResponse
                {
                    Time = DateTime.TryParse(x.Time, out var pointTime) ? pointTime : DateTime.UtcNow,
                    Pm25 = x.Pm25,
                    Aqi = x.Aqi,
                    Risk = x.Risk,
                    Recommendation = x.Recommendation,
                    ColorKey = AirRiskHelper.ToColorKey(x.Risk)
                }).ToList()
            };

            return Ok(response);
        }

        [HttpGet("full")]
        public async Task<IActionResult> GetFull()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null)
            {
                return Unauthorized();
            }

            var current = await _aiService.GetCurrentAsync(userGroup);
            var forecast = await _aiService.GetForecast24hAsync(userGroup);

            if (current == null || forecast == null)
            {
                return StatusCode(500, new { message = "Không lấy được dữ liệu dashboard full từ AI Server." });
            }

            var peak = forecast.Forecast
                .OrderByDescending(x => x.Aqi)
                .FirstOrDefault();

            var warningCount = forecast.Forecast.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY_SENSITIVE"));

            var dangerCount = forecast.Forecast.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY"));

            var summary = new DashboardSummaryResponse
            {
                CurrentPm25 = current.Pm25,
                CurrentAqi = current.Aqi,
                CurrentRisk = current.Risk,
                CurrentRecommendation = current.Recommendation,

                MaxPm25Next24h = peak?.Pm25 ?? current.Pm25,
                MaxAqiNext24h = peak?.Aqi ?? current.Aqi,
                PeakRiskNext24h = peak?.Risk ?? current.Risk,
                PeakTime = DateTime.TryParse(peak?.Time, out var peakTime) ? peakTime : null,

                UserGroup = current.UserGroup,
                GeneratedAt = DateTime.UtcNow,

                WarningCount = warningCount,
                DangerCount = dangerCount
            };

            var chart = new DashboardChartResponse
            {
                UserGroup = forecast.UserGroup,
                GeneratedAt = DateTime.TryParse(forecast.GeneratedAt, out var generatedAt)
                    ? generatedAt
                    : DateTime.UtcNow,
                Hours = forecast.Hours,
                Points = forecast.Forecast.Select(x => new DashboardChartPointResponse
                {
                    Time = DateTime.TryParse(x.Time, out var pointTime) ? pointTime : DateTime.UtcNow,
                    Pm25 = x.Pm25,
                    Aqi = x.Aqi,
                    Risk = x.Risk,
                    Recommendation = x.Recommendation,
                    ColorKey = AirRiskHelper.ToColorKey(x.Risk)
                }).ToList()
            };

            var response = new DashboardFullResponse
            {
                Summary = summary,
                Chart = chart
            };

            return Ok(response);
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