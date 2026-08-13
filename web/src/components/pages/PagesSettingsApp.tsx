"use client";

import { AppShell } from "@/components/AppShell";
import { SecureSignOutButton } from "@/components/SecureSignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function PagesSettingsApp() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(profile?.display_name?.trim() || "");
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 pt-2">
        <div className="h-32 rounded-3xl bg-sand-200/80" />
        <div className="h-40 rounded-3xl bg-sand-200/50" />
      </div>
    );
  }

  return (
    <AppShell title="Settings" subtitle="Account and budget">
      {notice ? (
        <p className="mb-4 rounded-xl bg-moss-500/15 px-3 py-2 text-sm text-moss-700">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-xl bg-coral-400/15 px-3 py-2 text-sm text-coral-600">
          {error}
        </p>
      ) : null}

      <section className="card-surface space-y-3 rounded-2xl p-4">
        <h3 className="font-display text-lg font-bold text-ink-900">Appearance</h3>
        <ThemeToggle />
      </section>

      <section className="mt-4 card-surface space-y-3 rounded-2xl p-4">
        <h3 className="font-display text-lg font-bold text-ink-900">Profile</h3>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
          Email
        </p>
        <p className="text-sm font-semibold text-ink-900">{email || "—"}</p>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const name = displayName.trim();
            if (!name) return;
            setError(null);
            setNotice(null);
            void (async () => {
              const supabase = createClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;
              const { error: updateError } = await supabase
                .from("profiles")
                .update({
                  display_name: name,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);
              if (updateError) {
                setError("Could not update display name.");
                return;
              }
              await supabase.auth.updateUser({ data: { display_name: name } });
              setNotice("Display name saved.");
            })();
          }}
        >
          <label className="block text-sm font-semibold text-ink-700">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-900/10 bg-white px-3 py-3 outline-none ring-moss-400 focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-bold text-sand-50"
          >
            Save name
          </button>
        </form>
      </section>

      <section className="mt-4 card-surface space-y-3 rounded-2xl p-4">
        <h3 className="font-display text-lg font-bold text-ink-900">New budget</h3>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const name = budgetName.trim() || "New budget";
            setError(null);
            setNotice(null);
            void (async () => {
              const supabase = createClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;
              const created = await supabase
                .from("budgets")
                .insert({ name, created_by: user.id })
                .select("id")
                .single();
              if (created.error || !created.data?.id) {
                setError("Could not create budget.");
                return;
              }
              const membership = await supabase.from("budget_members").insert({
                budget_id: created.data.id,
                user_id: user.id,
                role: "owner",
              });
              if (membership.error) {
                setError("Could not create budget.");
                return;
              }
              await supabase
                .from("profiles")
                .update({ current_budget_id: created.data.id })
                .eq("id", user.id);
              setBudgetName("");
              setNotice("Budget created.");
              window.location.reload();
            })();
          }}
        >
          <label className="block text-sm font-semibold text-ink-700">
            Name
            <input
              value={budgetName}
              onChange={(event) => setBudgetName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-900/10 bg-white px-3 py-3 outline-none ring-moss-400 focus:ring-2"
              placeholder="Household"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-moss-600 px-4 py-2 text-sm font-bold text-sand-50"
          >
            Create budget
          </button>
        </form>
      </section>

      <section className="mt-4 card-surface space-y-3 rounded-2xl p-4">
        <h3 className="font-display text-lg font-bold text-ink-900">Session</h3>
        <SecureSignOutButton />
      </section>

      <p className="mt-4 text-xs text-ink-500">
        GitHub Pages is a static host: Plaid bank sync, CSV import, and daily
        cron need a Node server and are not available here. HUD, Home Chat, Trust,
        and the budget lens still run in the browser against your Supabase project.
      </p>
    </AppShell>
  );
}
