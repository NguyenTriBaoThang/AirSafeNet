using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
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
        private readonly WeatherService _weatherService;

        public DashboardController(AppDbContext db, AiService aiService, WeatherService weatherService)
        {
            _db = db;
            _aiService = aiService;
            _weatherService = weatherService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
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
                return StatusCode(500, new { message = "Không lấy được dữ liệu từ AI Server." });
            }

            return Ok(new DashboardSummaryResponse
            {
                Pm25 = aiResult.Pm25,
                Aqi = aiResult.Aqi,
                Risk = aiResult.Risk,
                Recommendation = aiResult.Recommendation,
                UserGroup = userGroup,
                GeneratedAt = DateTime.UtcNow
            });
        }
    }
}
