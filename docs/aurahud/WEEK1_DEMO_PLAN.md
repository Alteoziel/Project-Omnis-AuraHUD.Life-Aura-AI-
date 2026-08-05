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

Everything else stays off the landing surface until someone asks for it. Full module inventory: [`FEATURE_LIST.md`](./FEATURE_LIST.md).

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
- Micro-feedback writes a small `corrections` table (pattern learning later)

### Day 4 — Budget crossover (the wow)

- From command bar: “I spent $12 on lunch” or “Can I afford takeout?” → writes/reads Alte’ categories
- One “Spend-less nudge” card tied to a fake/real aspiration (“Vacation: cut 2 takeouts → +$X/mo”)

### Day 5 — Voice (nice-to-have) + polish

- Browser speech → same router
- PWA install, mobile pass, shell loads fast
- Rate-limit AI; graceful offline for task list

### Day 6 — Demo packaging

- Landing: one headline, one sentence, one CTA (“Try the free demo”), one edge-to-edge product shot of the stream
- 30–45s Loom: open → speak → task + budget nudge → ✓
- Seed account with sample day

### Day 7 — Soft launch

- Ship Vercel URL
- Recruit **20 testers** (friends + r/Productivity, r/SideProject, r/ADHD)
- Pitch:

> “I got tired of opening 10 apps a day, so I built AuraHUD—a zero-menu, voice-first HUD for tasks + money. Free demo, looking for 20 people to break it.”

- Track: installs/visits, captures/day, ✓ vs ✗ rate, D1 return
- If those work, next slice adds pantry/expiration, goals, or mood/health—not more chrome

## Success bar

- Someone understands AuraHUD from the landing in **5 seconds**
- A stranger can complete **capture → see it in stream → confirm/correct** without a tutorial
- Budget feels **native**, not a bolted-on link farm
- You use it yourself for real tasks that day

## One-sentence strategy

Ship the calm HUD + capture + tasks + budget crossover; sell the feeling of leaving the app faster, not the feature list.
