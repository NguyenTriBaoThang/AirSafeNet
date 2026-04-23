import { useEffect, useState } from "react";
import { getUserPreferencesApi, updateUserPreferencesApi } from "../api/preferences";
import type { UpdateUserPreferencesRequest, UserPreferencesResponse } from "../types/preferences";
import PreferencesSkeleton from "../components/common/PreferencesSkeleton";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../components/common/useToast";
import SectionHeader from "../components/common/SectionHeader";
import StatusChip from "../components/common/StatusChip";
import AppIcon from "../components/common/AppIcon";
import AlertHistoryPanel from "../components/dashboard/AlertHistoryPanel";
import ActivitySchedulerWidget from "../components/dashboard/ActivitySchedulerWidget";

const USER_GROUP_OPTIONS = [
  { value: "normal",      label: "Người dùng phổ thông" },
  { value: "child",       label: "Trẻ em" },
  { value: "elderly",     label: "Người cao tuổi" },
  { value: "respiratory", label: "Người có bệnh hô hấp" },
  { value: "pregnant",    label: "Phụ nữ mang thai" },
];

const CHANNEL_OPTIONS = [
  { value: "none",     label: "Không nhận thông báo" },
  { value: "telegram", label: "Telegram" },
  { value: "email",    label: "Email" },
  { value: "both",     label: "Cả hai (Telegram + Email)" },
];

const THRESHOLD_PRESETS = [
  { value: 50,  label: "AQI > 50 — Trung bình (nhạy nhất)" },
  { value: 100, label: "AQI > 100 — Nhóm nhạy cảm (khuyến nghị)" },
  { value: 150, label: "AQI > 150 — Không tốt" },
  { value: 200, label: "AQI > 200 — Rất không tốt" },
];

function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff} giây trước`;
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(iso).toLocaleString("vi-VN");
}

export default function UserPreferencesPage() {
  const [data, setData]   = useState<UserPreferencesResponse | null>(null);
  const [form, setForm]   = useState<UpdateUserPreferencesRequest>({
    userGroup: "normal", preferredLocation: "Ho Chi Minh City",
    notifyEnabled: true, notifyChannel: "none",
    telegramChatId: "", notifyEmail: "", notifyThreshold: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const { showToast } = useToast();

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true);
      setError("");
      const result = await getUserPreferencesApi();
      setData(result);
      setForm({
        userGroup:         result.userGroup,
        preferredLocation: result.preferredLocation,
        notifyEnabled:     result.notifyEnabled,
        notifyChannel:     result.notifyChannel  ?? "none",
        telegramChatId:    result.telegramChatId ?? "",
        notifyEmail:       result.notifyEmail    ?? "",
        notifyThreshold:   result.notifyThreshold ?? 100,
      });
      if (silent) showToast("Đã tải lại cài đặt", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tải cài đặt";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const result = await updateUserPreferencesApi(form);
      setData(result);
      showToast("Đã cập nhật cài đặt thành công", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cập nhật thất bại";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  const needTelegram = form.notifyChannel === "telegram" || form.notifyChannel === "both";
  const needEmail    = form.notifyChannel === "email"    || form.notifyChannel === "both";

  if (loading) return <PreferencesSkeleton />;
  if (error && !data) return <EmptyState title="Không tải được cài đặt" description={error} />;

  return (
    <div className="preferences-page">
      <SectionHeader
        eyebrow="Cài đặt cá nhân"
        title="Tùy chỉnh trải nghiệm người dùng"
        description="Thiết lập nhóm người dùng, kênh nhận cảnh báo AQI và ngưỡng cảnh báo phù hợp."
        rightSlot={<button className="btn btn-secondary" onClick={() => loadData(true)}>Tải lại</button>}
      />

      <div className="section-toolbar">
        <StatusChip label={`Nhóm: ${form.userGroup}`} variant="info" />
        <StatusChip
          label={form.notifyEnabled && form.notifyChannel !== "none"
            ? `Cảnh báo: ${form.notifyChannel}` : "Cảnh báo: tắt"}
          variant={form.notifyEnabled && form.notifyChannel !== "none" ? "success" : "neutral"}
        />
        {data?.lastAlertSentAt && (
          <StatusChip label={`Gửi lần cuối: ${timeAgo(data.lastAlertSentAt)}`} variant="neutral" />
        )}
      </div>

      <div className="preferences-grid">
        
        <form className="card preferences-form interactive-card" onSubmit={handleSave}>
          <div className="card__header card__header--with-icon">
            <div className="card__header-icon"><AppIcon name="settings" /></div>
            <div>
              <h3>Cấu hình cá nhân</h3>
              <p className="card__header-desc">Chọn đúng thiết lập để hệ thống cảnh báo phù hợp hơn.</p>
            </div>
          </div>

          <label>Nhóm người dùng</label>
          <select value={form.userGroup} onChange={e => setForm(p => ({ ...p, userGroup: e.target.value }))}>
            {USER_GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <label>Khu vực quan tâm</label>
          <input
            type="text"
            value={form.preferredLocation}
            onChange={e => setForm(p => ({ ...p, preferredLocation: e.target.value }))}
            placeholder="Ho Chi Minh City"
          />

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.notifyEnabled}
              onChange={e => setForm(p => ({ ...p, notifyEnabled: e.target.checked }))}
            />
            <span>Bật cảnh báo chất lượng không khí</span>
          </label>

          {form.notifyEnabled && (
            <div className="notify-section">
              <div className="notify-section__header">🔔 Cài đặt thông báo</div>

              <label>Kênh nhận thông báo</label>
              <select
                value={form.notifyChannel}
                onChange={e => setForm(p => ({ ...p, notifyChannel: e.target.value }))}
              >
                {CHANNEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {needTelegram && (
                <>
                  <label>Telegram Chat ID</label>
                  <input
                    type="text"
                    value={form.telegramChatId ?? ""}
                    onChange={e => setForm(p => ({ ...p, telegramChatId: e.target.value }))}
                    placeholder="Ví dụ: 123456789"
                  />
                  <p className="field-hint">
                    Nhắn <code>/start</code> cho bot → dùng <code>@userinfobot</code> để lấy Chat ID
                  </p>
                </>
              )}

              {needEmail && (
                <>
                  <label>Email nhận cảnh báo</label>
                  <input
                    type="email"
                    value={form.notifyEmail ?? ""}
                    onChange={e => setForm(p => ({ ...p, notifyEmail: e.target.value }))}
                    placeholder="you@example.com"
                  />
                </>
              )}

              {form.notifyChannel !== "none" && (
                <>
                  <label>Ngưỡng AQI cảnh báo</label>
                  <select
                    value={form.notifyThreshold}
                    onChange={e => setForm(p => ({ ...p, notifyThreshold: Number(e.target.value) }))}
                  >
                    {THRESHOLD_PRESETS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="field-hint">Hệ thống gửi tối đa 1 cảnh báo mỗi 4 giờ để tránh spam.</p>
                </>
              )}
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>

        <div className="card preferences-info interactive-card">
          <div className="card__header card__header--with-icon">
            <div className="card__header-icon"><AppIcon name="user" /></div>
            <div>
              <h3>Thông tin hiện tại</h3>
              <p className="card__header-desc">Trạng thái cấu hình đang áp dụng</p>
            </div>
          </div>

          <div className="info-list">
            <div className="info-item"><span>Nhóm người dùng</span><strong>{data?.userGroup ?? "—"}</strong></div>
            <div className="info-item"><span>Khu vực ưu tiên</span><strong>{data?.preferredLocation ?? "—"}</strong></div>
            <div className="info-item">
              <span>Kênh thông báo</span>
              <strong>{data?.notifyChannel === "none" ? "Tắt" : data?.notifyChannel ?? "—"}</strong>
            </div>
            <div className="info-item"><span>Ngưỡng AQI</span><strong>{data?.notifyThreshold ?? 100}</strong></div>
            {data?.telegramChatId && (
              <div className="info-item"><span>Telegram ID</span><strong>{data.telegramChatId}</strong></div>
            )}
            {data?.notifyEmail && (
              <div className="info-item"><span>Email cảnh báo</span><strong>{data.notifyEmail}</strong></div>
            )}
            <div className="info-item">
              <span>Cảnh báo gần nhất</span>
              <strong>{timeAgo(data?.lastAlertSentAt)}</strong>
            </div>
            <div className="info-item">
              <span>Cập nhật lần cuối</span>
              <strong>{data?.updatedAt ? new Date(data.updatedAt).toLocaleString("vi-VN") : "—"}</strong>
            </div>
          </div>

          <div className="preferences-help">
            <h4>💡 Hướng dẫn cài Telegram Bot</h4>
            <ol style={{ paddingLeft: 16, lineHeight: 1.8, fontSize: 13 }}>
              <li>Tìm <strong>@BotFather</strong> → <code>/newbot</code></li>
              <li>Đặt tên → lấy <strong>BotToken</strong> → gửi Admin</li>
              <li>Nhắn <code>/start</code> cho bot của bạn</li>
              <li>Tìm <strong>@userinfobot</strong> → lấy Chat ID</li>
              <li>Điền Chat ID vào ô trên → Lưu</li>
            </ol>
          </div>
        </div>
      </div>

      <ActivitySchedulerWidget />

      <div className="card" style={{ marginTop: 4 }}>
        <div className="card__header">
          <h3>📬 Lịch sử cảnh báo đã gửi</h3>
        </div>
        <div style={{ padding: "0 0 16px" }}>
          <AlertHistoryPanel />
        </div>
      </div>
    </div>
  );
}