# Project Omnis — Agent Build Rules

These rules apply to **every** agent session that builds, edits, or reviews code in this
repository. They exist to keep usage cost low, keep verification honest, and keep the
human owner in control of what ships.

Current execution plan: [`docs/aurahud/DEMO_BUILD_PLAN.md`](docs/aurahud/DEMO_BUILD_PLAN.md)

---

## 1. Hard constraints (never violate)

### 1.1 Model: Grok 4.6 High (non-fast) only

- All building in this repo is done by **Grok 4.6 High — the non-fast variant**.
- Do **not** use the `-fast` variant, and do not switch to another model family mid-task.
- A rule file cannot verify which model is running. If you are running as any other
  model, **stop, say so, and let the human re-run the task on Grok 4.6 High** instead of
  proceeding.

### 1.2 No subagents

- Never spawn subagents, background agents, or parallel agent runs of any kind for work
  in this repo. That includes exploration, research, debugging, review, and testing
  subagents.
- Do the work in the main session, sequentially.

### 1.3 No building or testing on the environment computer

Do **not** run any of the following in the agent VM / dev container / local shell:

- `npm install` / `npm ci` / `npm run build` / `npm run dev` / `npm test` / `npx tsc`
- `pytest`, linters, formatters, or any other build or test command
- dev servers, watchers, or long-running background processes
- browser automation, computer use, screenshots, or screen recordings

`.cursor/install.sh` and the `.cursor/environment.json` terminal may run automatically at
VM boot. That is fine. Do not invoke them manually and do not wait on them.

### 1.4 Humans own frontend testing

- The human owner and their testers do **all** frontend, UI, device, and PWA testing.
- Never claim a UI works because it "should." State what you changed and what the human
  should check.
- Every product PR must ship a short, copy-pasteable test script (see §3).
- Do not produce walkthrough videos, screenshots, or GUI demo artifacts.

### 1.5 Usage discipline

Cost is a first-class constraint. In practice:

- **One slice = one branch = one PR.** Never merge two plan slices into one PR.
- Read only the files a slice names, plus files you are editing. Do not go exploring.
- No repo-wide refactors, no speculative abstraction, no drive-by renames.
- No new dependency unless the plan's approved list allows it (see the plan's
  "Approved dependencies").
- Prefer restoring known-good code from git history over rewriting it (§4).
- Keep diffs small; if a slice is outgrowing its file budget, stop and ask.

---

## 2. Verification model

CI is the compiler. `.github/workflows/enterprise-hygiene.yml` auto-detects
`web/package-lock.json` and then runs, on every PR:

| Check | Command in CI |
|---|---|
| Lint | `npm run lint` in `web/` |
| Types | `npx tsc --noEmit` in `web/` |
| Unit tests | `npm test` in `web/` |
| Production build | `npm run build` in `web/` |
| Secrets | Gitleaks |
| SAST | Semgrep (`.semgrep.yml` + OWASP packs) |
| Dependencies | `npm audit --audit-level=high` |

Because of that, the workflow for an agent is:

1. Write the code carefully (types first; pure logic in testable functions).
2. Commit, push, open/update the PR.
3. Let CI verify. If a check fails, read only the failing step
   (`gh run view --log-failed`) and fix that.
4. Hand the tester script to the human.

Never substitute a local build for CI, and never disable, weaken, or skip a governance
check to make a PR go green.

---

## 3. Required PR shape

Every product PR must include:

- **What changed** — one short paragraph.
- **Test script for humans** — numbered steps, expected result per step, and which
  device(s) matter (phone / desktop). Also append it to
  `docs/aurahud/DEMO_TEST_SCRIPTS.md`.
- **Known gaps** — what is intentionally unfinished or stubbed.
- The existing checklist in `.github/PULL_REQUEST_TEMPLATE.md`.

Branch naming stays `cursor/<descriptive-name>-<suffix>`. Create PRs as drafts unless the
human asks otherwise.

---

## 4. Reuse before rewrite

The pre-reset product still exists in git history at commit `19e71e7`. Read a file with:

```
git show 19e71e7:web/src/lib/aura/intent-router.ts
```

Useful prior art (each plan slice lists what to pull):

| Path at `19e71e7` | What it gives you |
|---|---|
| `web/src/lib/aura/intent-router.ts` | Local rules intent router + correction filters |
| `web/src/lib/aura/corrections.ts` | Correction constraint parsing |
| `web/src/lib/aura/capture-flow.ts` | Capture → route → persist → receipt flow |
| `web/src/components/aura/*` | Command bar, Today Stream, cloud-AI toggle, nudge |
| `web/src/lib/base-path.ts` | Only if a URL subpath is later required (Vercel root deploy does not need this) |
| `web/src/components/RegisterServiceWorker.tsx` | Service worker registration (see the Pages refresh-loop fix in `08883bf`) |
| `web/src/lib/crypto/secrets.ts` | Client crypto helpers |

Copy deliberately, not wholesale: known defects in that code are called out in the plan
and must be fixed as you port it.

---

## 5. Product guardrails (from the planning docs)

- **Cloud AI is off in the demo phase.** Routing and "insights" are deterministic local
  rules. No LLM API calls, no API keys, no network calls for AI.
- **Local-only data during demos.** No Supabase, no accounts, no server-side storage.
  Everything lives in the browser and must be wipeable from the UI.
- **Money, dates, and timers are code, never a model.**
- **Correction Memory is a product law**, not a nice-to-have: a rejected interpretation is
  never silently re-asserted. See [`docs/aurahud/CORRECTION_MEMORY.md`](docs/aurahud/CORRECTION_MEMORY.md).
- **No analytics that exfiltrate content.** Demo metrics stay local and are exported by
  the user on purpose.

---

## 6. Stop and ask the human when

- A slice needs a dependency that is not on the approved list.
- A slice needs a secret, an API key, or a hosted service.
- The work would exceed the slice's file budget or bleed into another slice.
- A governance check fails in a way that seems to require weakening the check.
- The plan and reality disagree (e.g. a browser API cannot do what a slice assumes).

Stopping to ask is cheaper than a wrong build.
