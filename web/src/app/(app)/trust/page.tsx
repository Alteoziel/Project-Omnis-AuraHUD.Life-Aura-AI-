import { CloudAiToggle } from "@/components/aura/CloudAiToggle";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TrustPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: settings } = await supabase
    .from("aura_privacy_settings")
    .select("cloud_ai_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: receipts } = await supabase
    .from("aura_ai_receipts")
    .select("id, purpose, word_count, provider, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: correctionCount } = await supabase
    .from("aura_corrections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

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

      <CloudAiToggle initialEnabled={settings?.cloud_ai_enabled === true} />

      <section className="rounded-2xl border border-ink-900/10 bg-sand-50/80 p-4">
        <p className="text-sm font-bold text-ink-900">Correction Memory</p>
        <p className="mt-1 text-xs text-ink-600">
          Rejected captures stored as hard constraints:{" "}
          <strong>{correctionCount ?? 0}</strong>
        </p>
      </section>

      <section className="rounded-2xl border border-ink-900/10 bg-sand-50/80 p-4">
        <p className="text-sm font-bold text-ink-900">Recent AI receipts</p>
        <ul className="mt-3 space-y-2">
          {(receipts ?? []).length === 0 ? (
            <li className="text-xs text-ink-600">No AI processing yet.</li>
          ) : (
            (receipts ?? []).map((r) => (
              <li key={r.id} className="text-xs text-ink-700">
                <span className="font-semibold">{r.purpose}</span> · {r.word_count}{" "}
                words · {r.provider} ·{" "}
                {new Date(r.created_at).toLocaleString()}
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
