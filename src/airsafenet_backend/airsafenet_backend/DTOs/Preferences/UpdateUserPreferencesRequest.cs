using System.ComponentModel.DataAnnotations;

namespace airsafenet_backend.DTOs.Preferences
{
    public class UpdateUserPreferencesRequest
    {
        [Required]
        [MaxLength(50)]
        public string UserGroup { get; set; } = "normal";

        [MaxLength(150)]
        public string PreferredLocation { get; set; } = "Ho Chi Minh City";

        public bool NotifyEnabled { get; set; } = true;
    }
}
