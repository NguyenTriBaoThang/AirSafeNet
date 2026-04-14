using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.OpenMeteo
{
    public class OpenMeteoCurrentResponse
    {
        [JsonPropertyName("current")]
        public OpenMeteoCurrent? Current { get; set; }
    }

    public class OpenMeteoCurrent
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;

        /// <summary>Nhiệt độ tại 2m, °C</summary>
        [JsonPropertyName("temperature_2m")]
        public double? Temperature2m { get; set; }

        /// <summary>Độ ẩm tương đối tại 2m, %</summary>
        [JsonPropertyName("relative_humidity_2m")]
        public double? RelativeHumidity2m { get; set; }

        /// <summary>Tốc độ gió tại 10m, km/h</summary>
        [JsonPropertyName("wind_speed_10m")]
        public double? WindSpeed10m { get; set; }

        /// <summary>Hướng gió tại 10m, degrees (0=Bắc, 90=Đông, 180=Nam, 270=Tây)</summary>
        [JsonPropertyName("wind_direction_10m")]
        public double? WindDirection10m { get; set; }

        /// <summary>Áp suất khí quyển tại mực nước biển, hPa</summary>
        [JsonPropertyName("surface_pressure")]
        public double? SurfacePressure { get; set; }

        /// <summary>Chỉ số UV hiện tại (0-11+) theo WHO scale</summary>
        [JsonPropertyName("uv_index")]
        public double? UvIndex { get; set; }

        /// <summary>Độ che phủ mây, %</summary>
        [JsonPropertyName("cloud_cover")]
        public double? CloudCover { get; set; }
    }
}
