using System.Security.Claims;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Auth;
using airsafenet_backend.Models;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly JwtService _jwtService;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext db, JwtService jwtService, IConfiguration config)
        {
            _db = db;
            _jwtService = jwtService;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            var email = request.Email.Trim().ToLower();
            if (await _db.Users.AnyAsync(x => x.Email == email))
                return BadRequest(new { message = "Email đã tồn tại." });

            var user = new User
            {
                FullName = request.FullName.Trim(),
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "User",
                CreatedAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            _db.UserPreferences.Add(new UserPreferences
            {
                UserId = user.Id,
                UserGroup = "normal",
                PreferredLocation = "Ho Chi Minh City",
                NotifyEnabled = true,
                UpdatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return Ok(BuildAuthResponse(user));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var email = request.Email.Trim().ToLower();
            var user = await _db.Users.FirstOrDefaultAsync(x => x.Email == email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });

            return Ok(BuildAuthResponse(user));
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound();
            return Ok(BuildAuthResponse(user));
        }

        [HttpPost("logout")]
        public IActionResult Logout() => Ok(new { message = "Đăng xuất thành công." });

        [HttpPost("seed-admin")]
        public async Task<IActionResult> SeedAdmin(
            [FromBody] SeedAdminRequest request,
            [FromHeader(Name = "X-Seed-Key")] string? seedKey)
        {
            var expectedKey = _config["SeedAdmin:Key"];
            if (string.IsNullOrEmpty(expectedKey) || seedKey != expectedKey)
                return Unauthorized(new { message = "Seed key không hợp lệ." });

            if (await _db.Users.AnyAsync(x => x.Role == "Admin"))
                return BadRequest(new { message = "Admin đã tồn tại." });

            var email = request.Email.Trim().ToLower();
            if (await _db.Users.AnyAsync(x => x.Email == email))
                return BadRequest(new { message = "Email đã tồn tại." });

            var admin = new User
            {
                FullName = request.FullName.Trim(),
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            };
            _db.Users.Add(admin);
            await _db.SaveChangesAsync();

            _db.UserPreferences.Add(new UserPreferences
            {
                UserId = admin.Id,
                UserGroup = "general",
                PreferredLocation = "Ho Chi Minh City",
                NotifyEnabled = true,
                UpdatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return Ok(new { message = "Admin tạo thành công.", email = admin.Email, role = admin.Role });
        }

        private AuthResponse BuildAuthResponse(User user) => new()
        {
            Token = _jwtService.GenerateToken(user),
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
        };
    }
}
