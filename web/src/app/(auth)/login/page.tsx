"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PasskeySignInButton } from "@/components/PasskeySignInButton";
import { withBasePath } from "@/lib/base-path";
import { safeInternalPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const isSignup = searchParams.get("mode") === "signup";
  const nextPath = useMemo(
    () => safeInternalPath(searchParams.get("next") ?? "/hud"),
    [searchParams],
  );
  const notice = searchParams.get("notice");
  const errorParam = searchParams.get("error");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(errorParam);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          setPending(false);
          return;
        }
        if (!data.session) {
          setPending(false);
          window.location.assign(
            withBasePath(
              `/login?notice=${encodeURIComponent(
                "Check your email to confirm your account, then sign in.",
              )}&mode=signup`,
            ),
          );
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          setPending(false);
          return;
        }
      }
      window.location.assign(withBasePath(nextPath));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
      <div className="mx-auto w-full max-w-md animate-rise card-surface rounded-2xl p-6 backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
          AuraHUD
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">
          {isSignup ? "Create your HUD" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Private by design. Your life data stays in your Supabase project.
        </p>

        {notice ? (
          <p className="mt-4 rounded-xl bg-moss-500/15 px-3 py-2 text-sm text-moss-600">
            {notice}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-coral-400/15 px-3 py-2 text-sm text-coral-500">
            {error}
          </p>
        ) : null}

        {!isSignup ? (
          <div className="mt-6 space-y-4">
            <PasskeySignInButton next={nextPath} />
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-600">
              <span className="h-px flex-1 bg-ink-900/10" />
              Or use password
              <span className="h-px flex-1 bg-ink-900/10" />
            </div>
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          className={`${isSignup ? "mt-6" : "mt-4"} space-y-3`}
        >
          {isSignup ? (
            <label className="block text-sm font-semibold text-ink-700">
              Display name
              <input
                name="displayName"
                className="mt-1 w-full rounded-xl border border-ink-900/10 bg-white px-3 py-3 outline-none ring-moss-400 focus:ring-2"
                placeholder="Your name"
              />
            </label>
          ) : null}
          <label className="block text-sm font-semibold text-ink-700">
            Email
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-ink-900/10 bg-white px-3 py-3 outline-none ring-moss-400 focus:ring-2"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm font-semibold text-ink-700">
            Password
            <input
              required
              type="password"
              name="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              className="mt-1 w-full rounded-xl border border-ink-900/10 bg-white px-3 py-3 outline-none ring-moss-400 focus:ring-2"
              placeholder="••••••••"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-ink-900 px-4 py-3.5 text-sm font-bold text-sand-50 hover:bg-ink-800 disabled:opacity-60"
          >
            {pending
              ? isSignup
                ? "Creating…"
                : "Signing in…"
              : isSignup
                ? "Create account"
                : "Sign in with password"}
          </button>
        </form>

        {!isSignup ? (
          <p className="mt-3 text-xs text-ink-600">
            Sign in with a passkey or with your email and password — either
            works.
          </p>
        ) : null}

        <p className="mt-5 text-center text-sm text-ink-600">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-moss-500">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/login?mode=signup" className="font-bold text-moss-500">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
          <div className="mx-auto h-80 w-full max-w-md animate-pulse rounded-2xl bg-sand-200/50" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
