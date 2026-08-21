# What you need to do — governance gate

The five-step suite is in the repo. **It will not protect `main` until you finish these setup steps.**

## Mental model

| Thing | Where it runs | What you do with it |
|-------|---------------|---------------------|
| **Governance Steps 1–5** | GitHub Actions (`AI Code Guardrail` workflow) | Automated AST / OWASP / fuzz / Big-O / copyright on every PR |
| **Human Review Dashboard** | **Vercel** (`dashboard/` Next.js app) | Approve / reject / merge after reviewing findings |
| **Enterprise Layers B–E, CodeQL, FOSSA** | GitHub Actions | Secrets, SAST, tests, licenses, IaC |

There is **no comprehension quiz** in this repository.

---

## 1. Require the CI checks

GitHub → **Settings → Branches / Rulesets** → protect `main`:

1. Require a pull request before merging
2. Require status checks to pass → select:
   - **`Governance Steps 1–5`**
   - **`Enterprise Layers B–E`**
   - **`CodeQL (Layer C)`**
   - **`FOSSA License Scan`**
3. Require review from Code Owners

## 2. (Optional) Enable LLM enrichment (Step 2)

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `OPENAI_API_KEY` or `GOVERNANCE_LLM_API_KEY` | Your API key |

Optional variable: `GOVERNANCE_LLM_MODEL` (default `gpt-4o-mini`).

Without this, Step 2 still runs deterministic OWASP regex rules.

## 3. Deploy the review dashboard to Vercel

### 3a. Create a secret you will reuse

Pick a long random string (`openssl rand -hex 32`). Paste it in:

1. Vercel env → `GOVERNANCE_DASHBOARD_SECRET`
2. GitHub Actions secret → `GOVERNANCE_DASHBOARD_SECRET` (same value)
3. Browser “Unlock actions” prompt when reviewing

### 3b. Create a Vercel project for the dashboard

1. Open [vercel.com/new](https://vercel.com/new)
2. **Import** this repository
3. **Root Directory** → **`dashboard`**
4. Framework Preset: **Next.js**
5. **Output Directory** must be empty / default
6. Add env + Redis (next steps), then deploy

### 3c. Add Upstash Redis (required on Vercel)

1. Vercel project → **Storage** → **Create** → **Upstash Redis**
2. Connect it — Vercel injects `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy after connecting

### 3d. Set dashboard environment variables

| Env | Value |
|-----|-------|
| `GOVERNANCE_DASHBOARD_SECRET` | Secret from 3a |
| `GOVERNANCE_SITE_PASSWORD` | **Recommended.** Browser login password |
| `GOVERNANCE_REVIEWER_SECRET` | Optional; defaults to dashboard secret |
| `GITHUB_TOKEN` or `GH_MERGE_TOKEN` | Fine-grained PAT with `contents:write` + `pull-requests:write` (for **Approve & Merge**) |
| `GITHUB_REPOSITORY` | `Alteoziel/Project-Omnis-AuraHUD.Life-Aura-AI-` (pins merge targets) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | From Marketplace |

### 3e. Wire CI → dashboard

GitHub → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `GOVERNANCE_DASHBOARD_URL` | Vercel production URL (no trailing slash) |
| `GOVERNANCE_DASHBOARD_SECRET` | Same as Vercel |

## 4. Confirm the loop

1. Open a PR that touches `governance/` or `.github/`
2. Wait for **Governance Steps 1–5** to go green
3. Open the dashboard — a new review should appear
4. Unlock with the reviewer secret → Approve / Reject / Merge

If the dashboard stays empty: check Actions logs for dashboard POST failures (401 = mismatched secret).
