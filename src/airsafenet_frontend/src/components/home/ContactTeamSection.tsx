export default function ContactTeamSection() {
  return (
    <section className="premium-section fade-in-up">
      <div className="contact-team-panel card-hover">
        <div className="contact-team-panel__left">
          <div className="section-heading__eyebrow">CONTACT & TEAM</div>
          <h2>Nhóm phát triển AirSafeNet</h2>
          <p>
            Đây là dự án hướng đến việc ứng dụng AI và Big Data trong cảnh báo ô nhiễm không khí,
            đồng thời cung cấp một trải nghiệm trực quan, dễ tiếp cận và phù hợp với người dùng thực tế.
          </p>
        </div>

        <div className="contact-team-panel__right">
          <div className="team-info-card">
            <span>Tên dự án</span>
            <strong>AirSafeNet</strong>
          </div>

          <div className="team-info-card">
            <span>Lĩnh vực</span>
            <strong>AI + Big Data + Environmental Monitoring</strong>
          </div>

          <div className="team-info-card">
            <span>Nền tảng</span>
            <strong>React • ASP.NET Core • FastAPI</strong>
          </div>

          <div className="team-info-card">
            <span>Mục tiêu</span>
            <strong>Hệ thống cảnh báo chất lượng không khí thông minh</strong>
          </div>
        </div>
      </div>
    </section>
  );
}