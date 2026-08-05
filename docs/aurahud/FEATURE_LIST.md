# AuraHUD / Life Aura — Feature Architecture

**Public name:** AuraHUD  
**AI engine:** Life Aura  
**Internal codename:** Project Omnis  

Unified “Everyday Life OS”: one voice-first HUD, one shared database, AI as an invisible router—not a chatbox over 15 mini-apps.

Design rules:

- **3-second rule** — capture or answer, then get out
- **UI first, AI second** — usable offline; AI structures unstructured input
- **Determinism for clocks/math** — LLMs parse intent; code owns dates, money, timers
- **Micro-feedback** — every AI action gets ✓ / ✗ / ✎ (no paragraph required)
- **Progressive disclosure** — presets + intent-unlocked modules, not a blank canvas of all features

Week 1 demo scope: [`WEEK1_DEMO_PLAN.md`](./WEEK1_DEMO_PLAN.md).

---

## 1. Core platform & voice-first input (the Verkada layer)

- **Unified Command Bar** — single voice-to-text / text prompt at the top of the HUD
- **Intent Router (Life Aura)** — parses input and routes to the right module without menus
- **Today Stream** — Now / Next / Captured (one vertical flow, zero app-grid)
- **Mobile–Desktop Link** — focus dashboard on desktop; quick-capture on phone
- **Onboarding presets** — 30-second quiz loads ~3 widgets; more unlock via intent (“enable Garden Grow?”)
- **Local-hybrid AI path (later)** — desktop Ollama/LM Studio for heavy work; tiny on-device models for intent only

---

## 2. Financial Freedom & Aspiration Engine

- **Integrated Budgeting Module** — Alte’ Budgeting lives in the same place as tasks, pantry, and goals
- **Deadline & Dream Tracker** — hard deadlines (rent, utilities, debt) + long-term aspirations (vacations, emergency fund)
- **Spend-Less First Optimization** — save-vs-earn tax math, leak patching over hustle, micro-sacrifice → dream goal visualizer
- **Cash-Flow Booster** — when deadline gaps appear, suggest liquidity wins (e.g. sell unused Memory Palace items)
- **Anti-Regret Impulse Buy Rack** — 24-hour lock, hours-of-work cost, devil’s-advocate roast

---

## 3. Health, household & kitchen logistics

- **Pantry & Expiration Tracker** — voice / receipt photo → shelf-life + spoil alerts
- **Dietary Meal Planner & Auto-Grocery** — budget + diet goals → recipes from expiring items → grocery list / order
- **Duo-Diet Dinner Resolver** — household preference profiles → one shared meal with optional “fork in the road” splits
- **Plant Care Assistant (Garden Grow)** — photo + environment → diagnosis and care schedule
- **Household Knowledge Vault** — shutoff valves, filter sizes, Wi‑Fi, lease terms—plain-language lookup
- **Mood & Health Tracker** *(planned)* — log mood, energy, sleep, symptoms, or check-ins via voice/tap; surface trends on the stream and feed the Life Coach
- **QR Code Food Scanner** *(planned)* — scan packaged food QR/barcode → healthiness summary (ingredients, sugars, additives, fit vs user goals) → **Yes / No “Did you buy it?”** to log intake for health tracking

---

## 4. Goals, school & planning

- **Goal Setter & Tracker** *(planned)* — define goals (health, money, school, personal), milestones, and progress; Life Aura ties daily tasks and spend-less nudges to active goals
- **Vacation Planner** *(planned)* — builds trip options from saved likes/interests, budget constraints, calendar gaps, and dietary needs—not generic listicles
- **School Tracker (Canvas & related)** *(planned)* — pull or capture assignments, due dates, and grades from Canvas and other school apps; rank school work into the smart task list and adaptive calendar so the user stays on track

---

## 5. Task management, calendar & smart escalation

- **Smart Priority Task List** — auto-sort by due date, effort, importance
- **Dynamic Adaptive Calendar** — blocks realistic slots for tasks, workouts, cooking (learns prep duration over time)
- **Graduated Escalation Training** — soft notification → Live Activity–style surface → alarm; intensity pulls back as responsiveness improves
- **Work & Focus Tracker** — 20-20-20 eye rule, hourly movement breaks

---

## 6. Mindset, coaching & behavioral guidance

- **Personalized AI Life Coach** *(planned)* — tips, ideas, and check-ins generated entirely from the user’s trends and Life Aura knowledge (mood, health, goals, budget, school load, habits)—not generic quote spam
- **Fulfillment & Anti-Doomscroll Coach** — boredom/fatigue detection → valued low-friction activity → gentle bridge to real tasks
- **Context-Aware Activity Generator** — interests + energy level → next best action
- **Adaptive Motivation Nudges** — learns whether encouraging / direct / humorous language works for this user

---

## 7. Social & communication engine

- **Social Hub & Goal Community** — micro-communities / accountability circles; progress sharing from other modules; distraction-free Life Feed (no rage-bait algorithm)
- **Interest & Support Video Calls** *(planned)* — group video calls inside circles of shared interests and/or support—connection without a doomscroll feed
- **AI Communication Assistant (“Text Buddy”)** — outgoing tone check + rewrite options; incoming intent translator; communication skill micro-lessons
- **Awkward Script Assistant** — roommate / landlord / decline scripts with vibe controls
- **Real-World Negotiation Engine** — bill/haggle game plans and counter-scripts
- **Gift Matrix** — year-round preference notes → birthday/holiday gift brainstorms by budget

---

## 8. Memory & physical world

- **Memory Palace** — photo/video + voice note of where physical items live; search returns the clip, not just text
- **Paperwork OCR Tamer** — scan mail → junk vs action item → due date / amount → calendar add

---

## 9. Platform, trust & ecosystem (later)

- **Community Developer Marketplace** — sandboxed plugins (WASM/iframe), permission scopes, security review; optional 70/30–80/20 revenue split
- **Open-source core + open-core cloud** — AGPL-3.0 for core trust; managed sync/escalation as hosted value
- **Privacy & local-first** — optimistic local writes; encrypt sensitive life data; optional local LLM path

---

## Module → week-1 status

| Module | Week 1 demo |
|---|---|
| Command bar + intent router | **Ship** |
| Today Stream | **Ship** |
| Smart Tasks | **Ship** |
| Alte’ Budget lens + spend-less nudge | **Ship** |
| ✓ ✗ ✎ micro-feedback | **Ship** |
| Mood & Health Tracker | Later |
| Goal Setter & Tracker | Later |
| QR Food Scanner + buy Yes/No | Later |
| Vacation Planner | Later |
| Social feed + interest/support video calls | Later |
| School / Canvas tracker | Later |
| Personalized AI Life Coach | Later |
| All other modules in §§2–8 | Later |

---

## Product philosophy (anti “phone inside a phone”)

You are not building 15 apps. You are building **1 database with 15 lenses**.

Life Aura sorts unstructured voice/images into that database. AuraHUD is a fast HUD that shows what matters **right now**—and gets the user back to real life.
