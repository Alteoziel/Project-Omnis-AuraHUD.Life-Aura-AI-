import * as THREE from "three";

const CYAN = 0x3df0ff;

export const CHANNELS = [
  {
    id: "sage",
    title: "THE SAGE",
    line: "The path is still open. Take the next step, not the last one.",
  },
  {
    id: "masked_lord",
    title: "THE MASKED LORD",
    line: "The line holds. Do not waste the hour.",
  },
  {
    id: "hooded_emperor",
    title: "THE HOODED EMPEROR",
    line: "Power is a circuit. Close it, or it burns you.",
  },
  {
    id: "young_knight",
    title: "THE YOUNG KNIGHT",
    line: "I am on station. Say the word and I move.",
  },
];

function addMat(opacity = 0.35) {
  return new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function lineMat(opacity = 0.7) {
  return new THREE.LineBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function cyl(rTop, rBot, h, opacity = 0.45, segs = 8) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs, 1, false), addMat(opacity));
}

function box(w, h, d, opacity = 0.4) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), addMat(opacity));
}

function makeSage() {
  const g = new THREE.Group();
  const robe = cyl(0.012, 0.028, 0.07, 0.4, 7);
  robe.position.y = 0.035;
  const hood = cyl(0.004, 0.016, 0.028, 0.5, 6);
  hood.position.y = 0.082;
  const staff = cyl(0.002, 0.002, 0.11, 0.7, 5);
  staff.position.set(0.03, 0.055, 0);
  g.add(robe, hood, staff);
  return g;
}

function makeMaskedLord() {
  const g = new THREE.Group();
  const torso = box(0.034, 0.07, 0.018, 0.42);
  torso.position.y = 0.055;
  const pauldron = box(0.056, 0.012, 0.02, 0.5);
  pauldron.position.y = 0.092;
  const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.028, 6), addMat(0.55));
  helm.position.y = 0.118;
  const visor = box(0.02, 0.008, 0.004, 0.8);
  visor.position.set(0, 0.118, 0.014);
  g.add(torso, pauldron, helm, visor);
  return g;
}

function makeHoodedEmperor() {
  const g = new THREE.Group();
  const robe = cyl(0.01, 0.036, 0.1, 0.32, 8);
  robe.position.y = 0.05;
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.05, 8, 1, true), addMat(0.48));
  hood.position.y = 0.122;
  const sleeves = box(0.05, 0.018, 0.016, 0.35);
  sleeves.position.y = 0.07;
  g.add(robe, hood, sleeves);
  return g;
}

function makeYoungKnight() {
  const g = new THREE.Group();
  const legs = box(0.02, 0.04, 0.012, 0.38);
  legs.position.y = 0.02;
  const chest = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), addMat(0.5));
  chest.position.y = 0.058;
  chest.scale.set(1.1, 1.3, 0.6);
  const cap = cyl(0.01, 0.012, 0.016, 0.55, 6);
  cap.position.y = 0.086;
  g.add(legs, chest, cap);
  return g;
}

const BUILDERS = {
  sage: makeSage,
  masked_lord: makeMaskedLord,
  hooded_emperor: makeHoodedEmperor,
  young_knight: makeYoungKnight,
};

function makeLabel(text, width, height, size) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#9ff7ff";
  ctx.font = `600 ${size}px Rajdhani, Segoe UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#3df0ff";
  ctx.shadowBlur = 14;
  ctx.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width / 1600, height / 1600),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  mesh.userData = { canvas, ctx, texture };
  return mesh;
}

function writeLabel(mesh, text) {
  const { canvas, ctx, texture } = mesh.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#9ff7ff";
  ctx.font = "600 28px Rajdhani, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#3df0ff";
  ctx.shadowBlur = 12;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  texture.needsUpdate = true;
}

export function createHolocomm() {
  const root = new THREE.Group();
  root.name = "holocomm";
  root.visible = false;

  const base = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), addMat(0.4));
  base.rotation.x = -Math.PI / 2;
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 33 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * 0.052, 0, Math.sin(a) * 0.052);
      }),
    ),
    lineMat(0.85),
  );
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.018, 0.22, 24, 1, true), addMat(0.12));
  cone.position.y = 0.12;
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.006), addMat(0.55));
  scan.position.y = 0.06;
  const caption = makeLabel("HOLOCOMM IDLE", 900, 80, 30);
  caption.position.set(0, -0.04, 0.02);

  const figures = {};
  CHANNELS.forEach((ch) => {
    const fig = BUILDERS[ch.id]();
    fig.position.y = 0.012;
    fig.visible = false;
    fig.userData.channel = ch.id;
    root.add(fig);
    figures[ch.id] = fig;
  });

  root.add(base, ring, cone, scan, caption);

  let active = null;
  let flicker = 0;

  const setChannel = (id) => {
    const channel = CHANNELS.find((row) => row.id === id) ?? null;
    active = channel;
    root.visible = Boolean(channel);
    Object.entries(figures).forEach(([key, fig]) => {
      fig.visible = Boolean(channel) && key === channel.id;
    });
    writeLabel(caption, channel ? channel.line : "HOLOCOMM IDLE");
    return channel;
  };

  return {
    root,
    channels: CHANNELS,
    get active() {
      return active;
    },
    open(id) {
      return setChannel(id || CHANNELS[0].id);
    },
    close() {
      return setChannel(null);
    },
    update(dt, elapsed) {
      if (!root.visible) {
        return;
      }
      flicker += dt;
      const pulse = 0.16 + Math.abs(Math.sin(elapsed * 11)) * 0.22;
      cone.material.opacity = 0.08 + pulse * 0.25;
      scan.position.y = 0.04 + ((elapsed * 0.18) % 0.18);
      scan.material.opacity = 0.25 + pulse;
      Object.values(figures).forEach((fig) => {
        fig.visible = active && fig.userData.channel === active.id && Math.sin(elapsed * 27) > -0.72;
        fig.position.y = 0.012 + Math.sin(elapsed * 3.2) * 0.004;
        fig.rotation.y = Math.sin(elapsed * 0.7) * 0.12;
      });
    },
  };
}
