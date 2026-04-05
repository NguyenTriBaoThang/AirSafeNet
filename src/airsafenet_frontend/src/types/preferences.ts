export type UserPreferencesResponse = {
  userId: number;
  userGroup: string;
  preferredLocation: string;
  notifyEnabled: boolean;
  updatedAt: string;
};

export type UpdateUserPreferencesRequest = {
  userGroup: string;
  preferredLocation: string;
  notifyEnabled: boolean;
};