import * as THREE from "three";

const CYAN = 0x3df0ff;
const GOLD = 0xf0c14a;

export const ACTIONS = [
  { id: "desk_light", label: "DESK LIGHT" },
  { id: "ceiling_light", label: "CEILING LIGHT" },
  { id: "scan_room", label: "SCAN ROOM" },
  { id: "nano_suit", label: "NANO SUIT" },
];

function lineMat(color, opacity = 0.9) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function addMat(color, opacity = 0.22) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function makeLabel(text, width = 512, height = 128, size = 42, color = "#9ff7ff") {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px Rajdhani, Segoe UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#3df0ff";
  ctx.shadowBlur = 18;
  ctx.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width / 1400, height / 1400), material);
  mesh.userData.canvas = canvas;
  mesh.userData.ctx = ctx;
  mesh.userData.texture = texture;
  return mesh;
}

function writeLabel(mesh, text, color = "#9ff7ff") {
  const { canvas, ctx, texture } = mesh.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = "600 42px Rajdhani, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  texture.needsUpdate = true;
}

function makeBlock(lines, width = 1024, height = 320, size = 36) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#3df0ff";
  ctx.shadowBlur = 14;
  const step = height / (lines.length + 1);
  lines.forEach((line, index) => {
    ctx.fillStyle = index === 0 ? "#e9fbff" : "#8ad7e4";
    ctx.font = `${index === 0 ? 700 : 600} ${index === 0 ? size + 4 : size}px Rajdhani, Segoe UI, sans-serif`;
    ctx.fillText(line, 36, step * (index + 1));
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width / 1450, height / 1450),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  return mesh;
}

function circleLine(radius, segments = 96) {
  const pts = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function dashedCircle(radius, dashes = 36, span = 0.55) {
  const pts = [];
  for (let i = 0; i < dashes; i += 1) {
    const a0 = (i / dashes) * Math.PI * 2;
    const a1 = a0 + ((Math.PI * 2) / dashes) * span;
    pts.push(new THREE.Vector3(Math.cos(a0) * radius, Math.sin(a0) * radius, 0));
    pts.push(new THREE.Vector3(Math.cos(a1) * radius, Math.sin(a1) * radius, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function tickRing(radius, count, inner, outer) {
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const len = i % 6 === 0 ? outer : inner;
    pts.push(new THREE.Vector3(c * radius, s * radius, 0));
    pts.push(new THREE.Vector3(c * (radius + len), s * (radius + len), 0));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function hexagon(radius) {
  const pts = [];
  for (let i = 0; i <= 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function makeHandle(width) {
  const row = new THREE.Group();
  const hit = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.04),
    new THREE.MeshBasicMaterial({
      color: 0x14303a,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  const edge = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-width / 2, 0.02, 0),
      new THREE.Vector3(width / 2, 0.02, 0),
      new THREE.Vector3(width / 2, -0.02, 0),
      new THREE.Vector3(-width / 2, -0.02, 0),
      new THREE.Vector3(-width / 2, 0.02, 0),
    ]),
    lineMat(GOLD, 0.9),
  );
  const label = makeLabel("PINCH TO MOVE", 480, 72, 28, "#f0c14a");
  label.position.z = 0.001;
  const pipL = new THREE.Mesh(new THREE.CircleGeometry(0.007, 10), addMat(GOLD, 0.85));
  const pipR = pipL.clone();
  pipL.position.set(-width / 2 + 0.03, 0, 0.002);
  pipR.position.set(width / 2 - 0.03, 0, 0.002);
  row.add(hit, edge, label, pipL, pipR);
  row.userData = { kind: "grab", hit };
  return row;
}

function makeActionRow(action, width = 0.4, height = 0.088) {
  const row = new THREE.Group();
  const hit = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color: 0x0a2430,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  const hw = width / 2;
  const hh = height / 2;
  const edge = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(-hw, hh, 0),
    ]),
    lineMat(CYAN, 0.45),
  );
  const label = makeLabel(action.label, 640, 88, 34);
  label.position.set(-0.02, 0, 0.001);
  const pip = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), addMat(CYAN, 0.25));
  pip.position.set(width / 2 - 0.05, 0, 0.002);
  row.add(hit, edge, label, pip);
  row.userData = {
    kind: action.kind || "toggle",
    action: action.id,
    on: false,
    hit,
    edge,
    pip,
    label,
    hover: false,
  };
  return row;
}

function bracket(width, height) {
  const w = width / 2;
  const h = height / 2;
  const notch = Math.min(0.018, w * 0.2);
  const pts = [
    new THREE.Vector3(-w + notch, h, 0),
    new THREE.Vector3(-w, h, 0),
    new THREE.Vector3(-w, -h, 0),
    new THREE.Vector3(-w + notch, -h, 0),
  ];
  const left = new THREE.BufferGeometry().setFromPoints(pts);
  const right = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(-p.x, p.y, 0)));
  return { left, right };
}

export function createHud() {
  const root = new THREE.Group();
  root.name = "visor-hud";

  const stage = new THREE.Group();
  root.add(stage);

  const ring = new THREE.Group();
  ring.position.set(0, 0.08, 0);
  stage.add(ring);

  const outer = new THREE.LineSegments(dashedCircle(0.34, 48, 0.62), lineMat(CYAN, 0.85));
  const mid = new THREE.LineLoop(circleLine(0.275, 128), lineMat(CYAN, 0.55));
  const ticks = new THREE.LineSegments(tickRing(0.292, 72, 0.01, 0.022), lineMat(CYAN, 0.7));
  const inner = new THREE.LineLoop(circleLine(0.168, 96), lineMat(CYAN, 0.8));
  const hex = new THREE.LineLoop(hexagon(0.086), lineMat(GOLD, 0.7));
  const coreGlow = new THREE.Mesh(new THREE.CircleGeometry(0.038, 32), addMat(CYAN, 0.35));
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.016, 24), addMat(0xe8ffff, 0.9));
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.21, 0.248, 64), addMat(CYAN, 0.08));
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.006), addMat(CYAN, 0.55));
  scan.position.z = 0.002;

  const cross = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.046, 0, 0),
      new THREE.Vector3(-0.014, 0, 0),
      new THREE.Vector3(0.014, 0, 0),
      new THREE.Vector3(0.046, 0, 0),
      new THREE.Vector3(0, -0.046, 0),
      new THREE.Vector3(0, -0.014, 0),
      new THREE.Vector3(0, 0.014, 0),
      new THREE.Vector3(0, 0.046, 0),
    ]),
    lineMat(CYAN, 0.95),
  );

  const orbit = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 12), addMat(CYAN, 0.95));
    const a = (i / 3) * Math.PI * 2;
    pip.position.set(Math.cos(a) * 0.318, Math.sin(a) * 0.318, 0);
    orbit.add(pip);
  }

  const title = makeLabel("STARK OS  //  MARK 85", 768, 96, 38, "#e9fbff");
  title.position.set(0, 0.4, 0);

  const status = makeLabel("VISOR LOCKED", 640, 80, 36, "#3df0ff");
  status.position.set(0, -0.4, 0);

  ring.add(outer, mid, ticks, inner, hex, coreGlow, core, halo, scan, cross, orbit, title, status);

  const makeWindow = (name, heading, width, height, home) => {
    const win = new THREE.Group();
    win.name = name;
    win.position.copy(home);
    win.userData.home = home.clone();
    win.userData.rest = home.clone();
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        color: 0x07141c,
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
      }),
    );
    const plateGlow = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.014, height + 0.014), addMat(CYAN, 0.07));
    const frame = bracket(width, height);
    const handle = makeHandle(width);
    handle.position.set(0, height / 2 + 0.028, 0.003);
    handle.userData.window = win;
    const headingLabel = makeLabel(heading, 640, 80, 36);
    headingLabel.position.set(0, height / 2 - 0.04, 0.002);
    win.add(plateGlow, plate, new THREE.Line(frame.left, lineMat(CYAN, 0.95)), new THREE.Line(frame.right, lineMat(CYAN, 0.95)), handle, headingLabel);
    win.userData.handle = handle;
    return win;
  };

  const houseWin = makeWindow("house-window", "HOUSE SYSTEMS", 0.44, 0.48, new THREE.Vector3(0.5, -0.02, 0.02));
  const buttons = [];
  ACTIONS.forEach((action, index) => {
    const row = makeActionRow(action, 0.4, 0.078);
    row.position.set(0, 0.12 - index * 0.088, 0.004);
    houseWin.add(row);
    buttons.push(row);
  });
  const receipt = makeLabel("LOCAL  ·  ALEXA PENDING", 720, 80, 32, "#8ad7e4");
  receipt.position.set(0, -0.26, 0.003);
  houseWin.add(receipt);
  stage.add(houseWin);

  const holoWin = makeWindow("holo-window", "HOLOCOMM", 0.44, 0.46, new THREE.Vector3(-0.5, -0.04, 0.02));
  const holoButtons = [];
  [
    { id: "sage", label: "THE SAGE", kind: "holo" },
    { id: "masked_lord", label: "MASKED LORD", kind: "holo" },
    { id: "hooded_emperor", label: "HOODED EMPEROR", kind: "holo" },
    { id: "young_knight", label: "YOUNG KNIGHT", kind: "holo" },
  ].forEach((action, index) => {
    const row = makeActionRow(action, 0.4, 0.078);
    row.position.set(0, 0.1 - index * 0.088, 0.004);
    holoWin.add(row);
    holoButtons.push(row);
  });
  stage.add(holoWin);

  const windows = [houseWin, holoWin];

  const orbGroup = new THREE.Group();
  orbGroup.position.set(-0.02, 0.42, 0.02);
  const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.028, 24, 24), addMat(CYAN, 0.55));
  const orbShell = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 24), addMat(CYAN, 0.16));
  const orbRing = new THREE.LineLoop(circleLine(0.05, 48), lineMat(CYAN, 0.7));
  const orbLabel = makeLabel("JARVIS", 360, 80, 34);
  orbLabel.position.set(0, -0.08, 0);
  orbGroup.add(orbShell, orbCore, orbRing, orbLabel);
  stage.add(orbGroup);

  const heard = makeLabel("HEARD  —", 1100, 80, 30, "#8ad7e4");
  heard.position.set(0, -0.48, 0.02);
  const reply = makeLabel("JARVIS STANDBY", 900, 72, 28, "#9ff7ff");
  reply.position.set(0, -0.56, 0.02);
  stage.add(heard, reply);

  const brief = makeBlock(
    [
      "PINCH THUMB + INDEX TO MOVE A WINDOW",
      "RELEASE TO DROP  ·  HOVER / TAP NEVER GRABS",
      "SAY SEND THE SUIT  ·  PALM OUT TO BLAST",
    ],
    1180,
    360,
    36,
  );
  brief.position.set(0, -0.68, 0.02);
  stage.add(brief);

  const chip = new THREE.Group();
  chip.position.set(0.34, 0.34, 0.03);
  const chipHit = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.072),
    new THREE.MeshBasicMaterial({
      color: 0x0a2430,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
  );
  const chipEdge = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.09, 0.036, 0),
      new THREE.Vector3(0.09, 0.036, 0),
      new THREE.Vector3(0.09, -0.036, 0),
      new THREE.Vector3(-0.09, -0.036, 0),
      new THREE.Vector3(-0.09, 0.036, 0),
    ]),
    lineMat(GOLD, 0.95),
  );
  const chipLabel = makeLabel("TAP STOW", 480, 80, 34, "#f0c14a");
  chipLabel.position.z = 0.002;
  chip.add(chipHit, chipEdge, chipLabel);
  chip.userData = { kind: "chip", hit: chipHit };
  root.add(chip);

  let scanSweep = 0;
  let boot = 0;
  let compact = 0;
  let wantCompact = 0;
  root.scale.setScalar(0.001);

  const setButtonState = (row, { on, hover }) => {
    if (typeof on === "boolean") {
      row.userData.on = on;
    }
    if (typeof hover === "boolean") {
      row.userData.hover = hover;
    }
    const active = row.userData.on;
    const pulsing = row.userData.flashUntil && performance.now() < row.userData.flashUntil;
    const lit = active || row.userData.hover || pulsing;
    row.userData.hit.material.opacity = pulsing ? 1 : lit ? 0.88 : 0.5;
    row.userData.hit.material.color.setHex(pulsing ? 0x3df0ff : active ? 0x125066 : row.userData.hover ? 0x163848 : 0x0a2430);
    row.userData.edge.material.opacity = lit ? 1 : 0.4;
    row.userData.pip.material.opacity = active || pulsing ? 0.95 : 0.22;
    row.userData.pip.material.color.setHex(active || pulsing ? 0x5cff9d : CYAN);
    row.scale.setScalar(row.userData.hover || pulsing ? 1.06 : 1);
  };

  const flashReceipt = (text, ok = true) => {
    writeLabel(receipt, text, ok ? "#5cff9d" : "#ff4d6d");
  };

  const setCompact = (next) => {
    wantCompact = next ? 1 : 0;
    writeLabel(chipLabel, next ? "STARK OS" : "TAP STOW", "#f0c14a");
  };

  const recallWindows = () => {
    windows.forEach((win) => {
      win.userData.returning = true;
      win.userData.rest.copy(win.userData.home);
    });
  };

  const magnetize = (tips, cameraWorld, dt) => {
    const center = new THREE.Vector3();
    const meet = new THREE.Vector3();
    const fromCam = new THREE.Vector3();
    const restWorld = new THREE.Vector3();
    const unit = new THREE.Vector3(1, 1, 1);
    const ATTRACT = 0.82;
    const HOLD = 0.055;
    const MIN_CAM = 0.44;

    const pull = (node, rest, range = ATTRACT) => {
      if (node.userData.grabbed || node.userData.returning) {
        node.userData.docked = false;
        return false;
      }
      node.updateMatrixWorld(true);
      node.getWorldPosition(center);
      if (node.parent) {
        node.parent.localToWorld(restWorld.copy(rest));
      } else {
        restWorld.copy(rest);
      }
      let nearest = null;
      let dist = range;
      tips.forEach((tip) => {
        const d = Math.min(tip.distanceTo(center), tip.distanceTo(restWorld));
        if (d < dist) {
          dist = d;
          nearest = tip;
        }
      });
      if (!nearest || !node.parent) {
        node.userData.docked = false;
        node.userData.magnet = false;
        node.position.lerp(rest, 1 - Math.exp(-5 * dt));
        node.scale.lerp(unit, 1 - Math.exp(-5 * dt));
        return false;
      }
      node.parent.localToWorld(restWorld.copy(rest));
      const homeDist = Math.max(0.22, restWorld.distanceTo(cameraWorld));
      const applyScale = () => {
        node.getWorldPosition(center);
        const nowDist = Math.max(0.18, center.distanceTo(cameraWorld));
        node.scale.setScalar(Math.min(1, Math.max(0.5, nowDist / homeDist)));
      };
      if (node.userData.docked) {
        applyScale();
        node.userData.magnet = true;
        return true;
      }
      fromCam.copy(nearest).sub(cameraWorld);
      if (fromCam.lengthSq() < 1e-8) {
        fromCam.set(0, 0, -1);
      } else {
        fromCam.normalize();
      }
      meet.copy(nearest).addScaledVector(fromCam, HOLD);
      if (meet.distanceTo(cameraWorld) < MIN_CAM) {
        meet.copy(cameraWorld).addScaledVector(fromCam, MIN_CAM);
      }
      const arrive = nearest.distanceTo(center);
      node.parent.worldToLocal(meet);
      node.position.lerp(meet, 1 - Math.exp(-8 * dt));
      applyScale();
      if (arrive < 0.22) {
        node.userData.docked = true;
      }
      node.userData.magnet = true;
      return true;
    };

    chip.userData.magnet = false;
    if (wantCompact > 0.5) {
      chip.userData.magnet = pull(chip, new THREE.Vector3(0, 0.02, 0.03), 0.5);
      return;
    }
    windows.forEach((win) => {
      pull(win, win.userData.rest, ATTRACT);
    });
  };

  return {
    root,
    stage,
    buttons,
    holoButtons,
    windows,
    chip,
    setButtonState,
    pulseButton(row) {
      row.userData.flashUntil = performance.now() + 180;
      setButtonState(row, {});
    },
    flashReceipt,
    setHeard(text) {
      writeLabel(heard, text ? `HEARD  ${text}` : "HEARD  —", "#8ad7e4");
    },
    setReply(text) {
      writeLabel(reply, text || "JARVIS STANDBY", "#9ff7ff");
    },
    triggerScan() {
      scanSweep = 1;
    },
    get minimized() {
      return wantCompact > 0.5;
    },
    minimize() {
      setCompact(true);
    },
    restore() {
      setCompact(false);
    },
    toggleMinimize() {
      setCompact(wantCompact < 0.5);
    },
    recallWindows,
    magnetize,
    setVoiceLevel(level) {
      const active = level > 0.035;
      const pulse = 1 + Math.min(0.55, level * 3.4);
      orbCore.scale.setScalar(pulse);
      orbShell.material.opacity = active ? 0.34 + level : 0.14;
      orbCore.material.opacity = active ? 0.85 : 0.45;
      writeLabel(orbLabel, active ? "JARVIS LIVE" : "JARVIS", active ? "#5cff9d" : "#9ff7ff");
    },
    update(dt, elapsed) {
      boot = Math.min(1, boot + dt * 0.85);
      const s = 0.08 + boot * 0.92;
      root.scale.setScalar(s);
      compact += (wantCompact - compact) * Math.min(1, dt * 8);
      stage.scale.setScalar(1 - compact * 0.92);
      stage.visible = compact < 0.88;
      chip.scale.setScalar(0.85 + compact * 1.15);
      if (!chip.userData.magnet) {
        chip.position.lerp(
          new THREE.Vector3(compact > 0.5 ? 0 : 0.34, compact > 0.5 ? 0.02 : 0.34, 0.03),
          Math.min(1, dt * 6),
        );
      }
      outer.rotation.z -= dt * 0.12;
      ticks.rotation.z += dt * 0.08;
      orbit.rotation.z -= dt * 0.22;
      hex.rotation.z += dt * 0.18;
      halo.material.opacity = 0.06 + Math.sin(elapsed * 2.1) * 0.03;
      coreGlow.material.opacity = 0.28 + Math.sin(elapsed * 3.2) * 0.1;
      scan.position.y = Math.sin(elapsed * 0.9) * 0.22;
      windows.forEach((win) => {
        if (!win.userData.returning) {
          return;
        }
        win.position.lerp(win.userData.home, Math.min(1, dt * 7));
        if (win.position.distanceTo(win.userData.home) < 0.004) {
          win.position.copy(win.userData.home);
          win.userData.returning = false;
        }
      });
      if (scanSweep > 0) {
        scanSweep = Math.max(0, scanSweep - dt * 0.85);
        halo.material.opacity = 0.22;
        scan.material.opacity = 0.95;
      } else {
        scan.material.opacity = 0.35;
      }
    },
  };
}
