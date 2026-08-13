"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DesktopSideNav, MobileBottomNav } from "@/components/AppNav";
import { AppLiveShell } from "@/components/AppLiveShell";
import { AppOfflineShell } from "@/components/AppOfflineShell";
import { BudgetSwitcher } from "@/components/BudgetSwitcher";
import { CollaboratorsBadge } from "@/components/CollaboratorsBadge";
import { createClient } from "@/lib/supabase/client";
import type { Budget, BudgetRole } from "@/lib/types";

type Active = {
  budget: Budget;
  role: BudgetRole;
  userId: string;
};

function isImmersivePath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/home-chat"));
}

export function ClientAppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const immersive = isImmersivePath(pathname);
  const [displayName, setDisplayName] = useState("You");
  const [active, setActive] = useState<Active | null>(null);
  const [budgets, setBudgets] = useState<Array<Budget & { role: BudgetRole }>>(
    [],
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }
        const { data: memberships } = await supabase
          .from("budget_members")
          .select("role, budget_id")
          .eq("user_id", user.id);
        const ids = (memberships ?? []).map((row) => row.budget_id as string);
        let nextBudgets: Array<Budget & { role: BudgetRole }> = [];
        if (ids.length) {
          const { data: budgetRows } = await supabase
            .from("budgets")
            .select("id, name, created_by")
            .in("id", ids);
          const byId = new Map(
            (budgetRows ?? []).map((row) => [row.id as string, row as Budget]),
          );
          nextBudgets = (memberships ?? [])
            .map((row) => {
              const budget = byId.get(row.budget_id as string);
              if (!budget) return null;
              return { ...budget, role: row.role as BudgetRole };
            })
            .filter(Boolean) as Array<Budget & { role: BudgetRole }>;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, current_budget_id")
          .eq("id", user.id)
          .maybeSingle();
        const preferred =
          (profile?.current_budget_id as string | null) ||
          nextBudgets[0]?.id ||
          null;
        const selected =
          nextBudgets.find((budget) => budget.id === preferred) ??
          nextBudgets[0] ??
          null;
        if (cancelled) return;
        setDisplayName(profile?.display_name?.trim() || "You");
        setBudgets(nextBudgets);
        setActive(
          selected
            ? { budget: selected, role: selected.role, userId: user.id }
            : null,
        );
      } catch {
        // Render the page without budget chrome rather than hanging on a blank shell.
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const body = (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-app-glow">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1">
        <DesktopSideNav />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {immersive ? null : (
            <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-500 sm:text-xs">
                  AuraHUD
                </p>
                {active ? (
                  <div className="mt-2 max-w-xs">
                    <BudgetSwitcher
                      budgets={budgets}
                      activeId={active.budget.id}
                    />
                  </div>
                ) : null}
              </div>
              {active ? (
                <div className="shrink-0 pt-1">
                  <CollaboratorsBadge />
                </div>
              ) : null}
            </header>
          )}
          <main
            className={
              immersive
                ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                : "mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto overscroll-y-contain px-4 pb-8 pt-2 sm:px-6 lg:mx-0 lg:max-w-3xl lg:px-8 lg:pb-10"
            }
          >
            {!ready ? (
              <div className="animate-pulse space-y-4 p-4">
                <div className="h-8 w-40 rounded-xl bg-sand-200/80" />
                <div className="h-48 rounded-3xl bg-sand-200/50" />
              </div>
            ) : active ? (
              <AppOfflineShell userId={active.userId} budgetId={active.budget.id}>
                {children}
              </AppOfflineShell>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );

  return (
    <AppLiveShell
      budgetId={active?.budget.id}
      userId={active?.userId}
      displayName={displayName}
    >
      {body}
    </AppLiveShell>
  );
}
