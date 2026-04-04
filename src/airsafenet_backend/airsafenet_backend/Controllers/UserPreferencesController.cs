using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Preferences;
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
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
            {
                return Unauthorized();
            }

            var preferences = await _db.UserPreferences.FirstOrDefaultAsync(x => x.UserId == userId);
            if (preferences == null)
            {
                return NotFound(new { message = "Không tìm thấy cấu hình người dùng." });
            }

            return Ok(new UserPreferencesResponse
            {
                UserId = preferences.UserId,
                UserGroup = preferences.UserGroup,
                PreferredLocation = preferences.PreferredLocation,
                NotifyEnabled = preferences.NotifyEnabled,
                UpdatedAt = preferences.UpdatedAt
            });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateMyPreferences(UpdateUserPreferencesRequest request)
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
            {
                return Unauthorized();
            }

            var preferences = await _db.UserPreferences.FirstOrDefaultAsync(x => x.UserId == userId);
            if (preferences == null)
            {
                return NotFound(new { message = "Không tìm thấy cấu hình người dùng." });
            }

            preferences.UserGroup = request.UserGroup.Trim().ToLower();
            preferences.PreferredLocation = request.PreferredLocation.Trim();
            preferences.NotifyEnabled = request.NotifyEnabled;
            preferences.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new UserPreferencesResponse
            {
                UserId = preferences.UserId,
                UserGroup = preferences.UserGroup,
                PreferredLocation = preferences.PreferredLocation,
                NotifyEnabled = preferences.NotifyEnabled,
                UpdatedAt = preferences.UpdatedAt
            });
        }
    }
}
