import { useEffect, useState } from "react";
import {
  getUserPreferencesApi,
  updateUserPreferencesApi,
} from "../api/preferences";
import type {
  UpdateUserPreferencesRequest,
  UserPreferencesResponse,
} from "../types/preferences";
import PreferencesSkeleton from "../components/common/PreferencesSkeleton";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../components/common/useToast";

const USER_GROUP_OPTIONS = [
  { value: "normal", label: "Người dùng phổ thông" },
  { value: "child", label: "Trẻ em" },
  { value: "elderly", label: "Người cao tuổi" },
  { value: "respiratory", label: "Người có bệnh hô hấp" },
  { value: "pregnant", label: "Phụ nữ mang thai" },
];

export default function UserPreferencesPage() {
  const [data, setData] = useState<UserPreferencesResponse | null>(null);
  const [form, setForm] = useState<UpdateUserPreferencesRequest>({
    userGroup: "normal",
    preferredLocation: "Ho Chi Minh City",
    notifyEnabled: true,
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
      setData(result);
      setForm({
        userGroup: result.userGroup,
        preferredLocation: result.preferredLocation,
        notifyEnabled: result.notifyEnabled,
      });

      if (silent) {
        showToast("Đã tải lại cài đặt người dùng", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải cài đặt";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const result = await updateUserPreferencesApi(form);
      setData(result);

      showToast("Đã cập nhật cài đặt người dùng thành công", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cập nhật thất bại";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PreferencesSkeleton />;
  }

  if (error && !data) {
    return (
      <EmptyState
        title="Không tải được cài đặt người dùng"
        description={error}
      />
    );
  }

  return (
    <div className="preferences-page">
      <div className="page-header">
        <div>
          <h1>Tùy chỉnh người dùng</h1>
          <p>
            Điều chỉnh nhóm người dùng, khu vực ưu tiên và chế độ nhận cảnh báo
            để phù hợp với nhu cầu sử dụng.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={() => loadData(true)}>
          Tải lại
        </button>
      </div>

      <div className="preferences-grid">
        <form className="card preferences-form" onSubmit={handleSave}>
          <div className="card__header">
            <h3>Cấu hình cá nhân</h3>
          </div>

          <label>Nhóm người dùng</label>
          <select
            value={form.userGroup}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, userGroup: e.target.value }))
            }
          >
            {USER_GROUP_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label>Khu vực quan tâm</label>
          <input
            type="text"
            value={form.preferredLocation}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                preferredLocation: e.target.value,
              }))
            }
            placeholder="Ví dụ: Ho Chi Minh City"
          />

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.notifyEnabled}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  notifyEnabled: e.target.checked,
                }))
              }
            />
            <span>Bật cảnh báo chất lượng không khí</span>
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="form-actions">
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>

        <div className="card preferences-info">
          <div className="card__header">
            <h3>Thông tin hiện tại</h3>
          </div>

          <div className="info-list">
            <div className="info-item">
              <span>User ID</span>
              <strong>{data?.userId ?? "-"}</strong>
            </div>

            <div className="info-item">
              <span>Nhóm người dùng</span>
              <strong>{data?.userGroup ?? "-"}</strong>
            </div>

            <div className="info-item">
              <span>Khu vực ưu tiên</span>
              <strong>{data?.preferredLocation ?? "-"}</strong>
            </div>

            <div className="info-item">
              <span>Nhận cảnh báo</span>
              <strong>{data?.notifyEnabled ? "Bật" : "Tắt"}</strong>
            </div>

            <div className="info-item">
              <span>Cập nhật lần cuối</span>
              <strong>
                {data?.updatedAt
                  ? new Date(data.updatedAt).toLocaleString("vi-VN")
                  : "-"}
              </strong>
            </div>
          </div>

          <div className="preferences-help">
            <h4>Gợi ý sử dụng</h4>
            <p>
              Chọn đúng nhóm người dùng sẽ giúp hệ thống đưa ra đánh giá mức độ
              rủi ro và khuyến nghị phù hợp hơn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}