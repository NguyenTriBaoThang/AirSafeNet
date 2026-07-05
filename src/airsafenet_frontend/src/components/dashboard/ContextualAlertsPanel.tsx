import { useCallback, useEffect, useMemo, useState } from "react";
import { getContextualAlertsApi, type ContextualAlertItem, type ContextualAlertResponse } from "../../api/alerts";

function severityLabel(severity: string): string {
  switch (severity) {
    case "critical": return "Khẩn cấp";
    case "warning": return "Cần xử lý";
    case "watch": return "Theo dõi";
    case "info": return "Thông tin";
    default: return severity;
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case "school": return "Đi học";
    case "respiratory-schedule": return "Hô hấp";
    case "exercise": return "Vận động";
    case "pm25-spike": return "PM2.5 spike";
    case "seven-day-trend": return "Xu hướng 7 ngày";
    case "family-child-school": return "Gia đình - trẻ em";
    case "family-respiratory": return "Gia đình - hô hấp";
    case "family-elderly": return "Gia đình - người già";
    case "family-pregnant": return "Gia đình - thai phụ";
    default: return category.replaceAll("-", " ");
  }
}

function formatTime(value?: string | null): string {
  if (!value) return "--:--";
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "--:--";
  return time.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Chưa rõ";
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "Chưa rõ";
  return time.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function confidenceTone(confidence: number): "good" | "watch" | "low" {
  if (confidence >= 80) return "good";
  if (confidence >= 60) return "watch";
  return "low";
}

function AlertCard({ alert, featured = false }: {
  alert: ContextualAlertItem;
  featured?: boolean;
}) {
  return (
    <article className={`context-alert-card context-alert-card--${alert.severity} ${featured ? "context-alert-card--featured" : ""}`}>
      <div className="context-alert-card__top">
        <div>
          <div className="context-alert-card__chips">
            <span className={`context-alert-chip context-alert-chip--${alert.severity}`}>
              {severityLabel(alert.severity)}
            </span>
            <span className="context-alert-chip context-alert-chip--neutral">
              {categoryLabel(alert.category)}
            </span>
          </div>
          <h4>{alert.title}</h4>
        </div>
        <div className="context-alert-card__aqi">
          <strong>{alert.aqi}</strong>
          <span>AQI</span>
        </div>
      </div>

      <p className="context-alert-card__reason">{alert.reason}</p>

      <div className="context-alert-action">
        <span>Hành động ngay</span>
        <strong>{alert.recommendedAction}</strong>
      </div>

      <div className="context-alert-meta">
        <div>
          <span>Khung rủi ro</span>
          <strong>{formatTime(alert.targetTime)}</strong>
        </div>
        <div>
          <span>Gợi ý đổi giờ</span>
          <strong>{formatTime(alert.recommendedTime)}</strong>
        </div>
        <div>
          <span>PM2.5</span>
          <strong>{alert.pm25.toFixed(1)} µg/m³</strong>
        </div>
        <div>
          <span>Trigger</span>
          <strong>{alert.triggerLabel}</strong>
        </div>
      </div>

      {alert.evidence.length > 0 && (
        <div className="context-alert-evidence">
          {alert.evidence.slice(0, 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}

      <div className="context-alert-card__footer">
        <span>{alert.dataLabel}</span>
        <span className={`context-alert-confidence context-alert-confidence--${confidenceTone(alert.confidence)}`}>
          Tin cậy {alert.confidence}%
        </span>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="context-alert-loading">
      {[1, 2, 3].map((item) => (
        <div key={item} className="context-alert-loading__row">
          <span />
          <div>
            <strong />
            <em />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ContextualAlertsPanel() {
  const [data, setData] = useState<ContextualAlertResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getContextualAlertsApi();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được cảnh báo ngữ cảnh");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedAlerts = useMemo(
    () => data?.alerts ?? [],
    [data],
  );
  const primary = sortedAlerts[0];
  const secondary = sortedAlerts.slice(1);

  return (
    <section className="context-alert-panel">
      <div className="context-alert-panel__header">
        <div>
          <div className="context-alert-panel__eyebrow">Actionable Alerts</div>
          <h3>Cảnh báo theo ngữ cảnh thật sự dùng được</h3>
          <p>
            Các việc nên đổi giờ, giảm thời lượng hoặc bảo vệ hô hấp trong vài giờ tới.
          </p>
        </div>
        <div className="context-alert-panel__tools">
          {data && (
            <div className={`context-alert-source ${data.isFallback ? "context-alert-source--fallback" : ""}`}>
              <span>{data.dataLabel}</span>
              <strong>{data.sourceConfidence}%</strong>
            </div>
          )}
          <button type="button" className="context-alert-refresh" onClick={load} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {data?.statusMessage && (
        <div className={`context-alert-status ${data.isFallback ? "context-alert-status--fallback" : ""}`}>
          <span>{data.primarySource}</span>
          <strong>{data.statusMessage}</strong>
          <em>Cập nhật {formatDateTime(data.generatedAt)}</em>
        </div>
      )}

      {error && (
        <div className="context-alert-error">
          <span>Không tải được cảnh báo: {error}</span>
          <button type="button" onClick={load}>Thử lại</button>
        </div>
      )}

      {loading && !data ? (
        <LoadingState />
      ) : !primary ? (
        <div className="context-alert-empty">
          <strong>Không có cảnh báo cần hành động ngay.</strong>
          <span>Tiếp tục ưu tiên các khung AQI thấp nếu có hoạt động ngoài trời.</span>
        </div>
      ) : (
        <div className="context-alert-layout">
          <AlertCard alert={primary} featured />
          {secondary.length > 0 && (
            <div className="context-alert-side-list">
              {secondary.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
