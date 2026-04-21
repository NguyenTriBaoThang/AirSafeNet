import { useState } from "react";

type Props = {
  currentAqi: number;
  currentPm25: number;
  currentRisk: string;
  currentRecommendation: string;
  maxAqi: number;
  warningCount: number;
  dangerCount: number;
  generatedAt: string;
  userGroup: string;
};

const RISK_LABEL: Record<string, string> = {
  GOOD:                "Tốt",
  MODERATE:            "Trung bình",
  UNHEALTHY_SENSITIVE: "Nhóm nhạy cảm",
  UNHEALTHY:           "Không tốt",
  VERY_UNHEALTHY:      "Rất không tốt",
  HAZARDOUS:           "Nguy hiểm",
};

const GROUP_LABEL: Record<string, string> = {
  general:     "Người bình thường",
  children:    "Trẻ em",
  elderly:     "Người cao tuổi",
  respiratory: "Người có bệnh hô hấp",
  normal:      "Người bình thường",
};

export default function ExportPdfButton(props: Props) {
  const [loading, setLoading] = useState(false);

  function handleExport() {
    setLoading(true);

    const {
      currentAqi, currentPm25, currentRisk, currentRecommendation,
      maxAqi, warningCount, dangerCount, generatedAt, userGroup,
    } = props;

    const riskLabel = RISK_LABEL[currentRisk] ?? currentRisk;
    const groupLabel = GROUP_LABEL[userGroup] ?? userGroup;
    const time = new Date(generatedAt).toLocaleString("vi-VN");
    const now  = new Date().toLocaleString("vi-VN");

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Báo cáo AirSafeNet</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", serif; font-size: 13pt; color: #1a1a1a; padding: 40px; }
  .header { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 20px; margin-bottom: 24px; }
  .header h1 { font-size: 20pt; color: #1a56db; margin-bottom: 6px; }
  .header p  { font-size: 11pt; color: #666; }
  .section   { margin-bottom: 24px; }
  .section h2 { font-size: 13pt; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; color: #1a56db; }
  table { width: 100%; border-collapse: collapse; font-size: 12pt; }
  th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
  th { background: #e8f0fe; font-weight: bold; }
  .value-big { font-size: 28pt; font-weight: bold; color: #1a56db; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11pt; font-weight: bold; }
  .badge-good { background: #dcfce7; color: #166534; }
  .badge-moderate { background: #fef9c3; color: #854d0e; }
  .badge-sensitive { background: #ffedd5; color: #9a3412; }
  .badge-unhealthy { background: #fee2e2; color: #991b1b; }
  .badge-very { background: #ede9fe; color: #5b21b6; }
  .badge-hazardous { background: #fef2f2; color: #7f1d1d; }
  .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 10pt; color: #999; text-align: center; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>BÁO CÁO CHẤT LƯỢNG KHÔNG KHÍ</h1>
  <p>AirSafeNet — AI Air Quality Platform</p>
  <p>TP. Hồ Chí Minh · Xuất ngày ${now}</p>
</div>

<div class="section">
  <h2>1. Tình trạng hiện tại</h2>
  <table>
    <tr><th>Chỉ số</th><th>Giá trị</th><th>Đánh giá</th></tr>
    <tr>
      <td>AQI (Air Quality Index)</td>
      <td><span class="value-big">${currentAqi}</span></td>
      <td>${riskLabel}</td>
    </tr>
    <tr>
      <td>PM2.5</td>
      <td><strong>${currentPm25.toFixed(1)} µg/m³</strong></td>
      <td>${currentPm25 <= 12 ? "Tốt (≤12)" : currentPm25 <= 35 ? "Trung bình" : "Cao"}</td>
    </tr>
    <tr>
      <td>Nhóm người dùng</td>
      <td colspan="2">${groupLabel}</td>
    </tr>
    <tr>
      <td>Cập nhật lúc</td>
      <td colspan="2">${time}</td>
    </tr>
  </table>
</div>

<div class="section">
  <h2>2. Khuyến nghị sức khỏe</h2>
  <p style="padding: 12px; background: #f0f4ff; border-left: 4px solid #1a56db; border-radius: 4px;">
    ${currentRecommendation}
  </p>
</div>

<div class="section">
  <h2>3. Thống kê kỳ dự báo</h2>
  <table>
    <tr><th>Chỉ số</th><th>Giá trị</th></tr>
    <tr><td>AQI cao nhất dự báo</td><td><strong>${maxAqi}</strong></td></tr>
    <tr><td>Số giờ cảnh báo (Warning)</td><td>${warningCount} giờ</td></tr>
    <tr><td>Số giờ nguy hiểm (Danger)</td><td>${dangerCount} giờ</td></tr>
  </table>
</div>

<div class="section">
  <h2>4. Tiêu chuẩn tham chiếu</h2>
  <table>
    <tr><th>Mức AQI</th><th>Phân loại</th><th>PM2.5 (µg/m³)</th></tr>
    <tr><td>0 – 50</td><td>Tốt</td><td>0 – 12</td></tr>
    <tr><td>51 – 100</td><td>Trung bình</td><td>12.1 – 35.4</td></tr>
    <tr><td>101 – 150</td><td>Nhóm nhạy cảm</td><td>35.5 – 55.4</td></tr>
    <tr><td>151 – 200</td><td>Không tốt</td><td>55.5 – 150.4</td></tr>
    <tr><td>201 – 300</td><td>Rất không tốt</td><td>150.5 – 250.4</td></tr>
    <tr><td>301+</td><td>Nguy hiểm</td><td>250.5+</td></tr>
  </table>
  <p style="font-size:10pt; color:#888; margin-top:8px;">Nguồn: US EPA AQI Standards & WHO Air Quality Guidelines 2021</p>
</div>

<div class="footer">
  Báo cáo được tạo tự động bởi AirSafeNet · HUTECH · Khoa Công nghệ Thông tin<br/>
  Dữ liệu từ Open-Meteo API · Mô hình AI: Random Forest (Accuracy 85.2%, MAE 4.2 µg/m³)
</div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { setLoading(false); return; }

    win.document.write(html);
    win.document.close();

    win.onload = () => {
      setTimeout(() => {
        win.print();
        setLoading(false);
      }, 400);
    };
  }

  return (
    <button
      className="btn btn-secondary export-pdf-btn"
      onClick={handleExport}
      disabled={loading}
      type="button"
    >
      {loading ? "Đang tạo PDF..." : "📄 Xuất PDF"}
    </button>
  );
}