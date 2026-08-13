"use client";

import { AppShell } from "@/components/AppShell";
import { Money } from "@/components/Money";
import {
  loadBudgetLens,
  saveAssignment,
} from "@/lib/budget-browser";
import { currentBudgetMonth, dollarsToCents, formatBudgetMonth } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import type { BudgetRow } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

export function PagesBudgetApp() {
  const month = currentBudgetMonth();
  const [readyToAssign, setReadyToAssign] = useState(0);
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function reload(client = createClient()) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;
    const { data: profile } = await client
      .from("profiles")
      .select("current_budget_id")
      .eq("id", user.id)
      .maybeSingle();
    const { data: memberships } = await client
      .from("budget_members")
      .select("budget_id")
      .eq("user_id", user.id);
    const id =
      (profile?.current_budget_id as string | null) ||
      (memberships?.[0]?.budget_id as string | undefined) ||
      null;
    if (!id) {
      setBudgetId(null);
      setUserId(user.id);
      setReady(true);
      return;
    }
    const lens = await loadBudgetLens(client, id, month);
    setUserId(user.id);
    setBudgetId(id);
    setRows(lens.rows);
    setReadyToAssign(lens.readyToAssignCents);
    setReady(true);
  }

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load budget.");
        setReady(true);
      }
    })();
    // Initial browser fetch only — reload() is also used after saving assignments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; categories: BudgetRow[] }>();
    for (const row of rows) {
      const existing = map.get(row.groupId);
      if (existing) existing.categories.push(row);
      else map.set(row.groupId, { name: row.groupName, categories: [row] });
    }
    return [...map.values()];
  }, [rows]);

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 pt-2">
        <div className="h-28 rounded-3xl bg-sand-200/80" />
        <div className="h-48 rounded-3xl bg-sand-200/50" />
      </div>
    );
  }

  if (!budgetId) {
    return (
      <AppShell title="Budget" subtitle="Alte’ lens">
        <p className="text-sm text-ink-600">
          Create a budget in Settings to use the money lens.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Budget" subtitle={formatBudgetMonth(month)}>
      {error ? (
        <p className="mb-4 rounded-xl bg-coral-400/15 px-3 py-2 text-sm text-coral-600">
          {error}
        </p>
      ) : null}
      <section className="hero-panel animate-rise rounded-2xl px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
          Ready to assign
        </p>
        <p className="mt-1 font-display text-3xl font-bold">
          <Money cents={readyToAssign} className="text-inherit" />
        </p>
      </section>

      <div className="mt-5 space-y-4">
        {groups.length === 0 ? (
          <p className="text-sm text-ink-600">No categories yet.</p>
        ) : (
          groups.map((group) => (
            <section
              key={group.name}
              className="card-surface overflow-hidden rounded-2xl"
            >
              <h2 className="border-b border-ink-900/8 px-4 py-3 font-display text-lg font-bold text-ink-900">
                {group.name}
              </h2>
              <ul>
                {group.categories.map((row) => (
                  <li
                    key={row.categoryId}
                    className="flex items-center justify-between gap-3 border-b border-ink-900/5 px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {row.categoryName}
                      </p>
                      <p className="text-xs text-ink-500">
                        Activity{" "}
                        <Money cents={row.activityCents} /> · Available{" "}
                        <Money cents={row.availableCents} />
                      </p>
                    </div>
                    <form
                      className="flex shrink-0 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const raw =
                          drafts[row.categoryId] ??
                          String(row.assignedCents / 100);
                        const cents = dollarsToCents(raw);
                        if (cents == null || !userId || !budgetId) return;
                        setError(null);
                        void saveAssignment({
                          supabase: createClient(),
                          userId,
                          budgetId,
                          categoryId: row.categoryId,
                          month,
                          assignedCents: cents,
                        })
                          .then(() => reload())
                          .catch((err) =>
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Could not save assignment.",
                            ),
                          );
                      }}
                    >
                      <input
                        inputMode="decimal"
                        value={
                          drafts[row.categoryId] ??
                          (row.assignedCents / 100).toFixed(2)
                        }
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [row.categoryId]: event.target.value,
                          }))
                        }
                        className="w-24 rounded-lg border border-ink-900/10 bg-white px-2 py-2 text-right text-sm outline-none ring-moss-400 focus:ring-2"
                        aria-label={`Assigned for ${row.categoryName}`}
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-ink-900 px-2 py-2 text-xs font-bold text-sand-50"
                      >
                        Set
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </AppShell>
  );
}
