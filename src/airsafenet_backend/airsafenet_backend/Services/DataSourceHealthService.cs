using System.Net;
using System.Text.Json;
using airsafenet_backend.DTOs.Dashboard;

namespace airsafenet_backend.Services
{
    public class DataSourceHealthService
    {
        private const double HcmcLat = 10.8231;
        private const double HcmcLon = 106.6297;
        private const string Timezone = "Asia/Bangkok";

        private readonly HttpClient _http;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DataSourceHealthService> _logger;

        public DataSourceHealthService(
            HttpClient http,
            IConfiguration configuration,
            ILogger<DataSourceHealthService> logger)
        {
            _http = http;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<DataSourceHealthResponse> BuildDashboardSourceAsync(
            string mode,
            DateTime? cacheGeneratedAt,
            int pointCount,
            CancellationToken cancellationToken = default)
        {
            var checkedAt = DateTime.UtcNow;
            var cache = BuildAiCacheSource(mode, cacheGeneratedAt, pointCount, checkedAt);

            var checks = await Task.WhenAll(
                CheckOpenMeteoAsync(checkedAt, cancellationToken),
                CheckOpenAqAsync(checkedAt, cancellationToken),
                CheckOfficialStationAsync(checkedAt, cancellationToken));

            var sources = new List<DataSourceStatusResponse> { cache };
            sources.AddRange(checks);

            var isStale = cache.Status == "stale" || cache.DataLabel == "stale";
            var confidence = cache.Confidence;
            if (sources.Any(s => s.Id == "open-meteo" && s.Status == "online")) confidence += 5;
            if (sources.Any(s => s.Id == "openaq" && s.Status == "online")) confidence += 8;
            if (sources.Any(s => s.Id == "official-stations" && s.Status == "online")) confidence += 12;
            if (sources.Any(s => s.Id == "open-meteo" && s.Status == "error")) confidence -= 8;
            if (isStale) confidence -= 15;

            return new DataSourceHealthResponse
            {
                GeneratedAt = checkedAt,
                OverallStatus = isStale ? "stale" : cache.Status,
                ActiveLabel = isStale ? "stale" : cache.DataLabel,
                OverallConfidence = Math.Clamp(confidence, 35, 96),
                IsStale = isStale,
                FreshnessLabel = FreshnessLabel(cache.FreshnessMinutes),
                PrimarySource = cache.Name,
                Sources = sources,
            };
        }

        private static DataSourceStatusResponse BuildAiCacheSource(
            string mode,
            DateTime? generatedAt,
            int pointCount,
            DateTime checkedAt)
        {
            var normalizedMode = mode.Equals("history", StringComparison.OrdinalIgnoreCase) ? "history" : "forecast";
            var updatedAt = generatedAt.HasValue ? NormalizeUtc(generatedAt.Value) : (DateTime?)null;
            var ageMinutes = updatedAt.HasValue
                ? Math.Max(0, (int)Math.Round((checkedAt - updatedAt.Value).TotalMinutes))
                : (int?)null;

            var staleLimit = normalizedMode == "history" ? 24 * 60 : 180;
            var watchLimit = normalizedMode == "history" ? 12 * 60 : 90;
            var isStale = !ageMinutes.HasValue || ageMinutes.Value > staleLimit;
            var isWatch = ageMinutes.HasValue && ageMinutes.Value > watchLimit;
            var status = isStale ? "stale" : isWatch ? "fallback" : "online";
            var label = isStale ? "stale" : normalizedMode == "history" ? "estimated" : "forecast";
            var confidence = isStale ? 52 : isWatch ? 68 : normalizedMode == "history" ? 76 : 82;

            return new DataSourceStatusResponse
            {
                Id = "airsafenet-ai-cache",
                Name = "AirSafeNet AI cache",
                Provider = "AirSafeNet AI Server",
                Category = "model-cache",
                DataLabel = label,
                Status = status,
                UpdatedAt = updatedAt,
                CheckedAt = checkedAt,
                FreshnessMinutes = ageMinutes,
                Confidence = pointCount <= 0 ? Math.Min(confidence, 45) : confidence,
                IsPrimary = true,
                IsFallback = status != "online",
                Detail = pointCount <= 0
                    ? "Cache chưa có điểm dữ liệu forecast/history để hiển thị."
                    : normalizedMode == "history"
                        ? $"Dữ liệu history từ cache AI, {pointCount} điểm."
                        : $"Dự báo AI từ cache, {pointCount} điểm forecast.",
                Attribution = "AirSafeNet model output; upstream có thể gồm Open-Meteo/OpenAQ khi pipeline AI được cấu hình.",
                Endpoint = "/forecast/range hoặc /history trên AI Server",
                NextStep = "Ghi snapshot định kỳ và so sánh Forecast Accuracy để tăng độ tin cậy.",
                Variables = new List<string> { "PM2.5", "AQI", "risk", "recommendation" },
            };
        }

        private async Task<DataSourceStatusResponse> CheckOpenMeteoAsync(
            DateTime checkedAt,
            CancellationToken cancellationToken)
        {
            var endpoint =
                "https://air-quality-api.open-meteo.com/v1/air-quality" +
                $"?latitude={HcmcLat}&longitude={HcmcLon}" +
                "&current=pm2_5,us_aqi_pm2_5" +
                $"&timezone={Uri.EscapeDataString(Timezone)}";

            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(4));
                using var response = await _http.GetAsync(endpoint, cts.Token);

                if (!response.IsSuccessStatusCode)
                {
                    return ErrorSource(
                        "open-meteo",
                        "Open-Meteo Air Quality",
                        "Open-Meteo",
                        "forecast-model",
                        "forecast",
                        checkedAt,
                        endpoint,
                        $"Open-Meteo trả HTTP {(int)response.StatusCode}.");
                }

                var body = await response.Content.ReadAsStringAsync(cts.Token);
                DateTime? observedAt = TryReadOpenMeteoTime(body);
                var updatedAt = observedAt.HasValue ? NormalizeUtc(observedAt.Value) : checkedAt;
                var age = Math.Max(0, (int)Math.Round((checkedAt - updatedAt).TotalMinutes));
                var stale = age > 180;

                return new DataSourceStatusResponse
                {
                    Id = "open-meteo",
                    Name = "Open-Meteo Air Quality",
                    Provider = "Open-Meteo / CAMS",
                    Category = "open-forecast-model",
                    DataLabel = stale ? "stale" : "forecast",
                    Status = stale ? "stale" : "online",
                    UpdatedAt = updatedAt,
                    CheckedAt = checkedAt,
                    FreshnessMinutes = age,
                    Confidence = stale ? 58 : 82,
                    IsPrimary = false,
                    IsFallback = stale,
                    Detail = stale
                        ? "Open-Meteo trả dữ liệu nhưng timestamp đã cũ, chỉ dùng làm tham chiếu."
                        : "Nguồn mở cho PM2.5/AQI forecast và current-condition theo lưới khí quyển.",
                    Attribution = "Open-Meteo Air Quality API; CAMS atmospheric composition forecasts.",
                    Endpoint = "air-quality-api.open-meteo.com/v1/air-quality",
                    NextStep = "Dùng làm nguồn mở mặc định và đối chiếu với OpenAQ/trạm chính thống khi có.",
                    Variables = new List<string> { "pm2_5", "us_aqi_pm2_5" },
                };
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
            {
                _logger.LogWarning(ex, "Open-Meteo source check failed");
                return ErrorSource(
                    "open-meteo",
                    "Open-Meteo Air Quality",
                    "Open-Meteo",
                    "open-forecast-model",
                    "forecast",
                    checkedAt,
                    endpoint,
                    "Không gọi được Open-Meteo; dashboard tiếp tục dùng AI cache/fallback.");
            }
        }

        private async Task<DataSourceStatusResponse> CheckOpenAqAsync(
            DateTime checkedAt,
            CancellationToken cancellationToken)
        {
            var apiKey = _configuration["DataSources:OpenAQ:ApiKey"];
            var baseUrl = _configuration["DataSources:OpenAQ:BaseUrl"] ?? "https://api.openaq.org/v3";
            var endpoint = $"{baseUrl.TrimEnd('/')}/locations?coordinates={HcmcLat},{HcmcLon}&radius=25000&limit=1";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return new DataSourceStatusResponse
                {
                    Id = "openaq",
                    Name = "OpenAQ observations",
                    Provider = "OpenAQ",
                    Category = "open-observation-network",
                    DataLabel = "real-time",
                    Status = "not-configured",
                    CheckedAt = checkedAt,
                    Confidence = 0,
                    IsConfigured = false,
                    Detail = "OpenAQ API v3 cần X-API-Key, hiện chưa cấu hình nên chưa dùng làm nguồn quan trắc realtime.",
                    Attribution = "OpenAQ aggregates public ground-level air-quality observations.",
                    Endpoint = "api.openaq.org/v3/locations",
                    NextStep = "Cấu hình DataSources:OpenAQ:ApiKey để bật kiểm tra nguồn quan trắc mở.",
                    Variables = new List<string> { "PM2.5", "PM10", "NO2", "O3", "CO" },
                };
            }

            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(4));
                using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
                request.Headers.Add("X-API-Key", apiKey);
                using var response = await _http.SendAsync(request, cts.Token);

                if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                {
                    return ErrorSource("openaq", "OpenAQ observations", "OpenAQ", "open-observation-network", "real-time", checkedAt, endpoint, "OpenAQ API key không hợp lệ hoặc không có quyền.");
                }

                if (!response.IsSuccessStatusCode)
                {
                    return ErrorSource("openaq", "OpenAQ observations", "OpenAQ", "open-observation-network", "real-time", checkedAt, endpoint, $"OpenAQ trả HTTP {(int)response.StatusCode}.");
                }

                return new DataSourceStatusResponse
                {
                    Id = "openaq",
                    Name = "OpenAQ observations",
                    Provider = "OpenAQ",
                    Category = "open-observation-network",
                    DataLabel = "real-time",
                    Status = "online",
                    CheckedAt = checkedAt,
                    Confidence = 78,
                    Detail = "OpenAQ API phản hồi được; có thể dùng để đối chiếu trạm quan trắc mở gần TP.HCM nếu dữ liệu khả dụng.",
                    Attribution = "OpenAQ public air-quality API v3.",
                    Endpoint = "api.openaq.org/v3/locations",
                    NextStep = "Map sensor/location ID cụ thể rồi lấy latest measurements theo tham số PM2.5.",
                    Variables = new List<string> { "PM2.5", "PM10", "NO2", "O3", "CO" },
                };
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
            {
                _logger.LogWarning(ex, "OpenAQ source check failed");
                return ErrorSource("openaq", "OpenAQ observations", "OpenAQ", "open-observation-network", "real-time", checkedAt, endpoint, "Không gọi được OpenAQ; giữ trạng thái fallback sang AI/Open-Meteo.");
            }
        }

        private async Task<DataSourceStatusResponse> CheckOfficialStationAsync(
            DateTime checkedAt,
            CancellationToken cancellationToken)
        {
            var baseUrl = _configuration["DataSources:OfficialStations:BaseUrl"];
            var enabled = bool.TryParse(_configuration["DataSources:OfficialStations:Enabled"], out var value) && value;

            if (!enabled || string.IsNullOrWhiteSpace(baseUrl))
            {
                return new DataSourceStatusResponse
                {
                    Id = "official-stations",
                    Name = "Trạm quan trắc chính thống",
                    Provider = "Gov/official station network",
                    Category = "official-observation-network",
                    DataLabel = "real-time",
                    Status = "planned",
                    CheckedAt = checkedAt,
                    Confidence = 0,
                    IsConfigured = false,
                    Detail = "Chưa cấu hình endpoint trạm quan trắc chính thống. App đã chừa khe tích hợp sau.",
                    Attribution = "Nguồn chính thống sẽ theo giấy phép/điều khoản của đơn vị cung cấp.",
                    Endpoint = "DataSources:OfficialStations:BaseUrl",
                    NextStep = "Khi có API/key từ trạm chính thống, cấu hình BaseUrl và adapter parse PM2.5/AQI.",
                    Variables = new List<string> { "PM2.5", "AQI", "station_id", "observed_at" },
                };
            }

            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(4));
                using var response = await _http.GetAsync(baseUrl, cts.Token);
                if (!response.IsSuccessStatusCode)
                {
                    return ErrorSource("official-stations", "Trạm quan trắc chính thống", "Gov/official station network", "official-observation-network", "real-time", checkedAt, baseUrl, $"Endpoint chính thống trả HTTP {(int)response.StatusCode}.");
                }

                return new DataSourceStatusResponse
                {
                    Id = "official-stations",
                    Name = "Trạm quan trắc chính thống",
                    Provider = "Gov/official station network",
                    Category = "official-observation-network",
                    DataLabel = "real-time",
                    Status = "online",
                    CheckedAt = checkedAt,
                    Confidence = 90,
                    Detail = "Endpoint trạm chính thống phản hồi được; sẵn sàng parse vào pipeline khi có schema cố định.",
                    Attribution = "Official monitoring station network.",
                    Endpoint = baseUrl,
                    NextStep = "Chuẩn hóa schema station_id, observed_at, pm25, aqi và đưa vào cache hợp nhất.",
                    Variables = new List<string> { "PM2.5", "AQI", "station_id", "observed_at" },
                };
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
            {
                _logger.LogWarning(ex, "Official station source check failed");
                return ErrorSource("official-stations", "Trạm quan trắc chính thống", "Gov/official station network", "official-observation-network", "real-time", checkedAt, baseUrl, "Không gọi được endpoint trạm chính thống; hệ thống fallback sang nguồn mở/cache.");
            }
        }

        private static DateTime? TryReadOpenMeteoTime(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                if (!doc.RootElement.TryGetProperty("current", out var current)) return null;
                if (!current.TryGetProperty("time", out var timeElement)) return null;
                return DateTime.TryParse(timeElement.GetString(), out var parsed) ? parsed : null;
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static DataSourceStatusResponse ErrorSource(
            string id,
            string name,
            string provider,
            string category,
            string dataLabel,
            DateTime checkedAt,
            string endpoint,
            string detail)
        {
            return new DataSourceStatusResponse
            {
                Id = id,
                Name = name,
                Provider = provider,
                Category = category,
                DataLabel = dataLabel,
                Status = "error",
                CheckedAt = checkedAt,
                Confidence = 25,
                IsFallback = true,
                Detail = detail,
                Attribution = provider,
                Endpoint = endpoint,
                NextStep = "Dùng cache/fallback và thử lại ở lần refresh kế tiếp.",
            };
        }

        private static DateTime NormalizeUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc) return value;
            if (value.Kind == DateTimeKind.Local) return value.ToUniversalTime();
            return DateTime.SpecifyKind(value, DateTimeKind.Local).ToUniversalTime();
        }

        private static string FreshnessLabel(int? minutes)
        {
            if (!minutes.HasValue) return "Không có timestamp nguồn";
            if (minutes.Value <= 20) return $"{minutes.Value} phút trước";
            if (minutes.Value <= 120) return $"{minutes.Value} phút trước";
            if (minutes.Value < 24 * 60) return $"{Math.Round(minutes.Value / 60.0, 1)} giờ trước";
            return $"{Math.Round(minutes.Value / 1440.0, 1)} ngày trước";
        }
    }
}