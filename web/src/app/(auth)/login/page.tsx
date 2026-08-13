"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PasskeySignInButton } from "@/components/PasskeySignInButton";
import { withBasePath } from "@/lib/base-path";
import { safeInternalPath } from "@/lib/paths";
import { authCallbackHref } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/client";

const shell =
  "flex min-h-dvh items-center bg-app-glow px-5 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]";
const card =
  "mx-auto w-full max-w-md animate-rise card-surface rounded-3xl p-5 backdrop-blur sm:p-6";
const field =
  "mt-1 min-h-12 w-full touch-manipulation rounded-xl border border-ink-900/10 bg-white px-3 py-3 text-base text-ink-900 outline-none ring-moss-400 focus:ring-2";
const primaryBtn =
  "flex min-h-12 w-full touch-manipulation items-center justify-center rounded-2xl bg-ink-900 px-4 py-3.5 text-base font-bold text-sand-50 hover:bg-ink-800 disabled:opacity-60";

function friendlyAuthError(message: string): string {
  if (/not confirmed|confirm your email/i.test(message)) {
    return "Open the confirmation link we emailed you, then come back here and sign in.";
  }
  if (/already registered|already been registered|user already registered/i.test(message)) {
    return "That email already has an account. Sign in instead.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Email or password doesn’t match. Try again, or create an account.";
  }
  return message;
}

function CheckEmailPanel({ email }: { email: string }) {
  return (
    <main className={shell}>
      <div className={card}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
          AuraHUD
        </p>
        <h1 className="mt-2 font-display text-[1.85rem] font-bold leading-tight text-ink-900 sm:text-3xl">
          Check your email
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-700">
          We sent a confirmation link to{" "}
          <span className="break-all font-semibold text-ink-900">
            {email || "your inbox"}
          </span>
          . Your account isn’t ready until you tap that link.
        </p>
        <ol className="mt-5 space-y-3 text-base text-ink-700">
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss-500/15 text-sm font-bold text-moss-600">
              1
            </span>
            <span>Open your mail app on this phone.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss-500/15 text-sm font-bold text-moss-600">
              2
            </span>
            <span>Tap the confirm link in the AuraHUD message.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss-500/15 text-sm font-bold text-moss-600">
              3
            </span>
            <span>Come back here and sign in with the same email and password.</span>
          </li>
        </ol>
        <a href={withBasePath("/login/")} className={`${primaryBtn} mt-6`}>
          I’ve confirmed — sign in
        </a>
        <Link
          href="/login?mode=signup"
          className="mt-3 flex min-h-12 w-full touch-manipulation items-center justify-center rounded-2xl border border-ink-900/15 px-4 py-3 text-base font-bold text-ink-800"
        >
          Use a different email
        </Link>
      </div>
    </main>
  );
}

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
  const [error, setError] = useState<string | null>(
    errorParam ? friendlyAuthError(errorParam) : null,
  );
  const [checkEmail, setCheckEmail] = useState<string | null>(
    searchParams.get("confirm") === "1"
      ? (searchParams.get("email") ?? "")
      : null,
  );

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
            emailRedirectTo: authCallbackHref(),
          },
        });
        if (signUpError) {
          setError(friendlyAuthError(signUpError.message));
          setPending(false);
          return;
        }
        if (!data.session) {
          setCheckEmail(email);
          setPending(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(friendlyAuthError(signInError.message));
          setPending(false);
          return;
        }
      }
      window.location.assign(withBasePath(nextPath));
    } catch (err) {
      setError(
        friendlyAuthError(
          err instanceof Error ? err.message : "Sign-in failed.",
        ),
      );
      setPending(false);
    }
  }

  if (checkEmail !== null) {
    return <CheckEmailPanel email={checkEmail} />;
  }

  return (
    <main className={shell}>
      <div className={card}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
          AuraHUD
        </p>
        <h1 className="mt-2 font-display text-[1.85rem] font-bold leading-tight text-ink-900 sm:text-3xl">
          {isSignup ? "Create your HUD" : "Welcome back"}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-600">
          {isSignup
            ? "Takes a minute. We’ll email you a confirm link before you can sign in."
            : "Private by design. Your life data stays in your Supabase project."}
        </p>

        {notice ? (
          <p
            role="status"
            className="mt-4 rounded-xl bg-moss-500/15 px-3 py-3 text-base text-moss-700"
          >
            {notice}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-coral-400/15 px-3 py-3 text-base text-coral-500"
          >
            {error}
          </p>
        ) : null}

        {!isSignup ? (
          <div className="mt-6 space-y-4">
            <PasskeySignInButton next={nextPath} />
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-600">
              <span className="h-px flex-1 bg-ink-900/10" />
              Or password
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
                autoComplete="name"
                enterKeyHint="next"
                className={field}
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
              inputMode="email"
              enterKeyHint="next"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={field}
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
              enterKeyHint="go"
              className={field}
              placeholder="At least 8 characters"
            />
          </label>
          <button type="submit" disabled={pending} className={primaryBtn}>
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
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Just confirmed your email? Sign in here with the same password.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Next step is a confirmation email — keep this tab so you can sign in
            after you tap the link.
          </p>
        )}

        <p className="mt-5 text-center text-base text-ink-600">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center font-bold text-moss-600 underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link
                href="/login?mode=signup"
                className="inline-flex min-h-11 items-center font-bold text-moss-600 underline-offset-2 hover:underline"
              >
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
        <main className={shell}>
          <div className="mx-auto h-80 w-full max-w-md animate-pulse rounded-3xl bg-sand-200/50" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
