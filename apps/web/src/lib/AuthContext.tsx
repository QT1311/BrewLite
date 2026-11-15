'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, AuthResult, AuthUser, fetchMe, loginUser, registerUser } from './api';

const TOKEN_KEY = 'brewlite.token.v1';

type Status = 'loading' | 'anon' | 'authed';

interface AuthValue {
  status: Status;
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Khôi phục phiên đăng nhập: kiểm tra token đã lưu còn hợp lệ không.
  useEffect(() => {
    const saved = readToken();
    if (!saved) {
      setStatus('anon');
      return;
    }
    let cancelled = false;
    fetchMe(saved)
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setToken(saved);
        setStatus('authed');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Token hết hạn/sai thì xoá; lỗi mạng thì giữ token để thử lại lần sau.
        if (err instanceof ApiError && err.status === 401) writeToken(null);
        setStatus('anon');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback((res: AuthResult) => {
    writeToken(res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
    setStatus('authed');
  }, []);

  const login = useCallback(async (email: string, password: string) => apply(await loginUser({ email, password })), [apply]);
  const register = useCallback(
    async (name: string, email: string, password: string) => apply(await registerUser({ name, email, password })),
    [apply],
  );
  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
    setStatus('anon');
  }, []);

  const value = useMemo(
    () => ({ status, user, token, login, register, logout }),
    [status, user, token, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return ctx;
}
