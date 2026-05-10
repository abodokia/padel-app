"use client";

import { useAuth } from "@/components/auth-provider";
import { BookingScreen } from "@/components/booking-screen";
import { LoginClient } from "@/app/login/login-client"; // დარწმუნდი რომ გზა სწორია

export function HomeView() {
  const { user } = useAuth();

  // თუ მომხმარებელი არ არის შესული, პირდაპირ აქ გამოუჩინე ლოგინის გვერდი
  // ყოველგვარი გადამისამართების (router.replace) გარეშე
  if (!user) {
    return <LoginClient initialMode="signin" />;
  }

  // თუ შესულია, აჩვენე დაჯავშნის ეკრანი
  return <BookingScreen />;
}