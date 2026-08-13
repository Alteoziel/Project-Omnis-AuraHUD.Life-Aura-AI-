"use client";

import { withBasePath } from "@/lib/base-path";
import { purgePrivateOfflineData } from "@/lib/offline/db";
import { createClient } from "@/lib/supabase/client";
import { useTransition } from "react";

export function SecureSignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await purgePrivateOfflineData();
          } finally {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.assign(withBasePath("/login"));
          }
        });
      }}
      className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-bold text-sand-50 hover:bg-ink-800 disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
