using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace airsafenet_backend.Models
{
    public class UserPreferences
    {
        public int Id { get; set; }

        [ForeignKey(nameof(User))]
        public int UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string UserGroup { get; set; } = "normal";

        [MaxLength(150)]
        public string PreferredLocation { get; set; } = "Ho Chi Minh City";

        public bool NotifyEnabled { get; set; } = true;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}
