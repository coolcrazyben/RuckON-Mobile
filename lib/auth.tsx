import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './query-client';

interface AuthUser {
  id: string;
  email: string | null;
  username: string;
  name: string | null;
  avatar: string | null;
  gender: string | null;
  weight: number | null;
  location: string | null;
  bio: string | null;
  onboardingComplete: boolean | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, fullName?: string) => Promise<void>;
  completeOnboarding: (data: { gender: string; weight: number; location: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const baseUrl = getApiUrl();

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }, [token]);

  useEffect(() => {
    loadStoredSession();
  }, []);

  async function loadStoredSession() {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        const res = await fetch(`${baseUrl}api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setToken(storedToken);
        } else {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAuthResponse(res: Response) {
    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(data.message || 'Request failed');
    }
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${baseUrl}api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    await handleAuthResponse(res);
  }

  async function register(email: string, password: string, name: string) {
    const res = await fetch(`${baseUrl}api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    await handleAuthResponse(res);
  }

  async function loginWithGoogle(idToken: string) {
    const res = await fetch(`${baseUrl}api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    await handleAuthResponse(res);
  }

  async function loginWithApple(identityToken: string, fullName?: string) {
    const res = await fetch(`${baseUrl}api/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityToken, fullName }),
    });
    await handleAuthResponse(res);
  }

  async function completeOnboarding(data: { gender: string; weight: number; location: string }) {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${baseUrl}api/user/onboarding`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to save' }));
      throw new Error(err.message);
    }
    const updatedUser = await res.json();
    setUser(updatedUser);
  }

  async function logout() {
    try {
      if (token && baseUrl) {
        await fetch(`${baseUrl}api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginWithGoogle,
        loginWithApple,
        completeOnboarding,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
