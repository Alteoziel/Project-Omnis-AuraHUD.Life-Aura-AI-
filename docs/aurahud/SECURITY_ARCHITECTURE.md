# AuraHUD Security Architecture

**Goal:** Be trustworthy with life data in a way Meta-style ad platforms are not — by making abuse *hard by design*, not by asking users to trust a brand promise.

## Threat model (honest)

Attackers may want: budgets, habits, health/mood, location of valuables, relationship texts, school data, and AI-derived profiles.

We assume:

- Client devices can be lost/stolen
- API keys in the client are public
- Cloud LLM providers can see any prompt we send them
- Insiders / future owners of the company may be pressured to monetize data

Therefore: **minimize plaintext we hold, minimize what AI ever sees, default to Cloud AI Off, and never build a life-data ad graph.**

## Non-negotiables (anti-Meta)

| Rule | Implementation |
|---|---|
| We do not sell personal data or use it for ads | No ad SDKs; no content analytics; privacy policy matches code |
| No god-mode browsing of user life | No admin UI that dumps tasks/health/texts; support via user export only |
| Cloud AI is opt-in | `cloud_ai_enabled` defaults **false**; local rule router always works |
| AI sees minimized slices only | Intent routes send short snippets + correction constraints — never the vault |
| Rejected AI claims are never re-assumed | Correction Memory + code pre/post-filters ([`CORRECTION_MEMORY.md`](./CORRECTION_MEMORY.md)) |
| User can leave | Working wipe/delete; export path |
| Secrets stay server-side | Env via Doppler/Vercel; CSP + RLS; no keys in client bundles |

## Trust ladder

Data access for Life Aura deepens only as the user opts in:

1. Capture / tasks  
2. Budget (Alte’)  
3. Health / mood / home  
4. Communication assists  
5. Deep private (Memory Palace, relationship tone)

Each rung: clear purpose, revoke, and (for cloud) explicit allow.

## Data classes

| Class | Storage | AI |
|---|---|---|
| Tasks, reminders | User DB + RLS | Local rules; cloud only if enabled |
| Budget math | Existing Alte’ tables | **Code**, not LLM |
| Corrections / DO_NOT_* | User DB | Injected as constraints; never “forgotten” |
| AI receipts | User DB | Metadata only (word count, purpose) — not full prompts in ops tools |
| Future health / texts | TBD encrypted / local-first | Local or desktop-only by default |

## Request path for capture

```
User input
  → optimistic UI write (local feel)
  → load privacy_settings (cloud_ai_enabled?)
  → load active DO_NOT_* corrections
  → LOCAL rule router (always)
  → optional cloud LLM ONLY if enabled + minimized pack
  → code post-filter vs corrections
  → persist task / note
  → show ✓ ✗ ✎ + optional AI receipt
```

## Platform controls already in this repo

- Governance Steps 1–5 + Enterprise Layers B–E (Gitleaks, Semgrep, CodeQL, npm audit)
- CSP with nonces (`web/src/lib/security/csp.ts`)
- Supabase Auth + budget-scoped RLS
- Passkeys / reauth window
- No `.env` in git; Doppler → Vercel

## AuraHUD tables (migration)

- `aura_privacy_settings` — cloud AI flag, motivation style, wipe metadata  
- `aura_tasks` — smart task list  
- `aura_corrections` — Correction Memory  
- `aura_ai_receipts` — what left the device (counts + purpose)  
- `aura_stream_events` — Today Stream items (captured actions)

All keyed by `auth.uid()` with RLS: users only read/write their own rows.

## What “most secure” means here

Not marketing hyperbole. It means:

1. Fail closed without auth/env  
2. Least privilege (RLS)  
3. Default-deny for cloud AI  
4. Deterministic money/time logic  
5. Auditable AI egress (receipts)  
6. Correction memory that survives model amnesia  
7. Open docs + eventually open-source core so trust is verifiable  

If a feature needs more intimate data than we can protect yet, **it does not ship**.
