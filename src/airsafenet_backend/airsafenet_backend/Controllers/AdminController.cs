using System.Security.Claims;
using airsafenet_backend.DTOs.Admin;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AiCachedService _aiCachedService;
        private readonly ILogger<AdminController> _logger;

        public AdminController(AiCachedService aiCachedService, ILogger<AdminController> logger)
        {
            _aiCachedService = aiCachedService;
            _logger = logger;
        }

        [HttpPost("compute")]
        [EnableRateLimiting("admin-compute")]
        public async Task<IActionResult> TriggerCompute([FromQuery] bool force = true)
        {
            var email = User.FindFirstValue(ClaimTypes.Email) ?? "unknown";
            _logger.LogInformation("Admin {Email} trigger compute (force={Force})", email, force);

            try
            {
                var result = await _aiCachedService.TriggerComputeAsync(force);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Compute thất bại");
                return StatusCode(500, new { message = $"Compute thất bại: {ex.Message}" });
            }
        }

        [HttpGet("cache/status")]
        public async Task<IActionResult> GetCacheStatus()
        {
            try
            {
                var status = await _aiCachedService.GetCacheStatusAsync();
                return Ok(status);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("cache/clear")]
        public async Task<IActionResult> ClearCache()
        {
            var email = User.FindFirstValue(ClaimTypes.Email) ?? "unknown";
            _logger.LogWarning("Admin {Email} xóa cache", email);
            try
            {
                var result = await _aiCachedService.ClearCacheAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
