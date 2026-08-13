"use client";

import Link from "next/link";
import { withBasePath } from "@/lib/base-path";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function InviteAcceptApp({ token }: { token: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
        <div className="mx-auto h-64 w-full max-w-md animate-pulse rounded-2xl bg-sand-200/50" />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md card-surface rounded-2xl p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
          AuraHUD
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">
          Join a budget
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Someone invited you to collaborate with a specific role.
        </p>
        {error ? (
          <p className="mt-4 rounded-xl bg-coral-400/15 px-3 py-2 text-sm text-coral-500">
            {error}
          </p>
        ) : null}

        {signedIn ? (
          <button
            type="button"
            disabled={pending || !token}
            onClick={() => {
              setPending(true);
              setError(null);
              void (async () => {
                const supabase = createClient();
                const { data, error: rpcError } = await supabase.rpc(
                  "accept_budget_invite",
                  { p_token: token },
                );
                if (rpcError) {
                  setError(rpcError.message);
                  setPending(false);
                  return;
                }
                const budgetId = String(data ?? "");
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (user && budgetId) {
                  await supabase
                    .from("profiles")
                    .update({ current_budget_id: budgetId })
                    .eq("id", user.id);
                }
                window.location.assign(withBasePath("/budget"));
              })();
            }}
            className="mt-6 w-full rounded-2xl bg-ink-900 px-4 py-3.5 text-sm font-bold text-sand-50 disabled:opacity-60"
          >
            {pending ? "Joining…" : "Accept invite"}
          </button>
        ) : (
          <div className="mt-6 space-y-3">
            <Link
              href={`/login?next=${encodeURIComponent(`/invite/?token=${token}`)}`}
              className="flex min-h-11 w-full touch-manipulation items-center justify-center rounded-2xl bg-ink-900 px-4 py-3.5 text-sm font-bold text-sand-50"
            >
              Sign in to accept
            </Link>
            <Link
              href={`/login?mode=signup&next=${encodeURIComponent(`/invite/?token=${token}`)}`}
              className="flex min-h-11 w-full touch-manipulation items-center justify-center rounded-2xl bg-moss-500 px-4 py-3.5 text-sm font-bold text-sand-50"
            >
              Create account to accept
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
