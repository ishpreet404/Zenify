import React from 'react';
import { AuthUser, LoginPayload, RegisterPayload } from '../types/auth';
import * as authService from '../utils/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<AuthUser | null>(authService.getStoredUser());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await authService.getCurrentUser();
        setUser(me);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (payload: LoginPayload) => {
    const response = await authService.login(payload);
    setUser(response.user);
  };

  const register = async (payload: RegisterPayload) => {
    const response = await authService.register(payload);
    setUser(response.user);
  };

  const logout = () => {
    authService.clearAuth();
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: !!user?.is_admin,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
