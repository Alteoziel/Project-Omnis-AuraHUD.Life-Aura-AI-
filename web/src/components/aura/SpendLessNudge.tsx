import Link from "next/link";

/** Soft spend-less nudge — math is illustrative until budget crossover is wired. */
export function SpendLessNudge() {
  return (
    <aside className="rounded-2xl border border-moss-500/25 bg-gradient-to-br from-moss-500/10 to-transparent px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-600">
        Spend-less nudge
      </p>
      <p className="mt-2 text-sm font-semibold text-ink-900">
        Cutting 2 takeaways a week can fund a vacation flight in months — saving
        keeps more than earning the same after tax.
      </p>
      <Link
        href="/budget"
        className="mt-3 inline-flex text-sm font-bold text-moss-700 underline-offset-2 hover:underline"
      >
        Open Budget lens
      </Link>
    </aside>
  );
}
