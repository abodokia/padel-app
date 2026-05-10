"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { BookingScreen } from "@/components/booking-screen";

export function HomeView() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-blue-600" />
        <p className="mt-3 text-sm text-stone-500">Opening…</p>
      </div>
    );
  }

  return <BookingScreen />;
}
