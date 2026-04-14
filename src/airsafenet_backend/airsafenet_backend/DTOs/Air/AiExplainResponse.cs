namespace airsafenet_backend.DTOs.Air
{
    public class AiExplainResponse
    {
        public double PredPm25 { get; set; }
        public int PredAqi { get; set; }
        public string AqiCategory { get; set; } = string.Empty;

        public double WindSpeed { get; set; }       // km/h
        public double WindDirection { get; set; }   // độ
        public double Humidity { get; set; }        // %
        public double Temperature { get; set; }     // °C
        public double Pressure { get; set; }        // hPa
        public double UvIndex { get; set; }         // 0-11+
        public double CloudCover { get; set; }      // %
        public double ObservedPm25 { get; set; }    // µg/m³ (24h trước)

        public double WindImpact { get; set; }
        public double HumidityImpact { get; set; }
        public double TemperatureImpact { get; set; }
        public double PressureImpact { get; set; }
        public double UvImpact { get; set; }
        public double Pm25HistoryImpact { get; set; }

        public string WindExplain { get; set; } = string.Empty;
        public string HumidityExplain { get; set; } = string.Empty;
        public string TemperatureExplain { get; set; } = string.Empty;
        public string PressureExplain { get; set; } = string.Empty;
        public string UvExplain { get; set; } = string.Empty;
        public string Pm25HistoryExplain { get; set; } = string.Empty;

        public string TrendDirection { get; set; } = "stable"; // "increasing" | "decreasing" | "stable"
        public string TrendLabel { get; set; } = string.Empty;
        public string OverallSummary { get; set; } = string.Empty;
        public string TopFactor { get; set; } = string.Empty;  // Yếu tố ảnh hưởng nhất

        public DateTime GeneratedAt { get; set; }
    }
}
