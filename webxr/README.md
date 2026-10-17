# STARK OS visor (WebXR)

Mixed-reality Iron Man HUD for **Meta Quest 3 Browser**. This folder is the Quest path. It does not replace `web/`, `dashboard/`, or any engine work.

## What it is

- Three.js `immersive-ar` client with color passthrough and optional hand tracking
- Helmet-locked holographic ring (cyan wireframe, slow counter-rotation)
- Floating **HOUSE SYSTEMS** and **HOLOCOMM** windows (one of each). **Pinch thumb + index** to move a window; release to drop it. Hover / tap never grabs.
- Reach a panel — it comes to your hand and shrinks. Hover a row, then tap. No laser pointer.
- Minimize the visor with the on-visor **TAP STOW** chip (or “minimize”); the **STARK OS** chip, a swipe, or “restore” brings it back
- Jarvis (Web Speech) plus a blue holocomm cone with original messengers. Commands commit after ~2.2s of silence so a breath does not cut you off. Heard text stays on the visor.
- Say **send the suit** — original cyan/gold nano-armor builds hands → arms → body (~2s). **Take the suit off** peels it.
- Suit on: hold a palm out (facing away) to charge ~2s, then blast. Chunks sit on the Quest room mesh / detected planes when Space Setup + spatial permission are available; otherwise a generic box after ~4s.
- Lights stay local until Alexa is wired
- Desktop fallback is a cinematic preview (click / drag; no passthrough)

Live HTTPS: https://tony-stark-hud-theta.vercel.app/

## Quest 3

1. Open https://tony-stark-hud-theta.vercel.app/ in the **Meta Quest Browser** (not App Lab).
2. Allow camera / microphone if asked.
3. Tap **Engage Helmet**.
4. The room stays visible through passthrough. The visor locks about a meter in front of you.
5. Reach toward HOUSE SYSTEMS. The window comes to your hand and shrinks. Hover a row, then tap. Pinch thumb + index to drag the window; release to drop it.
6. Allow spatial data if asked so wall chunks land on your real room. Say “Jarvis, send the suit” (pause ~2s after the line). Plates crawl onto hands, arms, then the chassis. Palm out, hold ~2s — blast the mapped wall. Say “take the suit off” to peel.

## Deploy

Static files. Vercel project root must be `webxr/` so this does not disturb the AuraHUD Next app.
