using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class AnomalyController : ControllerBase
    {
        private readonly AiService _aiService;
        private readonly ILogger<AnomalyController> _logger;

        public AnomalyController(AiService aiService, ILogger<AnomalyController> logger)
        {
            _aiService = aiService;
            _logger = logger;
        }

        [HttpGet("latest")]
        public async Task<IActionResult> GetLatest()
        {
            try
            {
                var (body, code) = await _aiService.GetRawAsync("/anomaly/latest");
                if (code >= 400) return StatusCode(code, new { message = "AI Server error" });
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                _logger.LogWarning("GetLatest anomaly error: {Msg}", ex.Message);
                return Ok(new { has_anomaly = false, anomaly = (object?)null });
            }
        }

        [HttpGet("history")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetHistory()
        {
            try
            {
                var adminKey = _aiService.GetAdminKey();
                var (body, code) = await _aiService.GetRawWithAdminKeyAsync(
                    "/anomaly/history", adminKey);
                if (code >= 400) return StatusCode(code);
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("check")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> TriggerCheck()
        {
            try
            {
                var adminKey = _aiService.GetAdminKey();
                var (body, code) = await _aiService.PostRawWithAdminKeyAsync(
                    "/anomaly/check", adminKey);
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
