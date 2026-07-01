using System.ComponentModel.DataAnnotations;

namespace airsafenet_backend.DTOs.Family
{
    public class UpsertFamilyProfileRequest
    {
        [Required]
        [MaxLength(120)]
        public string DisplayName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Relationship { get; set; } = "family";

        [Required]
        [MaxLength(50)]
        public string UserGroup { get; set; } = "child";

        [MaxLength(150)]
        public string PreferredLocation { get; set; } = "Ho Chi Minh City";

        public bool NotifyEnabled { get; set; } = true;

        public int NotifyThreshold { get; set; } = 100;

        [MaxLength(300)]
        public string? Notes { get; set; }
    }
}
