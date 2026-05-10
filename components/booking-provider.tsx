"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { MockBooking } from "@/lib/mock-db";
import {
  cancelBookingForUser,
  dateKeyFromDate,
  fetchBookingsForDate,
  fetchBookingsForUser,
  getActiveBookingFromList,
  getMockStoreRevision,
  subscribeMockStore,
  tryBookSlot,
} from "@/lib/mock-db";
import { useAuth } from "@/components/auth-provider";

export type BookFeedback =
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

type BookingGridContextValue = {
  selectedDay: Date;
  dateKey: string;
  bookings: MockBooking[];
  bookHour: (hour: number) => Promise<BookFeedback>;
  cancelBooking: (bookingId: string) => Promise<BookFeedback>;
};

type BookingSessionContextValue = {
  activeBooking: MockBooking | null;
};

const BookingGridContext = createContext<BookingGridContextValue | null>(
  null,
);
const BookingSessionContext = createContext<BookingSessionContextValue | null>(
  null,
);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [selectedDay] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [timeTick, setTimeTick] = useState(0);
  const [bookings, setBookings] = useState<MockBooking[]>([]);
  const [myBookings, setMyBookings] = useState<MockBooking[]>([]);

  const storeRevision = useSyncExternalStore(
    subscribeMockStore,
    getMockStoreRevision,
    () => 0,
  );

  const dateKey = useMemo(
    () => dateKeyFromDate(selectedDay),
    [selectedDay],
  );

  useEffect(() => {
    if (!userId) {
      queueMicrotask(() => {
        setBookings([]);
        setMyBookings([]);
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [dayRows, mineRows] = await Promise.all([
          fetchBookingsForDate(dateKey),
          fetchBookingsForUser(userId),
        ]);
        if (!cancelled) {
          setBookings(dayRows);
          setMyBookings(mineRows);
        }
      } catch {
        if (!cancelled) {
          setBookings([]);
          setMyBookings([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, dateKey, storeRevision]);

  useEffect(() => {
    const id = window.setInterval(() => setTimeTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const activeBooking = useMemo(() => {
    void timeTick;
    void storeRevision;
    if (!userId) return null;
    return getActiveBookingFromList(userId, myBookings, new Date());
  }, [userId, myBookings, timeTick, storeRevision]);

  const bookHour = useCallback(
    async (hour: number): Promise<BookFeedback> => {
      if (!userId) {
        return { status: "error", message: "Sign in to book a court." };
      }
      const result = await tryBookSlot(userId, dateKey, hour, new Date());
      if (!result.ok) {
        if (result.reason === "ACTIVE_BOOKING") {
          return {
            status: "error",
            message: "You already have an active booking",
          };
        }
        if (result.reason === "TAKEN") {
          return {
            status: "error",
            message: "That hour is already taken. Try another slot.",
          };
        }
        return { status: "error", message: "This slot is not available." };
      }
      return { status: "ok", message: "Court reserved. See you on court." };
    },
    [userId, dateKey],
  );

  const cancelBooking = useCallback(
    async (bookingId: string): Promise<BookFeedback> => {
      if (!userId) {
        return { status: "error", message: "Sign in to manage bookings." };
      }
      const result = await cancelBookingForUser(bookingId, userId);
      if (!result.ok) {
        if (result.reason === "NOT_FOUND") {
          return { status: "error", message: "That booking no longer exists." };
        }
        return {
          status: "error",
          message: "You can only cancel your own booking.",
        };
      }
      return { status: "ok", message: "Booking cancelled." };
    },
    [userId],
  );

  const gridValue = useMemo(
    () => ({
      selectedDay,
      dateKey,
      bookings,
      bookHour,
      cancelBooking,
    }),
    [selectedDay, dateKey, bookings, bookHour, cancelBooking],
  );

  const sessionValue = useMemo(
    () => ({ activeBooking }),
    [activeBooking],
  );

  return (
    <BookingGridContext.Provider value={gridValue}>
      <BookingSessionContext.Provider value={sessionValue}>
        {children}
      </BookingSessionContext.Provider>
    </BookingGridContext.Provider>
  );
}

export function useBookingGrid() {
  const ctx = useContext(BookingGridContext);
  if (!ctx) throw new Error("useBookingGrid must be used within BookingProvider");
  return ctx;
}

export function useBookingSession() {
  const ctx = useContext(BookingSessionContext);
  if (!ctx) {
    throw new Error("useBookingSession must be used within BookingProvider");
  }
  return ctx;
}

export function useBooking() {
  return { ...useBookingGrid(), ...useBookingSession() };
}
