import { useEffect, useMemo, useState } from "react";
import { getUserPreferencesApi, updateUserPreferencesApi } from "../api/preferences";
import type { UpdateUserPreferencesRequest, UserPreferencesResponse, UserProfileRule } from "../types/preferences";
import { getUserProfileRule, USER_PROFILE_RULES } from "../data/userProfileRules";
import PreferencesSkeleton from "../components/common/PreferencesSkeleton";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../components/common/useToast";
import SectionHeader from "../components/common/SectionHeader";
import StatusChip from "../components/common/StatusChip";
import AppIcon from "../components/common/AppIcon";
import AlertHistoryPanel from "../components/dashboard/AlertHistoryPanel";
import ActivitySchedulerWidget from "../components/dashboard/ActivitySchedulerWidget";
import FamilyProfilesPanel from "../components/dashboard/FamilyProfilesPanel";

const CHANNEL_OPTIONS = [
  { value: "none", label: "Không nhận thông báo" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" },
  { value: "both", label: "Cả hai (Telegram + Email)" },
];

function buildThresholdPresets(rule: UserProfileRule) {
  const values = [rule.recommendedNotifyThreshold, 50, 75, 90, 100, 150, 200]
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort((a, b) => a - b);

  return values.map((value) => ({
    value,
    label: value === rule.recommendedNotifyThreshold
      ? `AQI > ${value} - khuyến nghị cho ${rule.shortLabel}`
      : `AQI > ${value}`,
  }));
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "-";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(iso).toLocaleString("vi-VN");
}

function outdoorLimitText(rule: UserProfileRule): string {
  return [
    `AQI tốt: ${rule.maxOutdoorGoodMinutes}p`,
    `trung bình: ${rule.maxOutdoorModerateMinutes}p`,
    `nhạy cảm: ${rule.maxOutdoorSensitiveMinutes}p`,
    `xấu: ${rule.maxOutdoorUnhealthyMinutes}p`,
  ].join(" · ");
}

function ProfileRulePreview({ rule }: { rule: UserProfileRule }) {
  return (
    <div className="profile-rule-preview">
      <div className="profile-rule-preview__head">
        <div>
          <span>Rule đang áp dụng</span>
          <strong>{rule.label}</strong>
        </div>
        <em>×{rule.sensitivityMultiplier.toFixed(2)}</em>
      </div>

      <p>{rule.description}</p>

      <div className="profile-rule-grid">
        <div>
          <span>Ngưỡng cảnh báo</span>
          <strong>AQI {rule.recommendedNotifyThreshold}</strong>
        </div>
        <div>
          <span>Khẩu trang</span>
          <strong>{rule.maskRule}</strong>
        </div>
        <div>
          <span>Thời gian ngoài trời</span>
          <strong>{outdoorLimitText(rule)}</strong>
        </div>
        <div>
          <span>Luồng cảnh báo</span>
          <strong>{rule.alertRule}</strong>
        </div>
      </div>

      <div className="profile-rule-actions">
        {rule.keyActions.slice(0, 3).map((action) => (
          <span key={action}>{action}</span>
        ))}
      </div>
    </div>
  );
}

export default function UserPreferencesPage() {
  const [data, setData] = useState<UserPreferencesResponse | null>(null);
  const [form, setForm] = useState<UpdateUserPreferencesRequest>({
    userGroup: "normal",
    preferredLocation: "Ho Chi Minh City",
    notifyEnabled: true,
    notifyChannel: "none",
    telegramChatId: "",
    notifyEmail: "",
    notifyThreshold: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true);
      setError("");
      const result = await getUserPreferencesApi();
      const rule = result.profileRule ?? getUserProfileRule(result.userGroup, result.availableProfiles ?? USER_PROFILE_RULES);
      setData(result);
      setForm({
        userGroup: rule.id,
        preferredLocation: result.preferredLocation,
        notifyEnabled: result.notifyEnabled,
        notifyChannel: result.notifyChannel ?? "none",
        telegramChatId: result.telegramChatId ?? "",
        notifyEmail: result.notifyEmail ?? "",
        notifyThreshold: result.notifyThreshold || rule.recommendedNotifyThreshold,
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

  const profileOptions = useMemo(
    () => data?.availableProfiles?.length ? data.availableProfiles : USER_PROFILE_RULES,
    [data?.availableProfiles],
  );
  const selectedRule = useMemo(
    () => getUserProfileRule(form.userGroup, profileOptions),
    [form.userGroup, profileOptions],
  );
  const thresholdPresets = useMemo(
    () => buildThresholdPresets(selectedRule),
    [selectedRule],
  );

  function handleGroupChange(nextGroup: string) {
    const nextRule = getUserProfileRule(nextGroup, profileOptions);
    setForm((prev) => ({
      ...prev,
      userGroup: nextRule.id,
      notifyThreshold: nextRule.recommendedNotifyThreshold,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const result = await updateUserPreferencesApi(form);
      const rule = result.profileRule ?? getUserProfileRule(result.userGroup, result.availableProfiles ?? profileOptions);
      setData(result);
      setForm((prev) => ({ ...prev, userGroup: rule.id, notifyThreshold: result.notifyThreshold || rule.recommendedNotifyThreshold }));
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
  const needEmail = form.notifyChannel === "email" || form.notifyChannel === "both";

  if (loading) return <PreferencesSkeleton />;
  if (error && !data) return <EmptyState title="Không tải được cài đặt" description={error} />;

  return (
    <div className="preferences-page">
      <SectionHeader
        eyebrow="Cài đặt cá nhân"
        title="Hồ sơ người dùng thực tế hơn"
        description="Chọn đúng ngữ cảnh sống hằng ngày để AirSafeNet áp dụng ngưỡng cảnh báo, khẩu trang và thời gian ngoài trời riêng."
        rightSlot={<button className="btn btn-secondary" onClick={() => loadData(true)}>Tải lại</button>}
      />

      <div className="section-toolbar">
        <StatusChip label={`Hồ sơ: ${selectedRule.shortLabel}`} variant="info" />
        <StatusChip label={`Ngưỡng khuyến nghị: AQI ${selectedRule.recommendedNotifyThreshold}`} variant="warning" />
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
              <p className="card__header-desc">Mỗi hồ sơ có rule riêng về ngưỡng AQI, khẩu trang và giới hạn thời gian ngoài trời.</p>
            </div>
          </div>

          <label>Hồ sơ người dùng</label>
          <select value={form.userGroup} onChange={e => handleGroupChange(e.target.value)}>
            {profileOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          <div className="profile-option-grid">
            {profileOptions.map((rule) => (
              <button
                key={rule.id}
                type="button"
                className={`profile-option ${selectedRule.id === rule.id ? "profile-option--active" : ""}`}
                onClick={() => handleGroupChange(rule.id)}
              >
                <strong>{rule.shortLabel}</strong>
                <span>AQI {rule.recommendedNotifyThreshold} · ×{rule.sensitivityMultiplier.toFixed(2)}</span>
              </button>
            ))}
          </div>

          <ProfileRulePreview rule={selectedRule} />

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
              <div className="notify-section__header">Cài đặt thông báo</div>

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
                    Nhắn <code>/start</code> cho bot, sau đó dùng <code>@userinfobot</code> để lấy Chat ID.
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
                    {thresholdPresets.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="field-hint">
                    Rule của {selectedRule.shortLabel} khuyến nghị cảnh báo từ AQI {selectedRule.recommendedNotifyThreshold}. Hệ thống vẫn chống spam tối đa 1 cảnh báo mỗi 4 giờ.
                  </p>
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
              <p className="card__header-desc">Rule đang áp dụng cho dashboard, cảnh báo và mô phỏng hoạt động.</p>
            </div>
          </div>

          <div className="info-list">
            <div className="info-item"><span>Hồ sơ</span><strong>{data?.profileRule?.label ?? selectedRule.label}</strong></div>
            <div className="info-item"><span>Khu vực ưu tiên</span><strong>{data?.preferredLocation ?? "-"}</strong></div>
            <div className="info-item"><span>Kênh thông báo</span><strong>{data?.notifyChannel === "none" ? "Tắt" : data?.notifyChannel ?? "-"}</strong></div>
            <div className="info-item"><span>Ngưỡng AQI đang lưu</span><strong>{data?.notifyThreshold ?? selectedRule.recommendedNotifyThreshold}</strong></div>
            <div className="info-item"><span>Multiplier nhạy cảm</span><strong>×{selectedRule.sensitivityMultiplier.toFixed(2)}</strong></div>
            <div className="info-item"><span>Giới hạn AQI xấu</span><strong>{selectedRule.maxOutdoorUnhealthyMinutes} phút</strong></div>
            {data?.telegramChatId && <div className="info-item"><span>Telegram ID</span><strong>{data.telegramChatId}</strong></div>}
            {data?.notifyEmail && <div className="info-item"><span>Email cảnh báo</span><strong>{data.notifyEmail}</strong></div>}
            <div className="info-item"><span>Cảnh báo gần nhất</span><strong>{timeAgo(data?.lastAlertSentAt)}</strong></div>
            <div className="info-item"><span>Cập nhật lần cuối</span><strong>{data?.updatedAt ? new Date(data.updatedAt).toLocaleString("vi-VN") : "-"}</strong></div>
          </div>

          <div className="preferences-help profile-help-card">
            <h4>Rule thực tế đang dùng</h4>
            <p><strong>Khẩu trang:</strong> {selectedRule.maskRule}</p>
            <p><strong>Ngoài trời:</strong> {selectedRule.outdoorRule}</p>
            <p><strong>Cảnh báo:</strong> {selectedRule.alertRule}</p>
          </div>
        </div>
      </div>

      <FamilyProfilesPanel />

      <ActivitySchedulerWidget />

      <div className="card" style={{ marginTop: 4 }}>
        <div className="card__header">
          <h3>Alert Inbox</h3>
        </div>
        <div style={{ padding: "0 0 16px" }}>
          <AlertHistoryPanel />
        </div>
      </div>
    </div>
  );
}