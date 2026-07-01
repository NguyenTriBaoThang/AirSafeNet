export type AirEnsembleMeta = {
  method: "weighted_average" | "main_only";
  main_pm25: number;
  arima_pm25: number | null;
  xgb_pm25: number | null;
  weights: { main: number; arima: number; xgb: number };
  confidence: number;
  uncertainty_band: number;
  agreement: "high" | "medium" | "low" | "unknown";
  model_std: number;
  arima_available: boolean;
  xgb_available: boolean;
};
export type AirPredictResponse = {
  pm25: number;
  aqi: number;
  risk: string;
  recommendation: string;
  userGroup: string;
  generatedAt: string;
  ensemble?: AirEnsembleMeta | null;
};

export type AirForecastItemResponse = {
  time: string;
  pm25: number;
  aqi: number;
  risk: string;
  recommendation: string;
  userGroup: string;
};

export type AirForecastResponse = {
  userGroup: string;
  generatedAt: string;
  hours: number;
  forecast: AirForecastItemResponse[];
};

export type AiExplainResponse = {
  predPm25: number;
  predAqi: number;
  aqiCategory: string;

  windSpeed: number;
  windDirection: number;     
  humidity: number;
  temperature: number;
  pressure: number;         
  uvIndex: number;
  cloudCover: number;
  observedPm25: number;

  windImpact: number;
  humidityImpact: number;
  temperatureImpact: number;
  pressureImpact: number;
  uvImpact: number;
  cloudImpact: number;
  pm25HistoryImpact: number;

  windExplain: string;
  humidityExplain: string;
  temperatureExplain: string;
  pressureExplain: string;
  uvExplain: string;
  cloudExplain: string;
  pm25HistoryExplain: string;

  trendDirection: "increasing" | "decreasing" | "stable";
  trendLabel: string;
  overallSummary: string;
  topFactor: string;

  weatherSource: string;
  weatherObservedAt: string;
  generatedAt: string;
};
