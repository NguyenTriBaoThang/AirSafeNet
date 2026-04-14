using System.Collections.Generic;

namespace airsafenet_backend.Helpers
{
    public static class LocationMapper
    {
        private static readonly Dictionary<string, (double Lat, double Lon)> Mapping = new()
        {
            { "Hà Nội", (21.0285, 105.8542) },
            { "Hanoi", (21.0285, 105.8542) },
            { "TP. Hồ Chí Minh", (10.8231, 106.6297) },
            { "Ho Chi Minh City", (10.8231, 106.6297) },
            { "HCMC", (10.8231, 106.6297) },
            { "Đà Nẵng", (16.0544, 108.2022) },
            { "Da Nang", (16.0544, 108.2022) },
            { "Hải Phòng", (20.8449, 106.6881) },
            { "Hai Phong", (20.8449, 106.6881) },
            { "Cần Thơ", (10.0452, 105.7469) },
            { "Can Tho", (10.0452, 105.7469) },
            { "Huế", (16.4637, 107.5908) },
            { "Hue", (16.4637, 107.5908) },
            { "Nha Trang", (12.2461, 109.1923) }
        };

        public static (double Lat, double Lon)? GetCoordinates(string? cityName)
        {
            if (string.IsNullOrWhiteSpace(cityName)) return null;

            if (Mapping.TryGetValue(cityName, out var coords))
            {
                return coords;
            }

            // Fallback: lowercase check
            foreach (var kvp in Mapping)
            {
                if (kvp.Key.Equals(cityName, System.StringComparison.OrdinalIgnoreCase))
                    return kvp.Value;
            }

            return null;
        }
    }
}
