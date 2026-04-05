import LoadingSkeleton from "../common/LoadingSkeleton";
import AppShell from "../layout/AppShell";

export default function DashboardSkeleton() {
  return (
    <AppShell title="Dashboard tổng quan">
      <div className="dashboard-page-inner">
        <div className="page-header">
          <div style={{ width: "60%" }}>
            <LoadingSkeleton height={34} rounded={12} />
            <div style={{ height: 12 }} />
            <LoadingSkeleton height={18} rounded={10} />
          </div>
          <div style={{ width: 160 }}>
            <LoadingSkeleton height={44} rounded={14} />
          </div>
        </div>

        <div className="summary-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div className="summary-card" key={idx}>
              <LoadingSkeleton height={16} />
              <div style={{ height: 16 }} />
              <LoadingSkeleton height={40} />
              <div style={{ height: 12 }} />
              <LoadingSkeleton height={16} />
            </div>
          ))}
        </div>

        <div className="dashboard-two-col">
          <div className="card">
            <LoadingSkeleton height={24} />
            <div style={{ height: 20 }} />
            <LoadingSkeleton height={320} rounded={20} />
          </div>

          <div className="card">
            <LoadingSkeleton height={24} />
            <div style={{ height: 20 }} />
            <LoadingSkeleton height={28} rounded={999} />
            <div style={{ height: 16 }} />
            <LoadingSkeleton height={18} />
            <div style={{ height: 12 }} />
            <LoadingSkeleton height={18} />
            <div style={{ height: 20 }} />
            <LoadingSkeleton height={120} rounded={18} />
          </div>
        </div>

        <div className="card">
          <LoadingSkeleton height={24} />
          <div style={{ height: 20 }} />
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} style={{ marginBottom: 14 }}>
              <LoadingSkeleton height={18} rounded={10} />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}