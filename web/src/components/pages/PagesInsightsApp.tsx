"use client";

import { AppShell } from "@/components/AppShell";
import Link from "next/link";

export function PagesInsightsApp() {
  return (
    <AppShell title="Insights" subtitle="Trends & tips">
      <p className="text-sm text-ink-600">
        Full insight charts stay on the Node build. On GitHub Pages, use Budget
        and Transactions for the live money picture.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/budget"
          className="rounded-2xl bg-ink-900 px-4 py-3 text-sm font-bold text-sand-50"
        >
          Open Budget
        </Link>
        <Link
          href="/transactions"
          className="rounded-2xl border border-ink-900/15 px-4 py-3 text-sm font-bold text-ink-800"
        >
          Transactions
        </Link>
      </div>
    </AppShell>
  );
}
