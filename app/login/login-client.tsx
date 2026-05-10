"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type Mode = "signin" | "signup";

export function LoginClient({ initialMode }: { initialMode?: Mode }) {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (user) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 pb-16 pt-10">
      <div className="mb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
          Welcome
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          Padel Court
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          {mode === "signin"
            ? "Sign in with your Supabase Auth email and password."
            : "Create an account with Supabase Auth."}
        </p>
      </div>

      <div className="mb-4 flex rounded-2xl bg-stone-200/60 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError("");
          }}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
            mode === "signin"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError("");
          }}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600"
          }`}
        >
          Sign up
        </button>
      </div>

      <form
        className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200/70"
        onSubmit={(e) => {
          e.preventDefault();
          void (async () => {
            setError("");
            const trimmed = email.trim();
            if (!trimmed) {
              setError("Enter an email address.");
              return;
            }
            if (mode === "signin") {
              const r = await login(trimmed, password);
              if (!r.ok) {
                setError(r.message);
                return;
              }
            } else {
              const r = await register(trimmed, password, displayName);
              if (!r.ok) {
                setError(r.message);
                return;
              }
            }
            router.replace("/");
          })();
        }}
      >
        {mode === "signup" ? (
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Display name{" "}
              <span className="font-normal normal-case text-stone-400">
                (optional)
              </span>
            </span>
            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-3 text-base text-stone-900 outline-none ring-blue-500/0 transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              placeholder="e.g. Alex"
            />
          </label>
        ) : null}

        <label className={mode === "signup" ? "mt-4 block" : "block"}>
          <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-3 text-base text-stone-900 outline-none ring-blue-500/0 transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
            placeholder="you@example.com"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Password
          </span>
          <input
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-3 text-base text-stone-900 outline-none ring-blue-500/0 transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
            placeholder="Demo — anything goes"
          />
        </label>

        {error ? (
          <p className="mt-3 text-sm font-medium text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-6 w-full rounded-2xl bg-blue-600 py-3.5 text-base font-semibold text-white shadow-sm shadow-blue-600/25 active:scale-[0.99]"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs leading-relaxed text-stone-400">
        Accounts and bookings are stored in your Supabase project.
      </p>

      <Link
        href="/"
        className="mt-6 text-center text-sm font-medium text-blue-600"
      >
        Back to schedule
      </Link>
    </div>
  );
}
