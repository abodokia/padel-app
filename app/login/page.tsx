import { LoginClient } from "./login-client";

/** Sign in or register. Use `?mode=signup` to open the registration form. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = sp.mode;
  const mode = Array.isArray(raw) ? raw[0] : raw;
  const initialMode = mode === "signup" ? "signup" : "signin";
  return <LoginClient initialMode={initialMode} />;
}
