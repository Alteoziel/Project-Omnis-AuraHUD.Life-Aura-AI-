import { AppShell } from "@/components/AppShell";
import Link from "next/link";

export default function ImportPage() {
  return (
    <AppShell title="Import" subtitle="YNAB CSV">
      <p className="text-sm text-ink-600">
        CSV import needs a Node host. On GitHub Pages, add transactions from a
        computer running the Next.js server build, or enter them later.
      </p>
      <Link
        href="/settings"
        className="mt-4 inline-flex rounded-2xl bg-ink-900 px-4 py-3 text-sm font-bold text-sand-50"
      >
        Back to Settings
      </Link>
    </AppShell>
  );
}
