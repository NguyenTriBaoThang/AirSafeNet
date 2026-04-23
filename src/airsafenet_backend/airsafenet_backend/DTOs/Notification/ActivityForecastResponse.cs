using airsafenet_backend.Controllers;
using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Notification
{
    public class ActivityForecastResponse
    {
        [JsonPropertyName("userGroup")] public string UserGroup { get; init; } = "";
        [JsonPropertyName("date")] public string Date { get; init; } = "";
        [JsonPropertyName("activities")] public List<ActivityRiskDto> Activities { get; init; } = [];
        [JsonPropertyName("overallRisk")] public string OverallRisk { get; init; } = "GOOD";
        [JsonPropertyName("daySummary")] public string DaySummary { get; init; } = "";
    }

    public class ActivityRiskDto
    {
        [JsonPropertyName("id")] public int Id { get; init; }
        [JsonPropertyName("name")] public string Name { get; init; } = "";
        [JsonPropertyName("icon")] public string Icon { get; init; } = "📅";
        [JsonPropertyName("hourOfDay")] public int HourOfDay { get; init; }
        [JsonPropertyName("minute")] public int Minute { get; init; }
        [JsonPropertyName("durationMinutes")] public int DurationMinutes { get; init; }
        [JsonPropertyName("isOutdoor")] public bool IsOutdoor { get; init; }
        [JsonPropertyName("intensity")] public string Intensity { get; init; } = "moderate";
        [JsonPropertyName("forecastPm25")] public double ForecastPm25 { get; init; }
        [JsonPropertyName("forecastAqi")] public int ForecastAqi { get; init; }
        [JsonPropertyName("forecastRisk")] public string ForecastRisk { get; init; } = "";
        [JsonPropertyName("riskScore")] public double RiskScore { get; init; }
        [JsonPropertyName("riskLevel")] public string RiskLevel { get; init; } = "";
        [JsonPropertyName("recommendation")] public string Recommendation { get; init; } = "";
        [JsonPropertyName("groupMultiplier")] public double GroupMultiplier { get; init; }
        [JsonPropertyName("intensityMultiplier")] public double IntensityMultiplier { get; init; }
        [JsonPropertyName("bestAlternativeHour")] public int? BestAlternativeHour { get; init; }
    }
}
