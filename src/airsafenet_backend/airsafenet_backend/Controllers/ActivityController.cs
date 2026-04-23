using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using airsafenet_backend.Data;
using airsafenet_backend.DTOs.Air;
using airsafenet_backend.DTOs.Notification;
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
    public class ActivityController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AiCachedService _aiService;
        private readonly ILogger<ActivityController> _logger;

        public ActivityController(
            AppDbContext db,
            AiCachedService aiService,
            ILogger<ActivityController> logger)
        {
            _db = db;
            _aiService = aiService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetSchedules()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var schedules = await _db.UserActivitySchedules
                .AsNoTracking()
                .Where(x => x.UserId == userId.Value && x.IsActive)
                .OrderBy(x => x.HourOfDay).ThenBy(x => x.Minute)
                .Select(x => new ActivityScheduleDto(x))
                .ToListAsync();

            return Ok(schedules);
        }

        [HttpPost]
        public async Task<IActionResult> CreateSchedule([FromBody] ActivityScheduleRequest req)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var count = await _db.UserActivitySchedules
                .CountAsync(x => x.UserId == userId.Value && x.IsActive);
            if (count >= 10)
                return BadRequest(new { message = "Tối đa 10 hoạt động." });

            var schedule = new UserActivitySchedule
            {
                UserId = userId.Value,
                Name = req.Name.Trim(),
                Icon = req.Icon ?? "📅",
                HourOfDay = Math.Clamp(req.HourOfDay, 0, 23),
                Minute = req.Minute is 0 or 30 ? req.Minute : 0,
                DurationMinutes = Math.Clamp(req.DurationMinutes, 5, 240),
                IsOutdoor = req.IsOutdoor,
                Intensity = NormalizeIntensity(req.Intensity),
                DaysOfWeek = req.DaysOfWeek ?? "1,2,3,4,5",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            _db.UserActivitySchedules.Add(schedule);
            await _db.SaveChangesAsync();

            _logger.LogInformation("User {UserId} created activity: {Name}", userId, req.Name);
            return Ok(new ActivityScheduleDto(schedule));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateSchedule(int id, [FromBody] ActivityScheduleRequest req)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var schedule = await _db.UserActivitySchedules
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value);
            if (schedule == null) return NotFound();

            schedule.Name = req.Name.Trim();
            schedule.Icon = req.Icon ?? schedule.Icon;
            schedule.HourOfDay = Math.Clamp(req.HourOfDay, 0, 23);
            schedule.Minute = req.Minute is 0 or 30 ? req.Minute : 0;
            schedule.DurationMinutes = Math.Clamp(req.DurationMinutes, 5, 240);
            schedule.IsOutdoor = req.IsOutdoor;
            schedule.Intensity = NormalizeIntensity(req.Intensity);
            schedule.DaysOfWeek = req.DaysOfWeek ?? schedule.DaysOfWeek;

            await _db.SaveChangesAsync();
            return Ok(new ActivityScheduleDto(schedule));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSchedule(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var schedule = await _db.UserActivitySchedules
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value);
            if (schedule == null) return NotFound();

            schedule.IsActive = false;  // soft delete
            await _db.SaveChangesAsync();
            return Ok(new { message = "Đã xóa hoạt động." });
        }

        [HttpGet("forecast")]
        public async Task<IActionResult> GetActivityForecast()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var prefs = await _db.UserPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId.Value);
            var userGroup = prefs?.UserGroup ?? "normal";

            var today = (int)DateTime.Now.DayOfWeek;
            var dayNum = today == 0 ? 7 : today;

            var schedules = await _db.UserActivitySchedules
                .AsNoTracking()
                .Where(x => x.UserId == userId.Value && x.IsActive)
                .ToListAsync();

            var todaySchedules = schedules
                .Where(s => s.DaysOfWeek.Split(',')
                    .Select(d => int.TryParse(d.Trim(), out var n) ? n : -1)
                    .Contains(dayNum))
                .OrderBy(s => s.HourOfDay).ThenBy(s => s.Minute)
                .ToList();

            if (!todaySchedules.Any())
                return Ok(new ActivityForecastResponse
                {
                    UserGroup = userGroup,
                    Date = DateTime.Now.ToString("dd/MM/yyyy"),
                    Activities = [],
                    OverallRisk = "GOOD",
                    DaySummary = "Không có hoạt động nào hôm nay.",
                });

            var forecast = await _aiService.GetForecastRangeAsync(userGroup, 1);
            if (forecast == null)
                return StatusCode(503, new { message = "Forecast cache chưa sẵn sàng." });

            var forecastPoints = forecast.Forecast;

            var activities = todaySchedules.Select(s =>
            {
                var activityHour = s.HourOfDay;
                var matched = forecastPoints
                    .OrderBy(f =>
                    {
                        if (!DateTime.TryParse(f.Time, out var ft)) return 999;
                        return Math.Abs(ft.Hour - activityHour);
                    })
                    .FirstOrDefault();

                double pm25 = matched?.PredPm25 ?? 0;
                int aqi = matched?.PredAqi ?? 0;
                string risk = matched?.RiskProfile ?? "MODERATE";

                double baseScore = AqiToRiskScore(aqi);

                double groupMultiplier = userGroup switch
                {
                    "child" => 1.4,  
                    "elderly" => 1.3,  
                    "respiratory" => 1.5,  
                    "pregnant" => 1.35, 
                    _ => 1.0,  
                };

                double intensityMultiplier = s.Intensity switch
                {
                    "high" => 1.4,  
                    "moderate" => 1.15, 
                    _ => 1.0, 
                };

                double outdoorMultiplier = s.IsOutdoor ? 1.0 : 0.3; 

                double finalScore = Math.Min(100,
                    baseScore * groupMultiplier * intensityMultiplier * outdoorMultiplier);

                var riskLevel = finalScore switch
                {
                    <= 20 => "GOOD",
                    <= 40 => "MODERATE",
                    <= 60 => "UNHEALTHY_SENSITIVE",
                    <= 75 => "UNHEALTHY",
                    <= 90 => "VERY_UNHEALTHY",
                    _ => "HAZARDOUS",
                };

                var recommendation = BuildRecommendation(
                    s, riskLevel, pm25, aqi, userGroup);

                return new ActivityRiskDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Icon = s.Icon,
                    HourOfDay = s.HourOfDay,
                    Minute = s.Minute,
                    DurationMinutes = s.DurationMinutes,
                    IsOutdoor = s.IsOutdoor,
                    Intensity = s.Intensity,
                    ForecastPm25 = Math.Round(pm25, 1),
                    ForecastAqi = aqi,
                    ForecastRisk = risk,
                    RiskScore = Math.Round(finalScore, 1),
                    RiskLevel = riskLevel,
                    Recommendation = recommendation,
                    GroupMultiplier = Math.Round(groupMultiplier, 2),
                    IntensityMultiplier = Math.Round(intensityMultiplier, 2),
                    BestAlternativeHour = FindBestAlternativeHour(s, forecastPoints, userGroup),
                };
            }).ToList();

            var outdoorActivities = activities.Where(a => a.IsOutdoor).ToList();
            var overallRisk = outdoorActivities.Any()
                ? outdoorActivities.OrderByDescending(a => a.RiskScore).First().RiskLevel
                : "GOOD";

            var daySummary = BuildDaySummary(activities, userGroup, overallRisk);

            _logger.LogInformation(
                "Activity forecast: User={UserId} group={Group} activities={Count} overallRisk={Risk}",
                userId, userGroup, activities.Count, overallRisk);

            return Ok(new ActivityForecastResponse
            {
                UserGroup = userGroup,
                Date = DateTime.Now.ToString("dd/MM/yyyy"),
                Activities = activities,
                OverallRisk = overallRisk,
                DaySummary = daySummary,
            });
        }

        private int? GetUserId()
        {
            var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(v, out var id) ? id : null;
        }

        private static string NormalizeIntensity(string? s) =>
            s?.ToLower() switch { "high" => "high", "low" => "low", _ => "moderate" };

        private static double AqiToRiskScore(int aqi) => aqi switch
        {
            <= 50 => aqi * 0.4,            // 0-20
            <= 100 => 20 + (aqi - 50) * 0.4, // 20-40
            <= 150 => 40 + (aqi - 100) * 0.4, // 40-60
            <= 200 => 60 + (aqi - 150) * 0.3, // 60-75
            <= 300 => 75 + (aqi - 200) * 0.15, // 75-90
            _ => Math.Min(100, 90 + (aqi - 300) * 0.1),
        };

        private static int? FindBestAlternativeHour(
            UserActivitySchedule schedule,
            IEnumerable<AiForecastItem> forecast,
            string userGroup)
        {
            var best = forecast
                .Select(f => new {
                    Hour = DateTime.TryParse(f.Time, out var dt) ? (int?)dt.Hour : null,
                    Aqi = f.PredAqi
                })
                .Where(x => x.Hour.HasValue && x.Hour.Value != schedule.HourOfDay)
                .OrderBy(x => x.Aqi)
                .FirstOrDefault();

            return best?.Hour;
        }

        private static string BuildRecommendation(
            UserActivitySchedule schedule,
            string riskLevel,
            double pm25, int aqi,
            string userGroup)
        {
            var groupNote = userGroup switch
            {
                "child" => "Trẻ em rất nhạy cảm với bụi mịn. ",
                "elderly" => "Người cao tuổi cần thận trọng hơn. ",
                "respiratory" => "Người bệnh hô hấp nên hạn chế tối đa. ",
                "pregnant" => "Phụ nữ mang thai cần bảo vệ đặc biệt. ",
                _ => "",
            };

            var intensityNote = schedule.Intensity == "high" && riskLevel != "GOOD"
                ? "Hoạt động cường độ cao → hít nhiều PM2.5 hơn 40%. "
                : "";

            return riskLevel switch
            {
                "GOOD" =>
                    $"✓ Thời điểm lý tưởng cho {schedule.Name.ToLower()}. PM2.5 {pm25} µg/m³ — an toàn.",
                "MODERATE" =>
                    $"{groupNote}PM2.5 {pm25} µg/m³. {schedule.Name} được nhưng nên đeo khẩu trang nếu nhạy cảm.",
                "UNHEALTHY_SENSITIVE" =>
                    $"{groupNote}{intensityNote}PM2.5 {pm25} µg/m³. Đeo khẩu trang N95 khi {schedule.Name.ToLower()}.",
                "UNHEALTHY" =>
                    $"{groupNote}{intensityNote}PM2.5 {pm25} µg/m³. Hạn chế thời gian ngoài trời khi {schedule.Name.ToLower()}. Cân nhắc đổi giờ.",
                _ =>
                    $"⚠️ {groupNote}PM2.5 {pm25} µg/m³. Nên hoãn {schedule.Name.ToLower()} hoặc chuyển vào trong nhà.",
            };
        }

        private static string BuildDaySummary(
            List<ActivityRiskDto> activities,
            string userGroup,
            string overallRisk)
        {
            var dangerCount = activities.Count(a =>
                a.IsOutdoor && a.RiskLevel is "UNHEALTHY" or "VERY_UNHEALTHY" or "HAZARDOUS");
            var goodCount = activities.Count(a => a.RiskLevel is "GOOD" or "MODERATE");
            var total = activities.Count;

            var groupLabel = userGroup switch
            {
                "child" => "trẻ em",
                "elderly" => "người cao tuổi",
                "respiratory" => "người bệnh hô hấp",
                "pregnant" => "phụ nữ mang thai",
                _ => "bạn",
            };

            if (dangerCount == 0)
                return $"Hôm nay chất lượng không khí tốt — {goodCount}/{total} hoạt động an toàn cho {groupLabel}.";
            if (dangerCount == total)
                return $"Hôm nay ô nhiễm cao — tất cả {total} hoạt động ngoài trời có rủi ro cho {groupLabel}. Hạn chế ra ngoài.";
            return $"{dangerCount}/{total} hoạt động của {groupLabel} có rủi ro cao hôm nay. Xem chi tiết từng mục.";
        }
    }
}