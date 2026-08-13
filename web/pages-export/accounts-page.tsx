import { Suspense } from "react";
import { PagesAccountsApp } from "@/components/pages/PagesAccountsApp";

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4 pt-2">
          <div className="h-28 rounded-3xl bg-sand-200/80" />
        </div>
      }
    >
      <PagesAccountsApp />
    </Suspense>
  );
}
