# AuraHUD / Life Aura — Complete Feature Inventory

**Public name:** AuraHUD  
**AI engine:** Life Aura  
**Internal codename:** Project Omnis  

Unified “Everyday Life OS”: one voice-first HUD, one shared database, AI as an invisible router—not a chatbox over 15 mini-apps.

This list is the **full inventory** from the Project Omnis / AuraHUD planning doc (master architecture + later additions). Week 1 ships only a thin slice — see [`WEEK1_DEMO_PLAN.md`](./WEEK1_DEMO_PLAN.md). Phased roadmap + testing gates before expansion: [`LONG_TERM_PLAN.md`](./LONG_TERM_PLAN.md).

## Design rules

- **3-second rule** — capture or answer, then get out of the app
- **UI first, AI second** — usable offline; AI structures unstructured input
- **Determinism for clocks/math** — LLMs parse intent; code owns dates, money, timers
- **Micro-feedback** — every AI action gets ✓ (confirm) / ✗ (instant undo) / ✎ (quick inline edit); never force a paragraph to fix a mistake
- **Progressive disclosure** — presets + intent-unlocked modules, not a blank canvas of all features
- **Anti “phone inside a phone”** — one Today Stream / HUD, not a grid of mini-apps
- **Values-aligned coaching** — Life Aura improves life using the user’s stated morals, ethics, and values—not generic hustle defaults

---

## 1. Core platform & voice-first input (the Verkada layer)

- **Unified Command Bar** — single voice-to-text / text prompt at the top of the HUD
- **Intent Router (Life Aura)** — parses input (“I bought eggs” vs “Remind me to call the landlord”) and routes to the right module without menus
- **Voice-to-Task + Task-to-Voice** — speak to capture; also read tasks/reminders back aloud when hands-free
- **Voice-to-Task Morning Routine & Habit Tracker** — stream-of-consciousness morning voice log → auto-log habits + append errands (e.g. “buy milk”) to lists
- **Today Stream (HUD)** — Now / Next / Captured vertical flow; zero app-grid home
- **Mobile–Desktop Link** — deep-focus dashboard on desktop; rapid capture on phone; sync keeps both aligned without encouraging distraction
- **Onboarding: 30-second quiz + presets** — primary goal (Household & Budget / Focus & Work / Health & Habits / Mindset & Social) loads ~3 widgets
- **Passive Feature Unlocking** — when user intent hits a locked module (“leaves are yellow”), offer to enable that widget
- **Customization / Edit Mode** — hide, drag, or add widgets later at the user’s pace
- **Local-hybrid AI path** — see §10

---

## 2. Financial Freedom & Aspiration Engine

- **Integrated Budgeting Module (Alte’)** — prebuilt budget app as a first-class section; AI can check budget, spending habits, food spend vs health, disposable income, recurring bills, unused subscriptions
- **Deadline & Dream Tracker** — hard deadlines (rent, utilities, debt payoff) alongside long-term aspirations (vacations, emergency funds, gear)
- **Spend-Less First Optimization Engine**
  - **Tax Leverage Math** — saving $100 keeps $100; earning $100 more may only net ~$70–$75 after tax
  - **Leak Patching over Hustle** — spending cuts for instant relief vs waiting on raises/burnout side hustles
  - **Micro-Sacrifice Visualizer** — map small daily cuts to dream goals (e.g. “2 fewer takeaways/week → vacation flights in 4 months”)
- **Cash-Flow Booster** — when deadline gaps appear, suggest liquidity wins (e.g. sell unused items logged in Memory Palace on local marketplaces)
- **Anti-Regret Impulse Buy Rack** — paste link/photo → mandatory cooling period (e.g. 24h); hours-of-work cost; alternative uses of that money; devil’s-advocate roast before checkout
- **Budget ↔ kitchen crossover** — AI uses budget + what you eat most + health goals to plan groceries, track what spoils fastest, and cook from those items

---

## 3. Health, household & kitchen logistics

- **Pantry & Expiration Tracker** — log via voice or receipt photos; estimated shelf-life; spoil alerts
- **Digital Kitchen Concierge** — evening suggestion (e.g. ~5 PM) for one dinner using items that spoil first; auto-generate next grocery list from what ran out
- **Dietary Meal Planner & Auto-Grocery** — cross-reference budget + dietary goals → healthy meal plans → recipes from expiring pantry → auto-populate grocery orders
- **Stray-Ingredient / Fridge Alchemist** — photo or type random fridge items → custom recipe using only what you have (+ optional 1 staple); fun gourmet dish name
- **Duo-Diet Dinner Resolver** — household profiles (e.g. keto + vegetarian, spice tolerance) → one unified recipe or “fork in the road” split at the end
- **QR Code Food Scanner** — scan packaged food QR/barcode → healthiness summary (ingredients, sugars, additives, fit vs goals) → **Yes / No “Did you buy it?”** to log intake for health tracking
- **Mood & Health Tracker** — mood, energy, sleep, symptoms, check-ins via voice/tap; trends on the stream; feeds Life Coach
- **Plant Care Assistant (Garden Grow)** — photo + room/environment details → identify/diagnose leaf issues, moisture schedules, tailored care
- **Household Knowledge Vault** — plain-language lookup for physical house details (shutoff valves, furnace filter sizes, paint colors, Wi‑Fi, landlord/lease info, spare bulb locations, bill cadences)

---

## 4. Goals, school, vacations & events

- **Goal Setter & Tracker** — goals (health, money, school, personal), milestones, progress; Life Aura ties tasks and spend-less nudges to active goals
- **Vacation Planner** — trip options from saved likes/interests, budget, calendar gaps, dietary needs—not generic listicles
- **School Tracker (Canvas & related)** — assignments, due dates, grades from Canvas and other school apps; push into smart tasks + adaptive calendar so the user stays on track
- **Low-Maintenance Event Coordinator** — goal like “Dinner with Sam, Alex, Jordan Thursday ~7” → shareable no-account link → friends tap availability + diet needs → AI picks best slot, ~3 restaurant options (diet + midpoint), formatted invite for the group chat

---

## 5. Task management, calendar & smart escalation

- **Smart Priority Task List** — add anything; auto-rank by due date, effort, importance
- **Dynamic Adaptive Calendar**
  - Blocks realistic slots for tasks, workouts, breaks, and cooking (learns how long meals actually take you)
  - User can put anything on the calendar and get reminders
  - Adapts schedule from tasks, priorities, school deadlines, and aspirations
- **Graduated Escalation Training** — soft notification → Live Activity / Dynamic Island–style surface → full alarm if still ignored; intensity gradually pulls back as responsiveness improves (trains follow-through)
- **Work & Focus Tracker** — 20-20-20 eye strain rule; mandated breaks every hour or two; movement reminders

---

## 6. Mindset, coaching & behavioral guidance

- **Personalized AI Life Coach** — tips, ideas, and a dedicated section made entirely from trends + Life Aura knowledge about the user (mood, health, goals, budget, school load, habits, values)—not generic quote spam
- **Values / Ethics / Morals Alignment** — coaching and nudges respect the user’s stated values; secret/background algorithms optimize toward fulfillment they defined, not engagement metrics
- **Fulfillment & Anti-Doomscroll Coach** — detects post-work fatigue or boredom moments; offers valued low-friction alternatives (game 20 min → slightly better fun → dishes); gradual bridge to productivity
- **Smart Dopamine Routing** — when a mental break is needed, suggest goal-aligned low-friction activity (e.g. 15 min game, then 1-min garden update to your circle) instead of default doomscroll
- **Context-Aware Activity Generator** — saved interests (games, sports, cooking, reading, etc.) + current energy → custom activities when stuck or bored
- **Adaptive Motivation Nudges** — learn whether encouraging / direct / humorous / data-style language works; adjust notifications app-wide

---

## 7. Social & communication engine

### Social Hub & Goal Community

- **Micro-Communities & Accountability Circles** — private groups around goals (workout crew, save-for-vacation, gardeners, etc.)
- **Progress Sharing** — broadcast wins from other modules (meal from expiring pantry, healthy plant photo, goal milestones)
- **Life Feed** — clean, distraction-free feed of aspirations, milestones, personal projects—**no algorithmic rage-bait / doomscroll ranking**
- **Interest & Support Video Calls** — group video calls inside circles of shared interests and/or support

### AI Communication Assistant (“Text Buddy”)

- **Tone Check & Compassion Filter** — before send: draft analysis (“might sound blunt/passive-aggressive”) + 3 rewrite options (e.g. More Empathetic / Direct & Warm / Professional)
- **Incoming Intent Translator**
  - **Perspective Engine** — was the sender actually rude, or rushed/poorly phrased/missing context?
  - **Response Generator** — calm, boundary-respecting reply so you don’t react defensively
- **Communication Skill Coach** — tracks messaging habits over time; micro-lessons on active listening, boundaries, conflict resolution
- **Awkward Script Assistant** — scenario + vibe (Strict & Professional / Warm & Gentle / Casual & Firm) → 3 polished texts + “why this works” tip (roommate dishes, decline trip, landlord deposit, etc.)
- **Real-World Negotiation Engine** — screenshot/listing or bill provider + current vs target price → opening offer script, if-X-then-Y counters, walk-away script
- **Gift Matrix** — year-round voice/text notes of what friends/family like → birthday/holiday brainstorm across budget tiers with search links

---

## 8. Memory & physical world

- **Memory Palace** — short video/photo + spoken sentence of where something was put; auto-tag + transcript; later search returns the exact clip (“Where are the house keys?”)
- **Paperwork OCR Tamer** — phone camera scan of mail → junk vs important → extract due date, amount owed, action required → Add to Calendar
- **Plain-English Document Helper** *(from early niche ideas; optional lens)* — paste/upload dense contract/insurance/lease text → section-by-section plain English, red flags, questions to ask before signing

---

## 9. Platform, performance, trust & ecosystem

### Performance & architecture

- **Micro-frontends / lazy loading** — don’t load Plant Scanner, Negotiation, etc. until that widget is opened
- **Local-first database** — write on-device first (&lt;10ms UI); sync to cloud in background (SQLite / WatermelonDB-class approach)
- **Asynchronous AI** — never block UI waiting on LLM; optimistic “Saved!” then background parse
- **Shared schema** — one DB, many lenses (users, memory_palace_items, pantry_items, paperwork_tasks, budget_cooling_items, social_posts, tone_checks, activity_recommendations, goals, mood_health_logs, school_items, etc.)

### Trust & privacy

- **Open-source core + open-core cloud** — AGPL-3.0 for core trust; managed sync/escalation as hosted value
- **Privacy & local-first** — life data on device / user-owned DB; cloud is sync, not the product’s excuse to hoard plaintext
- **Tiered AI** — see §10; **Cloud AI Off** always available
- **Minimized AI payloads** — never ship the whole vault; redact names/account numbers/message bodies when structure is enough
- **No god-mode browsing** — operators can’t casually dump user life data; support via user export / scoped tokens
- **Three distinct non-sale promises** — (1) AuraHUD doesn’t sell data for ads, (2) sync/DB under DPA only, (3) AI providers get opted-in minimized prompts with no-training / zero-retention where possible
- **Trust UX** — privacy page that matches code; AI call receipts (“Sent N words…”); working delete/wipe; mode picker: Private / Balanced / Cloud-enhanced

### Community marketplace *(later)*

- **Community Developer Page** — third parties add features; security checks before publish
- **Sandboxed execution** — WASM / iframe / worker; malicious plugins can’t read bank tokens
- **Permission scopes** — plugins request access (e.g. Pantry DB) like iOS permissions
- **Automated + human security review** — SAST / static analysis before listing
- **Revenue split** — optional paid widgets (e.g. 70/30 or 80/20); platform cut funds infra + AI + better dev tooling
- **Free & open utilities** — anyone can publish free community tools

Full week-1 trust minimums: [`WEEK1_DEMO_PLAN.md`](./WEEK1_DEMO_PLAN.md#trust--privacy-architecture-note-for-all-phases).

---

## 10. Local-hybrid AI strategy

Running large models on the phone full-time drains battery. Target architecture:

1. **Desktop host (primary heavy engine)** — Ollama / LM Studio; efficient ~8B model for reasoning, scheduling, meal plans, scripts; phone reaches it over home LAN or Tailscale when the computer is on
2. **Mobile edge (lightweight)** — tiny on-device model (or rules) **only** for intent classification / routing; keep generation &lt;~1s, phone cool
3. **Cloud (opt-in)** — ZDR / no-training providers + redaction when away from home or when quality needs it
4. **Shared sync DB** — Supabase (or equivalent); phone + desktop read/write the same tables without running heavy inference on the phone

| Data | Where AI runs |
|---|---|
| Task/reminders, intent routing | On-device / rules |
| Mood, health, relationship texts, bank details | Local or desktop-only; never raw to cloud |
| Recipe ideas, vacation brainstorm (scrubbed likes) | Cloud OK if user opted in |
| Budget math, calendar math, timers | **Code, not LLM** |

---

## Module → week-1 status

| Module | Week 1 demo |
|---|---|
| Command bar + intent router | **Ship** |
| Today Stream | **Ship** |
| Smart Tasks | **Ship** |
| Alte’ Budget lens + spend-less nudge | **Ship** |
| ✓ ✗ ✎ micro-feedback | **Ship** |
| Cloud AI On/Off + privacy page + AI receipts + wipe | **Ship** |
| Everything else in §§1–10 | Later |

---

## Product philosophy

You are not building 15 apps. You are building **1 database with many lenses**.

Life Aura sorts unstructured voice/images into that database. AuraHUD is a fast HUD that shows what matters **right now**—and gets the user back to real life.
