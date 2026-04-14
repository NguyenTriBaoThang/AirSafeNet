using airsafenet_backend.DTOs.Air;

namespace airsafenet_backend.Services
{
    public class AirExplainService
    {
        // Gió: > 15 km/h phát tán tốt, < 5 km/h tích tụ bụi
        private const double WIND_GOOD = 15.0;
        private const double WIND_POOR = 5.0;

        // Độ ẩm: > 75% làm bụi lắng, nhưng > 90% fog tăng PM2.5
        private const double HUMIDITY_HIGH = 85.0;
        private const double HUMIDITY_LOW = 40.0;

        // Nhiệt độ: > 35°C tăng quang hóa, < 20°C nghịch nhiệt
        private const double TEMP_HOT = 33.0;
        private const double TEMP_COOL = 22.0;

        // Áp suất: < 1008 hPa front lạnh/thấp, > 1015 hPa ổn định
        private const double PRESSURE_HIGH = 1015.0;
        private const double PRESSURE_LOW = 1008.0;

        // UV: > 6 = cao, tăng phản ứng quang hóa tạo ozone/PM2.5 thứ cấp
        private const double UV_HIGH = 6.0;
        private const double UV_MODERATE = 3.0;

        public AiExplainResponse Explain(AiCurrentResponse current)
        {
            var resp = new AiExplainResponse
            {
                PredPm25 = current.PredPm25,
                PredAqi = current.PredAqi,
                AqiCategory = current.AqiCategory,
                WindSpeed = current.ObservedWindSpeed,
                Humidity = current.ObservedHumidity,
                Temperature = current.ObservedTemp,
                ObservedPm25 = current.ObservedPm25,
                GeneratedAt = DateTime.UtcNow,

                // Wind direction, pressure, UV, cloud — hiện tại AiCurrentResponse
                WindDirection = 180,   // hướng Nam — mùa mưa HCMC
                Pressure = 1010,  // hPa trung bình
                UvIndex = 5.5,   // UV trung bình HCMC
                CloudCover = 40,    // % mây trung bình
            };

            // Tính impact score cho từng yếu tố
            resp.WindImpact = ScoreWind(resp.WindSpeed);
            resp.HumidityImpact = ScoreHumidity(resp.Humidity);
            resp.TemperatureImpact = ScoreTemperature(resp.Temperature);
            resp.PressureImpact = ScorePressure(resp.Pressure);
            resp.UvImpact = ScoreUv(resp.UvIndex);
            resp.Pm25HistoryImpact = ScorePm25History(resp.ObservedPm25);

            // Giải thích text
            resp.WindExplain = ExplainWind(resp.WindSpeed);
            resp.HumidityExplain = ExplainHumidity(resp.Humidity);
            resp.TemperatureExplain = ExplainTemperature(resp.Temperature);
            resp.PressureExplain = ExplainPressure(resp.Pressure);
            resp.UvExplain = ExplainUv(resp.UvIndex);
            resp.Pm25HistoryExplain = ExplainPm25History(resp.ObservedPm25, current.PredPm25);

            // Tổng kết xu hướng
            var totalImpact = resp.WindImpact + resp.HumidityImpact
                            + resp.TemperatureImpact + resp.PressureImpact
                            + resp.UvImpact + resp.Pm25HistoryImpact;

            (resp.TrendDirection, resp.TrendLabel) = ClassifyTrend(totalImpact);
            resp.TopFactor = FindTopFactor(resp);
            resp.OverallSummary = BuildSummary(resp, totalImpact);

            return resp;
        }

        private static double ScoreWind(double windSpeed)
        {
            // Gió mạnh → phát tán bụi → PM2.5 giảm (score âm)
            // Gió yếu  → tích tụ bụi → PM2.5 tăng (score dương)
            if (windSpeed >= WIND_GOOD) return -0.8;
            if (windSpeed >= 10) return -0.4;
            if (windSpeed >= WIND_POOR) return 0.1;
            return 0.7; // Lặng gió — nguy cơ cao
        }

        private static string ExplainWind(double windSpeed)
        {
            if (windSpeed >= WIND_GOOD)
                return $"Gió {windSpeed:F1} km/h — phát tán bụi tốt, giúp giảm PM2.5";
            if (windSpeed >= 10)
                return $"Gió {windSpeed:F1} km/h — phát tán ở mức trung bình";
            if (windSpeed >= WIND_POOR)
                return $"Gió {windSpeed:F1} km/h — yếu, bụi phát tán kém";
            return $"Gió {windSpeed:F1} km/h — gần lặng gió, bụi tích tụ mạnh";
        }

        private static double ScoreHumidity(double humidity)
        {
            // Độ ẩm cao vừa (60-80%): bụi lắng xuống → giảm PM2.5
            // Độ ẩm rất cao (>85%): sương mù → tăng PM2.5 thứ cấp
            // Độ ẩm thấp (<40%): bụi khô bay lên
            if (humidity > 90) return 0.5;  // sương mù
            if (humidity > 75) return -0.3;  // lắng bụi tốt
            if (humidity > 50) return -0.1;  // bình thường
            if (humidity > HUMIDITY_LOW) return 0.2;
            return 0.6;  // rất khô — bụi bay
        }

        private static string ExplainHumidity(double humidity)
        {
            if (humidity > 90)
                return $"Độ ẩm {humidity:F0}% — rất cao, sương mù làm tăng PM2.5 thứ cấp";
            if (humidity > 75)
                return $"Độ ẩm {humidity:F0}% — cao, giúp bụi lắng xuống";
            if (humidity > 50)
                return $"Độ ẩm {humidity:F0}% — mức bình thường";
            if (humidity > HUMIDITY_LOW)
                return $"Độ ẩm {humidity:F0}% — hơi thấp, bụi khô dễ bay";
            return $"Độ ẩm {humidity:F0}% — rất thấp, bụi khô phát tán mạnh";
        }

        private static double ScoreTemperature(double temp)
        {
            // Nhiệt độ cao → tăng phản ứng quang hóa, PM2.5 thứ cấp
            // Nghịch nhiệt (lạnh sáng sớm) → bụi bị giữ lại tầng thấp
            if (temp >= TEMP_HOT) return 0.6;  // quang hóa mạnh
            if (temp >= 28) return 0.2;
            if (temp >= TEMP_COOL) return -0.1;  // mát mẻ, tốt
            return 0.4;  // nghịch nhiệt buổi sáng
        }

        private static string ExplainTemperature(double temp)
        {
            if (temp >= TEMP_HOT)
                return $"Nhiệt độ {temp:F1}°C — nóng, tăng phản ứng quang hóa tạo PM2.5 thứ cấp";
            if (temp >= 28)
                return $"Nhiệt độ {temp:F1}°C — ấm, quang hóa ở mức trung bình";
            if (temp >= TEMP_COOL)
                return $"Nhiệt độ {temp:F1}°C — mát mẻ, điều kiện tương đối thuận lợi";
            return $"Nhiệt độ {temp:F1}°C — thấp, có thể có nghịch nhiệt giữ bụi ở tầng thấp";
        }

        private static double ScorePressure(double pressure)
        {
            // Áp suất cao → khí quyển ổn định → bụi bị giữ lại (tăng PM2.5)
            // Áp suất thấp → front lạnh, mưa → rửa bụi (giảm PM2.5)
            if (pressure >= PRESSURE_HIGH) return 0.4;
            if (pressure >= 1010) return 0.1;
            if (pressure >= PRESSURE_LOW) return -0.2;
            return -0.5;  // áp thấp, mưa — rửa bụi
        }

        private static string ExplainPressure(double pressure)
        {
            if (pressure >= PRESSURE_HIGH)
                return $"Áp suất {pressure:F0} hPa — cao, khí quyển ổn định, bụi ít phát tán";
            if (pressure >= 1010)
                return $"Áp suất {pressure:F0} hPa — bình thường";
            if (pressure >= PRESSURE_LOW)
                return $"Áp suất {pressure:F0} hPa — hơi thấp, khả năng mưa nhẹ";
            return $"Áp suất {pressure:F0} hPa — thấp, front thời tiết, khả năng mưa rửa bụi";
        }

        private static double ScoreUv(double uvIndex)
        {
            // UV cao → phản ứng quang hóa NOx + VOC → tạo ozone + PM2.5 thứ cấp
            if (uvIndex >= UV_HIGH) return 0.5;
            if (uvIndex >= UV_MODERATE) return 0.2;
            return -0.1;
        }

        private static string ExplainUv(double uvIndex)
        {
            if (uvIndex >= UV_HIGH)
                return $"Chỉ số UV {uvIndex:F1} — cao, thúc đẩy phản ứng quang hóa tạo PM2.5 thứ cấp & ozone";
            if (uvIndex >= UV_MODERATE)
                return $"Chỉ số UV {uvIndex:F1} — trung bình, quang hóa ở mức vừa phải";
            return $"Chỉ số UV {uvIndex:F1} — thấp (nhiều mây/tối), quang hóa hạn chế";
        }

        private static double ScorePm25History(double observedPm25)
        {
            // PM2.5 quan trắc gần đây là indicator mạnh nhất
            if (observedPm25 >= 55) return 0.9;
            if (observedPm25 >= 35) return 0.6;
            if (observedPm25 >= 20) return 0.3;
            if (observedPm25 >= 12) return 0.0;
            return -0.3;
        }

        private static string ExplainPm25History(double observed, double predicted)
        {
            var diff = predicted - observed;
            var trend = diff > 3 ? "tăng" : diff < -3 ? "giảm" : "ổn định";
            return $"PM2.5 gần nhất {observed:F1} µg/m³ — xu hướng {trend} về {predicted:F1} µg/m³ (lag features)";
        }

        private static (string direction, string label) ClassifyTrend(double totalImpact)
        {
            if (totalImpact > 0.8) return ("increasing", "Xu hướng tăng mạnh ⬆");
            if (totalImpact > 0.3) return ("increasing", "Xu hướng tăng nhẹ ↗");
            if (totalImpact < -0.8) return ("decreasing", "Xu hướng giảm mạnh ⬇");
            if (totalImpact < -0.3) return ("decreasing", "Xu hướng cải thiện ↘");
            return ("stable", "Xu hướng ổn định →");
        }

        private static string FindTopFactor(AiExplainResponse r)
        {
            var factors = new Dictionary<string, double>
            {
                ["Lịch sử PM2.5"] = Math.Abs(r.Pm25HistoryImpact),
                ["Tốc độ gió"] = Math.Abs(r.WindImpact),
                ["Độ ẩm"] = Math.Abs(r.HumidityImpact),
                ["Nhiệt độ"] = Math.Abs(r.TemperatureImpact),
                ["Áp suất khí quyển"] = Math.Abs(r.PressureImpact),
                ["Chỉ số UV"] = Math.Abs(r.UvImpact),
            };
            return factors.OrderByDescending(x => x.Value).First().Key;
        }

        private static string BuildSummary(AiExplainResponse r, double totalImpact)
        {
            var parts = new List<string>();

            if (r.WindSpeed < WIND_POOR)
                parts.Add("gió lặng khiến bụi tích tụ");
            else if (r.WindSpeed >= WIND_GOOD)
                parts.Add("gió mạnh giúp phát tán bụi");

            if (r.Temperature >= TEMP_HOT)
                parts.Add("nhiệt độ cao thúc đẩy quang hóa");
            if (r.Humidity > 85)
                parts.Add("độ ẩm cao tạo điều kiện sương mù");
            else if (r.Humidity < HUMIDITY_LOW)
                parts.Add("không khí khô làm bụi dễ bay");

            if (r.UvIndex >= UV_HIGH)
                parts.Add("UV cao tăng PM2.5 thứ cấp");

            if (parts.Count == 0)
                return $"Điều kiện khí tượng ở mức trung bình. Yếu tố chi phối: {r.TopFactor}.";

            var condition = string.Join(", ", parts);
            return $"Model dự báo AQI {r.PredAqi} vì {condition}. Yếu tố ảnh hưởng nhất: {r.TopFactor}.";
        }
    }
}
