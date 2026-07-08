using airsafenet_backend.DTOs.Profiles;

namespace airsafenet_backend.DTOs.Preferences
{
    public class UserPreferencesResponse
    {
        public int UserId { get; set; }
        public string UserGroup { get; set; } = "normal";
        public string PreferredLocation { get; set; } = "Ho Chi Minh City";
        public bool NotifyEnabled { get; set; }
        public string NotifyChannel { get; set; } = "none";
        public string? TelegramChatId { get; set; }
        public string? NotifyEmail { get; set; }
        public int NotifyThreshold { get; set; } = 100;
        public UserProfileRuleResponse? ProfileRule { get; set; }
        public List<UserProfileRuleResponse> AvailableProfiles { get; set; } = new();
        public DateTime? LastAlertSentAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}