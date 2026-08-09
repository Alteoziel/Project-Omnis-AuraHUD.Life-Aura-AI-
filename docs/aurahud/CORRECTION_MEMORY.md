# Life Aura — Correction Memory (Never Forget an ✗)

**Priority:** Critical trust feature  
**Ships with:** Week 1 micro-feedback (✓ / ✗ / ✎)  
**Related:** [`WEEK1_DEMO_PLAN.md`](./WEEK1_DEMO_PLAN.md) · [`FEATURE_LIST.md`](./FEATURE_LIST.md)

The worst AI failure mode: the user says something was wrong, then later the system **assumes the same wrong thing again** or **acts like the correction never happened**. Aura must never do that.

---

## Product law

> **An ✗ is permanent knowledge.**  
> Even if the user does not explain *what* was wrong, Aura remembers: *this interpretation / fact / action was rejected* — and must not silently re-assert it.

Undo is for the UI. **Memory is for the relationship.**

---

## User experience

### Tap ✗ (no explanation)

1. Instantly undo / remove the bad action (task deleted, wrong category cleared, etc.).
2. Save a **correction event** with status `rejected_unspecified`.
3. Optional one-line, dismissible (never blocking):  
   “Noted — I won’t assume that again.”  
   Optional chip: **What was off?** (category / amount / person / timing / other) — skippable.
4. Do **not** open a chat. Do **not** demand a paragraph.

### Tap ✎ (quick edit)

1. User fixes the field(s).
2. Save correction with status `corrected` + before/after values.
3. Prefer the corrected pattern next time for similar input.

### Tap ✓

1. Reinforce that parse path (positive weight).
2. Still never overrides an existing ✗ on the same claim.

---

## What gets stored (Correction Memory)

Each event is structured (code-owned), not a vague chat memory:

| Field | Purpose |
|---|---|
| `input_snippet` | What the user said/typed (minimized) |
| `rejected_output` | What Aura claimed or did |
| `action_type` | e.g. `add_task`, `budget_category`, `pantry_item`, `intent_route` |
| `entities` | Parsed people, amounts, dates, item names involved |
| `status` | `rejected_unspecified` \| `corrected` \| `resolved_later` |
| `negative_constraints` | Machine rules derived from the ✗ (see below) |
| `open_question` | If unspecified: what blank Aura may gently fill later |
| `created_at` / `last_seen_at` | For decay only of *suggestions*, never of hard rejects |

### Negative constraints (the anti-amnesia layer)

From every ✗, write at least one hard rule into the Life Model, for example:

- `DO_NOT_ASSERT`: “User rejected: payee = Starbucks for that utterance”
- `DO_NOT_ROUTE`: “Phrase pattern X is not a pantry item”
- `DO_NOT_ASSUME_DEFAULT`: “Do not default Dining for ‘lunch’ until clarified”
- `FACT_INVALID`: “Claim Y is false for this user” (until they correct it)

**Hard rejects are consulted on every future parse** for matching context. The LLM is instructed (and the code enforces): if a candidate output conflicts with an active `DO_NOT_*` rule → drop it or ask a one-tap clarifier — **never silently reuse the rejected claim.**

---

## Filling the blank later (without nagging)

When status is `rejected_unspecified`, Aura may still be missing *why*. Strategies:

1. **Keep it in mind silently** — default. Next similar input → avoid the rejected interpretation; if ambiguous, prefer “unclear” over re-guessing the dead option.
2. **Opportunistic one-tap fill** — only when the user is already in a related flow, a single chip row:  
   “Last time I misread that — was it the *category* or the *amount*?”  
   Rare; never a quiz on app open.
3. **Resolve on next edit** — if they later enter the same thing correctly via ✎ or manual add, mark `resolved_later` and convert to a positive pattern + keep the negative constraint against the old wrong value.
4. **Never re-ask in a loop** — if they dismiss the clarifier, wait a long time / until they initiate.

---

## Runtime enforcement (so models can’t “forget”)

LLMs are stateless and will happily re-hallucinate. **Code must enforce memory:**

1. **Pre-filter** — before showing/applying an AI result, check Correction Memory for conflicts with `rejected_output` / entities / `DO_NOT_*` rules.
2. **Prompt pack** — inject a short “Active corrections” list (only relevant rules) into the intent call.
3. **Post-filter** — if the model emits a rejected claim anyway, strip it and fall back to safer behavior (ask / leave unclear / no write).
4. **DB wins** — corrections live in the user database (local-first + sync), not in the model’s chat history.
5. **✓ cannot wash out ✗** — a later similar ✓ on a *different* interpretation is fine; a ✓ never deletes a hard reject of a specific false claim without an explicit user edit.

---

## Examples

| User said | Aura did | User | Future behavior |
|---|---|---|---|
| “I spent $12 on lunch” | Categorized as Coffee | ✗ only | Never auto-file that utterance/pattern as Coffee; next time ask category chips or leave uncategorized — do not silently pick Coffee again |
| “Add milk” | Added task “Buy silk” | ✗ then later types milk in groceries | Reject “silk”; when milk is added correctly, bind pattern → pantry/grocery not nonsense task |
| “Remind me about Sam” | Created call with Sam at work | ✗, no detail | Do not recreate work-Sam reminder from that phrase; optional later chip: “Person or nickname?” once |

---

## Week 1 minimum vs later

**Week 1 (must ship with ✗):**

- ✗ undoes the action
- Persist `corrections` row (`rejected_unspecified` or `corrected` with before/after)
- On next matching intent, **exclude** the rejected interpretation (code post-filter + prompt note)
- One-line “Noted — I won’t assume that again.”

**Later:**

- Smarter `open_question` chips
- Cross-module constraints (budget ✗ informs pantry assumptions)
- Decay only for soft preferences, never for explicit rejects
- Life Model dashboard: “Things I’ve learned not to assume” (user-visible, editable)

---

## Success test

If a user taps ✗ on a wrong category/name/amount and comes back tomorrow with a similar capture, Aura **does not** confidently repeat the same wrong answer. Repeating a rejected claim is a **P0 bug**, not a model quirk.
