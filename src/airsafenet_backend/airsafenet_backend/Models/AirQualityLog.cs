using System.ComponentModel.DataAnnotations;

namespace airsafenet_backend.Models
{
    public class AirQualityLog
    {
        public int Id { get; set; }

        public double Pm25 { get; set; }

        public int Aqi { get; set; }

        [MaxLength(50)]
        public string Risk { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Recommendation { get; set; } = string.Empty;

        [MaxLength(50)]
        public string UserGroup { get; set; } = "normal";

        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    }
}
