using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Family;
using airsafenet_backend.Models;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class FamilyProfilesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AiCachedService _aiService;

        public FamilyProfilesController(AppDbContext db, AiCachedService aiService)
        {
            _db = db;
            _aiService = aiService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyProfiles()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var profiles = await _db.Set<FamilyProfile>()
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync();

            return Ok(profiles.Select(MapToResponse));
        }

        [HttpPost]
        public async Task<IActionResult> CreateProfile(UpsertFamilyProfileRequest request)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var count = await _db.Set<FamilyProfile>().CountAsync(x => x.UserId == userId);
            if (count >= 8)
                return BadRequest(new { message = "Một tài khoản chỉ nên theo dõi tối đa 8 hồ sơ gia đình." });

            var normalized = NormalizeRequest(request);
            if (string.IsNullOrWhiteSpace(normalized.DisplayName))
                return BadRequest(new { message = "Tên hồ sơ không được để trống." });

            var profile = new FamilyProfile
            {
                UserId = userId.Value,
                DisplayName = normalized.DisplayName,
                Relationship = normalized.Relationship,
                UserGroup = normalized.UserGroup,
                PreferredLocation = normalized.PreferredLocation,
                NotifyEnabled = normalized.NotifyEnabled,
                NotifyThreshold = normalized.NotifyThreshold,
                Notes = normalized.Notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _db.Set<FamilyProfile>().Add(profile);
            await _db.SaveChangesAsync();

            return Ok(MapToResponse(profile));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateProfile(int id, UpsertFamilyProfileRequest request)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var profile = await _db.Set<FamilyProfile>()
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
            if (profile == null) return NotFound(new { message = "Không tìm thấy hồ sơ gia đình." });

            var normalized = NormalizeRequest(request);
            if (string.IsNullOrWhiteSpace(normalized.DisplayName))
                return BadRequest(new { message = "Tên hồ sơ không được để trống." });

            profile.DisplayName = normalized.DisplayName;
            profile.Relationship = normalized.Relationship;
            profile.UserGroup = normalized.UserGroup;
            profile.PreferredLocation = normalized.PreferredLocation;
            profile.NotifyEnabled = normalized.NotifyEnabled;
            profile.NotifyThreshold = normalized.NotifyThreshold;
            profile.Notes = normalized.Notes;
            profile.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(MapToResponse(profile));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteProfile(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var profile = await _db.Set<FamilyProfile>()
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
            if (profile == null) return NotFound(new { message = "Không tìm thấy hồ sơ gia đình." });

            _db.Set<FamilyProfile>().Remove(profile);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("{id:int}/risk")]
        public async Task<IActionResult> GetProfileRisk(int id, [FromQuery] int days = 1)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var profile = await _db.Set<FamilyProfile>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
            if (profile == null) return NotFound(new { message = "Không tìm thấy hồ sơ gia đình." });

            var normalizedGroup = UserProfileRuleService.NormalizeGroup(profile.UserGroup);
            days = Math.Clamp(days, 1, 7);
            var current = await _aiService.GetCurrentAsync(normalizedGroup);
            var forecast = await _aiService.GetForecastRangeAsync(normalizedGroup, days);

            if (current == null || forecast == null)
                return StatusCode(503, new { message = "Cache chưa sẵn sàng. Vui lòng chờ admin tính toán." });

            var peak = forecast.Forecast.OrderByDescending(x => x.PredAqi).FirstOrDefault();
            var warningCount = forecast.Forecast.Count(x =>
                AirRiskHelper.ToSeverity(x.RiskProfile) >= AirRiskHelper.ToSeverity("UNHEALTHY_SENSITIVE"));
            var dangerCount = forecast.Forecast.Count(x =>
                AirRiskHelper.ToSeverity(x.RiskProfile) >= AirRiskHelper.ToSeverity("UNHEALTHY"));

            profile.UserGroup = normalizedGroup;

            return Ok(new FamilyProfileRiskResponse
            {
                Profile = MapToResponse(profile),
                CurrentPm25 = current.PredPm25,
                CurrentAqi = current.PredAqi,
                CurrentRisk = current.RiskProfile,
                CurrentRecommendation = current.RecommendationProfile,
                MaxPm25Next24h = peak?.PredPm25 ?? current.PredPm25,
                MaxAqiNext24h = peak?.PredAqi ?? current.PredAqi,
                PeakRiskNext24h = peak?.RiskProfile ?? current.RiskProfile,
                PeakTime = DateTime.TryParse(peak?.Time, out var pt) ? pt : null,
                WarningCount = warningCount,
                DangerCount = dangerCount,
                GeneratedAt = DateTime.UtcNow,
            });
        }

        private int? GetUserId()
        {
            var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(v, out var id) ? id : null;
        }

        private static UpsertFamilyProfileRequest NormalizeRequest(UpsertFamilyProfileRequest request)
        {
            var userGroup = UserProfileRuleService.NormalizeGroup(request.UserGroup);
            var rule = UserProfileRuleService.GetRule(userGroup);

            return new UpsertFamilyProfileRequest
            {
                DisplayName = (request.DisplayName ?? string.Empty).Trim(),
                Relationship = string.IsNullOrWhiteSpace(request.Relationship)
                    ? "family"
                    : request.Relationship.Trim().ToLowerInvariant(),
                UserGroup = userGroup,
                PreferredLocation = string.IsNullOrWhiteSpace(request.PreferredLocation)
                    ? "Ho Chi Minh City"
                    : request.PreferredLocation.Trim(),
                NotifyEnabled = request.NotifyEnabled,
                NotifyThreshold = request.NotifyThreshold <= 0
                    ? rule.RecommendedNotifyThreshold
                    : Math.Clamp(request.NotifyThreshold, 0, 500),
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            };
        }

        private static FamilyProfileResponse MapToResponse(FamilyProfile profile)
        {
            var normalizedGroup = UserProfileRuleService.NormalizeGroup(profile.UserGroup);
            return new FamilyProfileResponse
            {
                Id = profile.Id,
                DisplayName = profile.DisplayName,
                Relationship = profile.Relationship,
                UserGroup = normalizedGroup,
                PreferredLocation = profile.PreferredLocation,
                NotifyEnabled = profile.NotifyEnabled,
                NotifyThreshold = profile.NotifyThreshold,
                ProfileRule = UserProfileRuleService.GetRule(normalizedGroup),
                Notes = profile.Notes,
                CreatedAt = profile.CreatedAt,
                UpdatedAt = profile.UpdatedAt,
            };
        }
    }
}