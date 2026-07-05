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
        private readonly ContextualAlertService _contextualAlertService;

        public AlertController(
            AlertService alertService,
            ContextualAlertService contextualAlertService)
        {
            _alertService = alertService;
            _contextualAlertService = contextualAlertService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var summary = await _alertService.GetUserAlertSummaryAsync(userId.Value);
            return Ok(summary);
        }

        [HttpGet("contextual")]
        public async Task<IActionResult> GetContextualAlerts(CancellationToken cancellationToken)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var alerts = await _contextualAlertService.GetContextualAlertsAsync(
                userId.Value,
                cancellationToken);
            return Ok(alerts);
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string status = "all")
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            pageSize = Math.Clamp(pageSize, 1, 50);
            var normalizedStatus = status.ToLower() is "unread" or "read" or "failed" ? status : "all";
            var logs = await _alertService.GetUserAlertHistoryAsync(userId.Value, page, pageSize, normalizedStatus);
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

        [HttpPost("{id:int}/read")]
        public async Task<IActionResult> MarkOneRead(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var updated = await _alertService.MarkReadAsync(userId.Value, id);
            if (!updated) return NotFound(new { message = "Không tìm thấy cảnh báo." });

            return Ok(new { message = "Đã đánh dấu cảnh báo đã đọc." });
        }

        private int? GetUserId()
        {
            var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(v, out var id) ? id : null;
        }
    }
}