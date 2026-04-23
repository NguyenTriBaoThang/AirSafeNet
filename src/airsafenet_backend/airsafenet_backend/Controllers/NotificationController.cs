using airsafenet_backend.DTOs.Notification;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly AlertService _alertService;
        private readonly AiCachedService _aiCachedService;
        private readonly IConfiguration _config;
        private readonly ILogger<NotificationController> _logger;

        public NotificationController(
            AlertService alertService,
            AiCachedService aiCachedService,
            IConfiguration config,
            ILogger<NotificationController> logger)
        {
            _alertService = alertService;
            _aiCachedService = aiCachedService;
            _config = config;
            _logger = logger;
        }

        [HttpPost("check-and-alert")]
        public async Task<IActionResult> CheckAndAlert(
            [FromHeader(Name = "X-Internal-Key")] string? internalKey,
            [FromBody] AnomalyAlertRequest? body = null)
        {
            var expectedKey = _config["Notification:InternalKey"];
            if (string.IsNullOrEmpty(expectedKey) || internalKey != expectedKey)
                return Unauthorized(new { message = "Internal key không hợp lệ." });

            var current = await _aiCachedService.GetCurrentAsync("general");
            if (current == null)
            {
                return Ok(new { message = "Cache chưa sẵn sàng, bỏ qua alert check." });
            }

            string recommendation = current.RecommendationProfile;
            if (body?.Anomaly != null)
            {
                var a = body.Anomaly;
                var xaiSummary = a.Xai?.Summary ?? "Không xác định nguyên nhân.";
                recommendation =
                    $"⚠️ CẢNH BÁO ĐỘT BIẾN: PM2.5 tăng {a.SpikePm25:F1} µg/m³ " +
                    $"(từ {a.FromPm25:F1} → {a.ToPm25:F1} µg/m³) trong 1 giờ. " +
                    $"Phân tích AI: {xaiSummary} " +
                    $"Khuyến nghị: {recommendation}";

                _logger.LogWarning(
                    "Anomaly alert: spike={Spike} µg/m³, AQI={Aqi}, XAI={Xai}",
                    a.SpikePm25, current.PredAqi, xaiSummary);
            }

            var result = await _alertService.DispatchAlertsAsync(
                currentAqi: current.PredAqi,
                currentPm25: current.PredPm25,
                currentRisk: current.RiskProfile,
                recommendation: recommendation);

            return Ok(new
            {
                message = "Alert check hoàn thành.",
                aqi = result.Aqi,
                pm25 = result.Pm25,
                risk = result.Risk,
                dispatched = result.Dispatched,
                telegram_sent = result.TelegramSent,
                email_sent = result.EmailSent,
                skipped = result.Skipped,
                is_anomaly = body?.Anomaly != null,
            });
        }

        [HttpPost("test")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> TestAlert()
        {
            var current = await _aiCachedService.GetCurrentAsync("general");
            if (current == null)
                return StatusCode(503, new { message = "Cache chưa sẵn sàng." });

            var result = await _alertService.DispatchAlertsAsync(
                currentAqi: current.PredAqi,
                currentPm25: current.PredPm25,
                currentRisk: current.RiskProfile,
                recommendation: current.RecommendationProfile);

            return Ok(result);
        }
    }
}
