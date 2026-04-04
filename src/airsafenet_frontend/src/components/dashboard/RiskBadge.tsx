import { getRiskClass, getRiskLabel } from "./riskUtils";

type Props = {
  risk: string;
};

export default function RiskBadge({ risk }: Props) {
  return <span className={`risk-badge ${getRiskClass(risk)}`}>{getRiskLabel(risk)}</span>;
}