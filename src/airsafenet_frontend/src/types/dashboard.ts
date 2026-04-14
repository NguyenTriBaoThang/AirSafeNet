export type DashboardSummaryResponse = {
  currentPm25: number;
  currentAqi: number;
  currentRisk: string;
  currentRecommendation: string;

  maxPm25Next24h: number;
  maxAqiNext24h: number;
  peakRiskNext24h: string;
  peakTime?: string | null;

  userGroup: string;
  preferredLocation: string;
  generatedAt: string;

  warningCount: number;
  dangerCount: number;
};

export type DashboardChartPointResponse = {
  time: string;
  pm25: number;
  aqi: number;
  risk: string;
  recommendation: string;
  colorKey: string;
};

export type DashboardChartResponse = {
  userGroup: string;
  generatedAt: string;
  hours: number;
  points: DashboardChartPointResponse[];
};

export type DashboardFullResponse = {
  summary: DashboardSummaryResponse;
  chart: DashboardChartResponse;
};

export type DashboardMode = "forecast" | "history";
export type DashboardDays = 1 | 3 | 7;