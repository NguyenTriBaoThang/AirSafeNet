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
export type ForecastAccuracyPointResponse = {
  targetTime: string;
  forecastIssuedAt: string;
  leadHours: number;
  predictedPm25: number;
  actualPm25: number;
  pm25Error: number;
  predictedAqi: number;
  actualAqi: number;
  aqiError: number;
  withinTolerance: boolean;
};

export type ForecastAccuracyResponse = {
  hasEnoughData: boolean;
  userGroup: string;
  generatedAt: string;
  comparisonStart?: string | null;
  comparisonEnd?: string | null;
  matchedHours: number;
  snapshotCount: number;
  accuracyScore: number;
  pm25Mae: number;
  pm25Rmse: number;
  aqiMae: number;
  withinTolerancePct: number;
  biasPm25: number;
  reliabilityLabel: string;
  reliabilityTone: "excellent" | "good" | "watch" | "low" | "collecting";
  trend: "better" | "worse" | "stable";
  summary: string;
  method: string;
  points: ForecastAccuracyPointResponse[];
};
