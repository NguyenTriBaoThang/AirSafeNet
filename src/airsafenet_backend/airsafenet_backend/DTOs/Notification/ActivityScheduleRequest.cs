using airsafenet_backend.Models;
using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Notification
{
    public class ActivityScheduleRequest
    {
        [JsonPropertyName("name")] public string Name { get; set; } = "";
        [JsonPropertyName("icon")] public string? Icon { get; set; }
        [JsonPropertyName("hourOfDay")] public int HourOfDay { get; set; }
        [JsonPropertyName("minute")] public int Minute { get; set; }
        [JsonPropertyName("durationMinutes")] public int DurationMinutes { get; set; } = 30;
        [JsonPropertyName("isOutdoor")] public bool IsOutdoor { get; set; } = true;
        [JsonPropertyName("intensity")] public string? Intensity { get; set; } = "moderate";
        [JsonPropertyName("daysOfWeek")] public string? DaysOfWeek { get; set; } = "1,2,3,4,5";
    }

    public class ActivityScheduleDto
    {
        [JsonPropertyName("id")] public int Id { get; init; }
        [JsonPropertyName("name")] public string Name { get; init; } = "";
        [JsonPropertyName("icon")] public string Icon { get; init; } = "📅";
        [JsonPropertyName("hourOfDay")] public int HourOfDay { get; init; }
        [JsonPropertyName("minute")] public int Minute { get; init; }
        [JsonPropertyName("durationMinutes")] public int DurationMinutes { get; init; }
        [JsonPropertyName("isOutdoor")] public bool IsOutdoor { get; init; }
        [JsonPropertyName("intensity")] public string Intensity { get; init; } = "moderate";
        [JsonPropertyName("daysOfWeek")] public string DaysOfWeek { get; init; } = "1,2,3,4,5";

        public ActivityScheduleDto() { }
        public ActivityScheduleDto(UserActivitySchedule s)
        {
            Id = s.Id;
            Name = s.Name;
            Icon = s.Icon;
            HourOfDay = s.HourOfDay;
            Minute = s.Minute;
            DurationMinutes = s.DurationMinutes;
            IsOutdoor = s.IsOutdoor;
            Intensity = s.Intensity;
            DaysOfWeek = s.DaysOfWeek;
        }
    }
}
