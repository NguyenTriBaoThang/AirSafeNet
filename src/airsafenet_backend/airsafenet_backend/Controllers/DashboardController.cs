using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
using airsafenet_backend.DTOs.Dashboard;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AirSafeNet.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AiService _aiService;
        private readonly WeatherService _weatherService;

        public DashboardController(
            AppDbContext db,
            AiService aiService,
            WeatherService weatherService)
        {
            _db = db;
            _aiService = aiService;
            _weatherService = weatherService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null)
            {
                return Unauthorized();
            }

            var currentData = await _weatherService.GetCurrentAsync();
            var currentRequest = new AiPredictRequest
            {
                UserGroup = userGroup,
                Data = currentData
            };

            var currentAi = await _aiService.PredictAsync(currentRequest);
            if (currentAi == null)
            {
                return StatusCode(500, new { message = "Không lấy được dữ liệu hiện tại từ AI Server." });
            }

            var forecastPoints = await BuildChartPointsAsync(userGroup);

            var peak = forecastPoints
                .OrderByDescending(x => x.Aqi)
                .FirstOrDefault();

            var warningCount = forecastPoints.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY_SENSITIVE"));

            var dangerCount = forecastPoints.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY"));

            var response = new DashboardSummaryResponse
            {
                CurrentPm25 = currentAi.Pm25,
                CurrentAqi = currentAi.Aqi,
                CurrentRisk = currentAi.Risk,
                CurrentRecommendation = currentAi.Recommendation,

                MaxPm25Next24h = peak?.Pm25 ?? currentAi.Pm25,
                MaxAqiNext24h = peak?.Aqi ?? currentAi.Aqi,
                PeakRiskNext24h = peak?.Risk ?? currentAi.Risk,
                PeakTime = peak?.Time,

                UserGroup = userGroup,
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

            var points = await BuildChartPointsAsync(userGroup);

            var response = new DashboardChartResponse
            {
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow,
                Hours = points.Count,
                Points = points
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

            var currentData = await _weatherService.GetCurrentAsync();
            var currentRequest = new AiPredictRequest
            {
                UserGroup = userGroup,
                Data = currentData
            };

            var currentAi = await _aiService.PredictAsync(currentRequest);
            if (currentAi == null)
            {
                return StatusCode(500, new { message = "Không lấy được dữ liệu hiện tại từ AI Server." });
            }

            var chartPoints = await BuildChartPointsAsync(userGroup);

            var peak = chartPoints
                .OrderByDescending(x => x.Aqi)
                .FirstOrDefault();

            var warningCount = chartPoints.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY_SENSITIVE"));

            var dangerCount = chartPoints.Count(x =>
                AirRiskHelper.ToSeverity(x.Risk) >= AirRiskHelper.ToSeverity("UNHEALTHY"));

            var summary = new DashboardSummaryResponse
            {
                CurrentPm25 = currentAi.Pm25,
                CurrentAqi = currentAi.Aqi,
                CurrentRisk = currentAi.Risk,
                CurrentRecommendation = currentAi.Recommendation,

                MaxPm25Next24h = peak?.Pm25 ?? currentAi.Pm25,
                MaxAqiNext24h = peak?.Aqi ?? currentAi.Aqi,
                PeakRiskNext24h = peak?.Risk ?? currentAi.Risk,
                PeakTime = peak?.Time,

                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow,

                WarningCount = warningCount,
                DangerCount = dangerCount
            };

            var chart = new DashboardChartResponse
            {
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow,
                Hours = chartPoints.Count,
                Points = chartPoints
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

        private async Task<List<DashboardChartPointResponse>> BuildChartPointsAsync(string userGroup)
        {
            var weatherPoints = await _weatherService.Get24HourForecastAsync();
            var result = new List<DashboardChartPointResponse>();

            foreach (var point in weatherPoints)
            {
                var request = new AiPredictRequest
                {
                    UserGroup = userGroup,
                    Data = new Dictionary<string, double>
                    {
                        { "pm2_5", point.Pm25 },
                        { "temperature_2m", point.Temperature2m },
                        { "relative_humidity_2m", point.RelativeHumidity2m },
                        { "wind_speed_10m", point.WindSpeed10m },
                        { "hour", point.Time.Hour }
                    }
                };

                var aiResult = await _aiService.PredictAsync(request);
                if (aiResult == null)
                {
                    continue;
                }

                result.Add(new DashboardChartPointResponse
                {
                    Time = point.Time,
                    Pm25 = aiResult.Pm25,
                    Aqi = aiResult.Aqi,
                    Risk = aiResult.Risk,
                    Recommendation = aiResult.Recommendation,
                    ColorKey = AirRiskHelper.ToColorKey(aiResult.Risk)
                });
            }

            return result.OrderBy(x => x.Time).ToList();
        }
    }
}