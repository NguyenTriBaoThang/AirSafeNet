export default function ArchitectureFlow() {
  const blocks = [
    {
      title: "Data Sources",
      desc: "Open-Meteo Air Quality & Weather API",
    },
    {
      title: ".NET Backend",
      desc: "Xử lý nghiệp vụ, xác thực, tổng hợp dữ liệu",
    },
    {
      title: "AI Server",
      desc: "Dự đoán PM2.5, AQI, risk và recommendation",
    },
    {
      title: "React Dashboard",
      desc: "Trực quan hóa dữ liệu và trải nghiệm người dùng",
    },
  ];

  return (
    <div className="architecture-flow">
      {blocks.map((block, index) => (
        <div className="architecture-flow__item card-hover" key={block.title}>
          <div className="architecture-flow__index">0{index + 1}</div>
          <h3>{block.title}</h3>
          <p>{block.desc}</p>
          {index < blocks.length - 1 ? <div className="architecture-flow__arrow">→</div> : null}
        </div>
      ))}
    </div>
  );
}