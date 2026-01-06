import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  balance: number;
  kycVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'cutta_token';
const USER_KEY = 'cutta_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved auth state
  useEffect(() => {
    async function loadAuth() {
      try {
        const [savedToken, savedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));

          // Verify token is still valid
          try {
            const userData = await authApi.me(savedToken);
            setUser(userData);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
          } catch {
            // Token invalid, clear auth
            await Promise.all([
              SecureStore.deleteItemAsync(TOKEN_KEY),
              SecureStore.deleteItemAsync(USER_KEY),
            ]);
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error loading auth:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: userData, token: authToken } = await authApi.login({ email, password });
    setUser(userData);
    setToken(authToken);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, authToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData)),
    ]);
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    const { user: userData, token: authToken } = await authApi.signup({ email, password, displayName });
    setUser(userData);
    setToken(authToken);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, authToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData)),
    ]);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        updateUser,
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

