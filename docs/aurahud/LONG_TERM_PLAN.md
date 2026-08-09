# AuraHUD — Long-Term Plan

**Public name:** AuraHUD · **AI engine:** Life Aura · **Codename:** Project Omnis

This is the roadmap for growing from a thin, free demo into the full Everyday Life OS — **without** building the dream list before anyone trusts or uses the product.

Related docs:

- Week 1 demo: [`WEEK1_DEMO_PLAN.md`](./WEEK1_DEMO_PLAN.md)
- Full feature inventory: [`FEATURE_LIST.md`](./FEATURE_LIST.md)
- Repo security ops: [`../../SECURITY_OPERATOR_CHECKLIST.md`](../../SECURITY_OPERATOR_CHECKLIST.md)

---

## North star

A zero-friction, voice-first HUD for real life: one capture bar, one Today Stream, one shared database, AI as an invisible router. Users get out of the app in seconds. Privacy is a product feature, not a footer link.

**Sell the outcome (less mental load, money saved, follow-through)** — not “15 AI modules.”

---

## Guiding rules

1. **Demo before dream** — ship the Trojan Horse first; expand only when usage proves pull.
2. **Test before tons of work** — each new module must pass personal dogfood + small-cohort gates (below).
3. **Privacy & security from day one** — trust controls ship with the first demo, not after scale.
4. **One database, many lenses** — never a phone-inside-a-phone grid of mini-apps.
5. **AI writes code volume; humans own scope and security** — Cursor can build most UI/API slices; architecture, threat model, and “what not to ship” stay human.
6. **Indie-feasible start** — wedge product alone; platform (social video, marketplace) only after the HUD is loved.

---

## Phase 0 — Fast free demo (Trojan Horse)

**Goal:** Something strangers understand in 5 seconds and can break in a soft launch.

**Ship (see week-1 plan for detail):**

- Command bar (text; voice nice-to-have) + intent router
- Today Stream (Now / Next / Captured)
- Smart tasks + ✓ / ✗ / ✎ with **Correction Memory** (✗ is never forgotten — see [`CORRECTION_MEMORY.md`](./CORRECTION_MEMORY.md))
- Alte’ Budget lens + one spend-less nudge
- Trust minimums (below) on day one

**Explicitly not in this phase:** social, video, marketplace, Memory Palace, QR food, school sync, full local-hybrid AI, personalized coach deep dive, and the rest of [`FEATURE_LIST.md`](./FEATURE_LIST.md).

**Exit criteria (must pass before Phase 1):**

- [ ] You use it for real tasks/budget notes daily
- [ ] ~20 beta testers invited with a problem-first pitch
- [ ] Capture → stream → confirm/correct works without a tutorial
- [ ] Privacy page, Cloud AI On/Off, AI receipts, and wipe/delete work
- [ ] No secrets in client; RLS on user tables; governance/CI green on product PRs
- [ ] Basic metrics: visits, captures/day, ✓ vs ✗ rate, return-next-day

If exit criteria fail → fix the demo. Do **not** add modules to compensate.

---

## Rigorous testing gates (before tons of work)

Every expansion follows the same loop. No module graduates on “it compiled” or “AI wrote it.”

### Gate A — Spec & threat skim

- One-page intent: user job, data touched, AI payload (what leaves the device)
- Threat skim: authz/RLS, PII to AI APIs, wipe path, offline behavior
- Decision: local-only / desktop-hybrid / cloud-opt-in for this module’s AI

### Gate B — Thin slice build

- One verifiable slice (UI + persist + optional AI parse)
- Optimistic UI; micro-feedback ✓ / ✗ / ✎ on every AI action
- Lazy-load the module; do not inflate the home shell

### Gate C — Dogfood

- You use the slice in real life until it feels faster than not using it
- Log failures: wrong intent, slow path, confusing copy, privacy surprise

### Gate D — Cohort test

- Small group (start ~20; grow only when sticky)
- Pass bar examples:
  - Capture success rate high; ✗ rate not dominant
  - Users return without nagging
  - No critical security findings (secrets, broken wipe, data bleed to analytics)
  - Support load understandable for an indie

### Gate E — Keep / cut / rewrite

- **Keep** — schedule next related slice users asked for
- **Cut** — remove or hide; do not maintain zombie modules
- **Rewrite** — if useful but wrong shape (usually “too chatty” or “too many taps”)

**Hard rule:** Do not start Module N+2 while Module N is still failing Gate D.

---

## Phase 1 — Daily Life HUD (validate the OS feeling)

**Unlock only after Phase 0 exit criteria.**

Add modules users pull for — typical order if dogfood agrees:

1. Goals (ties spend-less + tasks together)
2. Pantry / expiration (or kitchen concierge thin slice)
3. Mood & health check-ins (feeds later coach; keep private)
4. Calendar basics (block tasks/cooking; escalation can wait)

**Still later:** social graph, video calls, Canvas deep sync, plugin marketplace.

**Exit criteria:**

- [ ] Multiple lenses feel like one product (shared capture + stream)
- [ ] At least one measurable “pays for itself” win (waste ↓, impulse blocked, bill path started)
- [ ] Privacy mode still default-safe; cloud AI remains optional
- [ ] Pro/paid experiment only after sticky daily use — not before

---

## Phase 2 — Deep Life OS (depth, not width)

Expand along proven pain:

- Memory Palace, paperwork OCR, Text Buddy, negotiation scripts
- QR food scanner + buy Yes/No → health log
- School / Canvas tracker into tasks + calendar
- Vacation planner from likes + budget
- Personalized Life Coach section (from trends you already store — not a new chat personality)

**Exit criteria:**

- [ ] Each shipped module still passes Gates A–E
- [ ] Home stays a HUD (stream + capture), not an app launcher
- [ ] Sensitive modules (health, texts, money notes) never require raw cloud AI

---

## Phase 3 — Platform & ecosystem

Only after the core HUD has real retention and trust:

- Interest/support circles + Life Feed (no doomscroll ranking)
- Group video for interests/support
- Community developer marketplace (sandbox, permissions, security review, optional revenue share)
- Full local-hybrid AI (desktop Ollama primary; tiny on-device intent; cloud opt-in)

This is where a small team or open-source contributors become realistic. Do not block Phase 0–1 on Phase 3.

---

## Privacy & security from day one

Trust is not a Phase 3 polish item. Users will not put a life OS on hope.

### Day-one product requirements (ship with the demo)

| Requirement | Why |
|---|---|
| Privacy page that matches reality | No marketing lies |
| **Cloud AI On/Off** | User can refuse API exposure |
| AI call receipts (“Sent N words for …”) | Makes leakage visible and rare |
| Working delete account / wipe | Exit is part of trust |
| No content-exfiltrating analytics | Habit products die on creepy telemetry |
| Secrets server-side only; RLS on all user tables | Baseline SaaS hygiene |
| Minimized prompts when cloud AI is on | Don’t upload the vault for a task parse |

### Architecture commitments (grow into; never violate)

- **Local-first storage** — UI writes locally/instant; cloud sync is secondary
- **Tiered AI** — on-device/rules for intent; desktop local LLM for heavy private work; cloud only opt-in with redaction + zero-retention / no-training where available
- **No god-mode admin browsing** of journals, health, or message bodies
- **Three non-sale promises** — (1) we don’t sell data for ads, (2) sync/DB under DPA only, (3) AI providers only get opted-in minimized prompts
- **Open-source core (AGPL-3.0 planned)** — verifiable trust; open-core for managed sync/escalation if needed
- **Sensitive buckets** (mood/health, relationship texts, raw bank detail) — local or desktop AI only unless the user explicitly opts into cloud for that action

### Engineering & ops (already aligned with this repo)

- Keep using governance Steps 1–5, Enterprise Layers B–E, CodeQL, Gitleaks, Semgrep on product changes
- Never commit `.env` / API keys; Doppler → Vercel for secrets
- Threat-skim every new table and every new AI route in Gate A
- Prefer deterministic code for money math, calendars, and timers — LLMs parse, they don’t “own” truth

Detail for the week-1 trust slice lives in [`WEEK1_DEMO_PLAN.md`](./WEEK1_DEMO_PLAN.md#trust--privacy-architecture-note-for-all-phases).

---

## Business shape (so the long game stays honest)

| Question | Stance |
|---|---|
| Sellable? | Yes — as relief (fast capture + tasks + money), not as a feature catalog |
| Will it sell? | Only after daily dogfood + cohort stickiness; then a modest Pro tier |
| Longevity? | Category lasts; product lasts if trust + 3-second rule + plugins/community stay ahead of copycats |
| Full dream done? | Never as one big bang — module-by-module when gates pass |
| AI build most code? | Yes for volume; no for taste, security, and scope |
| People want this? | They want less friction; they don’t want 15 tabs of AI slop on day one |
| Indie start? | Yes for Phases 0–1; Phase 3 needs community or a small team |

---

## Sequence at a glance

```
Phase 0  Fast demo + trust minimums + soft launch
    │
    ├─ fail gates → fix demo (no new modules)
    │
    ▼
Phase 1  Daily HUD modules users pull for (goals, pantry, mood, calendar…)
    │     each module: Gates A→E
    ▼
Phase 2  Deep OS (memory, paperwork, Text Buddy, school, coach…)
    │     still HUD-first; sensitive AI stays local/desktop
    ▼
Phase 3  Platform (social/video, marketplace, full hybrid AI)
```

**One-line plan:** Ship a fast, private demo; prove it with rigorous testing; only then earn the right to build the dream.
