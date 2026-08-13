/**
 * Static GitHub Pages export.
 *
 * Next.js `output: 'export'` cannot include API routes, middleware, or pages
 * that call cookies()/server actions. This script stashes those files, copies
 * browser-only overlays, builds, then restores the tree.
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const webDir = join(scriptsDir, "..");
const stashDir = join(webDir, ".pages-stash");
const exportDir = join(webDir, "pages-export");

const overlays = [
  ["layout.tsx", "src/app/layout.tsx"],
  ["budget-page.tsx", "src/app/(app)/budget/page.tsx"],
  ["accounts-page.tsx", "src/app/(app)/accounts/page.tsx"],
  ["transactions-page.tsx", "src/app/(app)/transactions/page.tsx"],
  ["insights-page.tsx", "src/app/(app)/insights/page.tsx"],
  ["import-page.tsx", "src/app/(app)/import/page.tsx"],
  ["settings-page.tsx", "src/app/(app)/settings/page.tsx"],
  ["settings-password-page.tsx", "src/app/(app)/settings/password/page.tsx"],
  ["invite-page.tsx", "src/app/(auth)/invite/page.tsx"],
  ["auth-callback-page.tsx", "src/app/auth/callback/page.tsx"],
];

const stashPaths = [
  "src/app/api",
  "src/middleware.ts",
  "src/app/auth/callback/route.ts",
  "src/app/(app)/accounts/[id]",
  "src/app/(auth)/invite/[token]",
  ...overlays.map(([, dest]) => dest),
];

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function stash(relPath) {
  const from = join(webDir, relPath);
  if (!existsSync(from)) return;
  const to = join(stashDir, relPath);
  ensureDir(dirname(to));
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  rmSync(from, { recursive: true, force: true });
}

let overlayCreated = [];
function applyOverlays() {
  overlayCreated = [];
  for (const [srcName, dest] of overlays) {
    const from = join(exportDir, srcName);
    const to = join(webDir, dest);
    if (!existsSync(to) && !existsSync(join(stashDir, dest))) {
      overlayCreated.push(dest);
    }
    ensureDir(dirname(to));
    copyFileSync(from, to);
  }
}

function restore() {
  if (!existsSync(stashDir) && overlayCreated.length === 0) return;
  for (const relPath of overlayCreated) {
    const to = join(webDir, relPath);
    if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  }
  if (!existsSync(stashDir)) return;
  for (const relPath of stashPaths) {
    const from = join(stashDir, relPath);
    if (!existsSync(from)) continue;
    const to = join(webDir, relPath);
    if (existsSync(to)) rmSync(to, { recursive: true, force: true });
    ensureDir(dirname(to));
    cpSync(from, to, { recursive: true });
  }
  rmSync(stashDir, { recursive: true, force: true });
}

function prefixPublicJson(basePath) {
  const out = join(webDir, "out");
  const manifestPath = join(out, "manifest.webmanifest");
  let raw;
  try {
    raw = readFileSync(manifestPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
  const manifest = JSON.parse(raw);
  const prefix = (value) => {
    if (typeof value !== "string" || !value.startsWith("/")) return value;
    if (!basePath) return value;
    return `${basePath}${value}`;
  };
  manifest.start_url = prefix(manifest.start_url || "/hud");
  manifest.scope = prefix(manifest.scope || "/");
  manifest.id = prefix(manifest.id || "/");
  if (Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons.map((icon) => ({
      ...icon,
      src: prefix(icon.src),
    }));
  }
  const nextPath = `${manifestPath}.tmp`;
  writeFileSync(nextPath, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(nextPath, manifestPath);
}

function writeNoJekyll() {
  writeFileSync(join(webDir, "out", ".nojekyll"), "");
}

function writeSpaFallback(basePath) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0b1220" />
    <title>AuraHUD</title>
    <script>
      (function () {
        var repo = ${JSON.stringify(basePath)};
        var path = location.pathname;
        var search = location.search;
        var hash = location.hash;
        var rel = path;
        if (repo && rel.indexOf(repo) === 0) rel = rel.slice(repo.length) || "/";
        function go(p, q) {
          var next = (repo || "") + p + (q || search || "") + hash;
          var nextPath = next.split("?")[0].split("#")[0];
          if (nextPath === path || nextPath + "/" === path || path + "/" === nextPath) return;
          location.replace(next);
        }
        var acc = rel.match(/^\\/accounts\\/([^/]+)\\/?$/);
        if (acc && acc[1]) {
          var accountQuery = new URLSearchParams();
          accountQuery.set("account", acc[1]);
          return go("/accounts/", "?" + accountQuery.toString());
        }
        var inv = rel.match(/^\\/invite\\/([^/]+)\\/?$/);
        if (inv && inv[1]) {
          var inviteQuery = new URLSearchParams();
          inviteQuery.set("token", inv[1]);
          return go("/invite/", "?" + inviteQuery.toString());
        }
        if (search.indexOf("code=") >= 0 || search.indexOf("token_hash=") >= 0) {
          return go("/auth/callback/", search);
        }
        if (/^\\/auth\\/callback\\/?$/.test(rel)) return go("/auth/callback/", search);
        if (/^\\/login\\/?$/.test(rel)) return go("/login/", search);
        if (/^\\/hud\\/?$/.test(rel)) return go("/hud/", search);
        go("/");
      })();
    </script>
  </head>
  <body style="background:#0b1220;color:#e8eef4;font-family:system-ui,sans-serif;margin:0;min-height:100dvh"></body>
</html>
`;
  writeFileSync(join(webDir, "out", "404.html"), html);
}

let failed = false;
try {
  rmSync(stashDir, { recursive: true, force: true });
  ensureDir(stashDir);
  for (const relPath of stashPaths) stash(relPath);
  applyOverlays();

  const result = spawnSync("npx", ["next", "build"], {
    cwd: webDir,
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_PAGES: "1",
    },
  });
  if (result.status !== 0) {
    failed = true;
    process.exitCode = result.status ?? 1;
  } else {
    const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(
      /\/$/,
      "",
    );
    writeNoJekyll();
    writeSpaFallback(basePath);
    prefixPublicJson(basePath);
  }
} catch (error) {
  failed = true;
  console.error(error);
  process.exitCode = 1;
} finally {
  restore();
}

if (failed) {
  console.error("GitHub Pages build failed; source tree restored.");
} else {
  console.log("GitHub Pages export ready in web/out");
}
