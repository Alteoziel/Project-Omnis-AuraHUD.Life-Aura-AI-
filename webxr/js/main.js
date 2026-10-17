import * as THREE from "three";
import { createHud } from "./hud.js";
import { createHands } from "./hands.js";
import { createVoice } from "./voice.js";
import { createBridge } from "./bridge.js";

const overlay = document.getElementById("overlay");
const enterBtn = document.getElementById("enter-ar");
const voiceBtn = document.getElementById("enable-voice");
const bootLine = document.getElementById("boot-line");
const hint = document.getElementById("hint");
const clockEl = document.getElementById("clock");
const linkEl = document.getElementById("link-status");
const voiceEl = document.getElementById("voice-status");

const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);
camera.position.set(0, 1.35, 0.85);

const previewRig = new THREE.Group();
scene.add(previewRig);

const hud = createHud();
const hudAnchor = new THREE.Group();
hudAnchor.add(hud.root);
scene.add(hudAnchor);

const dustGeo = new THREE.BufferGeometry();
const dustCount = 220;
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i += 1) {
  dustPos[i * 3] = (Math.random() - 0.5) * 6;
  dustPos[i * 3 + 1] = Math.random() * 3;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: 0x3df0ff,
    size: 0.012,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
previewRig.add(dust);

const floor = new THREE.GridHelper(8, 32, 0x12313a, 0x081820);
floor.position.y = 0;
previewRig.add(floor);

const hemi = new THREE.HemisphereLight(0x9fefff, 0x05080c, 0.7);
scene.add(hemi);

const clock = new THREE.Clock();
const followPos = new THREE.Vector3();
const followQuat = new THREE.Quaternion();
const camPos = new THREE.Vector3();
const offset = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let xrActive = false;
let snapped = false;
let voiceLevel = 0;

const bridge = createBridge({
  onStatus({ state }) {
    linkEl.dataset.state = state;
    linkEl.textContent = state === "live" ? "BRIDGE LIVE" : "BRIDGE OFFLINE";
  },
});

const voice = createVoice({
  onLevel(level) {
    voiceLevel = level;
  },
  onState(state) {
    voiceEl.textContent = state === "live" ? "VOICE LIVE" : "VOICE STANDBY";
  },
});

const hands = createHands(renderer, scene);

function placePreviewHud() {
  hudAnchor.position.set(0, 1.28, -0.95);
  hudAnchor.rotation.set(0, 0, 0);
}

function followHelmet(dt) {
  camera.getWorldPosition(camPos);
  camera.getWorldQuaternion(followQuat);
  offset.set(0, -0.06, -0.92).applyQuaternion(followQuat);
  followPos.copy(camPos).add(offset);
  const alpha = snapped ? 1 - Math.exp(-8 * dt) : 1;
  hudAnchor.position.lerp(followPos, alpha);
  hudAnchor.quaternion.slerp(followQuat, alpha);
  snapped = true;
}

function setBootCopy(text) {
  bootLine.textContent = text;
}

async function bootSequence() {
  const lines = [
    "BIOMETRIC HANDSHAKE…",
    "PASSTHROUGH CALIBRATED",
    "HAND TRACKING ONLINE",
    "HOUSE LINK SEEKING :8000",
    "VISOR LOCKED — ENGAGE WHEN READY",
  ];
  for (const line of lines) {
    setBootCopy(line);
    await new Promise((resolve) => window.setTimeout(resolve, 380));
  }
}

function fireAction(row) {
  const next = row.userData.action === "scan_room" ? true : !row.userData.on;
  hud.setButtonState(row, { on: next });
  if (row.userData.action === "scan_room") {
    hud.triggerScan();
    window.setTimeout(() => {
      hud.setButtonState(row, { on: false });
    }, 1200);
  }
  hud.pulseButton(row);
  bridge.send(row.userData.action, { on: next });
  hud.flashReceipt(`ACTUATED  ${row.userData.action}`, true);
}

function hoverFromPointer(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(
    hud.buttons.map((row) => row.userData.hit),
    false,
  );
  hud.buttons.forEach((row) => {
    const hovered = hits[0] && hits[0].object === row.userData.hit;
    hud.setButtonState(row, { hover: Boolean(hovered) });
  });
  return hits[0]?.object?.parent ?? null;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function requestArSession() {
  const attempts = [
    {
      requiredFeatures: ["local-floor"],
      optionalFeatures: ["hand-tracking", "dom-overlay", "hit-test", "anchors"],
      domOverlay: { root: overlay },
    },
    {
      optionalFeatures: ["hand-tracking", "dom-overlay"],
      domOverlay: { root: overlay },
    },
    { optionalFeatures: ["hand-tracking"] },
    {},
  ];
  let lastError = null;
  for (const options of attempts) {
    try {
      return await navigator.xr.requestSession("immersive-ar", options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("immersive-ar unavailable");
}

async function enterAR() {
  if (!navigator.xr) {
    setBootCopy("WEBXR UNAVAILABLE ON THIS BROWSER");
    return;
  }
  enterBtn.disabled = true;
  setBootCopy("LOWERING HELMET…");
  try {
    const session = await requestArSession();
    session.addEventListener("end", () => {
      xrActive = false;
      snapped = false;
      document.body.classList.remove("is-xr");
      previewRig.visible = true;
      renderer.setClearColor(0x000000, 0);
      placePreviewHud();
      enterBtn.disabled = false;
      setBootCopy("HELMET OPEN — ENGAGE AGAIN");
    });
    await renderer.xr.setSession(session);
    xrActive = true;
    snapped = false;
    document.body.classList.add("is-xr");
    previewRig.visible = false;
    renderer.setClearColor(0x000000, 0);
    try {
      await voice.start();
    } catch {
      voiceEl.textContent = "VOICE DENIED";
    }
  } catch (error) {
    enterBtn.disabled = false;
    setBootCopy(error?.message || "ENTER AR FAILED");
  }
}

async function initXrButton() {
  if (!navigator.xr || !navigator.xr.isSessionSupported) {
    enterBtn.disabled = true;
    hint.textContent = "Open this HTTPS URL in the Meta Quest 3 Browser, then tap Engage Helmet.";
    return;
  }
  const supported = await navigator.xr.isSessionSupported("immersive-ar").catch(() => false);
  if (!supported) {
    enterBtn.disabled = true;
    hint.textContent = "This browser cannot start immersive-ar. Use Meta Quest 3 Browser.";
    return;
  }
  enterBtn.disabled = false;
  hint.textContent = "Quest 3: Engage Helmet. Point the beam at a toggle, then pinch.";
}

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;
  if (!xrActive) {
    camera.position.x = Math.sin(elapsed * 0.15) * 0.18;
    camera.position.y = 1.34 + Math.sin(elapsed * 0.21) * 0.03;
    camera.lookAt(hudAnchor.position);
  } else {
    followHelmet(dt);
  }
  voice.sample();
  hud.setVoiceLevel(voiceLevel);
  hands.interact(hud.buttons, fireAction);
  hud.buttons.forEach((row) => {
    const hover = Boolean(row.userData.hover || row.userData.controllerHover);
    hud.setButtonState(row, { hover });
  });
  hud.update(dt, elapsed);
  clockEl.textContent = new Date().toISOString().slice(11, 19) + "Z";
  renderer.render(scene, camera);
}

placePreviewHud();
window.addEventListener("resize", onResize);
window.addEventListener("pointermove", (event) => {
  if (!xrActive) {
    hoverFromPointer(event.clientX, event.clientY);
  }
});
window.addEventListener("click", (event) => {
  if (xrActive) {
    return;
  }
  const row = hoverFromPointer(event.clientX, event.clientY);
  if (row) {
    fireAction(row);
  }
});
enterBtn.addEventListener("click", () => {
  void enterAR();
});
voiceBtn.addEventListener("click", async () => {
  try {
    await voice.start();
    setBootCopy("AUDIO CHANNEL OPEN");
  } catch {
    voiceEl.textContent = "VOICE DENIED";
    setBootCopy("MICROPHONE BLOCKED");
  }
});

void bootSequence();
void initXrButton();
renderer.setAnimationLoop(tick);
