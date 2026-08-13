import Link from "next/link";

export const metadata = {
  title: "Privacy · AuraHUD",
  description:
    "How AuraHUD handles life data: local-first capture, Cloud AI off by default, no ad business.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-app-glow px-6 py-12">
      <article className="mx-auto max-w-2xl space-y-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-moss-500">
          AuraHUD
        </p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          Privacy that matches the code
        </h1>
        <p className="text-ink-700">
          AuraHUD / Life Aura is a life HUD — not an ad platform. We do not sell
          your personal information. We do not build a behavioral ad graph. We
          do not want to be trusted the way people are asked to trust Meta.
        </p>

        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            What we collect
          </h2>
          <p className="text-sm text-ink-700">
            Account auth data, tasks and captures you enter, budget data in the
            Alte’ lens, correction feedback (✓ ✗ ✎), privacy preferences, and
            AI receipts (purpose + word count + provider — not a warehouse of
            prompt bodies for marketing).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            Cloud AI
          </h2>
          <p className="text-sm text-ink-700">
            <strong>Default: Off.</strong> Capture runs on local rules. If you
            turn Cloud AI on later, only minimized snippets needed for that
            action may be sent to a provider under no-training / zero-retention
            where available. You can turn it off anytime in Trust.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            Corrections
          </h2>
          <p className="text-sm text-ink-700">
            If you tap ✗, we store that the interpretation was wrong — even if
            you don&apos;t explain why — so Aura does not silently re-assume it.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            What we don&apos;t do
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
            <li>Sell or rent your life data</li>
            <li>Content analytics for ads</li>
            <li>God-mode staff browsing of your journal/budget/texts</li>
            <li>Train public models on your private captures</li>
          </ul>
        </section>

        <p className="text-sm text-ink-600">
          Architecture notes live in the open repo under{" "}
          <code className="text-xs">docs/aurahud/SECURITY_ARCHITECTURE.md</code>.
        </p>

        <Link
          href="/"
          className="inline-flex rounded-xl bg-ink-900 px-4 py-3 text-sm font-bold text-sand-50"
        >
          Back
        </Link>
      </article>
    </main>
  );
}
