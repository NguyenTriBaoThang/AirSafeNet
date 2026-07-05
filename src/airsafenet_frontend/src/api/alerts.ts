import { http } from "./http";

export type ContextualAlertItem = {
  id: string;
  severity: "info" | "watch" | "warning" | "critical" | string;
  category: string;
  title: string;
  reason: string;
  recommendedAction: string;
  trigger: string;
  triggerLabel: string;
  targetTime?: string | null;
  recommendedTime?: string | null;
  aqi: number;
  pm25: number;
  confidence: number;
  dataLabel: string;
  evidence: string[];
};

export type ContextualAlertResponse = {
  generatedAt: string;
  userGroup: string;
  dataLabel: string;
  primarySource: string;
  sourceConfidence: number;
  isFallback: boolean;
  statusMessage: string;
  alerts: ContextualAlertItem[];
};

export async function getContextualAlertsApi() {
  return http<ContextualAlertResponse>("/api/alert/contextual", {
    method: "GET",
    auth: true,
  });
}
