export default function AboutProjectSection() {
  return (
    <section className="premium-section fade-in-up">
      <div className="section-heading">
        <div className="section-heading__eyebrow">ABOUT THE PROJECT</div>
        <h2>AirSafeNet được xây dựng để giải quyết bài toán ô nhiễm không khí theo hướng dễ ứng dụng</h2>
        <p>
          Dự án tập trung vào việc kết nối dữ liệu môi trường, mô hình AI và giao diện trực quan
          để tạo ra một nền tảng hỗ trợ người dùng theo dõi chất lượng không khí theo thời gian thực.
        </p>
      </div>

      <div className="about-project-grid">
        <div className="about-project-card card-hover">
          <h3>Mục tiêu chính</h3>
          <p>
            Cung cấp một hệ thống dự báo và cảnh báo chất lượng không khí có thể sử dụng
            trong môi trường học đường, gia đình và cộng đồng.
          </p>
        </div>

        <div className="about-project-card card-hover">
          <h3>Điểm nhấn công nghệ</h3>
          <p>
            Tách AI Server, .NET Backend và React Dashboard để hệ thống dễ bảo trì,
            dễ mở rộng và thuận lợi khi tích hợp dữ liệu mới.
          </p>
        </div>

        <div className="about-project-card card-hover">
          <h3>Khả năng phát triển</h3>
          <p>
            Có thể mở rộng thêm heatmap, cảnh báo theo khu vực, lịch sử phân tích,
            hoặc tích hợp cảm biến thực tế trong các phiên bản sau.
          </p>
        </div>
      </div>
    </section>
  );
}