export const APP_NAV_LINKS = [
  { href: "/hud", label: "HUD", short: "HUD" },
  { href: "/home-chat", label: "Home Chat", short: "Chat" },
  { href: "/budget", label: "Budget", short: "Budget" },
  { href: "/accounts", label: "Accounts", short: "Accounts" },
  { href: "/trust", label: "Trust", short: "Trust" },
  { href: "/settings", label: "Settings", short: "Settings" },
] as const;

export const APP_NAV_SECONDARY_LINKS = [
  { href: "/insights", label: "Insights" },
  { href: "/transactions", label: "Transactions" },
  { href: "/privacy", label: "Privacy" },
] as const;

export const HOME_CHAT_HREF = "/home-chat";

/** Pairing or a live nearby chat — leaving the page hangs up the session. */
export function homeChatLocksAppNav(phase: string): boolean {
  return phase !== "idle";
}

export function primaryNavLinks(sessionLocked: boolean) {
  if (!sessionLocked) return [...APP_NAV_LINKS];
  return APP_NAV_LINKS.filter((link) => link.href === HOME_CHAT_HREF);
}

export function secondaryNavLinks(sessionLocked: boolean) {
  if (sessionLocked) return [];
  return [...APP_NAV_SECONDARY_LINKS];
}
