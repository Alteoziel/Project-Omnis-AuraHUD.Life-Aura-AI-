"use client";

import { CloudAiToggle } from "@/components/aura/CloudAiToggle";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Receipt = {
  id: string;
  purpose: string;
  word_count: number;
  provider: string;
  created_at: string;
};

export default function TrustPage() {
  const [cloudAi, setCloudAi] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [correctionCount, setCorrectionCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: settings } = await supabase
        .from("aura_privacy_settings")
        .select("cloud_ai_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: nextReceipts } = await supabase
        .from("aura_ai_receipts")
        .select("id, purpose, word_count, provider, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      const { count } = await supabase
        .from("aura_corrections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setCloudAi(settings?.cloud_ai_enabled === true);
      setReceipts((nextReceipts as Receipt[] | null) ?? []);
      setCorrectionCount(count ?? 0);
      setReady(true);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-500">
          Trust
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink-900">
          Your data, your rules
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          AuraHUD is built so you don&apos;t have to trust a brand speech — Cloud
          AI stays off until you opt in, and an ✗ is never forgotten.
        </p>
      </div>

      {ready ? <CloudAiToggle initialEnabled={cloudAi} /> : null}

      <section className="rounded-2xl border border-ink-900/10 bg-sand-50/80 p-4">
        <p className="text-sm font-bold text-ink-900">Correction Memory</p>
        <p className="mt-1 text-xs text-ink-600">
          Rejected captures stored as hard constraints:{" "}
          <strong>{correctionCount}</strong>
        </p>
      </section>

      <section className="rounded-2xl border border-ink-900/10 bg-sand-50/80 p-4">
        <p className="text-sm font-bold text-ink-900">Recent AI receipts</p>
        <ul className="mt-3 space-y-2">
          {receipts.length === 0 ? (
            <li className="text-xs text-ink-600">No AI processing yet.</li>
          ) : (
            receipts.map((row) => (
              <li key={row.id} className="text-xs text-ink-700">
                <span className="font-semibold">{row.purpose}</span> · {row.word_count}{" "}
                words · {row.provider} ·{" "}
                {new Date(row.created_at).toLocaleString()}
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="text-sm text-ink-600">
        Full policy:{" "}
        <Link href="/privacy" className="font-bold text-moss-700 underline-offset-2 hover:underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/settings" className="font-bold text-moss-700 underline-offset-2 hover:underline">
          Account settings
        </Link>
      </p>
    </div>
  );
}
