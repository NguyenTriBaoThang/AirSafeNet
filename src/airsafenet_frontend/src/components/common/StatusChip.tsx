type StatusVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

type Props = {
  label: string;
  variant?: StatusVariant;
};

export default function StatusChip({
  label,
  variant = "neutral",
}: Props) {
  return (
    <span className={`status-chip status-chip--${variant}`}>
      <span className="status-chip__dot" />
      <span>{label}</span>
    </span>
  );
}