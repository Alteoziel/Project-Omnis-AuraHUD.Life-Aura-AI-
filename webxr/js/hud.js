import * as THREE from "three";

const CYAN = 0x3df0ff;
const GOLD = 0xf0c14a;

export const ACTIONS = [
  { id: "desk_light", label: "DESK LIGHT" },
  { id: "ceiling_light", label: "CEILING LIGHT" },
  { id: "scan_room", label: "SCAN ROOM" },
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

  const ring = new THREE.Group();
  ring.position.set(0, 0.04, 0);
  root.add(ring);

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

  const panel = new THREE.Group();
  panel.position.set(0.42, -0.02, 0.02);
  root.add(panel);

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.27),
    new THREE.MeshBasicMaterial({
      color: 0x07141c,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    }),
  );
  const plateGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.352, 0.282), addMat(CYAN, 0.07));
  const frame = bracket(0.34, 0.27);
  const frameL = new THREE.Line(frame.left, lineMat(CYAN, 0.95));
  const frameR = new THREE.Line(frame.right, lineMat(CYAN, 0.95));
  const panelTitle = makeLabel("HOUSE SYSTEMS", 640, 80, 36);
  panelTitle.position.set(0, 0.1, 0.002);
  panel.add(plateGlow, plate, frameL, frameR, panelTitle);

  const buttons = [];
  ACTIONS.forEach((action, index) => {
    const row = new THREE.Group();
    row.position.set(0, 0.03 - index * 0.068, 0.004);
    const hit = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.056),
      new THREE.MeshBasicMaterial({
        color: 0x0a2430,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    const edge = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.15, 0.028, 0),
        new THREE.Vector3(0.15, 0.028, 0),
        new THREE.Vector3(0.15, -0.028, 0),
        new THREE.Vector3(-0.15, -0.028, 0),
        new THREE.Vector3(-0.15, 0.028, 0),
      ]),
      lineMat(CYAN, 0.45),
    );
    const label = makeLabel(action.label, 640, 88, 34);
    label.position.set(-0.02, 0, 0.001);
    const pip = new THREE.Mesh(new THREE.CircleGeometry(0.01, 16), addMat(CYAN, 0.25));
    pip.position.set(0.122, 0, 0.002);
    row.add(hit, edge, label, pip);
    row.userData = {
      action: action.id,
      on: false,
      hit,
      edge,
      pip,
      label,
      hover: false,
    };
    panel.add(row);
    buttons.push(row);
  });

  const orbGroup = new THREE.Group();
  orbGroup.position.set(-0.4, 0.02, 0.02);
  const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.034, 24, 24), addMat(CYAN, 0.55));
  const orbShell = new THREE.Mesh(new THREE.SphereGeometry(0.048, 24, 24), addMat(CYAN, 0.16));
  const orbRing = new THREE.LineLoop(circleLine(0.062, 48), lineMat(CYAN, 0.7));
  const orbLabel = makeLabel("VOICE", 360, 80, 36);
  orbLabel.position.set(0, -0.1, 0);
  orbGroup.add(orbShell, orbCore, orbRing, orbLabel);
  root.add(orbGroup);

  const receipt = makeLabel("BRIDGE STANDBY", 720, 80, 32, "#8ad7e4");
  receipt.position.set(0.42, -0.175, 0.03);
  root.add(receipt);

  let scanSweep = 0;
  let boot = 0;
  root.scale.setScalar(0.001);

  const setButtonState = (row, { on, hover }) => {
    if (typeof on === "boolean") {
      row.userData.on = on;
    }
    if (typeof hover === "boolean") {
      row.userData.hover = hover;
    }
    const active = row.userData.on;
    const lit = active || row.userData.hover;
    row.userData.hit.material.opacity = lit ? 0.82 : 0.5;
    row.userData.hit.material.color.setHex(active ? 0x125066 : 0x0a2430);
    row.userData.edge.material.opacity = lit ? 1 : 0.4;
    row.userData.pip.material.opacity = active ? 0.95 : 0.22;
    row.userData.pip.material.color.setHex(active ? 0x5cff9d : CYAN);
  };

  const flashReceipt = (text, ok = true) => {
    writeLabel(receipt, text, ok ? "#5cff9d" : "#ff4d6d");
  };

  return {
    root,
    buttons,
    setButtonState,
    flashReceipt,
    triggerScan() {
      scanSweep = 1;
    },
    setVoiceLevel(level) {
      const active = level > 0.035;
      const pulse = 1 + Math.min(0.55, level * 3.4);
      orbCore.scale.setScalar(pulse);
      orbShell.material.opacity = active ? 0.34 + level : 0.14;
      orbCore.material.opacity = active ? 0.85 : 0.45;
      writeLabel(orbLabel, active ? "VOICE LIVE" : "VOICE", active ? "#5cff9d" : "#9ff7ff");
    },
    update(dt, elapsed) {
      boot = Math.min(1, boot + dt * 0.85);
      const s = 0.08 + boot * 0.92;
      root.scale.setScalar(s);
      outer.rotation.z -= dt * 0.12;
      ticks.rotation.z += dt * 0.08;
      orbit.rotation.z -= dt * 0.22;
      hex.rotation.z += dt * 0.18;
      halo.material.opacity = 0.06 + Math.sin(elapsed * 2.1) * 0.03;
      coreGlow.material.opacity = 0.28 + Math.sin(elapsed * 3.2) * 0.1;
      scan.position.y = Math.sin(elapsed * 0.9) * 0.22;
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
