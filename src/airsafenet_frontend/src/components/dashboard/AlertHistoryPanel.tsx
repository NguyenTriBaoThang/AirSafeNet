import { useCallback, useEffect, useState } from "react";
import { http } from "../../api/http";

type AlertStatus = "all" | "unread" | "read" | "failed";

type AlertSummary = {
  totalSent: number;
  totalEmail: number;
  totalTelegram: number;
  unreadCount: number;
  lastSentAt: string | null;
  lastSentEmail: string | null;
};

type AlertLogItem = {
  id: number;
  aqi: number;
  pm25: number;
  risk: string;
  message: string;
  alertReason: string;
  recommendedAction: string;
  channel: string;
  sentToEmail: string | null;
  sentToTelegramChatId: string | null;
  isRead: boolean;
  readAt: string | null;
  success: boolean;
  createdAt: string;
};

const STATUS_OPTIONS: Array<{ value: AlertStatus; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "unread", label: "Chưa đọc" },
  { value: "read", label: "Đã đọc" },
  { value: "failed", label: "Lỗi gửi" },
];

function riskColor(risk: string): string {
  switch (risk) {
    case "GOOD": return "#16a34a";
    case "MODERATE": return "#ca8a04";
    case "UNHEALTHY_SENSITIVE": return "#ea580c";
    case "UNHEALTHY": return "#dc2626";
    case "VERY_UNHEALTHY": return "#7c3aed";
    case "HAZARDOUS": return "#7f1d1d";
    default: return "#64748b";
  }
}

function riskLabel(risk: string): string {
  switch (risk) {
    case "GOOD": return "Tốt";
    case "MODERATE": return "Trung bình";
    case "UNHEALTHY_SENSITIVE": return "Nhóm nhạy cảm";
    case "UNHEALTHY": return "Không tốt";
    case "VERY_UNHEALTHY": return "Rất không tốt";
    case "HAZARDOUS": return "Nguy hiểm";
    default: return risk;
  }
}

function riskEmoji(risk: string): string {
  switch (risk) {
    case "GOOD": return "🟢";
    case "MODERATE": return "🟡";
    case "UNHEALTHY_SENSITIVE": return "🟠";
    case "UNHEALTHY": return "🔴";
    case "VERY_UNHEALTHY": return "🟣";
    case "HAZARDOUS": return "⚫";
    default: return "⚪";
  }
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function formatReadAt(iso?: string | null): string {
  if (!iso) return "Chưa đọc";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function channelIcon(channel: string): string {
  switch (channel) {
    case "telegram": return "✈️";
    case "email": return "📧";
    case "both": return "📧✈️";
    default: return "📬";
  }
}

function buildGmailLink(email?: string | null): string {
  const query = email
    ? `from:(${email}) subject:AirSafeNet`
    : "subject:AirSafeNet cảnh báo";
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
}

async function fetchSummary(): Promise<AlertSummary> {
  return http<AlertSummary>("/api/alert/summary", { method: "GET", auth: true });
}

async function fetchHistory(page: number, status: AlertStatus): Promise<AlertLogItem[]> {
  return http<AlertLogItem[]>(`/api/alert/history?page=${page}&pageSize=10&status=${status}`, {
    method: "GET",
    auth: true,
  });
}

async function markAllRead(): Promise<void> {
  await http("/api/alert/mark-read", { method: "POST", auth: true });
}

async function markOneRead(id: number): Promise<void> {
  await http(`/api/alert/${id}/read`, { method: "POST", auth: true });
}

function SkeletonRows() {
  return (
    <div className="alert-skeleton">
      {[1, 2, 3].map((item) => (
        <div key={item} className="alert-skeleton__row">
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
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [logs, setLogs] = useState<AlertLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AlertStatus>("all");
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p = 1, append = false, nextStatus = status) => {
    try {
      setLoading(true);
      setError(null);
      const [sum, items] = await Promise.all([
        fetchSummary(),
        fetchHistory(p, nextStatus),
      ]);
      setSummary(sum);
      setLogs((prev) => append ? [...prev, ...items] : items);
      setHasMore(items.length === 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được Alert Inbox");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load(1);
  }, [load]);

  async function handleStatusChange(nextStatus: AlertStatus) {
    setStatus(nextStatus);
    setPage(1);
    await load(1, false, nextStatus);
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead();
      setSummary((prev) => prev ? { ...prev, unreadCount: 0 } : prev);
      setLogs((prev) => prev.map((log) => ({ ...log, isRead: true, readAt: new Date().toISOString() })));
      if (status === "unread") await load(1, false, "unread");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đánh dấu đã đọc được");
    }
  }

  async function handleMarkOneRead(id: number) {
    try {
      setMutatingId(id);
      await markOneRead(id);
      const readAt = new Date().toISOString();
      setLogs((prev) => status === "unread"
        ? prev.filter((log) => log.id !== id)
        : prev.map((log) => log.id === id ? { ...log, isRead: true, readAt } : log));
      setSummary((prev) => prev
        ? { ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }
        : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đánh dấu cảnh báo được");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    await load(next, true, status);
  }

  const gmailLink = buildGmailLink(summary?.lastSentEmail);

  return (
    <div className="alert-history-panel alert-inbox">
      <div className="alert-inbox__head">
        <div>
          <div className="alert-inbox__eyebrow">Alert Inbox</div>
          <h3>Hộp thư cảnh báo chất lượng không khí</h3>
          <p>Theo dõi cảnh báo đã gửi, trạng thái đọc, lý do kích hoạt và hành động nên làm.</p>
        </div>
        {(summary?.unreadCount ?? 0) > 0 && (
          <button className="alert-mark-read-btn" onClick={handleMarkAllRead} type="button">
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <div className="alert-stats">
        <div className="alert-stat-card">
          <span className="alert-stat-card__icon">📬</span>
          <div>
            <strong className="alert-stat-card__value">{summary?.totalSent ?? "--"}</strong>
            <span className="alert-stat-card__label">Tổng đã gửi</span>
          </div>
        </div>

        <div className="alert-stat-card">
          <span className="alert-stat-card__icon">📧</span>
          <div>
            <strong className="alert-stat-card__value">{summary?.totalEmail ?? "--"}</strong>
            <span className="alert-stat-card__label">Qua Email</span>
          </div>
        </div>

        <div className="alert-stat-card">
          <span className="alert-stat-card__icon">✈️</span>
          <div>
            <strong className="alert-stat-card__value">{summary?.totalTelegram ?? "--"}</strong>
            <span className="alert-stat-card__label">Qua Telegram</span>
          </div>
        </div>

        <div className={`alert-stat-card ${(summary?.unreadCount ?? 0) > 0 ? "alert-stat-card--unread" : ""}`}>
          <span className="alert-stat-card__icon">🔔</span>
          <div>
            <strong className="alert-stat-card__value">{summary?.unreadCount ?? "--"}</strong>
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
                Đã gửi {summary?.totalEmail ?? 0} email cảnh báo
                {summary?.lastSentEmail ? ` -> ${summary.lastSentEmail}` : ""}
              </strong>
              <span>Mở Gmail để xem bản email đã gửi</span>
            </div>
          </div>
          <a href={gmailLink} target="_blank" rel="noopener noreferrer" className="alert-gmail-btn">
            Mở Gmail ↗
          </a>
        </div>
      )}

      <div className="alert-inbox-tabs">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`alert-inbox-tab ${status === option.value ? "alert-inbox-tab--active" : ""}`}
            onClick={() => handleStatusChange(option.value)}
          >
            {option.label}
            {option.value === "unread" && (summary?.unreadCount ?? 0) > 0 && (
              <span>{summary?.unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="alert-list-header">
        <span>Lịch sử cảnh báo</span>
        <button className="alert-refresh-btn" onClick={() => load(1, false, status)} type="button">
          Tải lại
        </button>
      </div>

      {error && (
        <div className="alert-error">
          <span>⚠</span> {error}
          <button onClick={() => load(1, false, status)} type="button">Thử lại</button>
        </div>
      )}

      {loading && logs.length === 0 ? (
        <SkeletonRows />
      ) : logs.length === 0 ? (
        <div className="alert-empty">
          <span>🔕</span>
          <p>Chưa có cảnh báo nào trong mục này.</p>
          <span style={{ fontSize: 12, color: "var(--muted, #94a3b8)" }}>
            Cảnh báo sẽ xuất hiện khi AQI vượt ngưỡng bạn thiết lập.
          </span>
        </div>
      ) : (
        <div className="alert-list">
          {logs.map((log) => {
            const color = riskColor(log.risk);
            return (
              <div
                key={log.id}
                className={`alert-item alert-inbox-item ${!log.isRead && log.success ? "alert-item--unread" : ""} ${!log.success ? "alert-item--failed" : ""}`}
              >
                {!log.isRead && log.success && <span className="alert-item__dot" />}

                <div className="alert-item__aqi" style={{ borderColor: color }}>
                  <span className="alert-item__aqi-emoji">{riskEmoji(log.risk)}</span>
                  <strong style={{ color }}>{log.aqi}</strong>
                </div>

                <div className="alert-item__body">
                  <div className="alert-item__top-row">
                    <span className="alert-item__risk" style={{ color }}>{riskLabel(log.risk)}</span>
                    <span className="alert-item__pm25">PM2.5: {log.pm25.toFixed(1)} µg/m³</span>
                    <span className={`alert-read-chip ${log.isRead ? "alert-read-chip--read" : "alert-read-chip--unread"}`}>
                      {log.isRead ? "Đã đọc" : "Chưa đọc"}
                    </span>
                    <span className="alert-item__time">{timeAgo(log.createdAt)}</span>
                  </div>

                  <p className="alert-item__msg">{log.message}</p>

                  <div className="alert-explain-grid">
                    <div className="alert-explain-box">
                      <span>Lý do cảnh báo</span>
                      <strong>{log.alertReason || "AQI vượt ngưỡng cảnh báo đã đặt."}</strong>
                    </div>
                    <div className="alert-explain-box alert-explain-box--action">
                      <span>Hành động khuyến nghị</span>
                      <strong>{log.recommendedAction || "Theo dõi dashboard và hạn chế phơi nhiễm nếu AQI tiếp tục tăng."}</strong>
                    </div>
                  </div>

                  <div className="alert-item__channels">
                    <span className="alert-item__channel-tag">
                      {channelIcon(log.channel)} {log.channel}
                    </span>

                    <span className="alert-item__channel-tag">
                      Đọc lúc: {formatReadAt(log.readAt)}
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

                    {!log.isRead && log.success && (
                      <button
                        type="button"
                        className="alert-item__read-btn"
                        disabled={mutatingId === log.id}
                        onClick={() => handleMarkOneRead(log.id)}
                      >
                        {mutatingId === log.id ? "Đang lưu..." : "Đã đọc"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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