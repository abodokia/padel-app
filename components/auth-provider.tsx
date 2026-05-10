"use client";

import { createContext, useContext, useMemo } from "react";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ვაძლევთ "ვითომ" მომხმარებელს, რომ კოდი არ გაგიჟდეს
  const value = useMemo(() => ({
    user: { id: "1", email: "test@test.com" },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
  }), []);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}