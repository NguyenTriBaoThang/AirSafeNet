using System.ComponentModel.DataAnnotations;

namespace airsafenet_backend.Models
{
    public class ForecastSnapshot
    {
        public int Id { get; set; }

        [MaxLength(50)]
        public string UserGroup { get; set; } = "normal";

        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

        public DateTime TargetTime { get; set; }

        public double PredictedPm25 { get; set; }

        public int PredictedAqi { get; set; }

        [MaxLength(50)]
        public string Risk { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Recommendation { get; set; } = string.Empty;

        public int ForecastHorizonHours { get; set; }

        public DateTime SnapshotCreatedAt { get; set; } = DateTime.UtcNow;
    }
}