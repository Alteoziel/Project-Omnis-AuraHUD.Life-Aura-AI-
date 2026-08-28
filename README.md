# Project Omnis

This repository is a **clean slate for the product**, with the **security and quality gate kept in place**.

The previous AuraHUD / Alte’ Budgeting / Home Chat app is gone. Git history still has it if anything needs to be referenced. **Do not start a new product implementation until it has been planned and designed.**

Planning docs for the AuraHUD / Life Aura concept are kept in [`docs/aurahud/`](docs/aurahud/): feature inventory, week-1 demo plan, phased roadmap with testing gates, security model, and the Correction Memory spec.

The current execution plan is [`docs/aurahud/DEMO_BUILD_PLAN.md`](docs/aurahud/DEMO_BUILD_PLAN.md) — six polished demos, then rank and keep what works. Build constraints for every agent session (model, no subagents, no environment builds or tests, human-only frontend testing, usage discipline) are in [`AGENTS.md`](AGENTS.md).

Security, supply-chain, and code-quality checks stay on every PR.

| Piece | Path | Purpose |
|-------|------|---------|
| **AI Code Guardrail** | [`governance/`](governance/) + [`.github/workflows/ai-guardrail.yml`](.github/workflows/ai-guardrail.yml) | Steps 1–5: AST, OWASP, fuzz, Big-O, copyright |
| **Human review** | [`dashboard/`](dashboard/) | Approve / reject / merge governance findings |
| **Enterprise hygiene** | [`.github/workflows/enterprise-hygiene.yml`](.github/workflows/enterprise-hygiene.yml) | Gitleaks, pip-audit, npm audit, Semgrep, tests, Checkov |
| **CodeQL** | [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml) | GitHub code scanning |
| **FOSSA** | [`.github/workflows/fossa-license.yml`](.github/workflows/fossa-license.yml) | License / SCA gate |
| **Dependabot** | [`.github/dependabot.yml`](.github/dependabot.yml) | Dependency updates for governance, dashboard, Actions |
| **IaC stub** | [`infra/terraform/`](infra/terraform/) | Checkov scan target |

Operator setup: [`SETUP_GOVERNANCE.md`](SETUP_GOVERNANCE.md)  
Human checklist: [`SECURITY_OPERATOR_CHECKLIST.md`](SECURITY_OPERATOR_CHECKLIST.md)  
Layer map: [`ENTERPRISE_LAYERS.md`](ENTERPRISE_LAYERS.md)
