using System.Security.Claims;
using airsafenet_backend.Services;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
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
        private readonly AirExplainService _explainService;

        public AirController(
            AppDbContext db,
            AiService aiService,
            AirExplainService explainService) 
        {
            _db = db;
            _aiService = aiService;
            _explainService = explainService;
        }

        [HttpGet("current")]
        public async Task<IActionResult> GetCurrent()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var aiResult = await _aiService.GetCurrentAsync(userGroup);
            if (aiResult == null)
                return StatusCode(500, new { message = "Không lấy được dữ liệu current từ AI Server." });

            return Ok(new AirPredictResponse
            {
                Pm25 = aiResult.PredPm25,
                Aqi = aiResult.PredAqi,
                Risk = aiResult.RiskProfile,
                Recommendation = aiResult.RecommendationProfile,
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow
            });
        }

        [HttpGet("forecast")]
        public async Task<IActionResult> GetForecast([FromQuery] int days = 1)
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var aiForecast = await _aiService.GetForecastRangeAsync(userGroup, days);
            if (aiForecast == null)
                return StatusCode(500, new { message = "Không lấy được forecast từ AI Server." });

            var response = new AirForecastResponse
            {
                UserGroup = userGroup,
                GeneratedAt = DateTime.TryParse(aiForecast.GeneratedAt, out var gAt) ? gAt : DateTime.UtcNow,
                Hours = aiForecast.Hours,
                Forecast = aiForecast.Forecast.Select(x => new AirForecastItemResponse
                {
                    Time = DateTime.TryParse(x.Time, out var t) ? t : DateTime.UtcNow,
                    Pm25 = x.PredPm25,
                    Aqi = x.PredAqi,
                    Risk = x.RiskProfile,
                    Recommendation = x.RecommendationProfile,
                    UserGroup = userGroup
                }).ToList()
            };

            return Ok(response);
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int days = 7)
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var aiHistory = await _aiService.GetHistoryAsync(userGroup, days);
            if (aiHistory == null)
                return StatusCode(500, new { message = "Không lấy được history từ AI Server." });

            return Ok(new
            {
                generatedAt = aiHistory.GeneratedAt,
                days = aiHistory.Days,
                hours = aiHistory.Hours,
                userGroup,
                history = aiHistory.History.Select(x => new
                {
                    time = x.Time,
                    pm25 = x.Pm25,
                    aqi = x.Aqi,
                    risk = x.RiskProfile,
                    recommendation = x.RecommendationProfile
                })
            });
        }

        [HttpGet("explain")]
        public async Task<IActionResult> GetExplain()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var current = await _aiService.GetCurrentAsync(userGroup);
            if (current == null)
                return StatusCode(500, new { message = "Không lấy được current data để explain." });

            try
            {
                var explanation = _explainService.Explain(current);
                return Ok(explanation);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi explain: {ex.Message}" });
            }
        }

        private async Task<string?> GetCurrentUserGroupAsync()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
                return null;

            var preferences = await _db.UserPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            return preferences?.UserGroup ?? "normal";
        }
    }
}