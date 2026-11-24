export type UserRole = "USER" | "BUDDY" | "OWNER" | "ADMIN";

export interface UserProfile {
  id: string;
  email: string;
  phone?: string | null;
  phoneVerified: boolean;
  fullName: string;
  avatarUrl?: string | null;
  roles: UserRole[];
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number; // in seconds
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface SendOtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}
