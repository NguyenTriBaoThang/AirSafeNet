namespace airsafenet_backend.DTOs.Notification
{
    public class AnomalyAlertRequest
    {
        [System.Text.Json.Serialization.JsonPropertyName("anomaly")]
        public AnomalyPayload? Anomaly { get; set; }
    }

    public class AnomalyPayload
    {
        [System.Text.Json.Serialization.JsonPropertyName("spike_pm25")]
        public double SpikePm25 { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("from_pm25")]
        public double FromPm25 { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("to_pm25")]
        public double ToPm25 { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("spike_time")]
        public string? SpikeTime { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("severity")]
        public string? Severity { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("aqi_after")]
        public int AqiAfter { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("xai")]
        public AnomalyXai? Xai { get; set; }
    }

    public class AnomalyXai
    {
        [System.Text.Json.Serialization.JsonPropertyName("summary")]
        public string? Summary { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("confidence")]
        public int Confidence { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("top_factors")]
        public List<object>? TopFactors { get; set; }
    }
}
