import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Role, UserProfile } from '../types';

type AuthStatus = 'idle' | 'initializing' | 'authenticating';

type AuthUser = UserProfile;

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role: Role | null,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'pet-mini-auth-token';

export function getApiBaseUrl() {
  const configured = (import.meta as any).env?.VITE_API_BASE_URL;
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    return `${protocol}://${host}:3000`;
  }

  return 'http://localhost:3000';
}

// Build a safe URL for API-hosted assets. Trims input and encodes spaces
// ensuring images with spaces in their stored paths still load.
export function buildApiUrl(path: string | null | undefined) {
  const base = getApiBaseUrl().replace(/\/$/, '');
  if (!path) return base;
  const trimmed = path.trim();
  // encodeURI preserves existing slashes but encodes spaces as %20
  const encoded = encodeURI(trimmed);
  if (encoded.startsWith('/')) return base + encoded;
  return base + '/' + encoded;
}

async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {},
  token: string | null,
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  return (await res.json()) as T;
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const queryClient = useQueryClient();

  // On mount, if we have a token, fetch profile
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!token) {
        setStatus('idle');
        return;
      }

      try {
        const profile = await fetchWithAuth<AuthUser>('/api/auth/me', {}, token);
        if (!cancelled) {
          setUser(profile);
          setStatus('idle');
        }
      } catch (error) {
        console.error('Failed to load profile, clearing token', error);
        if (!cancelled) {
          window.localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          setUser(null);
          setStatus('idle');
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(
    async (email: string, password: string) => {
      setStatus('authenticating');
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Login failed');
        }

        const data: { token: string; user: AuthUser } = await res.json();

        window.localStorage.setItem(STORAGE_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        setStatus('idle');
        queryClient.clear();
        toast.success('Logged in successfully');
      } catch (error: any) {
        console.error('Login error', error);
        setStatus('idle');
        toast.error(error.message || 'Failed to login');
        throw error;
      }
    },
    [queryClient],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: Role | null,
      latitude?: number | null,
      longitude?: number | null,
      username?: string,
    ) => {
      setStatus('authenticating');
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role: role ?? 'PUBLIC_USER',
            ...(latitude && longitude && { latitude, longitude }),
            ...(username && { username }),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Registration failed');
        }

        const data: { token: string; user: AuthUser } = await res.json();

        window.localStorage.setItem(STORAGE_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        setStatus('idle');
        queryClient.clear();
        toast.success('Account created successfully');
      } catch (error: any) {
        console.error('Registration error', error);
        setStatus('idle');
        toast.error(error.message || 'Failed to register');
        throw error;
      }
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setStatus('idle');
    queryClient.clear();
  }, [queryClient]);

  const value: AuthContextValue = {
    user,
    token,
    status,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// Export fetch helper so other hooks (useQueries) can use the same logic
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  return fetchWithAuth<T>(path, options, token);
}
