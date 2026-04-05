const FAQ_ITEMS = [
  {
    question: "AirSafeNet dùng dữ liệu từ đâu?",
    answer:
      "Hệ thống hiện tích hợp dữ liệu chất lượng không khí và thời tiết từ Open-Meteo để phục vụ dự báo và hiển thị dashboard.",
  },
  {
    question: "AirSafeNet có dùng AI thật không?",
    answer:
      "Có. Hệ thống sử dụng AI Server riêng để xử lý dữ liệu đầu vào, dự đoán PM2.5, suy ra AQI, mức rủi ro và khuyến nghị sức khỏe.",
  },
  {
    question: "Dự báo 24 giờ được dùng như thế nào?",
    answer:
      "Người dùng có thể xem trước xu hướng AQI và PM2.5 để chủ động sắp xếp hoạt động ngoài trời và giảm rủi ro sức khỏe.",
  },
  {
    question: "Hệ thống có phù hợp với trẻ em và người cao tuổi không?",
    answer:
      "Có. AirSafeNet hỗ trợ tùy chỉnh nhóm người dùng để tăng độ nhạy cảnh báo và đưa ra khuyến nghị phù hợp hơn.",
  },
];

export default function FaqSection() {
  return (
    <section className="premium-section fade-in-up">
      <div className="section-heading">
        <div className="section-heading__eyebrow">FAQ</div>
        <h2>Một vài câu hỏi thường gặp về AirSafeNet</h2>
        <p>
          Những nội dung dưới đây giúp người dùng và BGK hiểu nhanh hơn về cách hệ thống hoạt động.
        </p>
      </div>

      <div className="faq-list">
        {FAQ_ITEMS.map((item) => (
          <div key={item.question} className="faq-item card-hover">
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}