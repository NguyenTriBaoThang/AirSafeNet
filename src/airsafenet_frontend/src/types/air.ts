export type AirPredictResponse = {
  pm25: number;
  aqi: number;
  risk: string;
  recommendation: string;
  userGroup: string;
  generatedAt: string;
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
  pm25HistoryImpact: number;

  windExplain: string;
  humidityExplain: string;
  temperatureExplain: string;
  pressureExplain: string;
  uvExplain: string;
  pm25HistoryExplain: string;

  trendDirection: "increasing" | "decreasing" | "stable";
  trendLabel: string;
  overallSummary: string;
  topFactor: string;

  generatedAt: string;
};
