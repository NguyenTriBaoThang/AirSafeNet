type IconName =
  | "air"
  | "aqi"
  | "trend"
  | "alert"
  | "settings"
  | "clock"
  | "history"
  | "forecast"
  | "user";

type Props = {
  name: IconName;
};

const iconMap: Record<IconName, string> = {
  air: "◌",
  aqi: "◎",
  trend: "↗",
  alert: "▲",
  settings: "⚙",
  clock: "◷",
  history: "↺",
  forecast: "☁",
  user: "◉",
};

export default function AppIcon({ name }: Props) {
  return <span className="app-icon">{iconMap[name]}</span>;
}