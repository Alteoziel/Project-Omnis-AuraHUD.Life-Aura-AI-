# STARK OS visor (WebXR)

Mixed-reality Iron Man HUD for **Meta Quest 3 Browser**. This folder is the Quest path. It does not replace `web/`, `dashboard/`, or any engine work.

## What it is

- Three.js `immersive-ar` client with color passthrough and optional hand tracking
- Helmet-locked holographic ring (cyan wireframe, slow counter-rotation)
- Floating **HOUSE SYSTEMS** panel: Desk Light, Ceiling Light, Scan Room
- Point a hand ray at a toggle, then pinch (thumb + index) or squeeze to actuate. Lights stay local until Alexa is wired.
- Voice orb pulses from microphone RMS
- Desktop fallback is a cinematic preview (click toggles; no passthrough)

Live HTTPS: https://tony-stark-hud-theta.vercel.app/

## Quest 3

1. Open https://tony-stark-hud-theta.vercel.app/ in the **Meta Quest Browser** (not App Lab).
2. Allow camera / microphone if asked.
3. Tap **Engage Helmet**.
4. The room stays visible through passthrough. The visor locks about a meter in front of you.
5. Point the cyan beam at a HOUSE SYSTEMS row. Pinch thumb to index. Do not walk up to poke the panel.

## Deploy

Static files. Vercel project root must be `webxr/` so this does not disturb the AuraHUD Next app.
