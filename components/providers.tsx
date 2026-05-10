"use client";

import { AuthProvider } from "@/components/auth-provider";
import { BookingProvider } from "@/components/booking-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BookingProvider>{children}</BookingProvider>
    </AuthProvider>
  );
}
