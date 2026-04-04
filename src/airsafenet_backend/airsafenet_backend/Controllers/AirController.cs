using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
using airsafenet_backend.Models;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AirSafeNet.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class AirController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AiService _aiService;
        private readonly WeatherService _weatherService;

        public AirController(AppDbContext db, AiService aiService, WeatherService weatherService)
        {
            _db = db;
            _aiService = aiService;
            _weatherService = weatherService;
        }

        [HttpPost("predict")]
        public async Task<IActionResult> Predict(AiPredictRequest request)
        {
            var userGroup = string.IsNullOrWhiteSpace(request.UserGroup)
                ? "normal"
                : request.UserGroup.Trim().ToLower();

            var aiResult = await _aiService.PredictAsync(new AiPredictRequest
            {
                Data = request.Data,
                UserGroup = userGroup
            });

            if (aiResult == null)
            {
                return StatusCode(500, new { message = "Không lấy được dữ liệu từ AI Server." });
            }

            var log = new AirQualityLog
            {
                Pm25 = aiResult.Pm25,
                Aqi = aiResult.Aqi,
                Risk = aiResult.Risk,
                Recommendation = aiResult.Recommendation,
                UserGroup = userGroup,
                RecordedAt = DateTime.UtcNow
            };

            _db.AirQualityLogs.Add(log);
            await _db.SaveChangesAsync();

            return Ok(new AirPredictResponse
            {
                Pm25 = aiResult.Pm25,
                Aqi = aiResult.Aqi,
                Risk = aiResult.Risk,
                Recommendation = aiResult.Recommendation,
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow
            });
        }

        [HttpGet("current")]
        public async Task<IActionResult> GetCurrent()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
            {
                return Unauthorized();
            }

            var preferences = await _db.UserPreferences.FirstOrDefaultAsync(x => x.UserId == userId);
            var userGroup = preferences?.UserGroup ?? "normal";

            var data = await _weatherService.GetCurrentAsync();

            var request = new AiPredictRequest
            {
                UserGroup = userGroup,
                Data = data
            };

            var aiResult = await _aiService.PredictAsync(request);

            if (aiResult == null)
            {
                return StatusCode(500, new { message = "AI lỗi." });
            }

            return Ok(new AirPredictResponse
            {
                Pm25 = aiResult.Pm25,
                Aqi = aiResult.Aqi,
                Risk = aiResult.Risk,
                Recommendation = aiResult.Recommendation,
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow
            });
        }

        [HttpGet("forecast")]
        public async Task<IActionResult> GetForecast24h()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
            {
                return Unauthorized();
            }

            var preferences = await _db.UserPreferences.FirstOrDefaultAsync(x => x.UserId == userId);
            var userGroup = preferences?.UserGroup ?? "normal";

            var weatherPoints = await _weatherService.Get24HourForecastAsync();

            var result = new AirForecastResponse
            {
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow,
                Hours = 24
            };

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

                result.Forecast.Add(new AirForecastItemResponse
                {
                    Time = point.Time,
                    Pm25 = aiResult.Pm25,
                    Aqi = aiResult.Aqi,
                    Risk = aiResult.Risk,
                    Recommendation = aiResult.Recommendation,
                    UserGroup = userGroup
                });
            }

            return Ok(result);
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory()
        {
            var logs = await _db.AirQualityLogs
                .OrderByDescending(x => x.RecordedAt)
                .Take(20)
                .ToListAsync();

            return Ok(logs);
        }
    }
}