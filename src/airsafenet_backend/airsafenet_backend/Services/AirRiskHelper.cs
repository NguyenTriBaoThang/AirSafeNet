namespace airsafenet_backend.Services
{
    public static class AirRiskHelper
    {
        public static string ToColorKey(string risk)
        {
            return risk switch
            {
                "GOOD" => "green",
                "MODERATE" => "yellow",
                "UNHEALTHY_SENSITIVE" => "orange",
                "UNHEALTHY" => "red",
                "VERY_UNHEALTHY" => "purple",
                "HAZARDOUS" => "maroon",
                _ => "gray"
            };
        }

        public static int ToSeverity(string risk)
        {
            return risk switch
            {
                "GOOD" => 1,
                "MODERATE" => 2,
                "UNHEALTHY_SENSITIVE" => 3,
                "UNHEALTHY" => 4,
                "VERY_UNHEALTHY" => 5,
                "HAZARDOUS" => 6,
                _ => 0
            };
        }
    }
}
