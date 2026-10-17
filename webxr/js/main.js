import * as THREE from "three";
import { createHud } from "./hud.js";
import { createHands } from "./hands.js";
import { createVoice } from "./voice.js";
import { createBridge } from "./bridge.js";
import { createHolocomm } from "./holocomm.js";
import { createJarvis } from "./jarvis.js";
import { createHouse } from "./house.js";
import { createSuit } from "./suit.js";

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

const house = createHouse();
scene.add(house.root);

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
    voiceEl.textContent = state === "live" ? "JARVIS LIVE" : "VOICE STANDBY";
  },
});

const holocomm = createHolocomm();
holocomm.root.position.set(0, -0.14, 0.08);
hud.stage.add(holocomm.root);

const grabOffset = new THREE.Vector3();
const localPinch = new THREE.Vector3();
const dragPoint = new THREE.Vector3();

const allTargets = () => [hud.chip, ...hud.windows.map((win) => win.userData.handle), ...hud.buttons, ...hud.holoButtons];

function lightState(id) {
  const row = hud.buttons.find((item) => item.userData.action === id);
  return row?.userData.on ? "live" : "dark";
}

function jarvisReply(line) {
  hud.setReply(line);
  jarvis.speak(line);
}

const jarvis = createJarvis({
  onHeard(text) {
    hud.setHeard(text);
  },
  onCommand(command) {
    runCommand(command);
  },
  onState(state) {
    if (state === "live") {
      voiceEl.textContent = "JARVIS LIVE";
    } else     if (state === "unavailable") {
      voiceEl.textContent = "JARVIS OFF";
      hud.setReply("WEB SPEECH UNAVAILABLE — TAP STILL WORKS");
    }
  },
});

function runCommand(command) {
  if (command.type === "minimize") {
    hud.minimize();
    jarvisReply("Stowing the visor. Tap the chip when you want it back.");
    return;
  }
  if (command.type === "restore") {
    hud.restore();
    jarvisReply("Visor up.");
    return;
  }
  if (command.type === "toggle") {
    const row = hud.buttons.find((item) => item.userData.action === command.id);
    if (row) {
      fireAction(row);
    }
    jarvisReply("Done. Still local. Alexa is pending.");
    return;
  }
  if (command.type === "status") {
    hud.restore();
    jarvisReply(
      `All local. Desk ${lightState("desk_light")}. Ceiling ${lightState("ceiling_light")}. Suit ${suit.on ? "on" : "off"}. Holocomm ${holocomm.active ? "live" : "idle"}.`,
    );
    return;
  }
  if (command.type === "suit") {
    if (command.on) {
      suit.send();
      const row = hud.buttons.find((item) => item.userData.action === "nano_suit");
      if (row) {
        hud.setButtonState(row, { on: true });
      }
      hud.flashReceipt("NANO SUIT  BUILDING", true);
      jarvisReply("Nano-armor coming online. Hands, then arms, then the chassis.");
    } else {
      suit.dismiss();
      const row = hud.buttons.find((item) => item.userData.action === "nano_suit");
      if (row) {
        hud.setButtonState(row, { on: false });
      }
      hud.flashReceipt("NANO SUIT  PEELING", true);
      jarvisReply("Peeling the suit. Visor only.");
    }
    return;
  }
  if (command.type === "holo") {
    hud.restore();
    const channel = holocomm.open(command.id);
    hud.holoButtons.forEach((row) => {
      hud.setButtonState(row, { on: row.userData.action === channel?.id });
    });
    jarvisReply(channel ? `Channel open. ${channel.title}.` : "Holocomm idle.");
    return;
  }
  jarvisReply("Say send the suit, take the suit off, status, or open holocomm.");
}

const hands = createHands(renderer, scene);
const suit = createSuit(scene);

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
  if (row.userData.action === "nano_suit") {
    if (next) {
      suit.send();
    } else {
      suit.dismiss();
    }
  }
  hud.pulseButton(row);
  bridge.send(row.userData.action, { on: next });
  hud.flashReceipt(`ACTUATED  ${row.userData.action}`, true);
}

function selectTarget(target) {
  if (!target) {
    return;
  }
  if (target.userData.kind === "chip") {
    hud.toggleMinimize();
    hud.setReply(hud.minimized ? "VISOR STOWED" : "VISOR UP");
    return;
  }
  if (target.userData.kind === "holo") {
    hud.restore();
    const channel = holocomm.open(target.userData.action);
    hud.holoButtons.forEach((row) => {
      hud.setButtonState(row, { on: row.userData.action === channel?.id });
    });
    hud.pulseButton(target);
    hud.flashReceipt(`HOLOCOMM  ${channel.title}`, true);
    hud.setReply(channel.line);
    return;
  }
  if (target.userData.kind === "toggle" || target.userData.action) {
    fireAction(target);
  }
}

function hoverFromPointer(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(
    allTargets().map((row) => row.userData.hit),
    false,
  );
  const hovered = hits[0]?.object?.parent ?? null;
  [...hud.buttons, ...hud.holoButtons].forEach((row) => {
    hud.setButtonState(row, { hover: hovered === row });
  });
  return hovered;
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
      house.resetCenter();
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
      await jarvis.start();
      await suit.unlockAudio();
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
  hint.textContent = "Quest 3: Engage Helmet. Say send the suit. Palm out to charge a blast. Reach + tap panels.";
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
  camera.getWorldPosition(camPos);
  camera.getWorldQuaternion(followQuat);
  if (xrActive) {
    house.centerOn(camPos);
  }
  const palms = hands.palms(camPos, followQuat);
  const skipSwipe = hands.grabbing() || suit.charging || (suit.equipped && palms.some((palm) => palm.facingAway));
  suit.update({
    dt,
    camera,
    hands: hands.xrHands,
    palms: hands.grabbing() ? [] : palms,
    onBlast(origin, dir) {
      const result = house.blast(origin, dir);
      hud.flashReceipt(result ? `BLAST  ${result.broken} CHUNKS` : "BLAST  MISS", Boolean(result));
    },
  });
  house.update(dt);
  hands.interact({
    targets: allTargets(),
    windows: hud.windows,
    skipSwipe,
    onSelect: selectTarget,
    onGrabStart(win, world) {
      win.userData.grabbed = true;
      win.userData.returning = false;
      win.parent.worldToLocal(localPinch.copy(world));
      grabOffset.copy(win.position).sub(localPinch);
    },
    onGrabMove(win, world) {
      win.parent.worldToLocal(localPinch.copy(world));
      win.position.copy(localPinch).add(grabOffset);
    },
    onGrabEnd(win) {
      win.userData.grabbed = false;
      win.userData.rest.copy(win.position);
    },
    onSwipe() {
      if (hud.minimized) {
        hud.restore();
      } else {
        hud.recallWindows();
      }
    },
  });
  hud.windows.forEach((win) => {
    win.userData.holdForTap = win.children.some((child) => child.userData.controllerHover);
  });
  hud.chip.userData.holdForTap = Boolean(hud.chip.userData.controllerHover);
  hud.magnetize(hands.fingertips(), camPos, dt);
  [...hud.buttons, ...hud.holoButtons].forEach((row) => {
    hud.setButtonState(row, { hover: Boolean(row.userData.hover || row.userData.controllerHover) });
  });
  holocomm.update(dt, elapsed);
  hud.update(dt, elapsed);
  clockEl.textContent = new Date().toISOString().slice(11, 19) + "Z";
  renderer.render(scene, camera);
}

let dragWin = null;
let pointerDirty = false;

placePreviewHud();
window.addEventListener("resize", onResize);
window.addEventListener("pointermove", (event) => {
  if (xrActive) {
    return;
  }
  hoverFromPointer(event.clientX, event.clientY);
  if (dragWin) {
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1).applyQuaternion(hudAnchor.quaternion),
      dragWin.getWorldPosition(dragPoint),
    );
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hit)) {
      dragWin.parent.worldToLocal(hit);
      dragWin.position.copy(hit).add(grabOffset);
      pointerDirty = true;
    }
  }
});
window.addEventListener("pointerdown", (event) => {
  if (xrActive) {
    return;
  }
  const row = hoverFromPointer(event.clientX, event.clientY);
  if (row?.userData.kind === "grab") {
    dragWin = row.userData.window;
    dragWin.userData.grabbed = true;
    dragWin.userData.returning = false;
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1).applyQuaternion(hudAnchor.quaternion),
      dragWin.getWorldPosition(dragPoint),
    );
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hit)) {
      dragWin.parent.worldToLocal(hit);
      grabOffset.copy(dragWin.position).sub(hit);
    }
    pointerDirty = false;
  }
});
window.addEventListener("pointerup", () => {
  if (dragWin) {
    dragWin.userData.grabbed = false;
    dragWin.userData.rest.copy(dragWin.position);
    dragWin = null;
  }
});
window.addEventListener("click", (event) => {
  if (xrActive || pointerDirty) {
    pointerDirty = false;
    return;
  }
  const row = hoverFromPointer(event.clientX, event.clientY);
  if (row && row.userData.kind !== "grab") {
    selectTarget(row);
    return;
  }
  if (suit.equipped && !row) {
    camera.getWorldPosition(camPos);
    camera.getWorldQuaternion(followQuat);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(followQuat);
    const result = house.blast(camPos, dir);
    hud.flashReceipt(result ? `BLAST  ${result.broken} CHUNKS` : "BLAST  MISS", Boolean(result));
  }
});
enterBtn.addEventListener("click", () => {
  void enterAR();
});
voiceBtn.addEventListener("click", async () => {
  try {
    await voice.start();
    await jarvis.start();
    await suit.unlockAudio();
    setBootCopy("JARVIS CHANNEL OPEN");
  } catch {
    voiceEl.textContent = "VOICE DENIED";
    setBootCopy("MICROPHONE BLOCKED");
  }
});

void bootSequence();
void initXrButton();
renderer.setAnimationLoop(tick);
