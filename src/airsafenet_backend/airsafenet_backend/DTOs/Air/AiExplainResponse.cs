using System.Text.Json.Serialization;

namespace airsafenet_backend.DTOs.Air
{
    public class AiExplainResponse
    {
        public double PredPm25 { get; set; }
        public int PredAqi { get; set; }
        public string AqiCategory { get; set; } = string.Empty;
        public double WindSpeed { get; set; }
        public double WindDirection { get; set; }
        public double Humidity { get; set; }
        public double Temperature { get; set; }
        public double Pressure { get; set; }
        public double UvIndex { get; set; }
        public double CloudCover { get; set; }
        public double ObservedPm25 { get; set; }
        public double WindImpact { get; set; }
        public double HumidityImpact { get; set; }
        public double TemperatureImpact { get; set; }
        public double PressureImpact { get; set; }
        public double UvImpact { get; set; }
        public double CloudImpact { get; set; }
        public double Pm25HistoryImpact { get; set; }
        public string WindExplain { get; set; } = string.Empty;
        public string HumidityExplain { get; set; } = string.Empty;
        public string TemperatureExplain { get; set; } = string.Empty;
        public string PressureExplain { get; set; } = string.Empty;
        public string UvExplain { get; set; } = string.Empty;
        public string CloudExplain { get; set; } = string.Empty;
        public string Pm25HistoryExplain { get; set; } = string.Empty;
        public string TrendDirection { get; set; } = "stable";
        public string TrendLabel { get; set; } = string.Empty;
        public string OverallSummary { get; set; } = string.Empty;
        public string TopFactor { get; set; } = string.Empty;
        public string WeatherSource { get; set; } = "Open-Meteo Real-time";
        public DateTime WeatherObservedAt { get; set; }
        public DateTime GeneratedAt { get; set; }
    }
}
