using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
using airsafenet_backend.Models;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class AirController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AiService _aiService;

        public AirController(AppDbContext db, AiService aiService)
        {
            _db = db;
            _aiService = aiService;
        }

        [HttpGet("current")]
        public async Task<IActionResult> GetCurrent()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null)
            {
                return Unauthorized();
            }

            var aiResult = await _aiService.GetCurrentAsync(userGroup);
            if (aiResult == null)
            {
                return StatusCode(500, new { message = "Không lấy được dữ liệu current từ AI Server." });
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
                UserGroup = aiResult.UserGroup,
                GeneratedAt = DateTime.UtcNow
            });
        }

        [HttpGet("forecast")]
        public async Task<IActionResult> GetForecast24h()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null)
            {
                return Unauthorized();
            }

            var aiForecast = await _aiService.GetForecast24hAsync(userGroup);
            if (aiForecast == null)
            {
                return StatusCode(500, new { message = "Không lấy được forecast 24h từ AI Server." });
            }

            var response = new AirForecastResponse
            {
                UserGroup = aiForecast.UserGroup,
                GeneratedAt = DateTime.TryParse(aiForecast.GeneratedAt, out var generatedAt)
                    ? generatedAt
                    : DateTime.UtcNow,
                Hours = aiForecast.Hours,
                Forecast = aiForecast.Forecast.Select(x => new AirForecastItemResponse
                {
                    Time = DateTime.TryParse(x.Time, out var t) ? t : DateTime.UtcNow,
                    Pm25 = x.Pm25,
                    Aqi = x.Aqi,
                    Risk = x.Risk,
                    Recommendation = x.Recommendation,
                    UserGroup = x.UserGroup
                }).ToList()
            };

            return Ok(response);
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory()
        {
            var logs = await _db.AirQualityLogs
                .AsNoTracking()
                .OrderByDescending(x => x.RecordedAt)
                .Take(20)
                .ToListAsync();

            return Ok(logs);
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