export interface AuthUser {
  id: number;
  email: string;
  full_name?: string | null;
  is_admin: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: 'bearer';
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
