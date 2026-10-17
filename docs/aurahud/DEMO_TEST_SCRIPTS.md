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

## WebXR — Iron Man visor (Quest 3)

URL: https://tony-stark-hud-theta.vercel.app/ (Vercel project `tony-stark-hud`, root `webxr/`). Devices: **Meta Quest 3 Browser** first, desktop Chromium only for the cinematic preview.

### Desktop preview (optional)

1. Open the HTTPS URL on a computer. The page is near-black with a glowing cyan HUD ring, a HOUSE SYSTEMS panel, and a voice orb. It should feel like a visor, not a tutorial cube.
2. Click **Desk Light**. The row lights, flashes, and the receipt reads `ACTUATED desk_light`. House link is still local.
3. Click **Open Audio**, allow the mic, and speak. The orb swells and the chrome says **VOICE LIVE**.

### Quest 3 — put the helmet on

1. On the headset, open **Meta Quest Browser** (the system browser).
2. Go to the HTTPS URL. Do not use a `http://` LAN address.
3. Tap **Engage Helmet**. Allow camera / microphone if the browser asks.
4. Passthrough stays on — you still see the real room. A cyan holographic ring locks in front of your face and slowly rotates. HOUSE SYSTEMS is on the right, HOLOCOMM on the left.
5. HOUSE SYSTEMS stays on the HUD dock. It must **not** slide toward your palm or orbit the hand. Hover **Desk Light** with your index fingertip — the row brightens. Tap / poke the row. It flashes `ACTUATED`. Lights stay local. There is no laser / pinch-beam.
6. Repeat for **Ceiling Light**. Same hover → tap on the docked pose. Bring hands in toward your body — windows ease **back to the HUD dock and stay**. They must not snap to the hands or oscillate. Hover / two-finger tap must **not** grab the window.
7. **Pinch thumb + index** near HOUSE SYSTEMS and drag it aside. Only that pinch follows the hand. Release the pinch — it stays until you bring hands back in, then it homes to the dock. A palm or fist must not attach. Open-hand **palm swipe** also snaps windows home. There is only one HOUSE SYSTEMS and one HOLOCOMM.
8. The gold **TAP STOW** chip stays on-visor. Tap it (or say “minimize”). The HUD collapses to a **STARK OS** chip. Tap the chip, palm-swipe, or say “restore”.
9. Watch the house. After Engage, the receipt should read `ROOM MESH  N WALLS` and cyan chunks should sit on **your real walls** (Quest Space Setup + allow spatial data). If the browser has no mesh / you deny permission, after ~4s it reads `ROOM FALLBACK  NO MESH` and uses the generic box.
10. Say “Jarvis, send the suit” (or tap **NANO SUIT**). Speak across a short breath — the HEARD line should keep the words and **not** fire until you stay quiet ~2 seconds. Then cyan/gold plates build onto hands, then arms, then the body in about two seconds. Not a Marvel mesh.
11. With the suit on, hold one hand **palm out, facing away**, and keep it still. Light + original charge tone for ~2s, then a blast. Chunks on the **real wall** (or fallback box) should break and fall.
12. Say “take the suit off.” Armor peels. You are visor + passthrough again.
13. Say “Jarvis, status” then “open holocomm” or tap **THE SAGE**. Heard text appears, then the command fires only after the long pause. A blue cone projects a CC0 Kenney humanoid in hologram material. It idles, then talks while a stylized original line is spoken (TTS). Repeat for masked lord / hooded emperor / young knight. Not film likenesses, not movie audio.
14. Use the Quest browser exit / **End AR** control. You return to the 2D visor page. **Engage Helmet** works again.

### Expected gaps

- House/Alexa is not in this slice. Toggles flip locally and show **ACTUATED**.
- Hand meshes are fingertip markers plus nano plates, not full skinned hands.
- Cloud AI stays off. No API keys. Jarvis and holocomm voices are Web Speech, not a model.
- Holocomm figures are Kenney Mini Characters (CC0) plus original accessories/lines. Not Disney / Lucasfilm likenesses.
- No first-encounter / shoot-walls scene exists in this AuraHUD repo (current tree or `19e71e7`). Chunks are original. They map onto WebXR plane/mesh detection when Quest Space Setup + spatial permission are available; otherwise a generic box after ~4s.
- Web Speech still needs a mic permission and a browser engine that implements SpeechRecognition. Silence commit is ~2.2s on purpose so a breath does not end the line.


