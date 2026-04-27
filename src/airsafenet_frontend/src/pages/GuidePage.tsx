import { useEffect, useRef, useState } from "react";

type Section = {
  id:    string;
  label: string;
  icon:  string;
};

const SECTIONS: Section[] = [
  { id: "what",    label: "PM2.5 là gì?",      icon: "🔬" },
  { id: "aqi",     label: "Chỉ số AQI",         icon: "📊" },
  { id: "health",  label: "Ảnh hưởng sức khỏe", icon: "🫁" },
  { id: "groups",  label: "Nhóm nhạy cảm",      icon: "👨‍👩‍👧‍👦" },
  { id: "protect", label: "Tự bảo vệ",          icon: "🛡️" },
  { id: "myth",    label: "Hiểu lầm thường gặp", icon: "💡" },
];

const AQI_LEVELS = [
  {
    range: "0 – 50", label: "Tốt", color: "#22c55e", bg: "rgba(34,197,94,.12)",
    icon: "😊", desc: "Chất lượng không khí tốt. Mọi người có thể vui chơi, hoạt động ngoài trời bình thường.",
    advice: "Tận hưởng không khí trong lành!",
  },
  {
    range: "51 – 100", label: "Trung bình", color: "#eab308", bg: "rgba(234,179,8,.12)",
    icon: "😐", desc: "Chấp nhận được với đại đa số. Nhóm cực kỳ nhạy cảm nên hạn chế hoạt động mạnh ngoài trời.",
    advice: "Theo dõi nếu bạn có bệnh hô hấp.",
  },
  {
    range: "101 – 150", label: "Nhạy cảm", color: "#f97316", bg: "rgba(249,115,22,.12)",
    icon: "😷", desc: "Người bệnh hô hấp, tim mạch, trẻ em, người già nên hạn chế ra ngoài.",
    advice: "Đeo khẩu trang nếu ra ngoài.",
  },
  {
    range: "151 – 200", label: "Không tốt", color: "#ef4444", bg: "rgba(239,68,68,.12)",
    icon: "🤧", desc: "Mọi người có thể bắt đầu cảm thấy ảnh hưởng. Nhóm nhạy cảm: tác động nghiêm trọng.",
    advice: "Hạn chế ra ngoài, đóng cửa sổ.",
  },
  {
    range: "201 – 300", label: "Rất kém", color: "#a855f7", bg: "rgba(168,85,247,.12)",
    icon: "😮", desc: "Cảnh báo sức khỏe. Mọi người đều có thể bị ảnh hưởng nghiêm trọng.",
    advice: "Ở trong nhà, lọc không khí.",
  },
  {
    range: "301+", label: "Nguy hiểm", color: "#7f1d1d", bg: "rgba(127,29,29,.15)",
    icon: "🚨", desc: "Khẩn cấp sức khỏe. Toàn bộ dân số bị ảnh hưởng. Không ra ngoài.",
    advice: "Ở trong nhà hoàn toàn.",
  },
];

const MYTHS = [
  {
    myth:  "Không khí trong lành là không khí trong suốt, không mùi",
    fact:  "PM2.5 hoàn toàn vô hình với mắt thường và không có mùi. Trời xanh không có nghĩa là không khí sạch — ngày ô nhiễm nặng vẫn có thể thấy bầu trời trong.",
    icon:  "👁️",
  },
  {
    myth:  "Khẩu trang vải thông thường ngăn được PM2.5",
    fact:  "Khẩu trang vải chỉ ngăn được 10-30% hạt PM2.5. Cần KF94 (lọc ≥94%) hoặc N95 (lọc ≥95%) để bảo vệ thực sự.",
    icon:  "😷",
  },
  {
    myth:  "Trong nhà thì an toàn hoàn toàn",
    fact:  "PM2.5 ngoài trời có thể xâm nhập vào trong nhà qua khe cửa. Nồng độ trong nhà thường bằng 50-70% nồng độ ngoài trời nếu không có lọc khí.",
    icon:  "🏠",
  },
  {
    myth:  "Người trẻ khỏe mạnh không cần lo lắng",
    fact:  "Phơi nhiễm PM2.5 lâu dài tích lũy tổn thương phổi và tim mạch ngay cả ở người khỏe mạnh. WHO: không có ngưỡng an toàn tuyệt đối.",
    icon:  "💪",
  },
  {
    myth:  "Cây xanh trong nhà lọc sạch PM2.5",
    fact:  "Cây xanh lọc VOC và CO₂ hiệu quả, nhưng tác dụng với PM2.5 cực kỳ hạn chế. Cần hàng trăm cây để đạt hiệu quả tương đương máy lọc không khí.",
    icon:  "🌿",
  },
  {
    myth:  "AQI 100 là ổn, chỉ lo khi AQI >150",
    fact:  "WHO khuyến nghị PM2.5 trung bình 24h ≤ 15 µg/m³ (AQI ≈ 60). AQI 100 đã gấp đôi ngưỡng an toàn của WHO.",
    icon:  "📏",
  },
];

const GROUPS = [
  {
    icon: "👶", label: "Trẻ em",
    color: "#f59e0b", bg: "rgba(245,158,11,.1)",
    why: "Phổi đang phát triển, nhịp thở nhanh hơn người lớn 50% theo cân nặng → hấp thụ nhiều PM2.5 hơn.",
    risks: ["Giảm phát triển chức năng phổi", "Tăng nguy cơ hen suyễn suốt đời", "Ảnh hưởng não bộ đang phát triển"],
    tips:  ["Hạn chế giờ ra ngoài khi AQI >100", "Ưu tiên vui chơi trong nhà", "Đeo khẩu trang đúng cỡ"],
  },
  {
    icon: "🧓", label: "Người cao tuổi",
    color: "#8b5cf6", bg: "rgba(139,92,246,.1)",
    why: "Chức năng phổi giảm theo tuổi, thường có bệnh nền tim mạch hoặc hô hấp → phản ứng mạnh hơn với ô nhiễm.",
    risks: ["Đột quỵ và nhồi máu cơ tim", "Viêm phổi và suy hô hấp", "Suy giảm nhận thức"],
    tips:  ["Tránh ra ngoài giờ cao điểm", "Uống đủ nước", "Báo bác sĩ nếu có triệu chứng lạ"],
  },
  {
    icon: "🫁", label: "Bệnh hô hấp",
    color: "#ef4444", bg: "rgba(239,68,68,.1)",
    why: "Đường thở đã bị viêm hoặc nhạy cảm → PM2.5 dễ gây co thắt phế quản và cơn hen cấp tính.",
    risks: ["Cơn hen cấp tính", "Co thắt phế quản khi vận động", "Viêm phổi nặng hơn"],
    tips:  ["Mang inhaler theo khi ra ngoài", "Đo peak flow hằng ngày", "Dùng máy lọc không khí ban đêm"],
  },
  {
    icon: "🤰", label: "Thai phụ",
    color: "#ec4899", bg: "rgba(236,72,153,.1)",
    why: "PM2.5 có thể vượt qua nhau thai và ảnh hưởng trực tiếp đến thai nhi đang phát triển.",
    risks: ["Sinh non", "Trẻ nhẹ cân", "Dị tật phát triển thần kinh"],
    tips:  ["Tránh ra ngoài khi AQI >100", "Ưu tiên lọc không khí trong phòng ngủ", "Thảo luận với bác sĩ"],
  },
];

function useVisible(threshold = 0.15) {
  const ref   = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, vis } = useVisible();
  return (
    <div ref={ref} style={{
      opacity:    vis ? 1 : 0,
      transform:  vis ? "none" : "translateY(24px)",
      transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function ParticleVisual() {
  return (
    <div className="gd-particle-wrap">
      <div className="gd-particle-scene">
        <div className="gd-obj gd-hair">
          <div className="gd-obj__body" />
          <div className="gd-obj__label">Sợi tóc người<br/><strong>70 µm</strong></div>
        </div>
        <div className="gd-obj gd-sand">
          <div className="gd-obj__body" />
          <div className="gd-obj__label">Hạt cát mịn<br/><strong>90 µm</strong></div>
        </div>
        <div className="gd-obj gd-pm10">
          <div className="gd-obj__body" />
          <div className="gd-obj__label">PM10<br/><strong>10 µm</strong></div>
        </div>
        <div className="gd-obj gd-pm25">
          <div className="gd-obj__body" />
          <div className="gd-obj__label gd-obj__label--highlight">PM2.5<br/><strong>2.5 µm</strong></div>
        </div>
        <div className="gd-obj gd-virus">
          <div className="gd-obj__body" />
          <div className="gd-obj__label">Virus<br/><strong>0.1 µm</strong></div>
        </div>
      </div>
      <p className="gd-particle-caption">
        PM2.5 nhỏ hơn sợi tóc người <strong>28 lần</strong> — mắt thường không thể nhìn thấy
      </p>
    </div>
  );
}

function LungDiagram() {
  return (
    <div className="gd-lung">
      <svg viewBox="0 0 280 200" className="gd-lung__svg">
        <defs>
          <radialGradient id="lgA" cx="35%" cy="40%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity=".25"/>
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity=".0"/>
          </radialGradient>
          <radialGradient id="lgB" cx="65%" cy="40%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity=".25"/>
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity=".0"/>
          </radialGradient>
        </defs>
        {/* Trachea */}
        <rect x="128" y="10" width="24" height="40" rx="12"
          fill="none" stroke="rgba(59,130,246,.6)" strokeWidth="2"/>
        {/* Left lung */}
        <ellipse cx="85" cy="115" rx="72" ry="75"
          fill="url(#lgA)" stroke="rgba(59,130,246,.35)" strokeWidth="1.5"/>
        {/* Right lung */}
        <ellipse cx="195" cy="115" rx="72" ry="75"
          fill="url(#lgB)" stroke="rgba(59,130,246,.35)" strokeWidth="1.5"/>
        {/* Bronchi */}
        <path d="M140 50 Q110 70 85 90" fill="none" stroke="rgba(59,130,246,.5)" strokeWidth="2"/>
        <path d="M140 50 Q170 70 195 90" fill="none" stroke="rgba(59,130,246,.5)" strokeWidth="2"/>

        {[
          [65,110],[85,130],[105,120],[75,145],[95,155],
          [170,110],[190,130],[210,120],[180,145],[200,155],
        ].map(([cx,cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="10"
            fill="rgba(59,130,246,.08)" stroke="rgba(59,130,246,.25)" strokeWidth="1"/>
        ))}

        {[
          [72,112,"#ef4444"], [90,128,"#f97316"], [88,155,"#ef4444"],
          [182,112,"#ef4444"], [205,135,"#f97316"], [192,155,"#a855f7"],
        ].map(([cx,cy,color], i) => (
          <circle key={`pm-${i}`} cx={cx} cy={cy} r="3"
            fill={String(color)} opacity=".85"
            style={{ animation: `gdParticleFloat ${1.5 + i*0.3}s ease-in-out infinite alternate` }}/>
        ))}

        <text x="140" y="195" textAnchor="middle"
          fill="rgba(255,255,255,.3)" fontSize="10" fontFamily="system-ui">
          Phổi người — PM2.5 thâm nhập đến tận phế nang
        </text>
      </svg>
    </div>
  );
}

function AqiGauge({ aqi, color }: { aqi: number; color: string }) {
  const pct  = Math.min(100, (aqi / 400) * 100);
  const circ = 2 * Math.PI * 36;
  return (
    <svg viewBox="0 0 88 88" width="88" height="88" style={{ flexShrink: 0 }}>
      <circle cx="44" cy="44" r="36" fill="none"
        stroke="rgba(255,255,255,.07)" strokeWidth="8"/>
      <circle cx="44" cy="44" r="36" fill="none"
        stroke={color} strokeWidth="8" strokeLinecap="round"
        transform="rotate(-90 44 44)"
        strokeDasharray={`${(pct/100)*circ} ${circ}`}
        style={{ transition: "stroke-dasharray .8s ease" }}/>
      <text x="44" y="40" textAnchor="middle"
        fill={color} fontSize="16" fontWeight="900" fontFamily="ui-monospace">
        {aqi}
      </text>
      <text x="44" y="54" textAnchor="middle"
        fill="rgba(255,255,255,.35)" fontSize="7.5" fontFamily="system-ui">
        AQI
      </text>
    </svg>
  );
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("what");
  const [aqiDemo,       setAqiDemo]       = useState(75);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActiveSection(e.target.id);
      });
    }, { rootMargin: "-30% 0px -60% 0px" });

    Object.values(sectionRefs.current).forEach(el => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  function scrollTo(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const demoLevel = AQI_LEVELS.find(l => {
    const [min, max] = l.range.replace("+","–500").split("–").map(Number);
    return aqiDemo >= min && aqiDemo <= max;
  }) ?? AQI_LEVELS[0];

  return (
    <div className="gd-page">
      <nav className="gd-toc">
        <div className="gd-toc__title">Nội dung</div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`gd-toc__item ${activeSection === s.id ? "gd-toc__item--on" : ""}`}
            type="button"
            onClick={() => scrollTo(s.id)}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </nav>

      <div className="gd-content">

        <div className="gd-hero">
          <div className="gd-hero__bg" />
          <div className="gd-hero__badge">Hướng dẫn · AirSafeNet</div>
          <h1 className="gd-hero__title">
            PM2.5 &<br/>Chất lượng<br/>Không khí
          </h1>
          <p className="gd-hero__desc">
            Tất cả những gì bạn cần biết để bảo vệ sức khỏe của mình và gia đình
            trước ô nhiễm không khí tại TP. Hồ Chí Minh.
          </p>
          <div className="gd-hero__stats">
            <div className="gd-hero__stat">
              <strong>7 triệu</strong><span>ca tử vong/năm do ô nhiễm không khí toàn cầu</span>
            </div>
            <div className="gd-hero__stat">
              <strong>2.5 µm</strong><span>kích thước hạt bụi nguy hiểm nhất</span>
            </div>
            <div className="gd-hero__stat">
              <strong>15 µg/m³</strong><span>ngưỡng an toàn WHO 24h</span>
            </div>
          </div>
        </div>

        <section id="what" ref={el => { sectionRefs.current.what = el; }} className="gd-section">
          <Reveal>
            <div className="gd-section__header">
              <span className="gd-section__eyebrow">🔬 Khái niệm cơ bản</span>
              <h2>PM2.5 là gì?</h2>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="gd-card gd-card--featured">
              <div className="gd-card__content">
                <p className="gd-lead">
                  <strong>PM2.5</strong> là các hạt bụi mịn có đường kính nhỏ hơn hoặc bằng
                  <strong> 2.5 micromet</strong> (µm) — nhỏ hơn sợi tóc người 28 lần.
                </p>
                <p>
                  Chữ <strong>PM</strong> viết tắt của <em>Particulate Matter</em> (vật chất dạng hạt).
                  Con số <strong>2.5</strong> là giới hạn kích thước tính bằng micromet.
                  Đây là loại ô nhiễm nguy hiểm nhất vì chúng <strong>xuyên thẳng vào phổi</strong> và
                  thậm chí vào máu.
                </p>
              </div>
              <ParticleVisual />
            </div>
          </Reveal>

          <div className="gd-grid-2">
            {[
              {
                icon: "🏭", title: "Nguồn gốc chính",
                items: ["Khói xe máy, ô tô, xe tải", "Đốt rác và phụ phẩm nông nghiệp", "Khói nhà máy, công trường", "Bếp than, bếp củi", "Phản ứng hóa học trong không khí (ozone, SO₂, NO₂)"],
              },
              {
                icon: "🫁", title: "Tại sao nguy hiểm",
                items: ["Xuyên qua lông mũi và màng lọc tự nhiên", "Thâm nhập vào phế nang (túi khí cuối phổi)", "Vào máu qua thành phế nang mỏng", "Gây viêm toàn thân, ảnh hưởng tim và não", "Tích lũy lâu dài — ảnh hưởng nhiều năm sau"],
              },
            ].map((card, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="gd-card">
                  <div className="gd-card__icon">{card.icon}</div>
                  <h3>{card.title}</h3>
                  <ul className="gd-list">
                    {card.items.map((item, j) => <li key={j}>{item}</li>)}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="gd-highlight-box">
              <div className="gd-highlight-box__icon">🧬</div>
              <div>
                <strong>Con đường vào cơ thể:</strong>
                <div className="gd-pathway">
                  {["Hít vào", "Qua mũi & miệng", "Xuống khí quản", "Vào phổi", "Đến phế nang", "Vào máu"].map((step, i) => (
                    <span key={i} className="gd-pathway__step">
                      {step} {i < 5 && <span className="gd-pathway__arrow">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="aqi" ref={el => { sectionRefs.current.aqi = el; }} className="gd-section">
          <Reveal>
            <div className="gd-section__header">
              <span className="gd-section__eyebrow">📊 Cách đọc chỉ số</span>
              <h2>Chỉ số AQI là gì?</h2>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="gd-card">
              <p className="gd-lead">
                <strong>AQI (Air Quality Index)</strong> — Chỉ số Chất lượng Không khí — là thang điểm từ
                <strong> 0 đến 500+</strong> giúp chuyển đổi các con số kỹ thuật phức tạp thành thông tin
                dễ hiểu cho mọi người.
              </p>
              <p>
                Điểm AQI càng cao → không khí càng ô nhiễm → nguy cơ sức khỏe càng lớn.
                Tại Việt Nam và Mỹ, thang AQI dùng ngưỡng EPA (Cơ quan Bảo vệ Môi trường Hoa Kỳ).
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="gd-card gd-aqi-demo">
              <div className="gd-aqi-demo__header">
                <h3>🎮 Thử nghiệm chỉ số AQI</h3>
                <p>Kéo thanh trượt để xem ý nghĩa của từng mức AQI</p>
              </div>
              <div className="gd-aqi-demo__body">
                <AqiGauge aqi={aqiDemo} color={demoLevel.color} />
                <div className="gd-aqi-demo__info">
                  <div className="gd-aqi-demo__label" style={{ color: demoLevel.color }}>
                    {demoLevel.icon} AQI {aqiDemo} — {demoLevel.label}
                  </div>
                  <p>{demoLevel.desc}</p>
                  <div className="gd-aqi-demo__advice" style={{ borderColor: demoLevel.color + "40", background: demoLevel.bg }}>
                    💡 {demoLevel.advice}
                  </div>
                </div>
              </div>
              <input
                type="range" min="0" max="400" step="5"
                value={aqiDemo}
                onChange={e => setAqiDemo(Number(e.target.value))}
                className="gd-slider"
                style={{ "--slider-color": demoLevel.color } as React.CSSProperties}
              />
              <div className="gd-slider-labels">
                <span style={{ color: "#22c55e" }}>0 Tốt</span>
                <span style={{ color: "#eab308" }}>100</span>
                <span style={{ color: "#f97316" }}>150</span>
                <span style={{ color: "#ef4444" }}>200</span>
                <span style={{ color: "#a855f7" }}>300+</span>
              </div>
            </div>
          </Reveal>

          <div className="gd-aqi-levels">
            {AQI_LEVELS.map((level, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="gd-aqi-row" style={{ borderColor: level.color + "30", background: level.bg }}>
                  <div className="gd-aqi-row__range" style={{ color: level.color }}>
                    <span className="gd-aqi-row__emoji">{level.icon}</span>
                    <div>
                      <strong>{level.range}</strong>
                      <span>{level.label}</span>
                    </div>
                  </div>
                  <div className="gd-aqi-row__bar-track">
                    <div className="gd-aqi-row__bar" style={{
                      width: `${Math.min(100, parseInt(level.range) / 3.5)}%`,
                      background: level.color,
                    }}/>
                  </div>
                  <div className="gd-aqi-row__desc">{level.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div className="gd-highlight-box gd-highlight-box--blue">
              <div className="gd-highlight-box__icon">📏</div>
              <div>
                <strong>WHO vs EPA:</strong> Ngưỡng WHO nghiêm ngặt hơn. AQI 60 (EPA = "Tốt") đã vượt
                ngưỡng PM2.5 24h của WHO (15 µg/m³). AirSafeNet hiển thị cả hai để bạn có cái nhìn toàn diện.
              </div>
            </div>
          </Reveal>
        </section>

        <section id="health" ref={el => { sectionRefs.current.health = el; }} className="gd-section">
          <Reveal>
            <div className="gd-section__header">
              <span className="gd-section__eyebrow">🫁 Khoa học</span>
              <h2>Ảnh hưởng đến sức khỏe</h2>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="gd-card gd-card--featured">
              <div className="gd-card__content">
                <p className="gd-lead">
                  PM2.5 không chỉ gây ho và khó thở. Nghiên cứu khoa học cho thấy ô nhiễm
                  không khí ảnh hưởng đến <strong>gần như mọi cơ quan trong cơ thể.</strong>
                </p>
              </div>
              <LungDiagram />
            </div>
          </Reveal>

          <div className="gd-timeline">
            {[
              {
                time: "Ngay lập tức (phút)", color: "#eab308",
                effects: ["Ho, kích ứng cổ họng", "Khó thở, tức ngực", "Kích ứng mắt, mũi", "Buồn nôn, đau đầu"],
              },
              {
                time: "Ngắn hạn (vài ngày)", color: "#f97316",
                effects: ["Cơn hen suyễn cấp tính", "Viêm phổi nặng hơn", "Tăng nhịp tim, huyết áp", "Giảm khả năng vận động"],
              },
              {
                time: "Dài hạn (nhiều năm)", color: "#ef4444",
                effects: ["Bệnh phổi tắc nghẽn mãn tính (COPD)", "Ung thư phổi", "Bệnh tim mạch vành", "Đột quỵ não", "Tiểu đường type 2", "Suy giảm nhận thức, Alzheimer"],
              },
            ].map((phase, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="gd-timeline__item">
                  <div className="gd-timeline__dot" style={{ background: phase.color }} />
                  <div className="gd-timeline__card">
                    <div className="gd-timeline__time" style={{ color: phase.color }}>{phase.time}</div>
                    <ul className="gd-list">
                      {phase.effects.map((e, j) => <li key={j}>{e}</li>)}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div className="gd-stat-cards">
              {[
                { num:"99%",   label:"dân số thế giới hít thở không khí vượt ngưỡng WHO", color:"#ef4444" },
                { num:"6.7tr", label:"ca tử vong sớm mỗi năm do ô nhiễm không khí ngoài trời", color:"#f97316" },
                { num:"17%",   label:"các ca tử vong do đột quỵ liên quan đến ô nhiễm không khí", color:"#a855f7" },
              ].map((s, i) => (
                <div key={i} className="gd-stat-card" style={{ borderColor: s.color + "35" }}>
                  <div className="gd-stat-card__num" style={{ color: s.color }}>{s.num}</div>
                  <div className="gd-stat-card__label">{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section id="groups" ref={el => { sectionRefs.current.groups = el; }} className="gd-section">
          <Reveal>
            <div className="gd-section__header">
              <span className="gd-section__eyebrow">👨‍👩‍👧‍👦 Đối tượng đặc biệt</span>
              <h2>Nhóm dễ bị tổn thương</h2>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <p className="gd-section__intro">
              Trong khi PM2.5 có hại cho tất cả mọi người, một số nhóm dân số chịu tác động
              nghiêm trọng hơn nhiều. Nếu bạn hoặc người thân thuộc nhóm này, cần đặc biệt chú ý.
            </p>
          </Reveal>

          <div className="gd-groups">
            {GROUPS.map((g, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="gd-group-card" style={{ borderColor: g.color + "35", background: g.bg }}>
                  <div className="gd-group-card__header">
                    <span className="gd-group-card__icon">{g.icon}</span>
                    <h3 style={{ color: g.color }}>{g.label}</h3>
                  </div>
                  <p className="gd-group-card__why">{g.why}</p>
                  <div className="gd-group-card__sections">
                    <div>
                      <div className="gd-group-card__section-title" style={{ color: g.color }}>
                        ⚠️ Rủi ro đặc trưng
                      </div>
                      <ul className="gd-list gd-list--compact">
                        {g.risks.map((r, j) => <li key={j}>{r}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="gd-group-card__section-title" style={{ color: g.color }}>
                        ✅ Khuyến nghị
                      </div>
                      <ul className="gd-list gd-list--compact">
                        {g.tips.map((t, j) => <li key={j}>{t}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="protect" ref={el => { sectionRefs.current.protect = el; }} className="gd-section">
          <Reveal>
            <div className="gd-section__header">
              <span className="gd-section__eyebrow">🛡️ Hành động</span>
              <h2>Cách tự bảo vệ</h2>
            </div>
          </Reveal>

          <div className="gd-protect-grid">
            {[
              {
                icon:"😷", title:"Chọn khẩu trang đúng", color:"#3b82f6",
                steps:[
                  { label:"Vải thông thường", note:"❌ Không đủ — chỉ lọc 10-30%" },
                  { label:"Khẩu trang y tế (surgical)", note:"⚠️ Lọc ~60%, không kín" },
                  { label:"KF94 (Hàn Quốc)", note:"✅ Lọc ≥94%, thoải mái" },
                  { label:"N95 / KN95", note:"✅ Lọc ≥95%, tiêu chuẩn y tế" },
                  { label:"N99 / P100", note:"✅✅ Lọc ≥99%, dùng khi AQI cực cao" },
                ],
              },
              {
                icon:"🏠", title:"Cải thiện không khí trong nhà", color:"#22c55e",
                steps:[
                  { label:"Máy lọc không khí HEPA", note:"Hiệu quả nhất — lọc 99.97%" },
                  { label:"Đóng cửa sổ khi AQI cao", note:"Giảm 40-60% PM2.5 từ ngoài" },
                  { label:"Tránh đốt nến, hương", note:"Tạo PM2.5 trong nhà" },
                  { label:"Không hút thuốc trong nhà", note:"Nguồn PM2.5 lớn nhất trong nhà" },
                  { label:"Lọc máy điều hòa thường xuyên", note:"Vệ sinh filter mỗi tháng" },
                ],
              },
              {
                icon:"📱", title:"Thói quen thông minh", color:"#f59e0b",
                steps:[
                  { label:"Kiểm tra AQI trước khi ra ngoài", note:"Dùng AirSafeNet mỗi sáng" },
                  { label:"Tránh giờ cao điểm giao thông", note:"7-9h và 17-19h AQI thường cao nhất" },
                  { label:"Chọn đường ít xe, nhiều cây xanh", note:"Giảm phơi nhiễm khi di chuyển" },
                  { label:"Hạn chế hoạt động mạnh ngoài trời", note:"Thở nhanh → hít nhiều hơn" },
                  { label:"Theo dõi pattern theo mùa", note:"Tháng 3-5 thường ô nhiễm hơn" },
                ],
              },
            ].map((section, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="gd-protect-card" style={{ borderColor: section.color + "30" }}>
                  <div className="gd-protect-card__header">
                    <span style={{ fontSize: 28 }}>{section.icon}</span>
                    <h3 style={{ color: section.color }}>{section.title}</h3>
                  </div>
                  <div className="gd-protect-steps">
                    {section.steps.map((step, j) => (
                      <div key={j} className="gd-protect-step">
                        <div className="gd-protect-step__num" style={{ background: section.color }}>{j+1}</div>
                        <div>
                          <strong>{step.label}</strong>
                          <span>{step.note}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="myth" ref={el => { sectionRefs.current.myth = el; }} className="gd-section">
          <Reveal>
            <div className="gd-section__header">
              <span className="gd-section__eyebrow">💡 Kiến thức đúng</span>
              <h2>Những hiểu lầm phổ biến</h2>
            </div>
          </Reveal>

          <div className="gd-myths">
            {MYTHS.map((m, i) => (
              <Reveal key={i} delay={i * 70}>
                <div className="gd-myth-card">
                  <div className="gd-myth-card__myth">
                    <span className="gd-myth-card__x">✗</span>
                    <div>
                      <div className="gd-myth-card__label">Hiểu lầm</div>
                      <p>"{m.myth}"</p>
                    </div>
                  </div>
                  <div className="gd-myth-card__fact">
                    <span className="gd-myth-card__check">✓</span>
                    <div>
                      <div className="gd-myth-card__label">Sự thật</div>
                      <p>{m.fact}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <div className="gd-cta">
            <div className="gd-cta__bg" />
            <div className="gd-cta__content">
              <h2>Bắt đầu theo dõi chất lượng không khí</h2>
              <p>
                AirSafeNet cung cấp dự báo PM2.5 theo giờ, cảnh báo cá nhân hóa theo
                nhóm sức khỏe, và lịch hoạt động thông minh — giúp bạn sống lành mạnh
                ngay cả trong ngày ô nhiễm.
              </p>
              <div className="gd-cta__features">
                {["Dự báo 7 ngày", "Cảnh báo realtime", "Lịch hoạt động AI", "Dose Budget WHO"].map(f => (
                  <span key={f} className="gd-cta__feature">✓ {f}</span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}