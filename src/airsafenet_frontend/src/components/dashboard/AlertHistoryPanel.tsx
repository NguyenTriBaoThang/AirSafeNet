import { useCallback, useEffect, useState } from "react";
import { http } from "../../api/http";

type AlertSummary = {
  totalSent:     number;
  totalEmail:    number;
  totalTelegram: number;
  unreadCount:   number;
  lastSentAt:    string | null;
  lastSentEmail: string | null;
};

type AlertLogItem = {
  id:                   number;
  aqi:                  number;
  pm25:                 number;
  risk:                 string;
  message:              string;
  channel:              string;
  sentToEmail:          string | null;
  sentToTelegramChatId: string | null;
  isRead:               boolean;
  success:              boolean;
  createdAt:            string;
};

function riskColor(risk: string): string {
  switch (risk) {
    case "GOOD":                return "#16a34a";
    case "MODERATE":            return "#ca8a04";
    case "UNHEALTHY_SENSITIVE": return "#ea580c";
    case "UNHEALTHY":           return "#dc2626";
    case "VERY_UNHEALTHY":      return "#7c3aed";
    case "HAZARDOUS":           return "#7f1d1d";
    default:                    return "#64748b";
  }
}

function riskLabel(risk: string): string {
  switch (risk) {
    case "GOOD":                return "Tốt";
    case "MODERATE":            return "Trung bình";
    case "UNHEALTHY_SENSITIVE": return "Nhóm nhạy cảm";
    case "UNHEALTHY":           return "Không tốt";
    case "VERY_UNHEALTHY":      return "Rất không tốt";
    case "HAZARDOUS":           return "Nguy hiểm";
    default:                    return risk;
  }
}

function riskEmoji(risk: string): string {
  switch (risk) {
    case "GOOD":                return "🟢";
    case "MODERATE":            return "🟡";
    case "UNHEALTHY_SENSITIVE": return "🟠";
    case "UNHEALTHY":           return "🔴";
    case "VERY_UNHEALTHY":      return "🟣";
    case "HAZARDOUS":           return "⚫";
    default:                    return "⚪";
  }
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff} giây trước`;
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function channelIcon(channel: string): string {
  switch (channel) {
    case "telegram": return "✈️";
    case "email":    return "📧";
    case "both":     return "📧✈️";
    default:         return "📬";
  }
}

function buildGmailLink(email?: string | null): string {
  const query = email
    ? `from:(${email}) subject:AirSafeNet`
    : `subject:AirSafeNet cảnh báo`;
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
}

async function fetchSummary(): Promise<AlertSummary> {
  return http<AlertSummary>("/api/alert/summary", { method: "GET", auth: true });
}

async function fetchHistory(page: number): Promise<AlertLogItem[]> {
  return http<AlertLogItem[]>(`/api/alert/history?page=${page}&pageSize=10`, { method: "GET", auth: true });
}

async function markAllRead(): Promise<void> {
  await http("/api/alert/mark-read", { method: "POST", auth: true });
}

function SkeletonRows() {
  return (
    <div className="alert-skeleton">
      {[1,2,3].map(i => (
        <div key={i} className="alert-skeleton__row">
          <div className="alert-sk alert-sk--icon" />
          <div style={{ flex: 1 }}>
            <div className="alert-sk alert-sk--line" style={{ width: "60%" }} />
            <div className="alert-sk alert-sk--line" style={{ width: "40%", marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AlertHistoryPanel() {
  const [summary,  setSummary]  = useState<AlertSummary | null>(null);
  const [logs,     setLogs]     = useState<AlertLogItem[]>([]);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [hasMore,  setHasMore]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async (p = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      const [sum, items] = await Promise.all([
        fetchSummary(),
        fetchHistory(p),
      ]);
      setSummary(sum);
      setLogs(prev => append ? [...prev, ...items] : items);
      setHasMore(items.length === 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được lịch sử cảnh báo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function handleMarkRead() {
    await markAllRead();
    setSummary(prev => prev ? { ...prev, unreadCount: 0 } : prev);
    setLogs(prev => prev.map(l => ({ ...l, isRead: true })));
  }

  async function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    await load(next, true);
  }

  const gmailLink = buildGmailLink(summary?.lastSentEmail);

  return (
    <div className="alert-history-panel">

      <div className="alert-stats">
        <div className="alert-stat-card">
          <span className="alert-stat-card__icon">📬</span>
          <div>
            <strong className="alert-stat-card__value">{summary?.totalSent ?? "—"}</strong>
            <span className="alert-stat-card__label">Tổng đã gửi</span>
          </div>
        </div>

        <div className="alert-stat-card">
          <span className="alert-stat-card__icon">📧</span>
          <div>
            <strong className="alert-stat-card__value">{summary?.totalEmail ?? "—"}</strong>
            <span className="alert-stat-card__label">Qua Email</span>
          </div>
        </div>

        <div className="alert-stat-card">
          <span className="alert-stat-card__icon">✈️</span>
          <div>
            <strong className="alert-stat-card__value">{summary?.totalTelegram ?? "—"}</strong>
            <span className="alert-stat-card__label">Qua Telegram</span>
          </div>
        </div>

        <div className={`alert-stat-card ${(summary?.unreadCount ?? 0) > 0 ? "alert-stat-card--unread" : ""}`}>
          <span className="alert-stat-card__icon">🔔</span>
          <div>
            <strong className="alert-stat-card__value">{summary?.unreadCount ?? "—"}</strong>
            <span className="alert-stat-card__label">Chưa đọc</span>
          </div>
        </div>
      </div>

      {(summary?.totalEmail ?? 0) > 0 && (
        <div className="alert-gmail-banner">
          <div className="alert-gmail-banner__left">
            <span className="alert-gmail-banner__icon">📧</span>
            <div>
              <strong>
                Đã gửi {summary!.totalEmail} email cảnh báo
                {summary?.lastSentEmail ? ` → ${summary.lastSentEmail}` : ""}
              </strong>
              <span>Nhấn để xem trong Gmail</span>
            </div>
          </div>
          <a
            href={gmailLink}
            target="_blank"
            rel="noopener noreferrer"
            className="alert-gmail-btn"
          >
            Mở Gmail ↗
          </a>
        </div>
      )}

      <div className="alert-list-header">
        <span>Lịch sử cảnh báo</span>
        {(summary?.unreadCount ?? 0) > 0 && (
          <button className="alert-mark-read-btn" onClick={handleMarkRead} type="button">
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      {error && (
        <div className="alert-error">
          <span>⚠</span> {error}
          <button onClick={() => load(1)} type="button">Thử lại</button>
        </div>
      )}

      {loading && logs.length === 0 ? (
        <SkeletonRows />
      ) : logs.length === 0 ? (
        <div className="alert-empty">
          <span>🔕</span>
          <p>Chưa có cảnh báo nào được gửi.</p>
          <span style={{ fontSize: 12, color: "var(--muted, #94a3b8)" }}>
            Cảnh báo sẽ xuất hiện ở đây khi AQI vượt ngưỡng bạn thiết lập.
          </span>
        </div>
      ) : (
        <div className="alert-list">
          {logs.map(log => (
            <div
              key={log.id}
              className={`alert-item ${!log.isRead ? "alert-item--unread" : ""} ${!log.success ? "alert-item--failed" : ""}`}
            >
              {!log.isRead && log.success && <span className="alert-item__dot" />}

              <div className="alert-item__aqi" style={{ borderColor: riskColor(log.risk) }}>
                <span className="alert-item__aqi-emoji">{riskEmoji(log.risk)}</span>
                <strong style={{ color: riskColor(log.risk) }}>{log.aqi}</strong>
              </div>

              <div className="alert-item__body">
                <div className="alert-item__top-row">
                  <span className="alert-item__risk" style={{ color: riskColor(log.risk) }}>
                    {riskLabel(log.risk)}
                  </span>
                  <span className="alert-item__pm25">PM2.5: {log.pm25.toFixed(1)} µg/m³</span>
                  <span className="alert-item__time">{timeAgo(log.createdAt)}</span>
                </div>

                <p className="alert-item__msg">{log.message}</p>

                <div className="alert-item__channels">
                  <span className="alert-item__channel-tag">
                    {channelIcon(log.channel)} {log.channel}
                  </span>

                  {log.sentToEmail && (
                    <a
                      href={buildGmailLink(log.sentToEmail)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="alert-item__gmail-link"
                    >
                      📬 Xem trong Gmail
                    </a>
                  )}

                  {log.sentToTelegramChatId && (
                    <span className="alert-item__channel-tag alert-item__channel-tag--telegram">
                      ✈️ Telegram: {log.sentToTelegramChatId}
                    </span>
                  )}

                  {!log.success && (
                    <span className="alert-item__channel-tag alert-item__channel-tag--failed">
                      ✕ Gửi thất bại
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && !loading && logs.length > 0 && (
        <button className="alert-load-more" onClick={handleLoadMore} type="button">
          Tải thêm
        </button>
      )}
      {loading && logs.length > 0 && (
        <div className="alert-loading-more">Đang tải...</div>
      )}
    </div>
  );
}