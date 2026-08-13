"use client";

import { AppShell } from "@/components/AppShell";
import { Money } from "@/components/Money";
import { loadRecentTransactions } from "@/lib/budget-browser";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function PagesTransactionsApp() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      occurred_on: string;
      payee: string;
      amount_cents: number;
    }>
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
      setRows(await loadRecentTransactions(supabase, budgetId));
      setReady(true);
    })().catch((err) => {
      setError(
        err instanceof Error ? err.message : "Could not load transactions.",
      );
      setReady(true);
    });
  }, []);

  return (
    <AppShell title="Transactions" subtitle="Newest first">
      {error ? (
        <p className="mb-4 rounded-xl bg-coral-400/15 px-3 py-2 text-sm text-coral-600">
          {error}
        </p>
      ) : null}
      <section className="card-surface overflow-hidden rounded-2xl">
        {!ready ? (
          <p className="px-4 py-4 text-sm text-ink-600">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-ink-600">No transactions yet.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 border-b border-ink-900/5 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {row.payee || "Transaction"}
                  </p>
                  <p className="text-xs text-ink-500">{row.occurred_on}</p>
                </div>
                <Money cents={row.amount_cents} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
