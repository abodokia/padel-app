"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { AuthResult, MockUser } from "@/lib/mock-db";
import {
  getCurrentUser,
  getSessionUserId,
  mockLogin,
  mockLogout,
  mockRegister,
  subscribeMockStore,
} from "@/lib/mock-db";

type AuthContextValue = {
  user: MockUser | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sessionUserId = useSyncExternalStore(
    subscribeMockStore,
    () => getSessionUserId() ?? "",
    () => "",
  );

  const user = useMemo((): MockUser | null => {
    if (!sessionUserId) return null;
    return getCurrentUser();
  }, [sessionUserId]);

  const login = useCallback((email: string, password: string) => {
    return mockLogin(email, password);
  }, []);

  const register = useCallback(
    (email: string, password: string, displayName?: string) => {
      return mockRegister(email, password, displayName);
    },
    [],
  );

  const logout = useCallback(() => {
    return mockLogout();
  }, []);

  const value = useMemo(
    () => ({ user, login, register, logout }),
    [user, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
