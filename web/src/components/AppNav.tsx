"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHomeChatSessionLock } from "@/components/home-chat/HomeChatSessionLock";
import { primaryNavLinks, secondaryNavLinks } from "@/lib/app-nav";

function navClass(active: boolean) {
  return `touch-manipulation flex items-center justify-center rounded-xl px-1 py-2.5 text-[10px] font-bold transition sm:px-2 sm:text-xs ${
    active ? "bg-moss-500 text-sand-50" : "text-ink-700 hover:bg-sand-100 active:bg-sand-200"
  }`;
}

function isActivePath(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

/**
 * Bottom tab bar — phones / narrow viewports only.
 * Sits in normal document flow at the bottom of the app shell (not `fixed`)
 * so mobile Safari/Chrome can’t leave a gap after long actions like Sync now.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { locked } = useHomeChatSessionLock();
  const links = primaryNavLinks(locked);

  return (
    <nav
      className="shrink-0 border-t border-ink-900/10 bg-sand-50 lg:hidden"
      aria-label={locked ? "Home Chat session" : "Primary"}
    >
      {locked ? (
        <p className="px-3 pt-2 text-center text-[10px] font-semibold text-ink-500">
          End chat to use HUD, Budget, and other tabs
        </p>
      ) : null}
      <ul
        className={`mx-auto grid max-w-lg gap-0.5 px-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 ${
          locked ? "grid-cols-1" : "grid-cols-6"
        }`}
      >
        {links.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <li key={link.href}>
              {locked ? (
                <span
                  className={`${navClass(true)} pointer-events-none`}
                  aria-current="page"
                  aria-disabled="true"
                >
                  {link.short}
                </span>
              ) : (
                <Link href={link.href} prefetch className={navClass(active)}>
                  {link.short}
                </Link>
              )}
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
  const { locked } = useHomeChatSessionLock();
  const links = primaryNavLinks(locked);
  const secondary = secondaryNavLinks(locked);

  return (
    <nav
      className="hidden w-56 shrink-0 flex-col border-r border-ink-900/10 bg-sand-50/60 px-3 py-6 lg:flex"
      aria-label={locked ? "Home Chat session" : "Primary"}
    >
      <p className="px-2 text-[11px] font-bold uppercase tracking-[0.2em] text-moss-500">
        AuraHUD
      </p>
      {locked ? (
        <p className="mt-2 px-2 text-xs font-semibold text-ink-500">
          End chat to use HUD, Budget, and other tabs
        </p>
      ) : null}
      <ul className="mt-3 space-y-1">
        {links.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <li key={link.href}>
              {locked ? (
                <span
                  className="pointer-events-none flex min-h-11 items-center rounded-xl bg-moss-500 px-3 text-sm font-bold text-sand-50"
                  aria-current="page"
                  aria-disabled="true"
                >
                  {link.label}
                </span>
              ) : (
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
              )}
            </li>
          );
        })}
      </ul>
      {secondary.length > 0 ? (
        <div className="mt-auto space-y-1 px-2 pt-6">
          {secondary.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-xs font-semibold text-ink-500 hover:text-ink-800"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
