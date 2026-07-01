using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace airsafenet_backend.Models
{
    public class FamilyProfile
    {
        public int Id { get; set; }

        [ForeignKey(nameof(User))]
        public int UserId { get; set; }

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

        [Range(0, 500)]
        public int NotifyThreshold { get; set; } = 100;

        [MaxLength(300)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}