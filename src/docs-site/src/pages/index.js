import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

// ── Feature data ───────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🤖',
    title: 'Ensemble AI Forecast',
    desc: 'Random Forest + ARIMA + XGBoost với trọng số động. Dự báo PM2.5 chính xác trước 7 ngày theo giờ.',
    color: 'blue',
  },
  {
    icon: '🚨',
    title: 'Anomaly Detection + XAI',
    desc: 'Phát hiện spike PM2.5 theo thời gian thực. Giải thích AI (XAI) chỉ ra nguyên nhân từng yếu tố.',
    color: 'orange',
  },
  {
    icon: '🗓️',
    title: 'Smart Activity Planner',
    desc: 'Lên lịch hoạt động tối ưu hóa theo AQI. WHO Dose Budget, Golden Hour Picker, Weekly Planner.',
    color: 'teal',
  },
  {
    icon: '🏥',
    title: 'Personalized Health Groups',
    desc: '5 nhóm sức khỏe: Phổ thông, Trẻ em, Người cao tuổi, Bệnh hô hấp, Thai phụ. Borg Scale, Mask Recommendation.',
    color: 'green',
  },
  {
    icon: '🗺️',
    title: 'District Heatmap',
    desc: 'Bản đồ nhiệt SVG 22 quận/huyện TP.HCM. Cập nhật song song mỗi 60 phút.',
    color: 'blue',
  },
  {
    icon: '🤖',
    title: 'AI Assistant',
    desc: 'Trợ lý chat Gemini 2.5 Flash trả lời mọi câu hỏi về chất lượng không khí theo dữ liệu thực tế.',
    color: 'teal',
  },
];

const STATS = [
  { value: '7M+',   label: 'Người dân TP.HCM được hưởng lợi' },
  { value: '22',    label: 'Quận/huyện có dữ liệu riêng' },
  { value: '7 ngày', label: 'Dự báo PM2.5 theo giờ' },
  { value: '5',     label: 'Nhóm sức khỏe được cá nhân hóa' },
];

const TECH = [
  { name: 'React 18',      icon: 'icon/react.svg' },
  { name: '.NET 8',        icon: 'icon/dotnet.svg' },
  { name: 'FastAPI',       icon: 'icon/fastapi.svg' },
  { name: 'PostgreSQL',    icon: 'icon/postgres.svg' },
  { name: 'Docker',        icon: 'icon/docker.svg' },
  { name: 'Python 3.11',   icon: 'icon/python.svg' },
];

// ── Hero ───────────────────────────────────────────────────────
function Hero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className="badge-row">
          <span className="badge-chip badge-chip--blue">AI-Powered</span>
          <span className="badge-chip badge-chip--teal">Real-time Anomaly</span>
          <span className="badge-chip badge-chip--green">WHO Dose Budget</span>
          <span className="badge-chip badge-chip--orange">5 Health Groups</span>
        </div>
        <h1 className="hero__title">
          🌍 {siteConfig.title}
        </h1>
        <p className="hero__subtitle">
          Hệ thống cá nhân hoá cảnh báo sớm và hỗ trợ ra quyết định về chất lượng không khí đô thị tại TP. Hồ Chí Minh
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Developed by KTT Team · HUTECH · Website & AI Innovation Contest 2026
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started">
            Get Started →
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/NguyenTriBaoThang/AirSafeNet"
            style={{ marginLeft: '1rem' }}>
            ⭐ GitHub
          </Link>
        </div>

        {/* Stats */}
        <div className="stats-row" style={{ marginTop: '3rem' }}>
          {STATS.map(({ value, label }) => (
            <div key={label} className="stat-item">
              <div className="stat-value">{value}</div>
              <div className="stat-label" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

// ── Features grid ──────────────────────────────────────────────
function Features() {
  return (
    <section className="features-section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          Why AirSafeNet?
        </h2>
        <p style={{ textAlign: 'center', opacity: 0.65, marginBottom: '3rem', maxWidth: 600, margin: '0 auto 3rem' }}>
          Không chỉ hiển thị AQI — AirSafeNet biến dữ liệu môi trường thành hành động bảo vệ sức khỏe cụ thể cho từng người dùng.
        </p>
        <div className="row">
          {FEATURES.map(({ icon, title, desc, color }) => (
            <div key={title} className="col col--4" style={{ marginBottom: '1.5rem' }}>
              <div className="feature-card">
                <span className="feature-icon">{icon}</span>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ opacity: 0.7, fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── What is AirSafeNet ─────────────────────────────────────────
function About() {
  return (
    <section style={{ padding: '4rem 0', background: 'var(--ifm-background-surface-color)' }}>
      <div className="container">
        <div className="row" style={{ alignItems: 'center', gap: '2rem' }}>
          <div className="col col--6">
            <h2>AirSafeNet là gì?</h2>
            <p style={{ opacity: 0.75, lineHeight: 1.8 }}>
              AirSafeNet là nền tảng AI toàn diện 3 tầng — <strong>AI Server</strong> (FastAPI Python), <strong>Backend</strong> (ASP.NET Core 8) và <strong>Web Dashboard</strong> (React 18) — để giám sát, dự báo và cảnh báo sớm chất lượng không khí PM2.5 tại TP. Hồ Chí Minh.
            </p>
            <p style={{ opacity: 0.75, lineHeight: 1.8 }}>
              Mô hình Ensemble AI được nhóm <strong>tự xây dựng và huấn luyện</strong> trên dữ liệu thực tế — không phụ thuộc dịch vụ AI thương mại cho phần dự báo lõi.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Link className="button button--primary" to="/docs/architecture">
                Xem kiến trúc
              </Link>
              <Link className="button button--outline button--primary" to="/docs/ai-model">
                Mô hình AI
              </Link>
            </div>
          </div>
          <div className="col col--6">
            <div className="arch-box" style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 2 }}>
              <div style={{ color: 'var(--ifm-color-primary)', fontWeight: 600 }}>External APIs</div>
              <div style={{ opacity: 0.5 }}>Open-Meteo + OpenAQ + Telegram</div>
              <div style={{ opacity: 0.3, marginLeft: '1rem' }}>↓</div>
              <div style={{ color: '#a855f7', fontWeight: 600 }}>AI Server — FastAPI :8000</div>
              <div style={{ opacity: 0.5 }}>Ensemble Model · Cache 60min · Anomaly</div>
              <div style={{ opacity: 0.3, marginLeft: '1rem' }}>↓  REST/JSON</div>
              <div style={{ color: 'var(--ifm-color-primary)', fontWeight: 600 }}>Backend — ASP.NET Core :7276</div>
              <div style={{ opacity: 0.5 }}>JWT Auth · Activity · Notifications · Chat AI</div>
              <div style={{ opacity: 0.3, marginLeft: '1rem' }}>↓  REST/JWT</div>
              <div style={{ color: '#22c55e', fontWeight: 600 }}>Frontend — React 18 :5173</div>
              <div style={{ opacity: 0.5 }}>Dashboard · Activity · Heatmap · Assistant</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Tech stack ─────────────────────────────────────────────────
function TechStack() {
  return (
    <section style={{ padding: '3rem 0' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '2rem' }}>Built With</h2>
        <div className="tech-grid">
          {TECH.map(({ name, icon }) => (
            <div key={name} className="tech-item">
              <img src={icon} alt={name} onError={e => { e.target.style.display='none'; }} />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ padding: '4rem 2rem' }}>
      <div className="container">
        <div className="cta-section">
          <h2 style={{ marginBottom: '1rem' }}>⭐ Bắt đầu với AirSafeNet</h2>
          <p style={{ opacity: 0.7, marginBottom: '2rem', maxWidth: 500, margin: '0 auto 2rem' }}>
            Triển khai hoàn toàn bằng Docker Compose. Chạy trong 5 phút trên bất kỳ máy chủ Linux nào.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="button button--primary button--lg" to="/docs/getting-started">
              📖 Documentation
            </Link>
            <Link className="button button--secondary button--lg" href="https://github.com/NguyenTriBaoThang/AirSafeNet">
              ⭐ Star on GitHub
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — AI Air Quality`}
      description="AI-powered Air Quality Monitoring and Personalized Early Warning System for Ho Chi Minh City">
      <Hero />
      <main>
        <Features />
        <About />
        <TechStack />
        <CTA />
      </main>
    </Layout>
  );
}
