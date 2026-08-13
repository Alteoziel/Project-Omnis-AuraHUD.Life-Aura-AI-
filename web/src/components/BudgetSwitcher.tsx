"use client";

import { createClient } from "@/lib/supabase/client";
import { withBasePath } from "@/lib/base-path";
import type { BudgetRole } from "@/lib/types";
import { useState } from "react";

export function BudgetSwitcher({
  budgets,
  activeId,
}: {
  budgets: Array<{ id: string; name: string; role: BudgetRole }>;
  activeId: string;
}) {
  const [pending, setPending] = useState(false);

  if (budgets.length <= 1) {
    const only = budgets[0];
    return (
      <p className="text-xs font-semibold text-ink-600">
        {only?.name ?? "Budget"}
        {only ? ` · ${only.role}` : ""}
      </p>
    );
  }

  return (
    <label className="block text-[11px] font-bold uppercase tracking-wide text-ink-600">
      Budget
      <select
        name="budget_id"
        defaultValue={activeId}
        disabled={pending}
        onChange={(event) => {
          const budgetId = event.currentTarget.value;
          setPending(true);
          void (async () => {
            const supabase = createClient();
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
              window.location.assign(withBasePath("/login"));
              return;
            }
            await supabase
              .from("profiles")
              .update({ current_budget_id: budgetId })
              .eq("id", user.id);
            window.location.reload();
          })();
        }}
        className="mt-1 min-h-11 w-full max-w-[14rem] touch-manipulation rounded-lg border border-ink-900/10 bg-white px-2 py-2 text-sm font-semibold text-ink-900 outline-none ring-moss-400 focus:ring-2"
      >
        {budgets.map((budget) => (
          <option key={budget.id} value={budget.id}>
            {budget.name} ({budget.role})
          </option>
        ))}
      </select>
    </label>
  );
}
