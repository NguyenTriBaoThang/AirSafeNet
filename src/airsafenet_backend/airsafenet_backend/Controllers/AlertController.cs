using System.Security.Claims;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class AlertController : ControllerBase
    {
        private readonly AlertService _alertService;

        public AlertController(AlertService alertService)
        {
            _alertService = alertService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var summary = await _alertService.GetUserAlertSummaryAsync(userId.Value);
            return Ok(summary);
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            pageSize = Math.Clamp(pageSize, 1, 50);
            var logs = await _alertService.GetUserAlertHistoryAsync(userId.Value, page, pageSize);
            return Ok(logs);
        }

        [HttpPost("mark-read")]
        public async Task<IActionResult> MarkAllRead()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            await _alertService.MarkAllReadAsync(userId.Value);
            return Ok(new { message = "Đã đánh dấu tất cả đã đọc." });
        }

        private int? GetUserId()
        {
            var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(v, out var id) ? id : null;
        }
    }
}
