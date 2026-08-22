# AuraHUD — Week 1 Free Demo Plan

**Public name:** AuraHUD (UI layer)  
**AI engine:** Life Aura  
**Internal codename:** Project Omnis  
**Constraint:** Free tiers only · ship a shareable demo that draws people in

## What draws people in (demo must prove these)

1. **3-second capture** — speak/type once, see it land, leave the app
2. **One stream, not 15 mini-apps** — “what matters now / next / capture”
3. **Invisible AI** — silent routing + ✓ / ✗ / quick edit, not a chat box
4. **Money already connected** — Alte’ Budgeting as the first real module

Everything else stays off the landing surface until someone asks for it. Full module inventory: [`FEATURE_LIST.md`](./FEATURE_LIST.md). Long-term phases + testing gates: [`LONG_TERM_PLAN.md`](./LONG_TERM_PLAN.md).

## Demo scope

**Stack (free tiers):** Next.js + Vercel · Supabase Auth/DB · one LLM API with hard rate limits · PWA install prompt (no App Store yet)

### Must-ship surfaces

| Surface | Why it hooks |
|---|---|
| Marketing landing | Problem-first pitch + 30-sec Loom |
| Auth + 1-question onboarding quiz → 3 widgets | Avoid blank-canvas drop-off |
| Unified Command Bar (text first; voice if mic works) | The product identity |
| Today Stream (Now / Next / Captured) | Anti “phone inside a phone” |
| Smart Tasks (priority + due date) | Immediate daily use |
| Budget lens (embed/link existing Alte’ data) | Proof it’s a Life OS, not another todo app |
| ✓ ✗ ✎ on every AI action | Trust + “not slop” |

### Explicitly cut from week 1

Social hub, video calls, plugins, Memory Palace, plant vision, QR food scanner, paperwork OCR, calendar escalation/alarms, local LLMs, auto-grocery, school sync, vacation planner, community marketplace, personalized coach deep dive.

## Day-by-day execution

### Day 1 — Shell + brand

- AuraHUD layout: command bar + Today Stream + bottom “Budget / Tasks / Capture”
- Port/link Alte’ as Budget
- Preset onboarding: *Household & Money* | *Focus & Tasks* | *Calm defaults*

### Day 2 — Capture + intent router (text)

- `/api/route-intent` classifies into `task` | `budget_note` | `reminder` | `unclear`
- Instant optimistic UI; AI fills fields in background
- Seed 5–10 demo utterances

### Day 3 — Tasks that feel smart

- CRUD, auto-rank (due + priority), show top 3 in stream
- Micro-feedback writes `corrections` with full **Correction Memory** behavior (see [`CORRECTION_MEMORY.md`](./CORRECTION_MEMORY.md)):
  - ✗ = instant undo + persist `rejected_unspecified` (even if user explains nothing)
  - Derive `DO_NOT_*` negative constraints so the same wrong parse cannot silently recur
  - ✎ stores before/after; ✓ reinforces but never washes out an ✗ on the same claim
  - Next matching intent: code pre/post-filter excludes rejected interpretations (“Noted — I won’t assume that again.”)

### Day 4 — Budget crossover (the wow)

- From command bar: “I spent $12 on lunch” or “Can I afford takeout?” → writes/reads Alte’ categories
- One “Spend-less nudge” card tied to a fake/real aspiration (“Vacation: cut 2 takeouts → +$X/mo”)

### Day 5 — Voice (nice-to-have) + polish + trust minimums

- Browser speech → same router
- PWA install, mobile pass, shell loads fast
- Rate-limit AI; graceful offline for task list
- **Cloud AI On/Off** toggle; privacy page that matches reality; AI call receipt (“Sent N words…”); working delete/wipe
- No content-exfiltrating analytics; secrets server-side only

### Day 6 — Demo packaging

- Landing: one headline, one sentence, one CTA (“Try the free demo”), one edge-to-edge product shot of the stream
- Call out privacy stance on landing (local-first intent + cloud AI optional)
- 30–45s Loom: open → speak → task + budget nudge → ✓ → show Cloud AI Off
- Seed account with sample day

### Day 7 — Soft launch

- Ship Vercel URL
- Recruit **20 testers** (friends + r/Productivity, r/SideProject, r/ADHD)
- Pitch:

> “I got tired of opening 10 apps a day, so I built AuraHUD—a zero-menu, voice-first HUD for tasks + money. Free demo, looking for 20 people to break it.”

- Track: installs/visits, captures/day, ✓ vs ✗ rate, D1 return
- If those work, next slice adds pantry/expiration, goals, or mood/health—not more chrome

## Trust & privacy architecture (note for all phases)

Users won’t trust a promise — they trust an architecture where you *can’t* quietly sell or browse their life. Local-only LLMs on phones burn battery and feel bad; cloud-everything destroys trust. **Target model: local-first storage + selective AI.**

### Principles

1. **Verifiable constraints over marketing** — open source, local-first DB, encryption, minimized AI payloads, plain policy that matches code.
2. **Don’t rely on personal virtue** — no god-mode admin dump of journals/budgets; no “interesting events” warehouse; support via user-initiated export or scoped tokens.
3. **AI APIs are a leak surface** — default to sending the smallest snippet needed; prefer zero-retention / no-training providers; users can turn cloud AI off entirely.
4. **Honest security framing** — “secure enough for a life OS” with health/finance discipline, not “unhackable.” If cloud AI is on, the provider can see the *prompt you send* — so send as little as possible.

### Tiered AI path (battery vs privacy)

```
Phone (always):
  • Local DB + UI (instant, private)
  • Tiny on-device model OR rules for intent only
    (“is this a task / pantry / mood?”)

Heavy reasoning (user chooses):
  A) Home desktop via Tailscale/Ollama  → private, free, no phone heat
  B) Cloud API with ZDR + redaction     → when away / need quality
  C) Cloud OFF                          → app still works; AI degrades gracefully
```

| Data | Where AI runs |
|---|---|
| Task/reminders, routing | On-device / rules |
| Mood, health, relationship texts, bank details | Local or desktop-only; never raw to cloud |
| Recipe ideas, vacation brainstorm (scrubbed likes) | Cloud OK if user opted in |
| Budget math, calendar math | **Code, not LLM** |

User control (later UI): **Private (local/desktop) / Balanced / Cloud-enhanced** — default Private or Balanced, never max-cloud.

### “We don’t sell data — including through AI APIs”

Keep three promises distinct:

1. **You** don’t sell or share user data for ads.
2. **Sync/DB** providers only process data to run the app (DPA).
3. **AI providers** only receive opted-in, minimized prompts under no-training / zero-retention; cloud AI is disableable.

If a feature needs the full Memory Palace or Text Buddy corpus, it stays **local/desktop-only** until it can be done safely.

### Week 1 trust minimums (ship with the demo)

Full E2E encryption can wait. The free demo still ships:

- Privacy page that matches reality
- **Cloud AI: On/Off** toggle
- No analytics that exfiltrate content
- Tiny receipt when AI runs: “Sent N words to Life Aura cloud for task parse”
- Delete account / wipe data that actually works
- Secrets only in env (never client); RLS on all user tables

Pitch line: *“Your life stays on your devices. Life Aura only sees the smallest slice needed for the one action you just asked for — and you can turn cloud AI off.”*

## Success bar

- Someone understands AuraHUD from the landing in **5 seconds**
- A stranger can complete **capture → see it in stream → confirm/correct** without a tutorial
- Budget feels **native**, not a bolted-on link farm
- You use it yourself for real tasks that day
- A tester can find the privacy stance and turn cloud AI off without digging

## One-sentence strategy

Ship the calm HUD + capture + tasks + budget crossover; sell the feeling of leaving the app faster, not the feature list — and make trust a product feature from day one.
