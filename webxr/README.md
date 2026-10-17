# STARK OS visor (WebXR)

Mixed-reality Iron Man HUD for **Meta Quest 3 Browser**. This folder is the Quest path. It does not replace `web/`, `dashboard/`, or any engine work.

## What it is

- Three.js `immersive-ar` client with color passthrough and optional hand tracking
- Helmet-locked holographic ring (cyan wireframe, slow counter-rotation)
- Floating **HOUSE SYSTEMS** and **HOLOCOMM** windows with grab handles
- Reach a panel — it comes to your hand and shrinks. Hover a row, then tap. No laser pointer.
- Minimize the visor to a **STARK OS** chip; palm-swipe or tap the chip to restore
- Jarvis (Web Speech) plus a blue holocomm cone with original messengers
- Lights stay local until Alexa is wired
- Desktop fallback is a cinematic preview (click / drag; no passthrough)

Live HTTPS: https://tony-stark-hud-theta.vercel.app/

## Quest 3

1. Open https://tony-stark-hud-theta.vercel.app/ in the **Meta Quest Browser** (not App Lab).
2. Allow camera / microphone if asked.
3. Tap **Engage Helmet**.
4. The room stays visible through passthrough. The visor locks about a meter in front of you.
5. Reach toward HOUSE SYSTEMS. The window comes to your hand and shrinks. Hover a row, then tap the hologram.

## Deploy

Static files. Vercel project root must be `webxr/` so this does not disturb the AuraHUD Next app.
