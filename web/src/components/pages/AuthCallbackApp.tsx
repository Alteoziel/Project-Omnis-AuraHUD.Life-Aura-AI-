"use client";

import { withBasePath } from "@/lib/base-path";
import { safeInternalPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const shell =
  "flex min-h-dvh items-center bg-app-glow px-5 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]";
const card =
  "mx-auto w-full max-w-md card-surface rounded-3xl p-5 sm:p-6";
const primaryBtn =
  "mt-5 flex min-h-12 w-full touch-manipulation items-center justify-center rounded-2xl bg-ink-900 px-4 py-3.5 text-base font-bold text-sand-50";

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

      const finish = (nextPath: string) => {
        window.location.replace(withBasePath(nextPath));
      };

      const {
        data: { session: existing },
      } = await supabase.auth.getSession();
      if (existing) {
        finish(safeInternalPath(requestedNext, isRecovery ? "/settings/password" : "/hud"));
        return;
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      } else if (tokenHash && type) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: type as
            | "recovery"
            | "signup"
            | "invite"
            | "email"
            | "magiclink"
            | "email_change",
          token_hash: tokenHash,
        });
        if (otpError) {
          setError(otpError.message);
          return;
        }
      } else {
        const {
          data: { session: hashed },
        } = await supabase.auth.getSession();
        if (!hashed) {
          setError(
            "This confirmation link is missing its code, or it was already used. Sign in if you already confirmed.",
          );
          return;
        }
      }

      const next = safeInternalPath(
        requestedNext,
        isRecovery ? "/settings/password" : "/hud",
      );
      finish(next);
    })();
  }, [searchParams]);

  if (error) {
    return (
      <main className={shell}>
        <div className={card}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral-500">
            AuraHUD
          </p>
          <h1 className="mt-2 font-display text-[1.85rem] font-bold leading-tight text-ink-900">
            Couldn’t finish from this link
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-600">{error}</p>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            If you already tapped confirm, your email is verified. Sign in with
            the same password.
          </p>
          <a href={withBasePath("/login/")} className={primaryBtn}>
            Sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className={shell}>
      <div className={`${card} text-center`}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
          AuraHUD
        </p>
        <h1 className="mt-2 font-display text-[1.85rem] font-bold text-ink-900">
          Email confirmed
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          Finishing sign-in… keep this tab open for a moment.
        </p>
      </div>
    </main>
  );
}

export function AuthCallbackApp() {
  return (
    <Suspense
      fallback={
        <main className={shell}>
          <p className="mx-auto text-base font-semibold text-ink-600">
            Finishing sign-in…
          </p>
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
