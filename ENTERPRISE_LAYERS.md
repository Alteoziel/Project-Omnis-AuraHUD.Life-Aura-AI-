# Enterprise Layers B–E

Automated supply-chain, SAST, tests, and IaC checks.
These sit **beside** Governance Steps 1–5 (AI Code Guardrail).

| Layer | What | Where |
|-------|------|-------|
| **B** Supply chain & secrets | Dependabot, checksummed Gitleaks, pip-audit (governance), npm audit (dashboard; `web/` when it exists) | `.github/dependabot.yml`, `.gitleaks.toml`, CI job |
| **C** Static analysis | Semgrep, CodeQL Advanced, CODEOWNERS, ESLint/`tsc` when `web/` exists | `.semgrep.yml`, `.github/workflows/codeql.yml`, CI |
| **D** Tests & builds | Governance unit tests; Next.js build for `dashboard/` (`web/` when it exists) | CI |
| **E** Ship & runtime | Terraform → Checkov | `infra/terraform/`, CI |

## Required CI checks (Protect Main ruleset)

These must stay required on `main`:

1. **`Governance Steps 1–5`** — `.github/workflows/ai-guardrail.yml`
2. **`Enterprise Layers B–E`** — `.github/workflows/enterprise-hygiene.yml`
3. **`CodeQL (Layer C)`** — python job in `.github/workflows/codeql.yml`
4. **`FOSSA License Scan`** — `.github/workflows/fossa-license.yml`

Also recommended on Protect Main: Code Owner review, dismiss stale reviews, up-to-date branch, approval of most recent push, signed commits, CodeQL code-scanning gate.

## Notes

- There is no product app in this repo yet. Hygiene skips `web/` npm/lint/build steps until that tree returns.
- Governance engine + review dashboard remain so PRs still get scanned and reviewed.
- See [`SETUP_GOVERNANCE.md`](SETUP_GOVERNANCE.md) and [`SECURITY_OPERATOR_CHECKLIST.md`](SECURITY_OPERATOR_CHECKLIST.md).
