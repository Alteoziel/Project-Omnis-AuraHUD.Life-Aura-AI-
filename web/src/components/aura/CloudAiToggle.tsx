"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function CloudAiToggle({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !enabled;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in to change this.");
        return;
      }
      const { error: updateError } = await supabase
        .from("aura_privacy_settings")
        .upsert({
          user_id: user.id,
          cloud_ai_enabled: next,
          updated_at: new Date().toISOString(),
        });
      if (updateError) {
        setError("Could not update privacy setting");
        return;
      }
      setEnabled(next);
    });
  }

  return (
    <div className="rounded-2xl border border-ink-900/10 bg-sand-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-900">Cloud AI</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            Default is <strong>Off</strong>. Capture still works with local rules.
            When On, only minimized snippets can leave the device — never your
            whole vault. We do not sell your data.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={toggle}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${
            enabled ? "bg-moss-600" : "bg-ink-300"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-sand-50 transition ${
              enabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
      <p className="mt-3 text-xs font-semibold text-ink-500">
        Status: {enabled ? "On (opt-in)" : "Off — local only"}
      </p>
      {enabled ? (
        <p className="mt-2 text-xs text-coral-700">
          Note: cloud provider path is gated until zero-retention wiring is ready.
          Toggling On records your preference; routing still uses local rules.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-coral-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
