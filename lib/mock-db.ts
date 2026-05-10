import type { Session } from "@supabase/supabase-js";
import { SLOT_END_HOUR_EXCLUSIVE, SLOT_START_HOUR } from "./slots";
import { getSupabaseBrowser } from "./supabase";

/** Coerce stored hour (number or string from JSON) to a valid slot start hour, or null. */
export function normalizeBookingHour(raw: unknown): number | null {
  const n =
    typeof raw === "number" && Number.isInteger(raw)
      ? raw
      : Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return null;
  if (n < SLOT_START_HOUR || n >= SLOT_END_HOUR_EXCLUSIVE) return null;
  return n;
}

export function sameUserId(a: string, b: string) {
  return String(a) === String(b);
}

export type MockUser = {
  id: string;
  email: string;
  name: string;
};

export type MockBooking = {
  id: string;
  userId: string;
  /** YYYY-MM-DD in local calendar */
  dateKey: string;
  /** Slot start hour [SLOT_START_HOUR, SLOT_END_HOUR_EXCLUSIVE) */
  hour: number;
  createdAt: number;
};

type BookingRow = {
  id: string;
  user_id: string;
  date_key: string;
  hour: number;
  created_at: string;
};

function rowToBooking(r: BookingRow): MockBooking {
  const hour = normalizeBookingHour(r.hour) ?? 0;
  return {
    id: r.id,
    userId: r.user_id,
    dateKey: r.date_key,
    hour,
    createdAt: new Date(r.created_at).getTime(),
  };
}

let storeRevision = 0;
const subscribers = new Set<() => void>();

function bump() {
  storeRevision += 1;
  subscribers.forEach((fn) => fn());
}

export function getMockStoreRevision() {
  return storeRevision;
}

let cachedSessionUserId: string | null = null;
let cachedUser: MockUser | null = null;
let globalListenersBound = false;

function syncFromSession(session: Session | null) {
  if (!session?.user) {
    cachedSessionUserId = null;
    cachedUser = null;
    return;
  }
  const u = session.user;
  cachedSessionUserId = u.id;
  const metaName =
    (typeof u.user_metadata?.name === "string" && u.user_metadata.name) ||
    (typeof u.user_metadata?.full_name === "string" &&
      u.user_metadata.full_name) ||
    undefined;
  cachedUser = {
    id: u.id,
    email: u.email ?? "",
    name: metaName || u.email?.split("@")[0] || "Player",
  };
  void refreshProfileRow(u.id);
}

async function refreshProfileRow(userId: string) {
  try {
    const sb = getSupabaseBrowser();
    const { data, error } = await sb
      .from("profiles")
      .select("email,name")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return;
    cachedUser = {
      id: userId,
      email: data.email ?? cachedUser?.email ?? "",
      name: data.name ?? cachedUser?.name ?? "Player",
    };
    bump();
  } catch {
    /* profiles optional until migration applied */
  }
}

function ensureSupabaseListeners() {
  if (typeof window === "undefined" || globalListenersBound) return;
  globalListenersBound = true;
  const sb = getSupabaseBrowser();
  void sb.auth.getSession().then(({ data: { session } }) => {
    syncFromSession(session);
    bump();
  });
  sb.auth.onAuthStateChange((_event, session) => {
    syncFromSession(session);
    bump();
  });
  sb.channel("public-bookings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      () => bump(),
    )
    .subscribe();
}

/** Subscribe to auth + booking changes (Supabase). */
export function subscribeMockStore(onChange: () => void) {
  ensureSupabaseListeners();
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

export function getSessionUserId(): string | null {
  return cachedSessionUserId;
}

export function getCurrentUser(): MockUser | null {
  return cachedUser;
}

export type AuthResult =
  | { ok: true; user: MockUser }
  | { ok: false; message: string };

export async function mockLogin(
  email: string,
  password?: string,
): Promise<AuthResult> {
  if (!password?.trim()) {
    return { ok: false, message: "Enter your password." };
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, message: "Enter your email." };
  }
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) {
    return {
      ok: false,
      message:
        error.message.includes("Invalid login") ||
        error.message.includes("Invalid")
          ? "Invalid email or password."
          : error.message,
    };
  }
  syncFromSession(data.session);
  bump();
  if (!cachedUser) {
    return { ok: false, message: "Session could not be established." };
  }
  return { ok: true, user: cachedUser };
}

export async function mockRegister(
  email: string,
  password?: string,
  displayName?: string,
): Promise<AuthResult> {
  if (!password || password.length < 6) {
    return { ok: false, message: "Use a password of at least 6 characters." };
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, message: "Enter your email." };
  }
  const name =
    displayName?.trim() ||
    normalized.split("@")[0] ||
    "Player";
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.auth.signUp({
    email: normalized,
    password,
    options: { data: { name, full_name: name } },
  });
  if (error) {
    if (
      error.message.toLowerCase().includes("registered") ||
      error.message.toLowerCase().includes("already")
    ) {
      return {
        ok: false,
        message: "An account with this email already exists. Sign in instead.",
      };
    }
    return { ok: false, message: error.message };
  }
  if (!data.session) {
    return {
      ok: false,
      message:
        "Confirm your email to finish sign-up, or disable email confirmation under Supabase → Authentication → Providers → Email.",
    };
  }
  syncFromSession(data.session);
  bump();
  if (!cachedUser) {
    return { ok: false, message: "Session could not be established." };
  }
  return { ok: true, user: cachedUser };
}

export async function mockLogout(): Promise<void> {
  const sb = getSupabaseBrowser();
  await sb.auth.signOut();
  syncFromSession(null);
  bump();
}

export async function fetchBookingsForDate(
  dateKey: string,
): Promise<MockBooking[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("bookings")
    .select("id,user_id,date_key,hour,created_at")
    .eq("date_key", dateKey)
    .order("hour", { ascending: true });
  if (error || !data) return [];
  return (data as BookingRow[]).map(rowToBooking);
}

export async function fetchBookingsForUser(
  userId: string,
): Promise<MockBooking[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("bookings")
    .select("id,user_id,date_key,hour,created_at")
    .eq("user_id", userId)
    .order("date_key", { ascending: true })
    .order("hour", { ascending: true });
  if (error || !data) return [];
  return (data as BookingRow[]).map(rowToBooking);
}

function bookingSlotEnd(b: MockBooking): Date {
  const [y, m, d] = b.dateKey.split("-").map(Number);
  const hour = normalizeBookingHour(b.hour) ?? 0;
  return new Date(y, m - 1, d, hour + 1, 0, 0, 0);
}

/** Active = booking window end is still in the future. */
export function getActiveBookingFromList(
  userId: string,
  list: MockBooking[],
  now: Date = new Date(),
): MockBooking | null {
  const mine = list.filter((b) => sameUserId(b.userId, userId));
  let active: MockBooking | null = null;
  let latestEnd = 0;
  for (const b of mine) {
    if (normalizeBookingHour(b.hour) === null) continue;
    const end = bookingSlotEnd(b).getTime();
    if (end > now.getTime() && end > latestEnd) {
      latestEnd = end;
      active = b;
    }
  }
  return active;
}

export type BookResult =
  | { ok: true; booking: MockBooking }
  | { ok: false; reason: "ACTIVE_BOOKING" | "TAKEN" | "INVALID_SLOT" };

export async function tryBookSlot(
  userId: string,
  dateKey: string,
  hour: number,
  now: Date = new Date(),
): Promise<BookResult> {
  const hourN = normalizeBookingHour(hour);
  if (hourN === null) {
    return { ok: false, reason: "INVALID_SLOT" };
  }

  const mine = await fetchBookingsForUser(userId);
  const active = getActiveBookingFromList(userId, mine, now);
  if (active) {
    return { ok: false, reason: "ACTIVE_BOOKING" };
  }

  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("bookings")
    .insert({
      user_id: userId,
      date_key: dateKey,
      hour: hourN,
    })
    .select("id,user_id,date_key,hour,created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, reason: "TAKEN" };
    }
    return { ok: false, reason: "INVALID_SLOT" };
  }

  bump();
  return { ok: true, booking: rowToBooking(data as BookingRow) };
}

export async function cancelBookingForUser(
  bookingId: string,
  userId: string,
): Promise<
  { ok: true } | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" }
> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { ok: false, reason: "FORBIDDEN" };
  }
  if (!data?.length) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  bump();
  return { ok: true };
}

export function isSlotInPast(dateKey: string, hour: number, now: Date) {
  const hourN = normalizeBookingHour(hour);
  if (hourN === null) return true;
  const [y, m, d] = dateKey.split("-").map(Number);
  const end = new Date(y, m - 1, d, hourN + 1, 0, 0, 0);
  return end.getTime() <= now.getTime();
}

export function dateKeyFromDate(d: Date) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

