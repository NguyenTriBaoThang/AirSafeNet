import type { DashboardDays, DashboardMode } from "../../types/dashboard";

type Props = {
  days: DashboardDays;
  mode: DashboardMode;
  onDaysChange: (days: DashboardDays) => void;
  onModeChange: (mode: DashboardMode) => void;
};

const dayOptions: DashboardDays[] = [1, 3, 7];

export default function DashboardFilters({
  days,
  mode,
  onDaysChange,
  onModeChange,
}: Props) {
  return (
    <div className="dashboard-filters">
      <div className="filter-group">
        <span className="filter-label">Chế độ</span>
        <div className="segmented-control">
          <button
            className={`segmented-btn ${mode === "forecast" ? "active" : ""}`}
            onClick={() => onModeChange("forecast")}
            type="button"
          >
            Forecast
          </button>
          <button
            className={`segmented-btn ${mode === "history" ? "active" : ""}`}
            onClick={() => onModeChange("history")}
            type="button"
          >
            History
          </button>
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Khoảng thời gian</span>
        <div className="segmented-control">
          {dayOptions.map((option) => (
            <button
              key={option}
              className={`segmented-btn ${days === option ? "active" : ""}`}
              onClick={() => onDaysChange(option)}
              type="button"
            >
              {option === 1 ? "1 ngày" : `${option} ngày`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}