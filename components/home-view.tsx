"use client";

import { BookingScreen } from "@/components/booking-screen";

export function HomeView() {
  // აქამდე აქ ეწერა useEffect და router.replace, რაც იწვევდა ციმციმს.
  // ახლა პირდაპირ ვაბრუნებთ მთავარ ეკრანს, რომ საიტი დავინახოთ.
  
  return <BookingScreen />;
}