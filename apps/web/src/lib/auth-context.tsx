'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi, usersApi } from './api';

interface User {
  id: string;
  googleId: string | null;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  avatarType: 'CUSTOM' | 'PRESET' | 'GOOGLE';
  presetAvatarId: string | null;
  phone: string | null;
  balance: number;
  kycVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
  setAuthToken: (token: string) => Promise<void>;
}

const TOKEN_KEY = 'cutta_auth_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  // Get token from storage
  const getValidToken = useCallback(async (): Promise<string | null> => {
    return tokenRef.current;
  }, []);

  // Set auth token (called after OAuth callback)
  const setAuthToken = useCallback(async (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    tokenRef.current = newToken;
    
    // Fetch user data
    try {
      const userData = await usersApi.me(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Token might be invalid, clear it
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      tokenRef.current = null;
    }
  }, []);

  // Initialize auth state from stored token
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      tokenRef.current = storedToken;

      try {
        const userData = await usersApi.me(storedToken);
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // Token is invalid, clear it
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        tokenRef.current = null;
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  // Email/password login
  const login = useCallback(async (email: string, password: string) => {
    const { user: userData, token: newToken } = await authApi.login({ email, password });
    
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    tokenRef.current = newToken;
    setUser(userData);
    
    router.push('/dashboard');
  }, [router]);

  // Email/password signup
  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    const { user: userData, token: newToken } = await authApi.signup({ email, password, displayName });
    
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    tokenRef.current = newToken;
    setUser(userData);
    
    router.push('/dashboard');
  }, [router]);

  // Google OAuth login - redirect to API
  const loginWithGoogle = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    window.location.href = `${apiUrl}/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
    tokenRef.current = null;
    router.push('/login');
  }, [router]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const validToken = tokenRef.current;
    if (!validToken) return;
    try {
      const userData = await usersApi.me(validToken);
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSignedIn: !!user,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateUser,
        refreshUser,
        getValidToken,
        setAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
