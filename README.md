# AuraHUD (Project Omnis)

Private, voice-first **life HUD** powered by Life Aura. Alte’ Budgeting remains the money lens inside the same app.

PR quality gates from the governance stack stay in place. Product plans: [`docs/aurahud/`](docs/aurahud/).

| Piece | Path | Purpose |
|-------|------|---------|
| **Product app** | [`web/`](web/) | AuraHUD + Alte’ Budget lens (Next.js PWA) |
| **AuraHUD docs** | [`docs/aurahud/`](docs/aurahud/) | Demo plan, feature list, long-term plan, security |
| **DB migrations** | [`supabase/migrations/`](supabase/migrations/) | Schema + RLS (budget + AuraHUD core) |
| **PR governance** | [`governance/`](governance/) | Automated Steps 1–5 on every PR |
| **Human review** | [`dashboard/`](dashboard/) | Approve / reject / merge findings |
| **CI hygiene** | [`.github/workflows/`](.github/workflows/) | Gitleaks, audits, CodeQL, Semgrep, builds |

> Operator steps for merge protection: [`SETUP_GOVERNANCE.md`](SETUP_GOVERNANCE.md)  
> Security checklist: [`SECURITY_OPERATOR_CHECKLIST.md`](SECURITY_OPERATOR_CHECKLIST.md)  
> AuraHUD security model: [`docs/aurahud/SECURITY_ARCHITECTURE.md`](docs/aurahud/SECURITY_ARCHITECTURE.md)

## Product

### AuraHUD (new)

- Today Stream HUD (Now / Next / Captured) with unified command bar
- Local-first intent routing (Cloud AI **off by default**)
- Correction Memory (✗ is never silently re-assumed)
- Trust controls + AI receipts + public Privacy page
- Spend-less nudge → Budget lens

### Alte’ Budgeting (lens)

- Multi-budget manager with role invite links (unlimited uses, Share on mobile)
- Category auto-assign by percentage of Ready to Assign
- Profile management (display name + password)
- Budget screen (categories, assigned / activity / available)
- Accounts + transaction register
- Insights charts + rule-based trend tips
- YNAB register / Reflect **CSV import**
- Offline PWA: service worker caches app shell; cold starts paint from cache (stale-while-revalidate) with a dark splash so dark mode doesn’t flash white
- Hosted on **GitHub Pages** (static export). Plaid bank sync / daily cron need a Node host and are not available on Pages
- Supabase Auth + budget-scoped RLS
- Passkey (WebAuthn) or email/password sign-in (either works)
- Installable PWA shell

## Quickstart — AuraHUD / Alte' (cloud only)

This app is meant to run on **GitHub Pages** as a static PWA. The browser talks to **Supabase** directly (anon key + RLS). There is no Vercel deploy.

### 1. Supabase

1. Create a Supabase project
2. Run **all** SQL files in [`supabase/migrations/`](supabase/migrations/) in order in the SQL editor (including multi-budget, Plaid, AuraHUD core, and Home Chat migrations). Skipping these causes logged-in pages to fail. Home Chat (`20260813010000_home_chat.sql`) is safe to re-run after a partial apply: it no longer requires `can_access_budget_realtime_topic` (that helper only exists if the older Alte’ budget migrations were applied).
3. Enable Email auth (password) under Authentication → Providers
4. Enable **Passkeys** under Authentication → Passkeys (beta). Set Relying Party display name to `AuraHUD`, RP ID to your Pages host (e.g. `alteoziel.github.io`), and origins to your HTTPS Pages URL (plus `http://localhost:3000` for local). Also allow `/auth/callback/` redirects under Authentication → URL Configuration. Set **Site URL** to the Pages origin (include the repo path if this is a project site).

### 2. GitHub Actions variables

1. Repo → **Settings → Secrets and variables → Actions → Variables**
2. Set the public keys listed in [`web/doppler.secrets.example`](web/doppler.secrets.example):
   - Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Invites / auth redirects: `NEXT_PUBLIC_SITE_URL` (example: `https://alteoziel.github.io/Project-Omnis-AuraHUD.Life-Aura-AI-`)
   - Optional: `NEXT_PUBLIC_BASE_PATH` (defaults to `/<repo>` for project sites; set to `/` if you attach a custom domain at the site root)
3. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**

### 3. GitHub Pages

The workflow [`.github/workflows/github-pages.yml`](.github/workflows/github-pages.yml) runs `npm run build:pages` in `web/` and deploys `web/out`.

```bash
cd web && GITHUB_PAGES=1 NEXT_PUBLIC_BASE_PATH=/your-repo npm run build:pages
```

After merge to `main`, open the Pages URL, sign in, and Add to Home Screen.

Plaid bank sync, Vercel Cron, and CSV import **do not run on GitHub Pages** (no Node server). HUD, Home Chat, Trust, and the budget lens work in the browser against Supabase.

Preview / production URLs come from GitHub Pages after the first successful Actions deploy.

### Plaid notes

Plaid needs a Node host (API routes + secrets). Skip this section unless you later add a server. The migrations can still be applied so the schema is ready.

- Keys: [Plaid Dashboard](https://dashboard.plaid.com) → Team Settings → Keys
- Start with `PLAID_ENV=sandbox` (Link test user `user_good` / `pass_good`)
- Settings → **Connect bank** opens Plaid Link; categories left blank for you to assign
- Pending bank authorizations are imported as uncleared; Sync now does a full refresh
- Sync now remaps accounts and requests an on-demand Plaid bank refresh when available — disconnecting is not required to recover missing transactions
- Run migration `supabase/migrations/20260724150000_plaid_bank_sync.sql`
- Disconnect / Sync now are available per connected item on Settings

### YNAB CSV import

1. In YNAB web: budget name → **Export Budget**
2. Upload the **Register** CSV on **Import** in Alte' Budgeting
3. Expected headers: `Account, Date, Payee, Category Group/Category, Memo, Outflow, Inflow`

## Governance (unchanged)

```bash
cd governance && pip install -e ".[dev]" && ai-guardrail run --root ..
```

Require status checks on `main`: **Governance Steps 1–5**, **Enterprise Layers B–E**, and **CodeQL (Layer C)**.

## Layout

```
web/            Alte' Budgeting Next.js PWA
supabase/       SQL migrations (RLS)
governance/     Steps 1–5 CLI + reporters
dashboard/      Human PR review panel
infra/terraform Checkov-scanned IaC stub
.github/        CI, Dependabot, CODEOWNERS
```
