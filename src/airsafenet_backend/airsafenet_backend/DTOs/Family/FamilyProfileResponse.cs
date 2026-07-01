namespace airsafenet_backend.DTOs.Family
{
    public class FamilyProfileResponse
    {
        public int Id { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string Relationship { get; set; } = "family";
        public string UserGroup { get; set; } = "child";
        public string PreferredLocation { get; set; } = "Ho Chi Minh City";
        public bool NotifyEnabled { get; set; }
        public int NotifyThreshold { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
