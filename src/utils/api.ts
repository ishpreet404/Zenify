const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

const API_BASE_URL = rawApiBaseUrl || (import.meta.env.PROD ? '' : 'http://localhost:8000');

export const getApiBaseUrl = (): string => API_BASE_URL;

export const getAuthToken = (): string | null => localStorage.getItem('zenify_access_token');

export const setAuthToken = (token: string): void => {
  localStorage.setItem('zenify_access_token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('zenify_access_token');
};

interface ApiFetchOptions extends RequestInit {
  auth?: boolean;
}

export const apiFetch = async (path: string, options: ApiFetchOptions = {}): Promise<Response> => {
  const { auth = false, headers, ...rest } = options;

  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured in frontend environment variables');
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
    });
  } catch {
    throw new Error(`Network error while contacting API at ${API_BASE_URL}`);
  }
};
