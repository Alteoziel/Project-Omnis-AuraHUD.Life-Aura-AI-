"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/hud", label: "HUD", short: "HUD" },
  { href: "/home-chat", label: "Home Chat", short: "Chat" },
  { href: "/budget", label: "Budget", short: "Budget" },
  { href: "/accounts", label: "Accounts", short: "Accounts" },
  { href: "/trust", label: "Trust", short: "Trust" },
  { href: "/settings", label: "Settings", short: "Settings" },
];

function navClass(active: boolean) {
  return `touch-manipulation flex items-center justify-center rounded-xl px-1 py-2.5 text-[10px] font-bold transition sm:px-2 sm:text-xs ${
    active ? "bg-moss-500 text-sand-50" : "text-ink-700 hover:bg-sand-100 active:bg-sand-200"
  }`;
}

/**
 * Bottom tab bar — phones / narrow viewports only.
 * Sits in normal document flow at the bottom of the app shell (not `fixed`)
 * so mobile Safari/Chrome can’t leave a gap after long actions like Sync now.
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="shrink-0 border-t border-ink-900/10 bg-sand-50 lg:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-6 gap-0.5 px-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link href={link.href} prefetch className={navClass(active)}>
                {link.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Left sidebar — desktop / large tablets. */
export function DesktopSideNav() {
  const pathname = usePathname();

  return (
    <nav
      className="hidden w-56 shrink-0 flex-col border-r border-ink-900/10 bg-sand-50/60 px-3 py-6 lg:flex"
      aria-label="Primary"
    >
      <p className="px-2 text-[11px] font-bold uppercase tracking-[0.2em] text-moss-500">
        AuraHUD
      </p>
      <ul className="mt-3 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch
                className={`touch-manipulation flex min-h-11 items-center rounded-xl px-3 text-sm font-bold transition ${
                  active
                    ? "bg-moss-500 text-sand-50"
                    : "text-ink-800 hover:bg-sand-100 active:bg-sand-200"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto space-y-1 px-2 pt-6">
        <Link
          href="/insights"
          className="block text-xs font-semibold text-ink-500 hover:text-ink-800"
        >
          Insights
        </Link>
        <Link
          href="/transactions"
          className="block text-xs font-semibold text-ink-500 hover:text-ink-800"
        >
          Transactions
        </Link>
        <Link
          href="/privacy"
          className="block text-xs font-semibold text-ink-500 hover:text-ink-800"
        >
          Privacy
        </Link>
      </div>
    </nav>
  );
}
