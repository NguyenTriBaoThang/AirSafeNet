import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
};

export default function SummaryCard({
  title,
  value,
  subtext,
  icon,
  tone = "default",
}: Props) {
  return (
    <div className={`summary-card summary-card--${tone}`}>
      <div className="summary-card__top">
        <div className="summary-card__meta">
          <span className="summary-card__title">{title}</span>
        </div>
        {icon ? <span className="summary-card__icon">{icon}</span> : null}
      </div>

      <div className="summary-card__value">{value}</div>

      {subtext ? <div className="summary-card__subtext">{subtext}</div> : null}
    </div>
  );
}