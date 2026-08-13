"use client";

import { PasskeySetupPanel } from "@/components/PasskeySetupPanel";
import { withBasePath } from "@/lib/base-path";
import { safeInternalPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function PasskeySetupForm() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeInternalPath(searchParams.get("next") ?? "/hud"),
    [searchParams],
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign(
          withBasePath(
            `/login?next=${encodeURIComponent("/passkey-setup")}`,
          ),
        );
        return;
      }
      try {
        const { data, error } = await supabase.auth.passkey.list();
        if (!error && (data?.length ?? 0) > 0) {
          window.location.assign(withBasePath(nextPath));
          return;
        }
      } catch {
        // Passkeys may be disabled on the project — still show the setup UI.
      }
      setReady(true);
    })();
  }, [nextPath]);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
        <div className="mx-auto h-64 w-full max-w-md animate-pulse rounded-2xl bg-sand-200/50" />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
      <div className="mx-auto w-full max-w-md animate-rise card-surface rounded-2xl p-6 backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
          AuraHUD
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">
          Set up a passkey
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Sign in next time with Face ID, Touch ID, or your device PIN — faster
          than a password, and harder to phish.
        </p>
        <PasskeySetupPanel next={nextPath} />
      </div>
    </main>
  );
}

export default function PasskeySetupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
          <div className="mx-auto h-64 w-full max-w-md animate-pulse rounded-2xl bg-sand-200/50" />
        </main>
      }
    >
      <PasskeySetupForm />
    </Suspense>
  );
}
