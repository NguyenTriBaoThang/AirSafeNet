import { useState } from "react";
import { useAdminCache } from "../hooks/useAdminCache";
import type { CacheFileDetail, ComputeStatus } from "../types/admin";
import SectionHeader from "../components/common/SectionHeader";
import { useToast } from "../components/common/useToast";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateVN(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)    return `${diff} giây trước`;
    if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  } catch {
    return "";
  }
}

function statusBadgeClass(s?: ComputeStatus | string): string {
  switch (s) {
    case "ok":      return "admin-badge--ok";
    case "error":   return "admin-badge--error";
    case "running": return "admin-badge--running";
    default:        return "admin-badge--neutral";
  }
}

function statusLabel(computing: boolean, s?: ComputeStatus | string): string {
  if (computing || s === "running") return "Đang tính...";
  switch (s) {
    case "ok":    return "Sẵn sàng";
    case "error": return "Lỗi";
    default:      return "Chưa có";
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FileRow({ label, icon, file }: {
  label: string;
  icon: string;
  file?: CacheFileDetail;
}) {
  const exists = file?.exists ?? false;
  return (
    <div className="admin-file-row">
      <span className="admin-file-row__icon">{icon}</span>
      <div className="admin-file-row__info">
        <span className="admin-file-row__name">{label}</span>
        {exists ? (
          <span className="admin-file-row__meta">
            {file?.size_kb ?? "?"} KB · {formatDateVN(file?.modified_at)}
          </span>
        ) : (
          <span className="admin-file-row__missing">Chưa có</span>
        )}
      </div>
      <span className={`admin-file-dot ${exists ? "admin-file-dot--ok" : "admin-file-dot--missing"}`} />
    </div>
  );
}

function StatCard({ label, value, sub, tone = "default" }: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "ok" | "warn" | "error";
}) {
  return (
    <div className={`admin-stat-card admin-stat-card--${tone}`}>
      <span className="admin-stat-card__label">{label}</span>
      <strong className="admin-stat-card__value">{value}</strong>
      {sub && <span className="admin-stat-card__sub">{sub}</span>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="admin-skeleton-list">
      {[1, 2, 3].map(i => <div key={i} className="admin-skeleton-row" />)}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { showToast } = useToast();
  const {
    status,
    loadingStatus,
    computing,
    lastResult,
    errorMsg,
    fetchStatus,
    triggerCompute,
    clearCache,
  } = useAdminCache();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const meta      = status?.cache_meta;
  const files     = status?.files;
  const scheduler = status?.scheduler;

  const computeStatus  = computing ? "running" : (meta?.status ?? "never");
  const computedAt     = meta?.computed_at ?? null;
  const metaError      = meta?.error ?? null;
  const schedulerRunning = scheduler?.running ?? false;
  const nextRun          = scheduler?.next_run ?? null;
  const intervalMin      = scheduler?.interval_minutes ?? 60;

  const filesReady = files
    ? [files.forecast_csv, files.history_csv, files.current_json]
        .filter(f => f?.exists === true).length
    : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleCompute() {
    await triggerCompute(true);
  }

  async function handleClear() {
    setShowClearConfirm(false);
    await clearCache();
    showToast("Cache đã được xóa. User sẽ thấy lỗi 503 cho đến khi tính lại.", "info");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="admin-page">

      <SectionHeader
        eyebrow="Quản trị hệ thống"
        title="Quản lý Cache AI"
        description="Kiểm soát quá trình tính toán dự báo và lịch sử chất lượng không khí. Dữ liệu được tính 1 lần, phục vụ toàn bộ người dùng."
        rightSlot={
          <button
            className="btn btn-secondary"
            onClick={() => fetchStatus()}
            disabled={loadingStatus}
            type="button"
          >
            {loadingStatus ? "Đang tải..." : "↺ Làm mới"}
          </button>
        }
      />

      {errorMsg && (
        <div className="admin-error-banner">
          <span>⚠</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="admin-compute-card">
        <div className="admin-compute-card__left">
          <div className="admin-compute-card__title-row">
            <span className="admin-compute-icon">⚡</span>
            <div>
              <h3>Tính toán Cache</h3>
              <p>
                Chạy mô hình AI → ghi{" "}
                <code>forecast_cache.csv</code>,{" "}
                <code>history_cache.csv</code>,{" "}
                <code>current_cache.json</code>
              </p>
            </div>
          </div>

          <div className="admin-compute-card__meta">
            <div className="admin-compute-card__meta-item">
              <span>Trạng thái cache</span>
              <span className={`admin-badge ${statusBadgeClass(computeStatus)}`}>
                {computing || computeStatus === "running"
                  ? <><span className="admin-badge-spin" />Đang tính...</>
                  : statusLabel(false, computeStatus)
                }
              </span>
            </div>
            <div className="admin-compute-card__meta-item">
              <span>Lần tính gần nhất</span>
              <strong>{formatDateVN(computedAt)}</strong>
            </div>
            {computedAt && (
              <div className="admin-compute-card__meta-item">
                <span>Cách đây</span>
                <strong>{timeAgo(computedAt)}</strong>
              </div>
            )}
            {metaError && (
              <div className="admin-compute-card__meta-item">
                <span style={{ color: "#fca5a5" }}>Lỗi gần nhất</span>
                <span style={{ color: "#fca5a5", fontSize: 12 }}>{metaError}</span>
              </div>
            )}
          </div>
        </div>

        <div className="admin-compute-card__actions">
          <button
            className={`admin-compute-btn ${(computing || computeStatus === "running") ? "admin-compute-btn--loading" : ""}`}
            onClick={handleCompute}
            disabled={computing || computeStatus === "running"}
            type="button"
          >
            {(computing || computeStatus === "running") ? (
              <>
                <span className="admin-compute-btn__spinner" />
                Đang tính toán...
              </>
            ) : (
              <>
                <span>▶</span>
                Tính toán ngay
              </>
            )}
          </button>

          <p className="admin-compute-card__note">
            Scheduler tự động chạy mỗi{" "}
            <strong>{intervalMin} phút</strong>
          </p>
        </div>
      </div>

      {lastResult && !computing && lastResult.status !== "running" && (
        <div className={`admin-result-banner ${lastResult.status === "ok" ? "admin-result-banner--ok" : "admin-result-banner--error"}`}>
          <div className="admin-result-banner__left">
            <span>{lastResult.status === "ok" ? "✓" : "✕"}</span>
            <div>
              <strong>{lastResult.message}</strong>
              {lastResult.status === "ok" && lastResult.elapsed_seconds && (
                <span>
                  {" "}· {lastResult.elapsed_seconds.toFixed(1)}s
                  {lastResult.forecast_rows ? ` · ${lastResult.forecast_rows.toLocaleString()} dòng forecast` : ""}
                  {lastResult.history_rows ? ` · ${lastResult.history_rows.toLocaleString()} dòng history` : ""}
                </span>
              )}
              {lastResult.error && (
                <span className="admin-result-banner__error">{lastResult.error}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {(computing || computeStatus === "running") && (
        <div className="admin-result-banner admin-result-banner--running">
          <div className="admin-result-banner__left">
            <span className="admin-compute-btn__spinner" style={{ width: 14, height: 14, borderColor: "rgba(253,230,138,0.3)", borderTopColor: "#fde68a" }} />
            <div>
              <strong>Đang tính toán trong background...</strong>
              <span> Tự động cập nhật mỗi 3 giây, vui lòng chờ.</span>
            </div>
          </div>
        </div>
      )}

      <div className="admin-stats-grid">
        <StatCard
          label="Files sẵn sàng"
          value={loadingStatus ? "..." : `${filesReady} / 3`}
          sub="forecast, history, current"
          tone={filesReady === 3 ? "ok" : filesReady > 0 ? "warn" : "error"}
        />
        <StatCard
          label="Scheduler"
          value={loadingStatus ? "..." : schedulerRunning ? "Đang chạy" : "Dừng"}
          sub={nextRun ? `Kế: ${formatDateVN(nextRun)}` : undefined}
          tone={schedulerRunning ? "ok" : "warn"}
        />
        <StatCard
          label="Forecast cache"
          value={loadingStatus ? "..." : files?.forecast_csv?.exists ? `${files.forecast_csv.size_kb ?? "?"} KB` : "Chưa có"}
          sub={files?.forecast_csv?.exists ? timeAgo(files.forecast_csv.modified_at) : undefined}
          tone={files?.forecast_csv?.exists ? "ok" : "error"}
        />
        <StatCard
          label="History cache"
          value={loadingStatus ? "..." : files?.history_csv?.exists ? `${files.history_csv.size_kb ?? "?"} KB` : "Chưa có"}
          sub={files?.history_csv?.exists ? timeAgo(files.history_csv.modified_at) : undefined}
          tone={files?.history_csv?.exists ? "ok" : "error"}
        />
      </div>

      <div className="admin-detail-grid">

        <div className="card admin-detail-card">
          <div className="card__header">
            <h3>Trạng thái file cache</h3>
          </div>
          {loadingStatus ? <SkeletonCard /> : (
            <div className="admin-file-list">
              <FileRow label="forecast_cache.csv" icon="📊" file={files?.forecast_csv} />
              <FileRow label="history_cache.csv"  icon="📈" file={files?.history_csv} />
              <FileRow label="current_cache.json" icon="🔴" file={files?.current_json} />
            </div>
          )}
        </div>

        <div className="card admin-detail-card">
          <div className="card__header">
            <h3>Thông tin Scheduler</h3>
          </div>
          {loadingStatus ? <SkeletonCard /> : (
            <div className="admin-info-list">
              <div className="admin-info-item">
                <span>Trạng thái</span>
                <span className={`admin-badge ${schedulerRunning ? "admin-badge--ok" : "admin-badge--neutral"}`}>
                  {schedulerRunning ? "Đang chạy" : "Dừng"}
                </span>
              </div>
              <div className="admin-info-item">
                <span>Chu kỳ tự động</span>
                <strong>Mỗi {intervalMin} phút</strong>
              </div>
              <div className="admin-info-item">
                <span>Lần chạy kế tiếp</span>
                <strong>{formatDateVN(nextRun)}</strong>
              </div>
              <div className="admin-info-item">
                <span>Lần tính cuối</span>
                <strong>{formatDateVN(computedAt)}</strong>
              </div>
              {metaError && (
                <div className="admin-info-item admin-info-item--error">
                  <span>Lỗi gần nhất</span>
                  <span className="admin-info-error">{metaError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="admin-danger-zone">
        <div className="admin-danger-zone__header">
          <span className="admin-danger-zone__icon">⚠</span>
          <div>
            <h4>Vùng nguy hiểm</h4>
            <p>Các thao tác này ảnh hưởng trực tiếp đến trải nghiệm người dùng.</p>
          </div>
        </div>

        {!showClearConfirm ? (
          <button
            className="admin-danger-btn"
            onClick={() => setShowClearConfirm(true)}
            disabled={computing || computeStatus === "running"}
            type="button"
          >
            Xóa toàn bộ cache
          </button>
        ) : (
          <div className="admin-confirm-row">
            <span>Bạn chắc chắn? User sẽ thấy lỗi 503 cho đến khi tính lại.</span>
            <div className="admin-confirm-actions">
              <button
                className="admin-danger-btn admin-danger-btn--confirm"
                onClick={handleClear}
                type="button"
              >
                Xác nhận xóa
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowClearConfirm(false)}
                type="button"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}