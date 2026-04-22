using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AirSafeNet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AirController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AiCachedService _aiService;
        private readonly AirExplainService _explainService;

        public AirController(AppDbContext db, AiCachedService aiService, AirExplainService explainService)
        {
            _db = db;
            _aiService = aiService;
            _explainService = explainService;
        }

        [HttpGet("public/current")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicCurrent()
        {
            try
            {
                var current = await _aiService.GetCurrentAsync("general");
                if (current == null)
                    return StatusCode(503, new { message = "Cache chưa sẵn sàng." });

                return Ok(new
                {
                    aqi = current.PredAqi,
                    pm25 = Math.Round(current.PredPm25, 1),
                    risk = current.RiskProfile,
                    aqi_category = current.AqiCategory,
                });
            }
            catch
            {
                return StatusCode(503, new { message = "Dữ liệu chưa sẵn sàng." });
            }
        }


        [HttpGet("current")]
        [Authorize]
        public async Task<IActionResult> GetCurrent()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var current = await _aiService.GetCurrentAsync(userGroup);
            if (current == null)
                return StatusCode(503, new { message = "Cache chưa sẵn sàng. Vui lòng chờ admin tính toán." });

            return Ok(new AirPredictResponse
            {
                Pm25 = current.PredPm25,
                Aqi = current.PredAqi,
                Risk = current.RiskProfile,
                Recommendation = current.RecommendationProfile,
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow,
            });
        }

        [HttpGet("forecast")]
        [Authorize]
        public async Task<IActionResult> GetForecast([FromQuery] int days = 1)
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var aiForecast = await _aiService.GetForecastRangeAsync(userGroup, days);
            if (aiForecast == null)
                return StatusCode(503, new { message = "Cache chưa sẵn sàng." });

            return Ok(new AirForecastResponse
            {
                UserGroup = userGroup,
                GeneratedAt = DateTime.TryParse(aiForecast.GeneratedAt, out var g) ? g : DateTime.UtcNow,
                Hours = aiForecast.Hours,
                Forecast = aiForecast.Forecast.Select(x => new AirForecastItemResponse
                {
                    Time = DateTime.TryParse(x.Time, out var t) ? t : DateTime.UtcNow,
                    Pm25 = x.PredPm25,
                    Aqi = x.PredAqi,
                    Risk = x.RiskProfile,
                    Recommendation = x.RecommendationProfile,
                    UserGroup = userGroup,
                }).ToList()
            });
        }

        [HttpGet("history")]
        [Authorize]
        public async Task<IActionResult> GetHistory([FromQuery] int days = 7)
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var aiHistory = await _aiService.GetHistoryAsync(userGroup, days);
            if (aiHistory == null)
                return StatusCode(503, new { message = "Cache chưa sẵn sàng." });

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
                    recommendation = x.RecommendationProfile,
                })
            });
        }

        [HttpGet("explain")]
        [Authorize]
        public async Task<IActionResult> GetExplain()
        {
            var userGroup = await GetCurrentUserGroupAsync();
            if (userGroup == null) return Unauthorized();

            var current = await _aiService.GetCurrentAsync(userGroup);
            if (current == null)
                return StatusCode(503, new { message = "Cache chưa sẵn sàng." });

            try
            {
                var explanation = await _explainService.ExplainAsync(current);
                return Ok(explanation);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi explain: {ex.Message}" });
            }
        }

        private async Task<string?> GetCurrentUserGroupAsync()
        {
            var userIdStr = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return null;

            var prefs = await _db.UserPreferences.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);
            return prefs?.UserGroup ?? "normal";
        }

        [HttpGet("districts")]
        public async Task<IActionResult> GetDistricts()
        {
            try
            {
                var (body, statusCode) = await _aiService.GetDistrictsRawAsync();

                if (statusCode == 503)
                    return StatusCode(503, new { message = "District cache chưa sẵn sàng. Đang tính toán..." });

                if (statusCode >= 400)
                    return StatusCode(statusCode, new { message = $"AI Server error: {statusCode}" });

                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi kết nối AI Server: {ex.Message}" });
            }
        }

        [HttpPost("districts/compute")]
        public async Task<IActionResult> TriggerDistrictCompute()
        {
            try
            {
                var (body, _) = await _aiService.TriggerDistrictComputeRawAsync();
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return Ok(new { status = "running", message = $"Đã kích hoạt. ({ex.Message})" });
            }
        }

    }
}