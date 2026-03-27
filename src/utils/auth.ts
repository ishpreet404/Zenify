import { apiFetch, clearAuthToken, getAuthToken, setAuthToken } from './api';
import { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from '../types/auth';

const USER_STORAGE_KEY = 'zenify_auth_user';

export const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: AuthUser): void => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuth = (): void => {
  clearAuthToken();
  localStorage.removeItem(USER_STORAGE_KEY);
};

const parseAuthResponse = async (response: Response): Promise<AuthResponse> => {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = typeof errorBody?.detail === 'string' ? errorBody.detail : 'Authentication request failed';
    throw new Error(message);
  }

  const data = (await response.json()) as AuthResponse;
  setAuthToken(data.access_token);
  setStoredUser(data.user);
  return data;
};

export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const response = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return parseAuthResponse(response);
};

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return parseAuthResponse(response);
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const token = getAuthToken();
  if (!token) return null;

  const response = await apiFetch('/api/auth/me', {
    method: 'GET',
    auth: true,
  });

  if (!response.ok) {
    clearAuth();
    return null;
  }

  const user = (await response.json()) as AuthUser;
  setStoredUser(user);
  return user;
};
