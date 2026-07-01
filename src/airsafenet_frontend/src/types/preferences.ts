export type UserPreferencesResponse = {
  userId: number;
  userGroup: string;
  preferredLocation: string;
  notifyEnabled: boolean;
  notifyChannel: string;
  telegramChatId?: string | null;
  notifyEmail?: string | null;
  notifyThreshold: number;
  lastAlertSentAt?: string | null;
  updatedAt: string;
};

export type UpdateUserPreferencesRequest = {
  userGroup: string;
  preferredLocation: string;
  notifyEnabled: boolean;
  notifyChannel: string;
  telegramChatId?: string;
  notifyEmail?: string;
  notifyThreshold: number;
};

export type FamilyProfileResponse = {
  id: number;
  displayName: string;
  relationship: string;
  userGroup: string;
  preferredLocation: string;
  notifyEnabled: boolean;
  notifyThreshold: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertFamilyProfileRequest = {
  displayName: string;
  relationship: string;
  userGroup: string;
  preferredLocation: string;
  notifyEnabled: boolean;
  notifyThreshold: number;
  notes?: string | null;
};

export type FamilyProfileRiskResponse = {
  profile: FamilyProfileResponse;
  currentPm25: number;
  currentAqi: number;
  currentRisk: string;
  currentRecommendation: string;
  maxPm25Next24h: number;
  maxAqiNext24h: number;
  peakRiskNext24h: string;
  peakTime?: string | null;
  warningCount: number;
  dangerCount: number;
  generatedAt: string;
};