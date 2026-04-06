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