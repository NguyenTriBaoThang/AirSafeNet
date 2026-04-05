import Skeleton from "./Skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <Skeleton className="sk-title" />
          <Skeleton className="sk-text" />
        </div>
        <Skeleton className="sk-button" />
      </div>

      <div className="dashboard-filters">
        <div className="filter-group">
          <Skeleton className="sk-chip-row" />
        </div>
        <div className="filter-group">
          <Skeleton className="sk-chip-row" />
        </div>
      </div>

      <div className="summary-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="summary-card">
            <Skeleton className="sk-card-label" />
            <Skeleton className="sk-card-value" />
            <Skeleton className="sk-card-text" />
          </div>
        ))}
      </div>

      <div className="dashboard-two-col">
        <div className="card">
          <Skeleton className="sk-section-title" />
          <Skeleton className="sk-chart" />
        </div>

        <div className="card">
          <Skeleton className="sk-section-title" />
          <Skeleton className="sk-badge" />
          <Skeleton className="sk-para" />
          <Skeleton className="sk-panel" />
        </div>
      </div>

      <div className="card">
        <Skeleton className="sk-section-title" />
        <Skeleton className="sk-table" />
      </div>
    </div>
  );
}