import { useState, useCallback } from 'react';
import { login as apiLogin, signup as apiSignup, setToken, clearToken, getToken } from '../api/client';
import type { AuthUser } from '../types';

function parseTokenPayload(token: string): { sub: string; email: string; exp: number } | null {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function buildUserFromToken(token: string): AuthUser | null {
  const payload = parseTokenPayload(token);
  if (!payload) return null;
  // Check expiry
  if (payload.exp * 1000 < Date.now()) {
    clearToken();
    return null;
  }
  return { user_id: payload.sub, email: payload.email, token };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const token = getToken();
    return token ? buildUserFromToken(token) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = currentUser !== null;

  const handleAuthResponse = useCallback((token: string, email: string, user_id: string) => {
    setToken(token);
    setCurrentUser({ user_id, email, token });
    setError(null);
  }, []);

  const signupFn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiSignup(email, password);
      handleAuthResponse(res.token, res.email, res.user_id);
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? (err instanceof Error ? err.message : 'Signup failed');
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleAuthResponse]);

  const loginFn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiLogin(email, password);
      handleAuthResponse(res.token, res.email, res.user_id);
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? (err instanceof Error ? err.message : 'Login failed');
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleAuthResponse]);

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    setError(null);
  }, []);

  return { currentUser, isAuthenticated, loading, error, signup: signupFn, login: loginFn, logout };
}
