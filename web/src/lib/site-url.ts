import { withBasePath } from "@/lib/base-path";

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

/** Confirmation / magic-link landing page. Uses the live origin in the browser. */
export function authCallbackHref(): string {
  const path = withBasePath("/auth/callback/");
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return absoluteUrl("/auth/callback/");
}

/** Send leftover `?code=` / hash tokens to /auth/callback/ from any other path. */
export function authCallbackCatchScript(): string {
  const dest = JSON.stringify(withBasePath("/auth/callback/"));
  return `(function(){try{var s=location.search||"";var h=location.hash||"";if(!/[?&](code|token_hash)=/.test(s)&&h.indexOf("access_token")===-1)return;if(location.pathname.indexOf("/auth/callback")!==-1)return;location.replace(${dest}+s+h);}catch(e){}})();`;
}
