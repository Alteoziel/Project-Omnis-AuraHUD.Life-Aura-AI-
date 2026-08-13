"use client";

import { AppShell } from "@/components/AppShell";
import { Money } from "@/components/Money";
import { loadAccountsWithBalances } from "@/lib/budget-browser";
import { createClient } from "@/lib/supabase/client";
import type { Account } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export function PagesAccountsApp() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("account");
  const [accounts, setAccounts] = useState<
    Array<Account & { balanceCents: number }>
  >([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_budget_id")
        .eq("id", user.id)
        .maybeSingle();
      const { data: memberships } = await supabase
        .from("budget_members")
        .select("budget_id")
        .eq("user_id", user.id);
      const budgetId =
        (profile?.current_budget_id as string | null) ||
        (memberships?.[0]?.budget_id as string | undefined) ||
        null;
      if (!budgetId) {
        setReady(true);
        return;
      }
      const next = await loadAccountsWithBalances(supabase, budgetId);
      setAccounts(next);
      setReady(true);
    })().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load accounts.");
      setReady(true);
    });
  }, []);

  const selected = useMemo(
    () => accounts.find((account) => account.id === selectedId) ?? null,
    [accounts, selectedId],
  );
  const included = accounts.filter((account) => account.include_in_total !== false);
  const total = included.reduce((sum, account) => sum + account.balanceCents, 0);

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 pt-2">
        <div className="h-28 rounded-3xl bg-sand-200/80" />
        <div className="h-48 rounded-3xl bg-sand-200/50" />
      </div>
    );
  }

  return (
    <AppShell
      title={selected ? selected.name : "Accounts"}
      subtitle={selected ? "Account register" : "Balances from your transactions"}
    >
      {error ? (
        <p className="mb-4 rounded-xl bg-coral-400/15 px-3 py-2 text-sm text-coral-600">
          {error}
        </p>
      ) : null}
      <section className="hero-panel animate-rise rounded-2xl px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
          {selected ? "Balance" : "All accounts"}
        </p>
        <p className="mt-1 font-display text-3xl font-bold">
          <Money
            cents={selected ? selected.balanceCents : total}
            className="text-inherit"
          />
        </p>
      </section>
      <section className="animate-rise-delay mt-5 card-surface overflow-hidden rounded-2xl">
        {accounts.length === 0 ? (
          <p className="px-4 py-4 text-sm text-ink-600">No accounts yet.</p>
        ) : (
          <ul>
            {accounts.map((account) => (
              <li key={account.id}>
                <a
                  href={`?account=${encodeURIComponent(account.id)}`}
                  className={`flex items-center justify-between px-4 py-3 text-sm ${
                    selected?.id === account.id
                      ? "bg-moss-500/10 font-bold"
                      : "hover:bg-sand-100"
                  }`}
                >
                  <span className="text-ink-900">{account.name}</span>
                  <Money cents={account.balanceCents} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
