using System.Net;
using System.Net.Mail;
using System.Text.Json;

namespace airsafenet_backend.Services
{
    /// <summary>
    /// Gửi cảnh báo AQI qua Telegram Bot hoặc Email (SMTP).
    ///
    /// Config trong appsettings.json:
    ///   "Telegram": { "BotToken": "..." }
    ///   "Email": { "Host": "smtp.gmail.com", "Port": 587,
    ///              "Username": "...", "Password": "...",
    ///              "FromName": "AirSafeNet Alert" }
    /// </summary>
    public class NotificationService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            HttpClient http,
            IConfiguration config,
            ILogger<NotificationService> logger)
        {
            _http = http;
            _config = config;
            _logger = logger;
        }

        public async Task<bool> SendTelegramAsync(string chatId, string message)
        {
            var token = _config["Telegram:BotToken"];
            if (string.IsNullOrWhiteSpace(token))
            {
                _logger.LogWarning("Telegram:BotToken chưa được cấu hình.");
                return false;
            }

            var url = $"https://api.telegram.org/bot{token}/sendMessage";
            var payload = new { chat_id = chatId, text = message, parse_mode = "HTML" };

            try
            {
                var resp = await _http.PostAsJsonAsync(url, payload);
                if (resp.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Telegram sent to {ChatId}", chatId);
                    return true;
                }
                var err = await resp.Content.ReadAsStringAsync();
                _logger.LogWarning("Telegram failed {Status}: {Err}", resp.StatusCode, err);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Telegram exception for {ChatId}", chatId);
                return false;
            }
        }

        public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var host = _config["Email:Host"];
            var portStr = _config["Email:Port"];
            var username = _config["Email:Username"];
            var password = _config["Email:Password"];
            var fromName = _config["Email:FromName"] ?? "AirSafeNet Alert";

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username))
            {
                _logger.LogWarning("Email config chưa được cấu hình đầy đủ.");
                return false;
            }

            try
            {
                int port = int.TryParse(portStr, out var p) ? p : 587;

                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 10_000,
                };

                using var mail = new MailMessage
                {
                    From = new MailAddress(username, fromName),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true,
                };
                mail.To.Add(toEmail);

                await client.SendMailAsync(mail);
                _logger.LogInformation("Email sent to {Email}", toEmail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email exception for {Email}", toEmail);
                return false;
            }
        }

        public static string BuildTelegramMessage(
            int aqi, double pm25, string risk, string recommendation, string userGroup)
        {
            var emoji = risk switch
            {
                "GOOD" => "🟢",
                "MODERATE" => "🟡",
                "UNHEALTHY_SENSITIVE" => "🟠",
                "UNHEALTHY" => "🔴",
                "VERY_UNHEALTHY" => "🟣",
                "HAZARDOUS" => "⚫",
                _ => "⚠️"
            };

            var riskViet = risk switch
            {
                "GOOD" => "Tốt",
                "MODERATE" => "Trung bình",
                "UNHEALTHY_SENSITIVE" => "Không tốt cho nhóm nhạy cảm",
                "UNHEALTHY" => "Không tốt",
                "VERY_UNHEALTHY" => "Rất không tốt",
                "HAZARDOUS" => "Nguy hiểm",
                _ => risk
            };

            var groupViet = userGroup switch
            {
                "children" => "Trẻ em",
                "elderly" => "Người cao tuổi",
                "respiratory" => "Người có bệnh hô hấp",
                _ => "Người bình thường"
            };

            var time = DateTime.Now.ToString("HH:mm, dd/MM/yyyy");

            return $"""
{emoji} <b>Cảnh báo chất lượng không khí AirSafeNet</b>

📍 TP. Hồ Chí Minh · {time}
👤 Nhóm: {groupViet}

📊 <b>AQI:</b> {aqi} — {riskViet}
🌫 <b>PM2.5:</b> {pm25:F1} µg/m³

💡 {recommendation}

<i>Cài đặt cảnh báo tại: AirSafeNet → Tùy chỉnh</i>
""";
        }

        public static string BuildEmailSubject(int aqi, string risk) =>
            $"⚠️ AirSafeNet: AQI {aqi} — Cảnh báo chất lượng không khí";

        public static string BuildEmailHtml(
            int aqi, double pm25, string risk, string recommendation, string userGroup)
        {
            var color = risk switch
            {
                "GOOD" => "#16a34a",
                "MODERATE" => "#ca8a04",
                "UNHEALTHY_SENSITIVE" => "#ea580c",
                "UNHEALTHY" => "#dc2626",
                "VERY_UNHEALTHY" => "#7c3aed",
                "HAZARDOUS" => "#7f1d1d",
                _ => "#64748b"
            };

            var riskViet = risk switch
            {
                "GOOD" => "Tốt",
                "MODERATE" => "Trung bình",
                "UNHEALTHY_SENSITIVE" => "Không tốt cho nhóm nhạy cảm",
                "UNHEALTHY" => "Không tốt",
                "VERY_UNHEALTHY" => "Rất không tốt",
                "HAZARDOUS" => "Nguy hiểm",
                _ => risk
            };

            var time = DateTime.Now.ToString("HH:mm, dd/MM/yyyy");

            return $"""
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;">
  <div style="background:white;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
    <h1 style="color:#1e293b;font-size:20px;margin:0 0 4px;">⚠️ Cảnh báo chất lượng không khí</h1>
    <p style="color:#64748b;font-size:13px;margin:0 0 24px;">AirSafeNet · {time} · TP. Hồ Chí Minh</p>

    <div style="display:flex;gap:16px;margin-bottom:24px;">
      <div style="flex:1;background:{color}15;border:2px solid {color};border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:36px;font-weight:900;color:{color};">{aqi}</div>
        <div style="font-size:12px;font-weight:600;color:{color};text-transform:uppercase;letter-spacing:1px;">AQI</div>
      </div>
      <div style="flex:1;background:#f1f5f9;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#1e293b;">{pm25:F1}</div>
        <div style="font-size:12px;color:#64748b;">µg/m³ PM2.5</div>
      </div>
    </div>

    <div style="background:{color}10;border-left:4px solid {color};border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
      <strong style="color:{color};">Mức độ: {riskViet}</strong>
    </div>

    <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
      <strong style="color:#1e293b;display:block;margin-bottom:6px;">💡 Khuyến nghị</strong>
      <p style="color:#475569;margin:0;line-height:1.6;">{recommendation}</p>
    </div>

    <a href="#" style="display:block;background:#2563eb;color:white;text-align:center;padding:12px;border-radius:10px;text-decoration:none;font-weight:600;">
      Xem chi tiết trên AirSafeNet Dashboard
    </a>

    <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px;">
      Bạn nhận được email này vì đã bật cảnh báo AQI.<br/>
      Tắt tại: AirSafeNet → Tùy chỉnh → Kênh thông báo
    </p>
  </div>
</body>
</html>
""";
        }
    }
}
