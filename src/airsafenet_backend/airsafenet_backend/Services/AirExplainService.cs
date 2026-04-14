using System.Net.Http.Json;
using System.Text.Json.Serialization;
using airsafenet_backend.DTOs.Air;
using airsafenet_backend.DTOs.OpenMeteo;

namespace airsafenet_backend.Services
{
    public class AirExplainService
    {
        private readonly HttpClient _http;
        private const double LAT = 10.8231;
        private const double LON = 106.6297;
        private const string TZ = "Asia/Bangkok";

        // ── Ngưỡng tham chiếu cho HCMC ────────────────────────────────────────
        private const double WIND_STRONG = 15.0;   // km/h — phát tán tốt
        private const double WIND_WEAK = 5.0;    // km/h — tích tụ
        private const double HUM_FOG = 88.0;   // % — sương mù, PM2.5 thứ cấp
        private const double HUM_GOOD = 75.0;   // % — lắng bụi tốt
        private const double HUM_DRY = 40.0;   // % — bụi khô bay
        private const double TEMP_HOT = 33.0;   // °C — quang hóa mạnh
        private const double TEMP_COOL = 22.0;   // °C — nghịch nhiệt sáng
        private const double PRES_STABLE = 1015.0; // hPa — khí quyển ổn định
        private const double PRES_FRONT = 1008.0; // hPa — front, mưa
        private const double UV_HIGH = 6.0;    // WHO scale
        private const double UV_MOD = 3.0;
        private const double CLOUD_HEAVY = 80.0;   // % — che UV mạnh
        private const double CLOUD_CLEAR = 20.0;   // % — UV mạnh

        public AirExplainService(HttpClient http)
        {
            _http = http;
        }

        public async Task<AiExplainResponse> ExplainAsync(AiCurrentResponse aiCurrent)
        {
            // 1. Lấy dữ liệu thời tiết THẬT từ Open-Meteo
            var weather = await FetchCurrentWeatherAsync();

            // 2. Build response
            var resp = new AiExplainResponse
            {
                PredPm25 = aiCurrent.PredPm25,
                PredAqi = aiCurrent.PredAqi,
                AqiCategory = aiCurrent.AqiCategory,
                ObservedPm25 = aiCurrent.ObservedPm25,

                // Dữ liệu thật từ Open-Meteo
                WindSpeed = weather.WindSpeed,
                WindDirection = weather.WindDirection,
                Humidity = weather.Humidity,
                Temperature = weather.Temperature,
                Pressure = weather.Pressure,
                UvIndex = weather.UvIndex,
                CloudCover = weather.CloudCover,
                WeatherSource = "Open-Meteo Real-time",
                WeatherObservedAt = weather.ObservedAt,
                GeneratedAt = DateTime.UtcNow,
            };

            // 3. Tính impact scores
            resp.WindImpact = ScoreWind(resp.WindSpeed);
            resp.HumidityImpact = ScoreHumidity(resp.Humidity);
            resp.TemperatureImpact = ScoreTemperature(resp.Temperature);
            resp.PressureImpact = ScorePressure(resp.Pressure);
            resp.UvImpact = ScoreUv(resp.UvIndex, resp.CloudCover);
            resp.CloudImpact = ScoreCloud(resp.CloudCover);
            resp.Pm25HistoryImpact = ScorePm25History(resp.ObservedPm25);

            // 4. Giải thích tiếng Việt
            resp.WindExplain = ExplainWind(resp.WindSpeed, resp.WindDirection);
            resp.HumidityExplain = ExplainHumidity(resp.Humidity);
            resp.TemperatureExplain = ExplainTemperature(resp.Temperature);
            resp.PressureExplain = ExplainPressure(resp.Pressure);
            resp.UvExplain = ExplainUv(resp.UvIndex, resp.CloudCover);
            resp.CloudExplain = ExplainCloud(resp.CloudCover);
            resp.Pm25HistoryExplain = ExplainPm25History(resp.ObservedPm25, resp.PredPm25);

            // 5. Tổng kết
            var total = resp.WindImpact + resp.HumidityImpact + resp.TemperatureImpact
                      + resp.PressureImpact + resp.UvImpact + resp.Pm25HistoryImpact;

            (resp.TrendDirection, resp.TrendLabel) = ClassifyTrend(total);
            resp.TopFactor = FindTopFactor(resp);
            resp.OverallSummary = BuildSummary(resp, total);

            return resp;
        }

        private record WeatherSnapshot(
            double WindSpeed, double WindDirection,
            double Humidity, double Temperature,
            double Pressure, double UvIndex,
            double CloudCover, DateTime ObservedAt);

        private async Task<WeatherSnapshot> FetchCurrentWeatherAsync()
        {
            // Open-Meteo current= API — không cần key, cập nhật 15 phút
            var url =
                $"https://api.open-meteo.com/v1/forecast" +
                $"?latitude={LAT}&longitude={LON}" +
                $"&current=temperature_2m,relative_humidity_2m,wind_speed_10m," +
                $"wind_direction_10m,surface_pressure,uv_index,cloud_cover" +
                $"&timezone={Uri.EscapeDataString(TZ)}" +
                $"&wind_speed_unit=kmh";

            var response = await _http.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadFromJsonAsync<OpenMeteoCurrentResponse>();
            var c = json?.Current;

            if (c == null)
                throw new Exception("Open-Meteo không trả về current data.");

            DateTime.TryParse(c.Time, out var observedAt);

            return new WeatherSnapshot(
                WindSpeed: c.WindSpeed10m ?? 5.0,
                WindDirection: c.WindDirection10m ?? 180.0,
                Humidity: c.RelativeHumidity2m ?? 70.0,
                Temperature: c.Temperature2m ?? 30.0,
                Pressure: c.SurfacePressure ?? 1010.0,
                UvIndex: c.UvIndex ?? 5.0,
                CloudCover: c.CloudCover ?? 40.0,
                ObservedAt: observedAt
            );
        }

        private static double ScoreWind(double v)
        {
            if (v >= WIND_STRONG) return -0.8;
            if (v >= 10) return -0.4;
            if (v >= WIND_WEAK) return 0.1;
            return 0.7;
        }

        private static double ScoreHumidity(double v)
        {
            if (v > HUM_FOG) return 0.5;
            if (v > HUM_GOOD) return -0.3;
            if (v > 50) return -0.1;
            if (v > HUM_DRY) return 0.2;
            return 0.6;
        }

        private static double ScoreTemperature(double v)
        {
            if (v >= TEMP_HOT) return 0.6;
            if (v >= 28) return 0.2;
            if (v >= TEMP_COOL) return -0.1;
            return 0.4; // nghịch nhiệt sáng sớm
        }

        private static double ScorePressure(double v)
        {
            if (v >= PRES_STABLE) return 0.4;
            if (v >= 1010) return 0.1;
            if (v >= PRES_FRONT) return -0.2;
            return -0.5;
        }

        private static double ScoreUv(double uv, double cloud)
        {
            // UV bị suy giảm bởi mây — cloud nặng giảm UV thực tế ~60-80%
            var effectiveUv = cloud > CLOUD_HEAVY
                ? uv * 0.3
                : cloud > 50
                ? uv * 0.6
                : uv;

            if (effectiveUv >= UV_HIGH) return 0.5;
            if (effectiveUv >= UV_MOD) return 0.2;
            return -0.1;
        }

        private static double ScoreCloud(double v)
        {
            // Mây nhiều → UV yếu → ít quang hóa → giảm PM2.5 thứ cấp
            // Nhưng mây nhiều kèm ẩm → fog → tăng PM2.5
            if (v > CLOUD_HEAVY) return 0.1;  // fog risk
            if (v > 50) return -0.1;
            if (v < CLOUD_CLEAR) return 0.2;  // quang hóa mạnh
            return 0.0;
        }

        private static double ScorePm25History(double v)
        {
            if (v >= 55) return 0.9;
            if (v >= 35) return 0.6;
            if (v >= 20) return 0.3;
            if (v >= 12) return 0.0;
            return -0.3;
        }

        private static string WindDirLabel(double deg)
        {
            string[] dirs = ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"];
            return dirs[(int)Math.Round(deg / 45) % 8];
        }

        private static string ExplainWind(double v, double dir)
        {
            var dirLabel = WindDirLabel(dir);
            if (v >= WIND_STRONG)
                return $"Gió {dirLabel} {v:F1} km/h — mạnh, phát tán bụi tốt, giúp giảm PM2.5";
            if (v >= 10)
                return $"Gió {dirLabel} {v:F1} km/h — trung bình, phát tán ở mức chấp nhận được";
            if (v >= WIND_WEAK)
                return $"Gió {dirLabel} {v:F1} km/h — yếu, khả năng phát tán bụi kém";
            return $"Gió {dirLabel} {v:F1} km/h — gần lặng gió, bụi tích tụ trong lớp khí quyển thấp";
        }

        private static string ExplainHumidity(double v)
        {
            if (v > HUM_FOG)
                return $"Độ ẩm {v:F0}% — rất cao, nguy cơ sương mù làm tăng PM2.5 thứ cấp";
            if (v > HUM_GOOD)
                return $"Độ ẩm {v:F0}% — cao, bụi lắng xuống, giúp giảm PM2.5 nhẹ";
            if (v > 50)
                return $"Độ ẩm {v:F0}% — mức bình thường, ít ảnh hưởng đến bụi";
            if (v > HUM_DRY)
                return $"Độ ẩm {v:F0}% — hơi thấp, bụi khô dễ phát tán trong không khí";
            return $"Độ ẩm {v:F0}% — rất thấp, bụi khô lơ lửng nhiều";
        }

        private static string ExplainTemperature(double v)
        {
            if (v >= TEMP_HOT)
                return $"Nhiệt độ {v:F1}°C — nóng, phản ứng quang hóa mạnh, tạo PM2.5 thứ cấp & ozone";
            if (v >= 28)
                return $"Nhiệt độ {v:F1}°C — ấm, quang hóa ở mức trung bình";
            if (v >= TEMP_COOL)
                return $"Nhiệt độ {v:F1}°C — mát, điều kiện tương đối thuận lợi cho chất lượng không khí";
            return $"Nhiệt độ {v:F1}°C — thấp, có thể xảy ra nghịch nhiệt giữ bụi tại tầng thấp";
        }

        private static string ExplainPressure(double v)
        {
            if (v >= PRES_STABLE)
                return $"Áp suất {v:F0} hPa — cao, khí quyển ổn định, bụi ít phát tán theo chiều đứng";
            if (v >= 1010)
                return $"Áp suất {v:F0} hPa — mức bình thường";
            if (v >= PRES_FRONT)
                return $"Áp suất {v:F0} hPa — hơi thấp, có thể có mưa nhẹ rửa bụi";
            return $"Áp suất {v:F0} hPa — thấp, front thời tiết, mưa rửa sạch bụi trong không khí";
        }

        private static string ExplainUv(double uv, double cloud)
        {
            var cloudNote = cloud > CLOUD_HEAVY
                ? $" (mây {cloud:F0}% suy giảm UV đáng kể)"
                : cloud > 50
                ? $" (mây {cloud:F0}% suy giảm UV một phần)"
                : "";

            if (uv >= 8)
                return $"Tia UV {uv:F1} — rất cao{cloudNote}, phản ứng quang hóa cực mạnh tạo PM2.5 & ozone";
            if (uv >= UV_HIGH)
                return $"Tia UV {uv:F1} — cao{cloudNote}, thúc đẩy phản ứng quang hóa NOx+VOC tạo PM2.5 thứ cấp";
            if (uv >= UV_MOD)
                return $"Tia UV {uv:F1} — trung bình{cloudNote}, quang hóa ở mức vừa phải";
            return $"Tia UV {uv:F1} — thấp{cloudNote}, quang hóa hạn chế, ít tạo PM2.5 thứ cấp";
        }

        private static string ExplainCloud(double v)
        {
            if (v > CLOUD_HEAVY)
                return $"Mây {v:F0}% — nhiều mây, hạn chế UV nhưng tăng độ ẩm, nguy cơ sương mù";
            if (v > 50)
                return $"Mây {v:F0}% — nhiều mây vừa, suy giảm UV và quang hóa";
            if (v < CLOUD_CLEAR)
                return $"Mây {v:F0}% — trời quang, UV mạnh, điều kiện quang hóa tốt";
            return $"Mây {v:F0}% — mây rải rác, ảnh hưởng nhẹ đến UV";
        }

        private static string ExplainPm25History(double obs, double pred)
        {
            var diff = pred - obs;
            var trend = diff > 3 ? "tăng" : diff < -3 ? "giảm" : "duy trì";
            return $"PM2.5 quan trắc {obs:F1} µg/m³ — lag features dự đoán {trend} về {pred:F1} µg/m³";
        }

        private static (string dir, string label) ClassifyTrend(double total)
        {
            if (total > 0.8) return ("increasing", "Xu hướng tăng mạnh ⬆");
            if (total > 0.3) return ("increasing", "Xu hướng tăng nhẹ ↗");
            if (total < -0.8) return ("decreasing", "Xu hướng cải thiện mạnh ⬇");
            if (total < -0.3) return ("decreasing", "Xu hướng cải thiện ↘");
            return ("stable", "Xu hướng ổn định →");
        }

        private static string FindTopFactor(AiExplainResponse r)
        {
            return new Dictionary<string, double>
            {
                ["Lịch sử PM2.5"] = Math.Abs(r.Pm25HistoryImpact),
                ["Tốc độ gió"] = Math.Abs(r.WindImpact),
                ["Độ ẩm"] = Math.Abs(r.HumidityImpact),
                ["Nhiệt độ"] = Math.Abs(r.TemperatureImpact),
                ["Áp suất khí quyển"] = Math.Abs(r.PressureImpact),
                ["Tia UV"] = Math.Abs(r.UvImpact),
                ["Độ che phủ mây"] = Math.Abs(r.CloudImpact),
            }
            .OrderByDescending(x => x.Value)
            .First().Key;
        }

        private static string BuildSummary(AiExplainResponse r, double total)
        {
            var parts = new List<string>();

            if (r.WindSpeed < WIND_WEAK)
                parts.Add("gió lặng khiến bụi tích tụ");
            else if (r.WindSpeed >= WIND_STRONG)
                parts.Add("gió mạnh giúp phát tán bụi");

            if (r.Temperature >= TEMP_HOT)
                parts.Add($"nhiệt độ {r.Temperature:F1}°C thúc đẩy quang hóa");
            if (r.Humidity > HUM_FOG)
                parts.Add($"độ ẩm {r.Humidity:F0}% tạo điều kiện sương mù");
            else if (r.Humidity < HUM_DRY)
                parts.Add("không khí khô làm bụi dễ lơ lửng");

            if (r.UvIndex >= UV_HIGH && r.CloudCover < CLOUD_HEAVY)
                parts.Add($"UV {r.UvIndex:F1} tăng PM2.5 thứ cấp");

            if (r.Pressure >= PRES_STABLE)
                parts.Add($"áp suất cao ({r.Pressure:F0} hPa) giữ bụi tầng thấp");

            var condition = parts.Count > 0
                ? string.Join(", ", parts)
                : "điều kiện khí tượng ở mức trung bình";

            return $"Model dự báo AQI {r.PredAqi} vì {condition}. Yếu tố chính: {r.TopFactor}.";
        }
    }
}
