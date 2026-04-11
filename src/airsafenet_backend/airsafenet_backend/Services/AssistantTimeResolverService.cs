using airsafenet_backend.DTOs.Air;
using System.Globalization;
using System.Text.RegularExpressions;

namespace airsafenet_backend.Services
{
    public class AssistantTimeResolverService
    {
        public class TimeResolutionResult
        {
            public DateTime? TargetTime { get; set; }
            public string? MatchedPhrase { get; set; }
            public bool IsFallback { get; set; }
        }

        public class ForecastMatchResult
        {
            public AiForecastItem? Item { get; set; }
            public DateTime? TargetTime { get; set; }
            public string? MatchedPhrase { get; set; }
            public bool IsFallback { get; set; }
        }

        public TimeResolutionResult ResolveTargetTime(string message, DateTime nowLocal)
        {
            var text = (message ?? string.Empty).Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(text))
            {
                return new TimeResolutionResult { IsFallback = true };
            }

            // 1) Parse "5h", "17h", "5 giờ", "17:30", "5h chiều"
            var explicitHour = ParseExplicitHour(text, nowLocal);
            if (explicitHour != null)
            {
                return explicitHour;
            }

            // 2) Parse "sáng nay", "chiều nay", "tối nay"
            if (text.Contains("sáng nay"))
                return BuildRelative(nowLocal, 8, "sáng nay");

            if (text.Contains("trưa nay"))
                return BuildRelative(nowLocal, 12, "trưa nay");

            if (text.Contains("chiều nay"))
                return BuildRelative(nowLocal, 17, "chiều nay");

            if (text.Contains("tối nay"))
                return BuildRelative(nowLocal, 20, "tối nay");

            // 3) Parse "sáng mai", "chiều mai", "tối mai"
            if (text.Contains("sáng mai"))
                return BuildRelative(nowLocal.AddDays(1), 8, "sáng mai");

            if (text.Contains("trưa mai"))
                return BuildRelative(nowLocal.AddDays(1), 12, "trưa mai");

            if (text.Contains("chiều mai"))
                return BuildRelative(nowLocal.AddDays(1), 17, "chiều mai");

            if (text.Contains("tối mai"))
                return BuildRelative(nowLocal.AddDays(1), 20, "tối mai");

            // 4) Parse "thứ 2", "thứ 7", "chủ nhật"
            var weekdayResolved = ParseWeekday(text, nowLocal);
            if (weekdayResolved != null)
            {
                return weekdayResolved;
            }

            return new TimeResolutionResult
            {
                IsFallback = true
            };
        }

        public ForecastMatchResult MatchForecast(
            string message,
            List<AiForecastItem> forecastItems,
            DateTime nowLocal)
        {
            if (forecastItems == null || forecastItems.Count == 0)
            {
                return new ForecastMatchResult { IsFallback = true };
            }

            var resolution = ResolveTargetTime(message, nowLocal);

            if (resolution.TargetTime == null)
            {
                // fallback: lấy mốc gần hiện tại nhất
                var nearest = forecastItems
                    .Select(x => new
                    {
                        Item = x,
                        Time = TryParseTime(x.Time),
                    })
                    .Where(x => x.Time != null)
                    .OrderBy(x => Math.Abs((x.Time!.Value - nowLocal).TotalMinutes))
                    .FirstOrDefault();

                return new ForecastMatchResult
                {
                    Item = nearest?.Item ?? forecastItems.First(),
                    TargetTime = nearest?.Time,
                    MatchedPhrase = "gần hiện tại nhất",
                    IsFallback = true
                };
            }

            var matched = forecastItems
                .Select(x => new
                {
                    Item = x,
                    Time = TryParseTime(x.Time),
                })
                .Where(x => x.Time != null)
                .OrderBy(x => Math.Abs((x.Time!.Value - resolution.TargetTime.Value).TotalMinutes))
                .FirstOrDefault();

            return new ForecastMatchResult
            {
                Item = matched?.Item ?? forecastItems.First(),
                TargetTime = resolution.TargetTime,
                MatchedPhrase = resolution.MatchedPhrase,
                IsFallback = resolution.IsFallback
            };
        }

        private TimeResolutionResult BuildRelative(DateTime date, int hour, string phrase)
        {
            var dt = new DateTime(date.Year, date.Month, date.Day, hour, 0, 0);
            return new TimeResolutionResult
            {
                TargetTime = dt,
                MatchedPhrase = phrase,
                IsFallback = false
            };
        }

        private TimeResolutionResult? ParseExplicitHour(string text, DateTime nowLocal)
        {
            // Ví dụ match: 5h, 17h, 5 giờ, 17:30
            var match = Regex.Match(text, @"\b(\d{1,2})(?:[:h](\d{1,2}))?\s*(giờ|h)?\b");
            if (!match.Success) return null;

            if (!int.TryParse(match.Groups[1].Value, out var hour))
                return null;

            var minute = 0;
            if (match.Groups[2].Success)
            {
                int.TryParse(match.Groups[2].Value, out minute);
            }

            if (hour < 0 || hour > 23 || minute < 0 || minute > 59)
                return null;

            // xử lý ngữ cảnh sáng/chiều/tối
            if (hour <= 12)
            {
                if (text.Contains("chiều") || text.Contains("tối"))
                {
                    if (hour < 12) hour += 12;
                }
            }

            var baseDate = nowLocal;

            if (text.Contains("mai"))
                baseDate = nowLocal.AddDays(1);

            var dt = new DateTime(baseDate.Year, baseDate.Month, baseDate.Day, hour, minute, 0);

            return new TimeResolutionResult
            {
                TargetTime = dt,
                MatchedPhrase = match.Value,
                IsFallback = false
            };
        }

        private TimeResolutionResult? ParseWeekday(string text, DateTime nowLocal)
        {
            var map = new Dictionary<string, DayOfWeek>
            {
                ["thứ 2"] = DayOfWeek.Monday,
                ["thứ hai"] = DayOfWeek.Monday,
                ["thứ 3"] = DayOfWeek.Tuesday,
                ["thứ ba"] = DayOfWeek.Tuesday,
                ["thứ 4"] = DayOfWeek.Wednesday,
                ["thứ tư"] = DayOfWeek.Wednesday,
                ["thứ 5"] = DayOfWeek.Thursday,
                ["thứ năm"] = DayOfWeek.Thursday,
                ["thứ 6"] = DayOfWeek.Friday,
                ["thứ sáu"] = DayOfWeek.Friday,
                ["thứ 7"] = DayOfWeek.Saturday,
                ["thứ bảy"] = DayOfWeek.Saturday,
                ["chủ nhật"] = DayOfWeek.Sunday
            };

            foreach (var kv in map)
            {
                if (!text.Contains(kv.Key)) continue;

                var targetDate = GetNextWeekday(nowLocal.Date, kv.Value);

                var hour = 9;
                if (text.Contains("sáng")) hour = 8;
                else if (text.Contains("trưa")) hour = 12;
                else if (text.Contains("chiều")) hour = 17;
                else if (text.Contains("tối")) hour = 20;

                return new TimeResolutionResult
                {
                    TargetTime = new DateTime(
                        targetDate.Year,
                        targetDate.Month,
                        targetDate.Day,
                        hour,
                        0,
                        0),
                    MatchedPhrase = kv.Key,
                    IsFallback = false
                };
            }

            return null;
        }

        private DateTime GetNextWeekday(DateTime start, DayOfWeek day)
        {
            var daysToAdd = ((int)day - (int)start.DayOfWeek + 7) % 7;
            if (daysToAdd == 0) daysToAdd = 7;
            return start.AddDays(daysToAdd);
        }

        private DateTime? TryParseTime(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;

            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var dt))
                return dt;

            if (DateTime.TryParse(value, out dt))
                return dt;

            return null;
        }
    }
}
