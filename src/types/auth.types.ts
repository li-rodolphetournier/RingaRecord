export interface User {
  id: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  session?: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  };
}

