using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Preferences;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class UserPreferencesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public UserPreferencesController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyPreferences()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var p = await _db.UserPreferences.FirstOrDefaultAsync(x => x.UserId == userId);
            if (p == null) return NotFound(new { message = "Không tìm thấy cấu hình." });

            return Ok(MapToResponse(p));
        }

        [HttpPut]
        public async Task<IActionResult> UpdateMyPreferences(UpdateUserPreferencesRequest req)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var p = await _db.UserPreferences.FirstOrDefaultAsync(x => x.UserId == userId);
            if (p == null) return NotFound(new { message = "Không tìm thấy cấu hình." });

            var normalizedGroup = UserProfileRuleService.NormalizeGroup(req.UserGroup);
            var rule = UserProfileRuleService.GetRule(normalizedGroup);

            p.UserGroup = normalizedGroup;
            p.PreferredLocation = string.IsNullOrWhiteSpace(req.PreferredLocation)
                ? "Ho Chi Minh City"
                : req.PreferredLocation.Trim();
            p.NotifyEnabled = req.NotifyEnabled;
            p.NotifyChannel = string.IsNullOrWhiteSpace(req.NotifyChannel)
                ? "none"
                : req.NotifyChannel.Trim().ToLowerInvariant();
            p.TelegramChatId = string.IsNullOrWhiteSpace(req.TelegramChatId)
                ? null : req.TelegramChatId.Trim();
            p.NotifyEmail = string.IsNullOrWhiteSpace(req.NotifyEmail)
                ? null : req.NotifyEmail.Trim().ToLowerInvariant();
            p.NotifyThreshold = req.NotifyThreshold <= 0
                ? rule.RecommendedNotifyThreshold
                : Math.Clamp(req.NotifyThreshold, 0, 500);
            p.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(MapToResponse(p));
        }

        private int? GetUserId()
        {
            var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(v, out var id) ? id : null;
        }

        private static UserPreferencesResponse MapToResponse(Models.UserPreferences p)
        {
            var normalizedGroup = UserProfileRuleService.NormalizeGroup(p.UserGroup);
            var rule = UserProfileRuleService.GetRule(normalizedGroup);

            return new UserPreferencesResponse
            {
                UserId = p.UserId,
                UserGroup = normalizedGroup,
                PreferredLocation = p.PreferredLocation,
                NotifyEnabled = p.NotifyEnabled,
                NotifyChannel = p.NotifyChannel,
                TelegramChatId = p.TelegramChatId,
                NotifyEmail = p.NotifyEmail,
                NotifyThreshold = p.NotifyThreshold,
                ProfileRule = rule,
                AvailableProfiles = UserProfileRuleService.GetAll().ToList(),
                LastAlertSentAt = p.LastAlertSentAt,
                UpdatedAt = p.UpdatedAt,
            };
        }
    }
}