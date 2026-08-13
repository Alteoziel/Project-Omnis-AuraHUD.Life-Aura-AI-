"use client";

import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function PasswordUpdateApp() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <AppShell title="New password" subtitle="Confirmed via email">
      <section className="card-surface rounded-2xl p-4">
        <p className="text-sm text-ink-600">
          Choose a new password for this signed-in session. Open the email link
          on this device first.
        </p>
        {notice ? (
          <p className="mt-3 rounded-xl bg-moss-500/15 px-3 py-2 text-sm text-moss-700">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-xl bg-coral-400/15 px-3 py-2 text-sm text-coral-600">
            {error}
          </p>
        ) : null}
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const password = String(form.get("password") ?? "");
            if (password.length < 8) {
              setError("Use at least 8 characters.");
              return;
            }
            setPending(true);
            setError(null);
            void (async () => {
              const supabase = createClient();
              const { error: updateError } = await supabase.auth.updateUser({
                password,
              });
              setPending(false);
              if (updateError) {
                setError(updateError.message);
                return;
              }
              setNotice("Password updated.");
            })();
          }}
        >
          <label className="block text-sm font-semibold text-ink-700">
            New password
            <input
              type="password"
              name="password"
              minLength={8}
              required
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-ink-900/10 bg-white px-3 py-3 outline-none ring-moss-400 focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-bold text-sand-50 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
