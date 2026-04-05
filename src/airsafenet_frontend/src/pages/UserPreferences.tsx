import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import {
  getUserPreferencesApi,
  updateUserPreferencesApi,
} from "../api/preferences";
import type {
  UpdateUserPreferencesRequest,
  UserPreferencesResponse,
} from "../types/preferences";

const GROUP_OPTIONS = [
  { value: "normal", label: "Người dùng thông thường" },
  { value: "child", label: "Trẻ em" },
  { value: "elderly", label: "Người cao tuổi" },
  { value: "respiratory", label: "Người có bệnh hô hấp" },
  { value: "pregnant", label: "Phụ nữ mang thai" },
];

export default function UserPreferences() {
  const [data, setData] = useState<UserPreferencesResponse | null>(null);
  const [form, setForm] = useState<UpdateUserPreferencesRequest>({
    userGroup: "normal",
    preferredLocation: "Ho Chi Minh City",
    notifyEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const result = await getUserPreferencesApi();
      setData(result);
      setForm({
        userGroup: result.userGroup,
        preferredLocation: result.preferredLocation,
        notifyEnabled: result.notifyEnabled,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const result = await updateUserPreferencesApi(form);
      setData(result);
      setMessage("Cập nhật tùy chỉnh thành công.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Tùy chỉnh người dùng">
      <div className="preferences-page">
        <div className="content-grid">
          <div className="card">
            <div className="card__header">
              <h3>Cài đặt cảnh báo và đối tượng sử dụng</h3>
              <p className="card__desc">
                Tùy chỉnh nhóm người dùng để hệ thống đưa ra mức cảnh báo và khuyến nghị phù hợp hơn.
              </p>
            </div>

            {loading ? (
              <div className="page-state">Đang tải cấu hình...</div>
            ) : (
              <form className="preferences-form" onSubmit={handleSubmit}>
                <label>Nhóm người dùng</label>
                <select
                  value={form.userGroup}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, userGroup: e.target.value }))
                  }
                >
                  {GROUP_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <label>Khu vực ưu tiên</label>
                <input
                  value={form.preferredLocation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      preferredLocation: e.target.value,
                    }))
                  }
                  placeholder="Ho Chi Minh City"
                />

                <label className="switch-row">
                  <span>Bật nhận cảnh báo</span>
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
                </label>

                {message ? <div className="form-success">{message}</div> : null}
                {error ? <div className="form-error">{error}</div> : null}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={loadData}
                  >
                    Tải lại
                  </button>

                  <button className="btn btn-primary" disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="card">
            <div className="card__header">
              <h3>Thông tin hiện tại</h3>
            </div>

            {data ? (
              <div className="info-stack">
                <div className="info-row">
                  <span>Nhóm người dùng</span>
                  <strong>{data.userGroup}</strong>
                </div>
                <div className="info-row">
                  <span>Khu vực</span>
                  <strong>{data.preferredLocation}</strong>
                </div>
                <div className="info-row">
                  <span>Nhận cảnh báo</span>
                  <strong>{data.notifyEnabled ? "Bật" : "Tắt"}</strong>
                </div>
                <div className="info-row">
                  <span>Cập nhật lần cuối</span>
                  <strong>{new Date(data.updatedAt).toLocaleString("vi-VN")}</strong>
                </div>
              </div>
            ) : (
              <div className="page-state">Chưa có dữ liệu.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}