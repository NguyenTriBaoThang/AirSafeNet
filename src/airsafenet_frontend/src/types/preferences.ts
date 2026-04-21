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
