/** Public URL prefix for GitHub Pages project sites. Empty on a custom domain. */
export function publicBasePath(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
}

/** GitHub Pages only serves `dir/index.html` at `dir/`, not `dir`. */
export function withPagesTrailingSlash(path: string): string {
  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = withoutHash.indexOf("?");
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : "";
  let pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname !== "/" && !pathname.endsWith("/")) pathname += "/";
  return `${pathname}${query}${hash}`;
}

export function withBasePath(path: string): string {
  const base = publicBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const next = isGitHubPagesBuild()
    ? withPagesTrailingSlash(normalized)
    : normalized;
  return `${base}${next}`;
}

export function isGitHubPagesBuild(): boolean {
  return process.env.GITHUB_PAGES === "1";
}
