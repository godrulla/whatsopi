import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '../types';
import { AuthService } from '../services/AuthService';
import { useLanguage } from '../lib/i18n';
import toast from 'react-hot-toast';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  loginWithWhatsApp: (phone: string) => Promise<void>;
  verifyWhatsAppOTP: (phone: string, otp: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

interface RegisterData {
  name: string;
  phone: string;
  email?: string;
  password: string;
  preferredLanguage: 'es-DO' | 'ht';
  role: 'customer' | 'colmado_owner';
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isAuthenticated = user !== null;

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('whatsopi-token');
        if (token) {
          // Verify token and get user data
          const userData = await AuthService.verifyToken(token);
          setUser(userData);
        }
      } catch (error) {
        // Token is invalid, remove it
        localStorage.removeItem('whatsopi-token');
        localStorage.removeItem('whatsopi-refresh-token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const refreshToken = localStorage.getItem('whatsopi-refresh-token');
        if (refreshToken) {
          const newTokens = await AuthService.refreshToken(refreshToken);
          localStorage.setItem('whatsopi-token', newTokens.accessToken);
          localStorage.setItem('whatsopi-refresh-token', newTokens.refreshToken);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Force logout if refresh fails
        logout();
      }
    }, 15 * 60 * 1000); // Refresh every 15 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const login = async (phone: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await AuthService.login(phone, password);
      
      // Store tokens
      localStorage.setItem('whatsopi-token', response.accessToken);
      localStorage.setItem('whatsopi-refresh-token', response.refreshToken);
      
      setUser(response.user);
      toast.success(t('auth.loginSuccess'));
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || t('auth.loginError');
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithWhatsApp = async (phone: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await AuthService.sendWhatsAppOTP(phone);
      toast.success('Código enviado por WhatsApp');
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Error al enviar código';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyWhatsAppOTP = async (phone: string, otp: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await AuthService.verifyWhatsAppOTP(phone, otp);
      
      // Store tokens
      localStorage.setItem('whatsopi-token', response.accessToken);
      localStorage.setItem('whatsopi-refresh-token', response.refreshToken);
      
      setUser(response.user);
      toast.success(t('auth.loginSuccess'));
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Código inválido';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await AuthService.register(data);
      
      // Store tokens
      localStorage.setItem('whatsopi-token', response.accessToken);
      localStorage.setItem('whatsopi-refresh-token', response.refreshToken);
      
      setUser(response.user);
      toast.success(t('auth.registerSuccess'));
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || t('auth.registerError');
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Call logout endpoint to invalidate tokens on server
      const token = localStorage.getItem('whatsopi-token');
      if (token) {
        await AuthService.logout(token);
      }
      
    } catch (error) {
      // Even if logout fails, we should clear local state
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('whatsopi-token');
      localStorage.removeItem('whatsopi-refresh-token');
      setUser(null);
      setError(null);
      setIsLoading(false);
      
      toast.success('Sesión cerrada exitosamente');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('whatsopi-token');
      if (!token || !user) {
        throw new Error('No authenticated user');
      }

      const updatedUser = await AuthService.updateProfile(token, data);
      setUser(updatedUser);
      toast.success('Perfil actualizado exitosamente');
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Error al actualizar perfil';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('whatsopi-token');
      if (!token) return;

      const userData = await AuthService.verifyToken(token);
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // Don't show error toast for background refresh
    }
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    login,
    loginWithWhatsApp,
    verifyWhatsAppOTP,
    register,
    logout,
    updateProfile,
    refreshUser,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { RegisterData };