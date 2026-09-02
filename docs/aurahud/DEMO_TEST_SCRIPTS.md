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

- D1 Now is in S1. Other demo cards still say Next.
- App icons may still use the previous PNG set; SVGs are the new Night Flash mark.

---

## S1 — Now (capture → Today Stream)

URL: `/now` (also the **Now** card on the home picker). Safari desktop, then iPhone.

1. From a cold open, type `call the landlord tomorrow` and press Enter. It appears instantly and lands in **Next** (or **Now** if nothing else is due) with tomorrow's date.
2. Type `I spent $12 on lunch`. An amount of $12.00 is shown. No category is invented.
3. Type `that thing about Sam`. It lands in **Captured**, not as a wrong task. Use **Task / Reminder / Spend** chips to type it.
4. Tap **✗** on a wrong item. It disappears immediately. Toast: **Noted — I won't assume that again.** Capture the same phrase again: it should land in Captured, not confidently repeat.
5. Tap **✎**, change the title, Save. Reload: the edit is still there.
6. Airplane mode: **typed** capture still works.
7. Safari/iPhone: tap mic, speak `call the landlord tomorrow`, see it land. Deny mic once: typing still works. The one-line Apple-dictation note is visible.
8. **Done for now** returns to the picker.

---

## S2 — Life Model

URL: `/life-model`.

1. In Now, ✗ a wrong parse. Open Life Model. The row explains the rejection in plain language and shows the original capture.
2. Capture the same phrasing in Now: it does not repeat the wrong claim.
3. Capture something similar but different: it still routes.
4. Delete the row in Life Model. Capture the original phrasing again: the old guess can return.
5. Reload: rows are still there until you delete them.

---

## S3 — Money

URL: `/money`.

1. Capture `I spent $12 on lunch` in Now. Open Money. Uncategorized (or dining) includes $12.00 exactly.
2. Add an impulse. Hours-of-work uses $20/hour unless you change it. Change the rate; the hours sentence updates.
3. Turn **Demo speed** on. Cooling expires in seconds. **Skipped it** raises **Kept in your account** by the item price.
4. Micro-sacrifice sentence is checkable: 2 × $22 / week toward $800.
5. Reload: spends, impulses, and rate persist.

---

## S5 — Follow-through (graduated escalation)

URL: `/follow-through` (also the **Follow-through** card on the home picker). Safari desktop, then iPhone as an installed PWA for the notification rung.

1. From home, **Seed a week of history**, turn **Demo speed** on, open **Follow-through**. You should see intensity around 50: **Aura is meeting you in the middle.**
2. Tap **Watch** on **Call the landlord** (or any open task). The ladder sits on **0. Waiting**. Within about **2 seconds** it should move to **1. Soft nudge** and a toast: **Still on your list: …**
3. Wait. About **4s** total: **2. Pinned to Now**. Open **Now** (`/now`): that task is the **Do this** card. Come back.
4. About **8s**: **3. System ping**. If you previously tapped **Allow notifications** and granted them, a banner may appear. If you deny or skip, the in-app ladder still advances and a one-line note explains iPhone/PWA limits. Nothing should look broken.
5. About **12s**: **4. Takeover** fills the screen (a short beep unless reduced-motion is on). Tap **Done**. Intensity should rise (going easy). Watch the same kind of task again: rungs take longer.
6. Arm another task. Toggle **Hard mute**: the ladder freezes. Toggle mute off. Turn **Quiet hours 10pm–8am** on during those hours: it freezes; off during daytime it should not. **Snooze** resets to waiting for ~2 simulated hours (~2s). **Skip today** works once; a second skip the same day is refused.
7. **Done for now** returns to the picker. Reload: mute / quiet / score persist.

### Expected gaps in S5

- iOS banners need an installed PWA and are still unreliable in the background. The in-app ladder is the real test.
- Paperwork (S4) and Weekly digest (S6) are still Next.


