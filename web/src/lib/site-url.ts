/** Absolute site origin for invite links and webhooks. */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const pages = process.env.GITHUB_PAGES_URL?.replace(/\/$/, "");
  if (pages) {
    return pages.startsWith("http") ? pages : `https://${pages}`;
  }
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) {
    return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  }
  return "";
}

export function absoluteUrl(path: string): string {
  const origin = siteOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${normalized}` : normalized;
}
