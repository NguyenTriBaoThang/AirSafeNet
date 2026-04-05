import Skeleton from "./Skeleton";

export default function PreferencesSkeleton() {
  return (
    <div className="preferences-page">
      <div className="page-header">
        <div>
          <Skeleton className="sk-title" />
          <Skeleton className="sk-text" />
        </div>
        <Skeleton className="sk-button" />
      </div>

      <div className="preferences-grid">
        <div className="card preferences-form">
          <Skeleton className="sk-section-title" />
          <Skeleton className="sk-input" />
          <Skeleton className="sk-input" />
          <Skeleton className="sk-input" />
          <Skeleton className="sk-button" />
        </div>

        <div className="card preferences-info">
          <Skeleton className="sk-section-title" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="sk-info-row" />
          ))}
        </div>
      </div>
    </div>
  );
}