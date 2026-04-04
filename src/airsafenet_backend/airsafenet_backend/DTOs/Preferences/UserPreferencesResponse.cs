namespace airsafenet_backend.DTOs.Preferences
{
    public class UserPreferencesResponse
    {
        public int UserId { get; set; }
        public string UserGroup { get; set; } = "normal";
        public string PreferredLocation { get; set; } = "Ho Chi Minh City";
        public bool NotifyEnabled { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}