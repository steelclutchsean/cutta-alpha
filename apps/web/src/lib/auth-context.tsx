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
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { usersApi } from './api';

interface User {
  id: string;
  clerkId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  avatarType: 'CUSTOM' | 'PRESET' | 'CLERK';
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
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  // Get a fresh token - Clerk tokens expire quickly, so always get fresh when needed
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!isSignedIn) return null;
    try {
      const freshToken = await getToken();
      if (freshToken) {
        setToken(freshToken);
        tokenRef.current = freshToken;
      }
      return freshToken;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }, [isSignedIn, getToken]);

  // Sync user with backend when Clerk user changes
  useEffect(() => {
    async function syncUser() {
      if (!clerkLoaded) return;
      
      if (!isSignedIn || !clerkUser) {
        setUser(null);
        setToken(null);
        tokenRef.current = null;
        setIsLoading(false);
        return;
      }

      try {
        // Get Clerk JWT token
        const clerkToken = await getToken();
        setToken(clerkToken);
        tokenRef.current = clerkToken;

        if (clerkToken) {
          // Sync or create user in our database
          const userData = await usersApi.syncClerkUser(clerkToken, {
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            displayName: clerkUser.fullName || clerkUser.firstName || 'User',
            avatarUrl: clerkUser.imageUrl,
          });
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to sync user:', error);
        // Still allow access even if sync fails
        setUser({
          id: clerkUser.id,
          clerkId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          displayName: clerkUser.fullName || clerkUser.firstName || 'User',
          avatarUrl: clerkUser.imageUrl || null,
          avatarType: 'CLERK',
          presetAvatarId: null,
          phone: null,
          balance: 0,
          kycVerified: false,
        });
      } finally {
        setIsLoading(false);
      }
    }

    syncUser();
  }, [clerkUser, clerkLoaded, isSignedIn, getToken]);

  // Refresh token periodically to keep it fresh (every 45 seconds)
  useEffect(() => {
    if (!isSignedIn) return;

    const refreshInterval = setInterval(async () => {
      await getValidToken();
    }, 45000); // Refresh every 45 seconds

    return () => clearInterval(refreshInterval);
  }, [isSignedIn, getValidToken]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setToken(null);
    tokenRef.current = null;
  }, [signOut]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const validToken = await getValidToken();
    if (!validToken) return;
    try {
      const userData = await usersApi.me(validToken);
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [getValidToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading: !clerkLoaded || isLoading,
        isSignedIn: !!isSignedIn,
        logout,
        updateUser,
        refreshUser,
        getValidToken,
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
