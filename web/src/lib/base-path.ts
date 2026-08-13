/** Public URL prefix for GitHub Pages project sites. Empty on a custom domain. */
export function publicBasePath(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
}

export function withBasePath(path: string): string {
  const base = publicBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function isGitHubPagesBuild(): boolean {
  return process.env.GITHUB_PAGES === "1";
}
