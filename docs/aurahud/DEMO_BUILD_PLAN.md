# AuraHUD — Polished Demo Build Plan (draft)

**Status:** draft for review · **Scope:** six demos, then pick winners  
**Public name:** AuraHUD · **AI engine:** Life Aura · **Codename:** Project Omnis

This is the execution plan for building **six polished, self-contained demos**, testing
them with real people, and only then deciding which ones become the real product.

It supersedes the day-by-day sequencing in [`WEEK1_DEMO_PLAN.md`](./WEEK1_DEMO_PLAN.md)
for the current phase. The phase gates and long-term shape in
[`LONG_TERM_PLAN.md`](./LONG_TERM_PLAN.md) still apply; this plan is how Phase 0 actually
gets built.

**Build constraints are non-negotiable and live in [`../../AGENTS.md`](../../AGENTS.md)**
(Grok 4.6 High non-fast only, no subagents, no builds or tests on the environment
computer, humans do all frontend testing, strict usage discipline). Read that first.

---

## 1. What we are building

Six demos, one shell. Each demo is a single screen plus one complete flow that a stranger
can finish in under five minutes without a tutorial.

| ID | Demo | The job it does | From |
|---|---|---|---|
| **D1** | **Now** — capture bar → Today Stream | Get it out of your head in 3 seconds and be told the one thing to do next | `FEATURE_LIST.md` §1, §5 |
| **D2** | **Life Model** — what Aura knows / won't assume | Correct the AI once and have it stay corrected, visibly | `CORRECTION_MEMORY.md` |
| **D3** | **Money** — budget lens + impulse rack + micro-sacrifice | Stop leaks, block regret buys, see a dollar number you kept | `FEATURE_LIST.md` §2 |
| **D4** | **Follow-through** — graduated escalation that backs off | Actually do the thing you captured | `FEATURE_LIST.md` §5 |
| **D5** | **Weekly digest** — one noticing, one action | Learn something true about yourself without a dashboard | `FEATURE_LIST.md` §6 |
| **D6** | **Paperwork** — photo of mail → due date, amount, action | Kill the pile of unopened important mail | `FEATURE_LIST.md` §8 |

Explicitly **not** in this phase: accounts, sync, cloud AI, social, video, marketplace,
pantry/kitchen, school sync, vacation planner, Text Buddy, plant care, negotiation,
Memory Palace video capture, bank connections.

---

## 2. Locked decisions

Do not re-open these while building. If one is wrong, stop and ask.

| Decision | Choice | Why |
|---|---|---|
| App location | New `web/` tree (Next.js App Router, TypeScript, Tailwind) | CI auto-detects `web/package-lock.json` and runs lint, types, tests, build |
| Rendering | Static export (`output: 'export'`), no server routes | Free hosting, no secrets, nothing to operate |
| Hosting | GitHub Pages via a workflow | Testers get a URL; no Vercel account or env needed |
| Data | Browser-local only (IndexedDB), append-only event log + derived records | Matches the privacy story, zero backend, instant wipe |
| Accounts | None | Removes the single biggest drop-off in demo testing |
| AI | **Deterministic local rules only.** No LLM calls, no API keys | Zero API cost, works offline, nothing to leak |
| Money / dates / timers | Code, never a model | Product law from the planning docs |
| Charts | Hand-rolled inline SVG sparkline | Avoids a chart dependency |
| Motion | CSS transitions honoring `prefers-reduced-motion` | Avoids an animation dependency |
| OCR | `tesseract.js` in the browser, lazy-loaded on D6 only | No image ever leaves the device |
| Time-based features | Real durations, plus a visible **Demo speed** switch that compresses them | A 24h cooling period is untestable in a 5-minute demo |

### Approved dependencies

`next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`,
`eslint`, `eslint-config-next`, `@types/*`, `vitest`, `idb-keyval` (S0), `tesseract.js`
(S6 only).

Anything else requires human approval. `npm audit --audit-level=high` must pass.

---

## 3. The shared polish bar

"Polished" is a pass/fail bar every demo must clear, not a vibe. A demo is not done until
all of these are true:

- **Dark-first theme** with one accent, consistent 4px spacing scale, one type scale, one
  radius, one shadow. No ad-hoc colors or margins.
- **Touch targets ≥ 44px**, safe-area insets respected, thumb-reachable primary action.
- **Every state designed:** empty, loading (skeleton, not spinner), success, error,
  offline. No dead ends, no raw error text.
- **Optimistic writes** — the UI never waits on work; nothing shows a spinner over 150ms
  for local operations.
- **Undo on every destructive or AI-initiated action**, via a toast that lasts ~6s.
- **✓ / ✗ / ✎ micro-feedback** on every AI-produced item (D1, D3, D5, D6).
- **One-tap exit** — each demo has a visible "done" affordance that returns you to the
  picker; the product's promise is leaving, not lingering.
- **Keyboard accessible**, visible focus rings, labelled controls, contrast ≥ 4.5:1.
- **Copy is human** — no "Success!", no jargon, no exclamation marks in system messages.
- **Loads fast on a phone** — first paint under a second on a mid-range device, no layout
  shift, no font flash.

---

## 4. Slice plan

Each slice is one branch, one PR, one CI run, one tester script. File budgets are caps,
not targets. `[reuse]` marks code to port from commit `19e71e7` rather than write fresh.

### S0 — Foundation shell (blocks everything)

**Goal:** an installable, static, browser-local app with a design system, a seeded demo
data layer, and a demo picker home.

In scope:

- `web/` scaffold: `package.json`, `tsconfig.json`, `next.config.ts` (static export +
  base path), Tailwind + PostCSS config, `eslint.config.mjs`, `vitest` config, `npm test`
  script that runs vitest.
- Design tokens in `globals.css` + UI primitives: `Button`, `IconButton`, `Card`, `Chip`,
  `Sheet`, `Toast` (with undo), `Skeleton`, `EmptyState`, `Sparkline`.
- Local store `src/lib/store/`: `schema.ts` (typed records + append-only `events` log),
  `db.ts` (idb-keyval wrapper, synchronous in-memory cache + async persist), `seed.ts`
  (a realistic sample week: captures, spends, tasks, one piece of mail), `wipe.ts`.
- `demoClock` utility: real time by default, compressed when **Demo speed** is on.
- Demo picker home: six cards, each with the one-line problem it solves, plus **Reset
  demo data**, **Seed a week of history**, and the Demo speed switch.
- PWA: `manifest.webmanifest`, icons, service worker + registration. `[reuse]`
  `web/src/lib/base-path.ts` and `web/src/components/RegisterServiceWorker.tsx`, and
  carry the Pages refresh-loop fix from commit `08883bf`.
- GitHub Pages deploy workflow (`.github/workflows/pages.yml`), build only, no secrets.
- `docs/aurahud/DEMO_TEST_SCRIPTS.md` created with the S0 section.

Out of scope: any of the six demo flows.

File budget: ~28 files (scaffold-heavy; the only slice allowed to be this wide).

Acceptance (human):

1. Pages URL loads on phone and desktop; six cards visible; nothing broken offline after
   first load.
2. "Add to Home Screen" installs; the installed app opens without a browser chrome and
   without a refresh loop.
3. **Seed a week of history** fills the store; **Reset demo data** empties it; reload
   confirms both persisted.
4. Toggling **Demo speed** shows a persistent indicator so nobody mistakes it for real
   time.
5. Dark theme, focus rings, and 44px targets check out; no console errors.

---

### S1 — D1 "Now": capture bar → Today Stream

**Goal:** three-second capture, then a single answer to "what do I do right now."

In scope:

- `CommandBar` — one text field, always focused on open, Enter commits, optimistic insert,
  toast with undo. Voice via the browser `SpeechRecognition` API **only where supported**,
  behind graceful feature detection.
- Local intent router `[reuse]` `web/src/lib/aura/intent-router.ts`, with these fixes:
  - Replace the `input.length > 2` catch-all with a **confidence threshold**: anything
    under it lands in a neutral **Captured** bucket instead of being forced into a type.
  - Deterministic date parsing (today/tomorrow/weekday names/"in N days") and money
    parsing in pure functions with unit tests. No model, no guessing.
- Today Stream: **Now** (exactly one card), **Next** (max three), **Captured** (the
  unclear bucket, with one-tap chips to type it).
- ✓ / ✗ / ✎ on every routed item; ✎ is inline field editing, never a chat.
- "Done for now" exit button back to the picker.
- Unit tests for the router, date parser, and money parser (CI runs them).

Out of scope: escalation (S5), budget math beyond capturing an amount (S3), corrections UI
(S2 — S1 only writes correction rows).

File budget: ~14 files.

Acceptance (human):

1. From a cold open, capture "call the landlord tomorrow" in under three seconds; it
   appears instantly and lands in **Next** with tomorrow's date.
2. "I spent 12 on lunch" captures an amount without inventing a category.
3. A vague capture ("that thing about Sam") lands in **Captured**, not as a wrong task,
   and the chips let you type it in one tap.
4. ✗ removes the item instantly and shows "Noted — I won't assume that again."
5. ✎ edits a field inline and the change sticks after reload.
6. Airplane mode: capture still works; nothing errors.

---

### S2 — D2 "Life Model": corrections you can see and edit

**Goal:** make Correction Memory visible, trustworthy, and impossible to poison.

In scope:

- Correction store per [`CORRECTION_MEMORY.md`](./CORRECTION_MEMORY.md) with **scoped**
  constraints. This fixes a real defect in the pre-reset code: `constraintsFromRejection`
  stored the whole utterance and `violatesConstraints` matched by substring in both
  directions while ignoring `action_type`, so one ✗ on "buy milk" would force every later
  "buy milk" into "needs a quick clarify" forever, with no UI to undo it.
  - Constraints key on `(normalized utterance pattern, action_type, rejected entity or
    claim)`.
  - Match on **entity equality**, not substring containment.
  - `DO_NOT_ASSERT` must respect `action_type`.
  - Cap active constraints per pattern and surface the rest as history.
- **Life Model screen:** "What Aura knows" and "What Aura won't assume" — every row
  readable in plain language, editable, deletable, with the capture that caused it.
- Pre-filter and post-filter enforcement in code (LLM-free), with unit tests proving a
  rejected claim cannot recur *and* that an unrelated capture is not over-blocked.
- AI receipts list (word count + purpose + "stayed on device").

Out of scope: cross-module constraint inference, decay heuristics.

File budget: ~10 files.

Acceptance (human):

1. ✗ a wrong parse, then capture the same phrasing: Aura does not repeat the wrong claim.
2. Capture something *similar but legitimately different*: it still routes correctly (no
   over-blocking).
3. The Life Model screen explains each row in plain language and deleting a row restores
   the old behavior on the next capture.
4. Every row shows the original capture that produced it.
5. Reload: nothing forgotten, nothing duplicated.

---

### S3 — D3 "Money": budget lens, impulse rack, micro-sacrifice

**Goal:** the one demo that ends with a dollar number the tester believes.

In scope:

- Envelope-lite budget lens: a handful of seeded categories, month-to-date spend, "safe to
  spend" computed in integer cents by pure functions with unit tests. `[reuse]` the money
  helpers and category shapes from `19e71e7` where they fit.
- Capture crossover: "I spent $12 on lunch" from D1 writes a spend; "can I afford takeout"
  answers from code, not a model.
- **Anti-Regret Impulse Rack:** add an item (paste a link, type a name and price) →
  cooling timer (real 24h, seconds under Demo speed) → hours-of-work cost from an editable
  hourly rate → three alternative uses of the money → a devil's-advocate line → **Bought
  it / Skipped it** resolution.
- **Micro-Sacrifice Visualizer:** one aspiration with a target; show "two fewer takeaways
  a week → target reached in N weeks" from arithmetic, and update it live as spends land.
- **Kept in your account** counter: sum of skipped impulse items, shown on the demo card.

Out of scope: bank sync, Plaid, real categories import, multi-month history.

File budget: ~14 files.

Acceptance (human):

1. Capture a spend in D1, open D3, see it in the right category with correct math (verify
   by hand; cents must be exact).
2. Add an impulse item; the timer, hours-of-work figure, and alternatives all read
   sensibly; Demo speed lets the cooling period expire in seconds.
3. Skipping an item raises **Kept in your account** by exactly the item price.
4. The micro-sacrifice sentence changes correctly after a new spend.
5. "Can I afford takeout" gives a deterministic answer you can check.

---

### S4 — D6 "Paperwork": photo of mail → due date, amount, action

Built before D4/D5 because it is independent of them and feeds D1 and D3.

**Goal:** photograph a bill, get the three facts that matter, one tap to act.

In scope:

- Capture from camera or file picker; image never leaves the device.
- `tesseract.js` lazy-loaded only on this route, with a real progress state (OCR is slow —
  design for 3–10 seconds, not a spinner).
- Deterministic extractors (pure functions, unit tested) for amount, due date, payee, and
  an **important vs junk** heuristic; every extracted field is shown with ✓ / ✗ / ✎ before
  anything is saved. Nothing auto-commits.
- Actions: **Add to Now** (creates a dated task in D1) and **Add to Money** (creates a
  planned spend in D3).
- Three sample images bundled for testers with no mail handy.

Out of scope: multi-page documents, handwriting, contract/lease analysis, cloud OCR.

File budget: ~10 files.

Acceptance (human):

1. Photograph a real bill on a phone: amount and due date come out right, or the fields
   are clearly marked unsure — never confidently wrong.
2. Progress is visible and the app stays responsive during OCR.
3. ✗ on a wrong field prevents the save and (via S2) is remembered.
4. **Add to Now** produces a correctly dated task; **Add to Money** produces the planned
   spend.
5. Works with the network off after first load.

---

### S5 — D4 "Follow-through": graduated escalation that backs off

**Goal:** prove that captured intentions actually get done.

In scope:

- Escalation ladder per task: soft in-app toast → card pinned to **Now** → system
  notification (where permitted) → full-screen in-app takeover with sound. Each rung is
  visible in a small ladder UI so testers can see the mechanic.
- **Responsiveness score** (local, deterministic): as follow-through improves, the ladder
  starts lower and escalates slower; as it degrades, it escalates sooner. Show the current
  intensity in one sentence.
- Grace: snooze, one guilt-free skip per day, quiet hours, and a hard mute.
- Web Notifications + service worker `showNotification`, with honest feature detection.
  Document that iOS requires an installed PWA and that background timing is unreliable —
  the in-app ladder must fully work without notification permission.
- Demo speed compresses the whole ladder into seconds.

Out of scope: native app, Live Activities / Dynamic Island, alarm-level audio on iOS
background, push servers.

File budget: ~12 files.

Acceptance (human):

1. With Demo speed on, a task walks the whole ladder and the UI makes each rung obvious.
2. Completing tasks promptly visibly softens future escalation; ignoring them sharpens it.
3. Snooze, daily skip, and quiet hours all behave, and mute really mutes.
4. Denying notification permission degrades gracefully with no broken states.
5. Tested on the owner's phone as an installed PWA, with the real limits written down.

---

### S6 — D5 "Weekly digest": one noticing, one action

**Goal:** self-knowledge that ends in a button, not a dashboard.

In scope:

- Deterministic "noticers" over the local event log — five rules, each with a plain-English
  template and one suggested action:
  1. spend concentration by day of week,
  2. capture-time clustering (when your head is loudest),
  3. which tasks needed the most escalation,
  4. category creep versus the previous two weeks,
  5. ✗ rate trend (is Aura getting you right more often).
- Digest screen: one noticing sentence, one sparkline, one action button, and **"Not
  true"** — which writes a correction into the Life Model.
- Runs on seeded history so it demos on day one, and on real history once it exists.
- Honest empty state: "not enough data yet, come back after N more days" with the count.
- Unit tests for every noticer, including the not-enough-data path.

Out of scope: statistical correlation engine, causal claims, LLM-written narrative.

File budget: ~10 files.

Acceptance (human):

1. With a seeded week, the digest reads like a person wrote it and is factually checkable
   against the data.
2. The action button does something real in one tap.
3. **Not true** removes the claim and stops it recurring.
4. With a fresh store, the empty state is honest instead of inventing an insight.
5. No claim implies causation.

---

### S7 — Demo harness and scorecard

**Goal:** make the "which one wins" decision on evidence, not vibes.

In scope:

- Local-only metrics (no network, no third party): time from open to first action per demo,
  actions completed, ✓ / ✗ counts, escalation completion rate, dollars skipped, returns by
  day. Hooks are added in S0 so nothing needs retrofitting.
- Three-question rating sheet at the end of each demo: *Would you use this tomorrow
  (0–10)? What was confusing? What would you remove?*
- **Export session JSON** button so a tester can send results without any server.
- A tester packet page: the pitch line per demo, the task, and the questions.

File budget: ~8 files.

Acceptance (human): a tester finishes a demo, rates it, exports JSON, and sends it back
without ever creating an account.

---

## 5. Order and dependencies

```
S0 Foundation
 ├─ S1 D1 Now ─────┬─ S2 D2 Life Model
 │                 ├─ S3 D3 Money
 │                 ├─ S5 D4 Follow-through
 │                 └─ S6 D5 Weekly digest
 ├─ S4 D6 Paperwork (feeds S1 + S3)
 └─ S7 Harness (hooks land in S0)
```

Build order: **S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7.**

Rules of engagement: never start a slice while the previous slice's CI is red; never open a
second slice PR to "unblock" a stuck one; if the human's testing finds a defect in a
shipped slice, fix it in its own small PR before continuing.

---

## 6. Evaluation: which demos deserve to be real

### Hard numbers per demo (from S7 exports)

| Metric | Pass bar |
|---|---|
| Median time from open to first completed action | under 30s |
| Unaided completion (no help, no tutorial) | ≥ 80% of testers |
| "Would you use this tomorrow" (0–10) | median ≥ 7 |
| Unprompted second use within 48h | ≥ 40% of testers |
| Demo-specific outcome | D1 captures/day · D2 zero repeat-wrong-claim reports · D3 dollars skipped · D4 escalated-task completion rate · D5 "that's true" rate · D6 fields correct per bill |

### Judgement scores (owner, 0–5 each)

Pull (did people come back unprompted), clarity, payoff visibility, friction, trust cost,
and cost to take from demo to production.

### Protocol

- Minimum six testers plus the owner. Each tester does **three of the six** demos in a
  randomized order, five minutes each, with no tutorial and no coaching.
- The owner dogfoods **all six** for ten consecutive days and logs every failure: wrong
  parse, slow path, confusing copy, privacy surprise.
- Then: promote **at most two** demos to real product work. Park or cut the rest — no
  zombie modules.
- "All six underperform" is a legitimate outcome and means the shell or the pitch is
  wrong, not that more modules are needed.

---

## 7. Known risks

| Risk | Mitigation |
|---|---|
| Six polished demos is a lot of surface with no local build loop | Strict slice budgets, CI as the compiler, shared primitives from S0, one screen per demo |
| iOS PWA notification and background limits could gut D4 | In-app ladder works without permissions; owner tests on-device early; native decision deferred until D4 proves pull |
| OCR accuracy on real mail is uneven | Never auto-commit; show unsure fields; ✗ is one tap; bundled samples for fallback |
| Correction Memory over-blocking (the pre-reset defect) | Scoped constraints, entity equality matching, visible editable list, unit tests for both directions |
| Tesseract model assets are large | Load model assets from CDN by default (no user image leaves the device) — vendoring into the repo needs human approval first |
| Demo speed could mislead testers | Persistent indicator whenever it is on; never on by default |
| Capture-bar market is crowded | D1 is judged on the *output* half (the single Now answer and the exit), not on capture alone |

---

## 8. Open questions for the human

1. **Hosting:** GitHub Pages (assumed here) or Vercel? Pages needs to be enabled once in
   repo settings.
2. **Tesseract assets:** CDN-loaded model (default) or vendored into the repo (~4MB+)?
3. **Voice input:** ship browser speech recognition in D1 even though it is inconsistent
   across browsers, or keep D1 text-only for a cleaner comparison?
4. **Hourly rate for the impulse rack:** ask the tester once, or ship a fixed default?
5. **Tester recruiting:** the same six people across all demos, or a fresh set per demo?
6. **After the picks:** do the two winners get rebuilt on accounts and sync, or stay
   local-first with export/import as the sync story?
