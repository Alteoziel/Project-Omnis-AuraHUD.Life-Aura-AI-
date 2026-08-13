import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
          AuraHUD
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          That link isn&apos;t in this build. Head back to the HUD.
        </p>
        <Link
          href="/hud"
          className="mt-6 inline-flex rounded-2xl bg-ink-900 px-4 py-3 text-sm font-bold text-sand-50"
        >
          Open HUD
        </Link>
      </div>
    </main>
  );
}
