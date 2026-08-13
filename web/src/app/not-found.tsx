import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center bg-app-glow px-5 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
          AuraHUD
        </p>
        <h1 className="mt-2 font-display text-[1.85rem] font-bold text-ink-900">
          Page not found
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          That link isn&apos;t in this build. If you just confirmed your email,
          sign in next.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/login"
            className="flex min-h-12 w-full touch-manipulation items-center justify-center rounded-2xl bg-ink-900 px-4 py-3.5 text-base font-bold text-sand-50"
          >
            Sign in
          </Link>
          <Link
            href="/hud"
            className="flex min-h-12 w-full touch-manipulation items-center justify-center rounded-2xl border border-ink-900/15 px-4 py-3.5 text-base font-bold text-ink-800"
          >
            Open HUD
          </Link>
        </div>
      </div>
    </main>
  );
}
