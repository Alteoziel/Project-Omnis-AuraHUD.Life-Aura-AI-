"use client";

import { withBasePath } from "@/lib/base-path";
import { safeInternalPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const requestedNext = searchParams.get("next");
      const isRecovery = type === "recovery";

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      } else if (tokenHash && type) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: type as "recovery" | "signup" | "invite" | "email" | "magiclink" | "email_change",
          token_hash: tokenHash,
        });
        if (otpError) {
          setError(otpError.message);
          return;
        }
      } else {
        setError("Invalid or expired confirmation link.");
        return;
      }

      const next = safeInternalPath(
        requestedNext,
        isRecovery ? "/settings/password" : "/hud",
      );
      window.location.replace(withBasePath(next));
    })();
  }, [searchParams]);

  if (error) {
    return (
      <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
        <div className="mx-auto max-w-md card-surface rounded-2xl p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral-500">
            AuraHUD
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink-900">
            Couldn’t finish sign-in
          </h1>
          <p className="mt-2 text-sm text-ink-600">{error}</p>
          <a
            href={withBasePath("/login")}
            className="mt-5 inline-flex rounded-2xl bg-ink-900 px-4 py-3 text-sm font-bold text-sand-50"
          >
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
      <p className="mx-auto text-sm font-semibold text-ink-600">Finishing sign-in…</p>
    </main>
  );
}

export function AuthCallbackApp() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
          <p className="mx-auto text-sm font-semibold text-ink-600">
            Finishing sign-in…
          </p>
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
