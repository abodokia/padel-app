"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  useBookingGrid,
  useBookingSession,
} from "@/components/booking-provider";
import {
  isSlotInPast,
  normalizeBookingHour,
  sameUserId,
} from "@/lib/mock-db";
import { formatHourRange, getSlotsForDay } from "@/lib/slots";

function formatHeaderDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const BookingBanner = memo(function BookingBanner() {
  const { activeBooking } = useBookingSession();

  return activeBooking ? (
    <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
        Your booking
      </p>
      <p className="mt-1 text-sm font-medium text-blue-950">
        {formatHourRange(
          normalizeBookingHour(activeBooking.hour) ??
            Math.trunc(Number(activeBooking.hour)),
        )}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-blue-800/90">
        Other hours stay available. Change time by cancelling your booking or
        waiting until it ends.
      </p>
    </div>
  ) : (
    <p className="mb-4 text-sm leading-relaxed text-stone-500">
      Tap an open hour to reserve. Only one active booking at a time.
    </p>
  );
});

const SlotGrid = memo(function SlotGrid({
  userId,
  onToast,
}: {
  userId: string;
  onToast: (tone: "success" | "error", text: string) => void;
}) {
  const { dateKey, bookings, bookHour, cancelBooking, selectedDay } =
    useBookingGrid();
  const { activeBooking } = useBookingSession();
  const slots = useMemo(() => getSlotsForDay(selectedDay), [selectedDay]);
  const now = new Date();

  const hasPersonalLock = activeBooking != null;

  return (
    <section
      aria-label="Court availability"
      className="flex flex-col gap-2.5"
    >
      {slots.map((slot) => {
        const slotHour = slot.hour;

        const dbBooking = bookings.find((b) => {
          if (b.dateKey !== dateKey) return false;
          const bh = normalizeBookingHour(b.hour);
          return bh === slotHour;
        });

        const past = isSlotInPast(dateKey, slotHour, now);
        const hasDbRow = dbBooking != null;
        const mineHere = hasDbRow && sameUserId(dbBooking.userId, userId);
        const takenByOther = hasDbRow && !sameUserId(dbBooking.userId, userId);
        const slotOpen = !past && !hasDbRow;

        const statusLabel: "Available" | "Booked" | "Ended" = past
          ? "Ended"
          : hasDbRow
            ? "Booked"
            : "Available";

        return (
          <article
            key={slotHour}
            className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-stone-200/60"
          >
            <div className="min-w-0">
              <p className="text-base font-semibold text-stone-900">
                {slot.label}
              </p>
              <p className="text-xs text-stone-500">{statusLabel}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {mineHere && dbBooking ? (
                <div className="flex flex-col items-end gap-1.5">
                  <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600">
                    Booked
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        const r = await cancelBooking(dbBooking.id);
                        onToast(
                          r.status === "ok" ? "success" : "error",
                          r.message,
                        );
                      })();
                    }}
                    className="text-xs font-semibold text-blue-600 underline-offset-2 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : takenByOther ? (
                <span
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-400"
                  aria-disabled
                >
                  Booked
                </span>
              ) : past ? (
                <span className="rounded-full bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-400">
                  —
                </span>
              ) : slotOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const r = await bookHour(slotHour);
                      onToast(
                        r.status === "ok" ? "success" : "error",
                        r.message,
                      );
                    })();
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.97] ${
                    hasPersonalLock
                      ? "bg-stone-100 text-stone-500 ring-1 ring-stone-200/80"
                      : "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                  }`}
                >
                  Book now
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
});

export function BookingScreen() {
  const { user, logout } = useAuth();
  const { selectedDay } = useBookingGrid();
  const [toast, setToast] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const setToastFromSlot = useCallback(
    (tone: "success" | "error", text: string) => {
      setToast({ tone, text });
    },
    [],
  );

  if (!user) return null;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-10 pt-3">
      <header className="mb-5 flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Padel Court
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
            Book
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {formatHeaderDate(selectedDay)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            setToast(null);
          }}
          className="rounded-full bg-white/80 px-3.5 py-2 text-sm font-medium text-blue-600 shadow-sm ring-1 ring-stone-200/80 backdrop-blur active:scale-[0.98]"
        >
          Sign out
        </button>
      </header>

      <BookingBanner />

      {toast ? (
        <div
          role="status"
          className={`mb-3 rounded-2xl px-4 py-3 text-sm font-medium ${
            toast.tone === "success"
              ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
              : "bg-rose-50 text-rose-900 ring-1 ring-rose-100"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <SlotGrid userId={user.id} onToast={setToastFromSlot} />

      <p className="mt-8 text-center text-xs text-stone-400">
        Signed in as{" "}
        <span className="font-medium text-stone-600">{user.email}</span>
      </p>
    </div>
  );
}
