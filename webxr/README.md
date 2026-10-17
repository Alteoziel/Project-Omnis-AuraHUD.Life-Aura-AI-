# STARK OS visor (WebXR)

Mixed-reality Iron Man HUD for **Meta Quest 3 Browser**. This folder is the Quest path. It does not replace `web/`, `dashboard/`, or any engine work.

## What it is

- Three.js `immersive-ar` client with color passthrough and optional hand tracking
- Helmet-locked holographic ring (cyan wireframe, slow counter-rotation)
- Floating **HOUSE SYSTEMS** panel: Desk Light, Ceiling Light, Scan Room
- Pinch or poke sends `{ "action": "<name>" }` JSON to `ws://localhost:8000`
- Voice orb pulses from microphone RMS
- Desktop fallback is a cinematic preview (click toggles; no passthrough)

## Quest 3

1. Open the HTTPS deploy URL in the **Meta Quest Browser** (not App Lab).
2. Allow camera / microphone if asked.
3. Tap **Engage Helmet**.
4. The room stays visible through passthrough. The visor locks about a meter in front of you.
5. Pinch thumb-to-index or poke a toggle. If a home bridge is listening on `ws://localhost:8000`, it receives the action.

Override the socket with `?ws=wss://your-bridge.example`.

## Deploy

Static files. Vercel project root must be `webxr/` so this does not disturb the AuraHUD Next app.
