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
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AdminController(
            AiCachedService aiCachedService,
            ILogger<AdminController> logger,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _aiCachedService = aiCachedService;
            _logger = logger;
            _httpClient = httpClientFactory.CreateClient();
            _configuration = configuration;
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


        [HttpPost("districts/compute")]
        public async Task<IActionResult> TriggerDistrictCompute()
        {
            var email = User.FindFirstValue(ClaimTypes.Email) ?? "unknown";
            _logger.LogInformation("Admin {Email} trigger district compute", email);
            try
            {
                var baseUrl = _configuration["AiServer:BaseUrl"] ?? "http://localhost:8000";
                var adminKey = _configuration["AiServer:AdminKey"] ?? "airsafenet-admin-secret";

                using var req = new HttpRequestMessage(HttpMethod.Post,
                    $"{baseUrl}/admin/districts/compute");
                req.Headers.Add("X-Admin-Key", adminKey);

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                HttpResponseMessage res;
                try { res = await _httpClient.SendAsync(req, cts.Token); }
                catch (TaskCanceledException)
                {
                    return Ok(new { status = "running", message = "Đã kích hoạt tính toán 22 quận/huyện." });
                }

                var body = await res.Content.ReadAsStringAsync();
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("districts/status")]
        public async Task<IActionResult> GetDistrictStatus()
        {
            try
            {
                var baseUrl = _configuration["AiServer:BaseUrl"] ?? "http://localhost:8000";
                var adminKey = _configuration["AiServer:AdminKey"] ?? "airsafenet-admin-secret";

                using var req = new HttpRequestMessage(HttpMethod.Get,
                    $"{baseUrl}/admin/districts/status");
                req.Headers.Add("X-Admin-Key", adminKey);

                var res = await _httpClient.SendAsync(req);
                var body = await res.Content.ReadAsStringAsync();
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
