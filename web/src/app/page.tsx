import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-app-glow">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_80%_-10%,rgba(42,157,143,0.28),transparent_55%),radial-gradient(700px_420px_at_0%_80%,rgba(233,196,106,0.12),transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col justify-between px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 sm:py-10">
        <header className="animate-rise flex items-center justify-between gap-4">
          <p className="font-display text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
            AuraHUD
          </p>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-600 underline-offset-2 hover:underline"
          >
            Privacy
          </Link>
        </header>

        <section className="animate-rise-delay max-w-2xl py-10 sm:py-16">
          <h1 className="font-display text-[2.15rem] font-semibold leading-[1.08] text-ink-900 sm:text-5xl md:text-6xl">
            Your life, one calm HUD — not ten noisy apps.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-700 sm:mt-5 sm:text-lg">
            Capture in seconds. Life Aura routes tasks and money quietly. Cloud
            AI stays off until you say otherwise.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Link
              href="/login?mode=signup"
              className="flex min-h-12 w-full touch-manipulation items-center justify-center rounded-2xl bg-ink-900 px-5 py-4 text-base font-bold text-sand-50 transition hover:bg-ink-800 sm:w-auto"
            >
              Try the free demo
            </Link>
            <Link
              href="/login"
              className="flex min-h-12 w-full touch-manipulation items-center justify-center rounded-2xl border border-ink-900/15 bg-sand-50/70 px-5 py-4 text-base font-bold text-ink-800 sm:w-auto"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <div
          aria-hidden
          className="animate-rise mb-2 overflow-hidden rounded-[1.75rem] border border-ink-900/10 bg-ink-950/90 p-5 text-sand-50 shadow-soft sm:mb-4 sm:p-8"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-300">
            Today stream
          </p>
          <p className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
            Now · Call the landlord
          </p>
          <p className="mt-2 text-sm text-sand-200">
            Next · Buy milk · Budget nudge: two fewer takeouts → vacation fund
          </p>
          <p className="mt-4 text-xs text-sand-300">
            Captured with local rules · ✓ ✗ ✎ · nothing sent to cloud AI
          </p>
        </div>
      </div>
    </main>
  );
}
