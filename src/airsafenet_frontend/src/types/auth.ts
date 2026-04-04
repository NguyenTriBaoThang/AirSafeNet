export type AuthResponse = {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: string;
};

export type RegisterRequest = {
  fullName: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type MeResponse = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
};