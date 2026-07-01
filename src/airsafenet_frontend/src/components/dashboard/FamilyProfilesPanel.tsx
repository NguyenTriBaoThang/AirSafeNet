import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createFamilyProfileApi,
  deleteFamilyProfileApi,
  getFamilyProfileRiskApi,
  getFamilyProfilesApi,
  updateFamilyProfileApi,
} from "../../api/preferences";
import type {
  FamilyProfileResponse,
  FamilyProfileRiskResponse,
  UpsertFamilyProfileRequest,
} from "../../types/preferences";
import AppIcon from "../common/AppIcon";
import StatusChip from "../common/StatusChip";
import { useToast } from "../common/useToast";

const USER_GROUP_OPTIONS = [
  { value: "child", label: "Trẻ em" },
  { value: "elderly", label: "Người cao tuổi" },
  { value: "respiratory", label: "Bệnh hô hấp" },
  { value: "pregnant", label: "Phụ nữ mang thai" },
  { value: "normal", label: "Người dùng phổ thông" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "child", label: "Con/em bé" },
  { value: "parent", label: "Ba/mẹ" },
  { value: "grandparent", label: "Ông/bà" },
  { value: "spouse", label: "Vợ/chồng" },
  { value: "family", label: "Người thân" },
];

const THRESHOLD_PRESETS = [
  { value: 50, label: "AQI > 50" },
  { value: 100, label: "AQI > 100" },
  { value: 150, label: "AQI > 150" },
  { value: 200, label: "AQI > 200" },
];

const EMPTY_FORM: UpsertFamilyProfileRequest = {
  displayName: "",
  relationship: "child",
  userGroup: "child",
  preferredLocation: "Ho Chi Minh City",
  notifyEnabled: true,
  notifyThreshold: 100,
  notes: "",
};

const PROFILE_PRESETS: Array<{
  label: string;
  description: string;
  form: UpsertFamilyProfileRequest;
}> = [
  {
    label: "Trẻ em",
    description: "Nhạy với PM2.5, ưu tiên cảnh báo sớm.",
    form: {
      ...EMPTY_FORM,
      displayName: "Con nhỏ",
      relationship: "child",
      userGroup: "child",
      notifyThreshold: 75,
      notes: "Ưu tiên hạn chế vận động ngoài trời khi AQI tăng.",
    },
  },
  {
    label: "Người già",
    description: "Theo dõi sát các khung AQI xấu.",
    form: {
      ...EMPTY_FORM,
      displayName: "Ba/Mẹ",
      relationship: "parent",
      userGroup: "elderly",
      notifyThreshold: 100,
      notes: "Nên tránh ra ngoài vào giờ cao điểm ô nhiễm.",
    },
  },
  {
    label: "Bệnh hô hấp",
    description: "Cảnh báo mạnh hơn khi rủi ro tăng.",
    form: {
      ...EMPTY_FORM,
      displayName: "Người bệnh hô hấp",
      relationship: "family",
      userGroup: "respiratory",
      notifyThreshold: 75,
      notes: "Chuẩn bị khẩu trang và thuốc hỗ trợ theo chỉ định cá nhân.",
    },
  },
];

type RiskMap = Record<number, FamilyProfileRiskResponse>;

type ChipVariant = "neutral" | "success" | "warning" | "danger" | "error" | "info" | "purple";

function groupLabel(value: string): string {
  return USER_GROUP_OPTIONS.find((x) => x.value === value)?.label ?? value;
}

function relationshipLabel(value: string): string {
  return RELATIONSHIP_OPTIONS.find((x) => x.value === value)?.label ?? value;
}

function severityValue(risk: string): number {
  const normalized = risk.toUpperCase();
  if (normalized === "GOOD") return 0;
  if (normalized === "MODERATE") return 1;
  if (normalized === "UNHEALTHY_SENSITIVE") return 2;
  if (normalized === "UNHEALTHY") return 3;
  if (normalized === "VERY_UNHEALTHY") return 4;
  if (normalized === "HAZARDOUS") return 5;
  return 1;
}

function riskLabel(risk: string): string {
  const normalized = risk.toUpperCase();
  if (normalized === "GOOD") return "Tốt";
  if (normalized === "MODERATE") return "Trung bình";
  if (normalized === "UNHEALTHY_SENSITIVE") return "Nhạy cảm";
  if (normalized === "UNHEALTHY") return "Không tốt";
  if (normalized === "VERY_UNHEALTHY") return "Rất xấu";
  if (normalized === "HAZARDOUS") return "Nguy hiểm";
  return risk || "Chưa rõ";
}

function riskVariant(risk: string): ChipVariant {
  const severity = severityValue(risk);
  if (severity <= 0) return "success";
  if (severity === 1) return "warning";
  if (severity <= 3) return "danger";
  return "error";
}

function riskColor(risk: string): string {
  const severity = severityValue(risk);
  if (severity <= 0) return "#22c55e";
  if (severity === 1) return "#eab308";
  if (severity === 2) return "#f97316";
  if (severity === 3) return "#ef4444";
  return "#a855f7";
}

function maskAdvice(risk: string, userGroup: string): string {
  const severity = severityValue(risk);
  if (severity >= 3) return "Nên đeo N95/KN95";
  if (severity >= 2 || userGroup !== "normal") return "Nên có khẩu trang";
  return "Không bắt buộc";
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "Chưa có";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPayload(form: UpsertFamilyProfileRequest): UpsertFamilyProfileRequest {
  return {
    displayName: form.displayName.trim(),
    relationship: form.relationship,
    userGroup: form.userGroup,
    preferredLocation: form.preferredLocation.trim() || "Ho Chi Minh City",
    notifyEnabled: form.notifyEnabled,
    notifyThreshold: Number(form.notifyThreshold),
    notes: form.notes?.trim() ? form.notes.trim() : null,
  };
}

function FamilyProfileCard({
  profile,
  risk,
  onEdit,
  onDelete,
}: {
  profile: FamilyProfileResponse;
  risk?: FamilyProfileRiskResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const currentColor = risk ? riskColor(risk.currentRisk) : "#94a3b8";

  return (
    <article className="family-profile-card" style={{ borderColor: `${currentColor}55` }}>
      <div className="family-profile-card__top">
        <div className="family-profile-card__identity">
          <span className="family-profile-card__avatar">{profile.displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <h4>{profile.displayName}</h4>
            <div className="family-profile-card__meta">
              <span>{relationshipLabel(profile.relationship)}</span>
              <span>{groupLabel(profile.userGroup)}</span>
              <span>{profile.preferredLocation}</span>
            </div>
          </div>
        </div>

        <div className="family-profile-card__actions">
          <button className="family-icon-btn" type="button" onClick={onEdit} aria-label="Sửa hồ sơ">
            Sửa
          </button>
          <button className="family-icon-btn family-icon-btn--danger" type="button" onClick={onDelete} aria-label="Xóa hồ sơ">
            Xóa
          </button>
        </div>
      </div>

      {risk ? (
        <>
          <div className="family-risk-row">
            <div className="family-risk-main" style={{ background: `${currentColor}16` }}>
              <span>Rủi ro hiện tại</span>
              <strong style={{ color: currentColor }}>{riskLabel(risk.currentRisk)}</strong>
              <small>AQI {risk.currentAqi} · PM2.5 {risk.currentPm25.toFixed(1)}</small>
            </div>
            <div className="family-risk-stat">
              <span>Cao nhất 24h</span>
              <strong>{risk.maxAqiNext24h}</strong>
              <small>{formatDateTime(risk.peakTime)}</small>
            </div>
            <div className="family-risk-stat">
              <span>Giờ cần chú ý</span>
              <strong>{risk.warningCount}</strong>
              <small>{risk.dangerCount} giờ nguy cơ cao</small>
            </div>
          </div>

          <div className="family-profile-card__chips">
            <StatusChip label={riskLabel(risk.currentRisk)} variant={riskVariant(risk.currentRisk)} />
            <StatusChip label={maskAdvice(risk.currentRisk, profile.userGroup)} variant={severityValue(risk.currentRisk) >= 2 ? "warning" : "neutral"} />
            <StatusChip
              label={profile.notifyEnabled ? `Cảnh báo AQI > ${profile.notifyThreshold}` : "Cảnh báo tắt"}
              variant={profile.notifyEnabled ? "info" : "neutral"}
            />
          </div>

          <p className="family-recommendation">{risk.currentRecommendation}</p>
          <div className="family-profile-card__freshness">
            Cập nhật risk: {formatDateTime(risk.generatedAt)}
          </div>
        </>
      ) : (
        <div className="family-risk-empty">
          Chưa có dữ liệu risk cho hồ sơ này. Hệ thống sẽ hiện khi cache AI sẵn sàng.
        </div>
      )}

      {profile.notes && <p className="family-notes">{profile.notes}</p>}
    </article>
  );
}

export default function FamilyProfilesPanel() {
  const [profiles, setProfiles] = useState<FamilyProfileResponse[]>([]);
  const [risks, setRisks] = useState<RiskMap>({});
  const [form, setForm] = useState<UpsertFamilyProfileRequest>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const list = await getFamilyProfilesApi();
      setProfiles(list ?? []);

      if (list.length === 0) {
        setRisks({});
        return;
      }

      setLoadingRisk(true);
      const results = await Promise.allSettled(
        list.map((profile) => getFamilyProfileRiskApi(profile.id, 1))
      );
      const nextRisks: RiskMap = {};
      results.forEach((result, index) => {
        const profile = list[index];
        if (profile && result.status === "fulfilled") {
          nextRisks[profile.id] = result.value;
        }
      });
      setRisks(nextRisks);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không tải được hồ sơ gia đình";
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingRisk(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const overview = useMemo(() => {
    const riskValues = Object.values(risks);
    const needAttention = riskValues.filter((risk) => severityValue(risk.currentRisk) >= 2).length;
    const highestAqi = riskValues.reduce((max, risk) => Math.max(max, risk.maxAqiNext24h), 0);
    return { needAttention, highestAqi };
  }, [risks]);

  function startCreate(preset?: UpsertFamilyProfileRequest) {
    setEditingId(null);
    setForm(preset ? { ...preset } : { ...EMPTY_FORM });
  }

  function startEdit(profile: FamilyProfileResponse) {
    setEditingId(profile.id);
    setForm({
      displayName: profile.displayName,
      relationship: profile.relationship,
      userGroup: profile.userGroup,
      preferredLocation: profile.preferredLocation,
      notifyEnabled: profile.notifyEnabled,
      notifyThreshold: profile.notifyThreshold,
      notes: profile.notes ?? "",
    });
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const payload = buildPayload(form);
    if (!payload.displayName) {
      showToast("Bạn cần nhập tên hồ sơ", "error");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (editingId) {
        await updateFamilyProfileApi(editingId, payload);
        showToast("Đã cập nhật hồ sơ gia đình", "success");
      } else {
        await createFamilyProfileApi(payload);
        showToast("Đã thêm hồ sơ gia đình", "success");
      }
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      await loadProfiles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không lưu được hồ sơ";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(profile: FamilyProfileResponse) {
    const ok = window.confirm(`Xóa hồ sơ ${profile.displayName}?`);
    if (!ok) return;

    try {
      await deleteFamilyProfileApi(profile.id);
      showToast("Đã xóa hồ sơ gia đình", "success");
      if (editingId === profile.id) {
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
      }
      await loadProfiles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không xóa được hồ sơ";
      showToast(msg, "error");
    }
  }

  return (
    <section className="family-profiles-panel">
      <div className="family-profiles__header">
        <div className="family-profiles__title">
          <span className="family-profiles__icon"><AppIcon name="user" /></span>
          <div>
            <div className="family-profiles__eyebrow">Family Profiles</div>
            <h3>Theo dõi sức khỏe không khí cho người thân</h3>
            <p>Mỗi hồ sơ có nhóm sức khỏe, khu vực quan tâm và ngưỡng cảnh báo riêng.</p>
          </div>
        </div>

        <div className="family-overview">
          <div>
            <span>Hồ sơ</span>
            <strong>{profiles.length}/8</strong>
          </div>
          <div>
            <span>Cần chú ý</span>
            <strong>{overview.needAttention}</strong>
          </div>
          <div>
            <span>AQI đỉnh 24h</span>
            <strong>{overview.highestAqi || "--"}</strong>
          </div>
        </div>
      </div>

      <div className="family-presets">
        {PROFILE_PRESETS.map((preset) => (
          <button key={preset.label} className="family-preset" type="button" onClick={() => startCreate(preset.form)}>
            <strong>{preset.label}</strong>
            <span>{preset.description}</span>
          </button>
        ))}
        <button className="family-preset family-preset--plain" type="button" onClick={() => startCreate()}>
          <strong>Hồ sơ khác</strong>
          <span>Tự chọn nhóm sức khỏe và ngưỡng AQI.</span>
        </button>
      </div>

      <form className="family-form" onSubmit={handleSave}>
        <div className="family-form__head">
          <strong>{editingId ? "Sửa hồ sơ" : "Thêm hồ sơ"}</strong>
          {editingId && (
            <button className="family-text-btn" type="button" onClick={() => startCreate()}>
              Tạo mới
            </button>
          )}
        </div>

        <div className="family-form__grid">
          <label>
            Tên hiển thị
            <input
              value={form.displayName}
              onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              placeholder="Ví dụ: Con nhỏ, Ba, Bà ngoại"
              maxLength={120}
            />
          </label>

          <label>
            Quan hệ
            <select
              value={form.relationship}
              onChange={(event) => setForm((prev) => ({ ...prev, relationship: event.target.value }))}
            >
              {RELATIONSHIP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            Nhóm sức khỏe
            <select
              value={form.userGroup}
              onChange={(event) => setForm((prev) => ({ ...prev, userGroup: event.target.value }))}
            >
              {USER_GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            Quận/huyện hoặc khu vực
            <input
              value={form.preferredLocation}
              onChange={(event) => setForm((prev) => ({ ...prev, preferredLocation: event.target.value }))}
              placeholder="Ho Chi Minh City"
              maxLength={150}
            />
          </label>

          <label>
            Ngưỡng cảnh báo
            <select
              value={form.notifyThreshold}
              onChange={(event) => setForm((prev) => ({ ...prev, notifyThreshold: Number(event.target.value) }))}
            >
              {THRESHOLD_PRESETS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="family-form__toggle">
            <input
              type="checkbox"
              checked={form.notifyEnabled}
              onChange={(event) => setForm((prev) => ({ ...prev, notifyEnabled: event.target.checked }))}
            />
            <span>Bật cảnh báo cho hồ sơ này</span>
          </label>
        </div>

        <label className="family-form__notes">
          Ghi chú sức khỏe
          <textarea
            value={form.notes ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Ví dụ: hen suyễn, dễ dị ứng, hạn chế vận động mạnh ngoài trời"
            maxLength={300}
            rows={3}
          />
        </label>

        {error && <div className="family-form__error">{error}</div>}

        <div className="family-form__actions">
          <button className="btn btn-primary" type="submit" disabled={saving || !form.displayName.trim()}>
            {saving ? "Đang lưu..." : editingId ? "Cập nhật hồ sơ" : "Thêm hồ sơ"}
          </button>
          {editingId && (
            <button className="btn btn-secondary" type="button" onClick={() => startCreate()}>
              Hủy sửa
            </button>
          )}
        </div>
      </form>

      <div className="family-list-head">
        <strong>Risk theo từng người thân</strong>
        {loadingRisk && <span>Đang cập nhật risk...</span>}
      </div>

      {loading ? (
        <div className="family-loading">Đang tải hồ sơ gia đình...</div>
      ) : profiles.length === 0 ? (
        <div className="family-risk-empty family-risk-empty--large">
          Chưa có hồ sơ nào. Chọn preset phía trên để thêm nhanh trẻ em, người già hoặc người bệnh hô hấp.
        </div>
      ) : (
        <div className="family-profile-grid">
          {profiles.map((profile) => (
            <FamilyProfileCard
              key={profile.id}
              profile={profile}
              risk={risks[profile.id]}
              onEdit={() => startEdit(profile)}
              onDelete={() => handleDelete(profile)}
            />
          ))}
        </div>
      )}
    </section>
  );
}