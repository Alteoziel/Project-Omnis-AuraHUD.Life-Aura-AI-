# AuraHUD demo test scripts

Humans run these. Agents do not. Each slice appends a section.

Devices that matter for this phase: **Safari on desktop, then iPhone** (installed PWA when noted).

---

## S0 — Foundation shell

URL: the Vercel preview for the `web/` app (root `/`).

### Setup

1. Open the preview URL in Safari.
2. Confirm the page is dark (near-black) with magenta/ice accents, not a white flash.

### Home

1. You see the headline **Your life, in a glance.**
2. Six demo cards are visible: Now, Life Model, Money, Follow-through, Weekly digest, Paperwork. They are labeled D1–D6 and say **Next** (flows are not in this slice).
3. The vault card says **Empty vault** on a first visit.

### Seed and reset

1. Tap **Seed a week of history**. The vault card should change to a count (about 10 items). A toast appears.
2. Reload the page. The seeded count is still there.
3. Tap **Reset demo data** → **Wipe it**. The vault says **Empty vault** again. Toast offers **Undo** for ~6 seconds.
4. Tap **Undo** immediately. Seeded data returns.
5. Wipe again, wait for the toast to disappear, reload. Still empty.

### Demo speed

1. Toggle **Demo speed** on. A persistent ice-colored bar appears: **Demo speed on · 1s = 1 hour**.
2. Reload. The bar is still there.
3. Toggle it off. The bar disappears.

### Install / offline (iPhone)

1. Share → **Add to Home Screen**. Open the icon. It should open without Safari chrome and without a refresh loop.
2. With the installed app, load once online, then enable Airplane Mode. The home screen still appears (or the offline fallback, not a Safari error page).

### Keyboard / a11y

1. Tab through Seed, Reset, and Demo speed. A bright ice focus ring is visible.
2. Primary buttons are easy to hit with a thumb (at least 44px tall).

### Expected gaps in S0

- Demo cards do not navigate yet.
- Voice, capture, budget, OCR, escalation, and digest are not built.
- App icons may still use the previous PNG set; SVGs are the new Night Flash mark.
