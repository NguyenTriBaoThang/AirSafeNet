namespace airsafenet_backend.DTOs.Air
{
    public class AiPredictRequest
    {
        public Dictionary<string, double> Data { get; set; } = new();
        public string UserGroup { get; set; } = "normal";
    }
}
