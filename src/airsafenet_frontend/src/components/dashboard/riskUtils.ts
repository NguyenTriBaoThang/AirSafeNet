export function getRiskLabel(risk: string): string {
  switch (risk) {
    case "GOOD":
      return "Tốt";
    case "MODERATE":
      return "Trung bình";
    case "UNHEALTHY_SENSITIVE":
      return "Ảnh hưởng nhóm nhạy cảm";
    case "UNHEALTHY":
      return "Có hại";
    case "VERY_UNHEALTHY":
      return "Rất có hại";
    case "HAZARDOUS":
      return "Nguy hiểm";
    default:
      return risk;
  }
}

export function getRiskClass(risk: string): string {
  switch (risk) {
    case "GOOD":
      return "risk-good";
    case "MODERATE":
      return "risk-moderate";
    case "UNHEALTHY_SENSITIVE":
      return "risk-sensitive";
    case "UNHEALTHY":
      return "risk-unhealthy";
    case "VERY_UNHEALTHY":
      return "risk-very-unhealthy";
    case "HAZARDOUS":
      return "risk-hazardous";
    default:
      return "risk-default";
  }
}