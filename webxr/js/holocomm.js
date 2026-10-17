import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const CYAN = 0x3df0ff;

export const CHANNELS = [
  {
    id: "sage",
    title: "THE SAGE",
    file: "./models/kenney/sage.glb",
    line: "The path is still open. Take the next step, not the last one.",
    pitch: 0.62,
    rate: 0.88,
  },
  {
    id: "masked_lord",
    title: "THE MASKED LORD",
    file: "./models/kenney/masked-lord.glb",
    line: "The line holds. Do not waste the hour.",
    pitch: 0.48,
    rate: 0.84,
  },
  {
    id: "hooded_emperor",
    title: "THE HOODED EMPEROR",
    file: "./models/kenney/hooded-emperor.glb",
    line: "Power is a circuit. Close it, or it burns you.",
    pitch: 0.42,
    rate: 0.8,
  },
  {
    id: "young_knight",
    title: "THE YOUNG KNIGHT",
    file: "./models/kenney/young-knight.glb",
    line: "I am on station. Say the word and I move.",
    pitch: 0.72,
    rate: 0.96,
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

function holoMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uTalk: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uTalk;
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        float scan = 0.42 + 0.58 * step(0.35, fract(vWorld.y * 72.0 + uTime * 1.8));
        float bands = 0.75 + 0.25 * sin(vWorld.y * 140.0 - uTime * 9.0);
        float fres = pow(1.0 - abs(vNormal.z), 1.35);
        float flicker = 0.82 + 0.18 * sin(uTime * 41.0);
        float talk = 0.18 * uTalk * (0.5 + 0.5 * sin(uTime * 26.0));
        vec3 col = mix(vec3(0.12, 0.62, 1.0), vec3(0.55, 0.98, 1.0), fres + talk);
        float alpha = (0.18 + fres * 0.62 + talk) * scan * bands * flicker;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function applyHolo(root, material) {
  root.traverse((node) => {
    if (!node.isMesh) {
      return;
    }
    node.material = material;
    node.renderOrder = 4;
    node.frustumCulled = false;
  });
}

function fitFigure(root, height = 0.13) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const mid = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(mid);
  const tall = Math.max(size.y, 0.001);
  root.scale.multiplyScalar(height / tall);
  root.updateMatrixWorld(true);
  const next = new THREE.Box3().setFromObject(root);
  next.getCenter(mid);
  next.getSize(size);
  root.position.x -= mid.x;
  root.position.y -= next.min.y;
  root.position.z -= mid.z;
}

function cyl(rTop, rBot, h, opacity = 0.45, segs = 8) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs, 1, false), addMat(opacity));
}

function box(w, h, d, opacity = 0.4) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), addMat(opacity));
}

function makeFallback(id) {
  const g = new THREE.Group();
  if (id === "sage") {
    const robe = cyl(0.012, 0.028, 0.07, 0.4, 7);
    robe.position.y = 0.035;
    const hood = cyl(0.004, 0.016, 0.028, 0.5, 6);
    hood.position.y = 0.082;
    const staff = cyl(0.002, 0.002, 0.11, 0.7, 5);
    staff.position.set(0.03, 0.055, 0);
    g.add(robe, hood, staff);
  } else if (id === "masked_lord") {
    const torso = box(0.034, 0.07, 0.018, 0.42);
    torso.position.y = 0.055;
    const pauldron = box(0.056, 0.012, 0.02, 0.5);
    pauldron.position.y = 0.092;
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.028, 6), addMat(0.55));
    helm.position.y = 0.118;
    const visor = box(0.02, 0.008, 0.004, 0.8);
    visor.position.set(0, 0.118, 0.014);
    g.add(torso, pauldron, helm, visor);
  } else if (id === "hooded_emperor") {
    const robe = cyl(0.01, 0.036, 0.1, 0.32, 8);
    robe.position.y = 0.05;
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.05, 8, 1, true), addMat(0.48));
    hood.position.y = 0.122;
    const sleeves = box(0.05, 0.018, 0.016, 0.35);
    sleeves.position.y = 0.07;
    g.add(robe, hood, sleeves);
  } else {
    const legs = box(0.02, 0.04, 0.012, 0.38);
    legs.position.y = 0.02;
    const chest = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), addMat(0.5));
    chest.position.y = 0.058;
    chest.scale.set(1.1, 1.3, 0.6);
    const cap = cyl(0.01, 0.012, 0.016, 0.55, 6);
    cap.position.y = 0.086;
    g.add(legs, chest, cap);
  }
  return g;
}

function dressFigure(id, host) {
  const gear = new THREE.Group();
  if (id === "sage") {
    const staff = cyl(0.002, 0.002, 0.12, 0.7, 6);
    staff.position.set(0.028, 0.06, 0);
    gear.add(staff);
  } else if (id === "masked_lord") {
    const visor = box(0.028, 0.01, 0.006, 0.85);
    visor.position.set(0, 0.108, 0.018);
    const bar = box(0.036, 0.006, 0.004, 0.6);
    bar.position.set(0, 0.118, 0.016);
    gear.add(visor, bar);
  } else if (id === "hooded_emperor") {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.046, 8, 1, true), addMat(0.4));
    hood.position.set(0, 0.132, -0.004);
    gear.add(hood);
  } else {
    const pip = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), addMat(0.8));
    pip.position.set(0, 0.07, 0.02);
    gear.add(pip);
  }
  host.add(gear);
}

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

function pickHoloVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  return (
    voices.find((v) => /en-GB|Daniel|Google UK English Male/i.test(`${v.name} ${v.lang}`)) ||
    voices.find((v) => /male/i.test(v.name) && /^en/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  );
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
  const materials = {};
  const loader = new GLTFLoader();

  CHANNELS.forEach((ch) => {
    const wrap = new THREE.Group();
    wrap.visible = false;
    wrap.userData.channel = ch.id;
    wrap.userData.talk = 0;
    wrap.userData.ready = false;
    const mat = holoMaterial();
    materials[ch.id] = mat;
    const fallback = makeFallback(ch.id);
    wrap.add(fallback);
    root.add(wrap);
    figures[ch.id] = wrap;
    loader.load(
      ch.file,
      (gltf) => {
        const model = gltf.scene;
        applyHolo(model, mat);
        fitFigure(model, 0.132);
        dressFigure(ch.id, model);
        wrap.remove(fallback);
        wrap.add(model);
        wrap.userData.ready = true;
      },
      undefined,
      () => {
        applyHolo(fallback, mat);
        wrap.userData.ready = true;
      },
    );
  });

  root.add(base, ring, cone, scan, caption);

  let active = null;
  let talking = false;

  const speakLine = (channel) => {
    if (!window.speechSynthesis || !channel) {
      talking = false;
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(channel.line);
    const voice = pickHoloVoice();
    if (voice) {
      utter.voice = voice;
    }
    utter.rate = channel.rate;
    utter.pitch = channel.pitch;
    utter.lang = voice?.lang || "en-GB";
    utter.onstart = () => {
      talking = true;
    };
    utter.onend = () => {
      talking = false;
    };
    utter.onerror = () => {
      talking = false;
    };
    talking = true;
    window.speechSynthesis.speak(utter);
  };

  const setChannel = (id) => {
    const channel = CHANNELS.find((row) => row.id === id) ?? null;
    active = channel;
    root.visible = Boolean(channel);
    Object.entries(figures).forEach(([key, fig]) => {
      fig.visible = Boolean(channel) && key === channel.id;
    });
    writeLabel(caption, channel ? channel.line : "HOLOCOMM IDLE");
    if (channel) {
      speakLine(channel);
    } else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      talking = false;
    }
    return channel;
  };

  return {
    root,
    channels: CHANNELS,
    get active() {
      return active;
    },
    get talking() {
      return talking;
    },
    open(id) {
      return setChannel(id || CHANNELS[0].id);
    },
    close() {
      return setChannel(null);
    },
    speak(channel = active) {
      speakLine(channel);
    },
    update(dt, elapsed) {
      if (!root.visible) {
        return;
      }
      const talkMix = talking ? 1 : 0;
      cone.material.opacity = 0.08 + Math.abs(Math.sin(elapsed * 11)) * 0.22 + talkMix * 0.08;
      scan.position.y = 0.04 + ((elapsed * 0.18) % 0.18);
      scan.material.opacity = 0.25 + Math.abs(Math.sin(elapsed * 11)) * 0.22;
      Object.values(figures).forEach((fig) => {
        const on = Boolean(active) && fig.userData.channel === active.id;
        fig.visible = on && Math.sin(elapsed * 29) > -0.78;
        if (!on) {
          return;
        }
        fig.userData.talk += ((talkMix ? 1 : 0) - fig.userData.talk) * Math.min(1, dt * 8);
        const idle = Math.sin(elapsed * 2.1);
        const chatter = Math.sin(elapsed * 14.0) * fig.userData.talk;
        fig.position.y = 0.01 + idle * 0.006 + chatter * 0.004;
        fig.rotation.y = idle * 0.18 + chatter * 0.12;
        fig.rotation.z = Math.sin(elapsed * 1.4) * 0.04;
        fig.scale.setScalar(1 + fig.userData.talk * 0.04 * Math.abs(Math.sin(elapsed * 18)));
        const mat = materials[fig.userData.channel];
        if (mat) {
          mat.uniforms.uTime.value = elapsed;
          mat.uniforms.uTalk.value = fig.userData.talk;
        }
      });
    },
  };
}
