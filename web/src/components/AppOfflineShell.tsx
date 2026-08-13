"use client";

import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineProvider } from "@/components/OfflineProvider";

/** Client wrapper so authenticated pages share one offline cache/outbox. */
export function AppOfflineShell({
  userId,
  budgetId,
  children,
}: {
  userId: string;
  budgetId: string;
  children: React.ReactNode;
}) {
  return (
    <OfflineProvider userId={userId} budgetId={budgetId}>
      <div className="flex min-h-0 flex-1 flex-col">
        <OfflineBanner />
        {children}
      </div>
    </OfflineProvider>
  );
}
