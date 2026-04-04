import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
};

export default function SummaryCard({ title, value, subtext, icon }: Props) {
  return (
    <div className="summary-card">
      <div className="summary-card__top">
        <span className="summary-card__title">{title}</span>
        <span className="summary-card__icon">{icon}</span>
      </div>
      <div className="summary-card__value">{value}</div>
      {subtext ? <div className="summary-card__subtext">{subtext}</div> : null}
    </div>
  );
}