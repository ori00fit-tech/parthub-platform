// ============================
// Auth Types
// ============================

export type UserRole = "buyer" | "seller" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  is_authenticated: boolean;
  is_loading: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "buyer" | "seller";
}
