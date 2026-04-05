export default function HeroStats() {
  const items = [
    {
      value: "24h",
      label: "Dự báo chất lượng không khí",
    },
    {
      value: "AI",
      label: "Phân tích và hỗ trợ cảnh báo",
    },
    {
      value: "Real-time",
      label: "Dữ liệu khí tượng & PM2.5",
    },
  ];

  return (
    <div className="hero-stats">
      {items.map((item) => (
        <div key={item.label} className="hero-stats__item">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}