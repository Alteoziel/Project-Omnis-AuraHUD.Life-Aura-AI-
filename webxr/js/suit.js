import * as THREE from "three";

const CYAN = 0x3df0ff;
const GOLD = 0xf0c14a;
const BUILD_S = 2;
const CHARGE_S = 2;

function plateMat(gold = false, opacity = 0.55) {
  return new THREE.MeshBasicMaterial({
    color: gold ? GOLD : CYAN,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function makePlate(w, h, d, gold = false) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plateMat(gold, gold ? 0.42 : 0.5));
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
    new THREE.LineBasicMaterial({
      color: gold ? GOLD : CYAN,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(body, edge);
  group.visible = false;
  group.scale.setScalar(0.001);
  group.userData.body = body;
  group.userData.edge = edge;
  return group;
}

function makeSfx() {
  let ctx = null;
  let chargeOsc = null;
  let chargeGain = null;

  const ensure = () => {
    if (ctx) {
      return ctx;
    }
    ctx = new AudioContext();
    return ctx;
  };

  return {
    async unlock() {
      const audio = ensure();
      if (audio.state === "suspended") {
        await audio.resume();
      }
    },
    startCharge() {
      const audio = ensure();
      this.stopCharge();
      chargeOsc = audio.createOscillator();
      chargeGain = audio.createGain();
      chargeOsc.type = "sawtooth";
      chargeOsc.frequency.setValueAtTime(160, audio.currentTime);
      chargeOsc.frequency.linearRampToValueAtTime(420, audio.currentTime + CHARGE_S);
      chargeGain.gain.setValueAtTime(0.0001, audio.currentTime);
      chargeGain.gain.exponentialRampToValueAtTime(0.045, audio.currentTime + 0.12);
      chargeOsc.connect(chargeGain);
      chargeGain.connect(audio.destination);
      chargeOsc.start();
    },
    stopCharge() {
      try {
        chargeOsc?.stop();
      } catch {
        /* already stopped */
      }
      chargeOsc = null;
      chargeGain = null;
    },
    blast() {
      const audio = ensure();
      this.stopCharge();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(240, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(48, audio.currentTime + 0.28);
      gain.gain.setValueAtTime(0.07, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.32);
      const noise = audio.createBufferSource();
      const buffer = audio.createBuffer(1, audio.sampleRate * 0.18, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const nGain = audio.createGain();
      nGain.gain.setValueAtTime(0.05, audio.currentTime);
      nGain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
      noise.buffer = buffer;
      noise.connect(nGain);
      nGain.connect(audio.destination);
      noise.start();
    },
  };
}

export function createSuit(scene) {
  const root = new THREE.Group();
  root.name = "nano-suit";
  scene.add(root);

  const bodyRig = new THREE.Group();
  root.add(bodyRig);

  const plates = [];

  const addPlate = (parent, spec) => {
    const plate = makePlate(spec.w, spec.h, spec.d, spec.gold);
    plate.userData.joint = spec.joint || null;
    plate.userData.handIndex = spec.handIndex;
    plate.userData.local = spec.local || new THREE.Vector3();
    plate.userData.appear = spec.appear;
    plate.userData.phase = spec.phase;
    plate.userData.followBody = Boolean(spec.followBody);
    parent.add(plate);
    plates.push(plate);
    return plate;
  };

  const handSpecs = (handIndex) => [
    { joint: "wrist", w: 0.062, h: 0.028, d: 0.01, local: new THREE.Vector3(0, 0.01, 0.012), appear: 0.04, phase: "hands", handIndex },
    { joint: "index-finger-phalanx-proximal", w: 0.018, h: 0.014, d: 0.008, local: new THREE.Vector3(0, 0.004, 0.006), appear: 0.12, phase: "hands", handIndex },
    { joint: "middle-finger-phalanx-proximal", w: 0.018, h: 0.014, d: 0.008, local: new THREE.Vector3(0, 0.004, 0.006), appear: 0.16, phase: "hands", handIndex },
    { joint: "ring-finger-phalanx-proximal", w: 0.016, h: 0.013, d: 0.008, local: new THREE.Vector3(0, 0.004, 0.006), appear: 0.2, phase: "hands", handIndex },
    { joint: "pinky-finger-phalanx-proximal", w: 0.014, h: 0.012, d: 0.007, local: new THREE.Vector3(0, 0.003, 0.005), appear: 0.24, phase: "hands", handIndex },
    { joint: "thumb-phalanx-proximal", w: 0.016, h: 0.012, d: 0.008, local: new THREE.Vector3(0, 0.003, 0.006), appear: 0.18, phase: "hands", handIndex, gold: true },
    { joint: "forearm", w: 0.05, h: 0.08, d: 0.012, local: new THREE.Vector3(0, 0, 0.06), appear: 0.55, phase: "arms", handIndex },
    { joint: "forearm", w: 0.046, h: 0.07, d: 0.012, local: new THREE.Vector3(0, 0, 0.13), appear: 0.75, phase: "arms", handIndex },
  ];

  [0, 1].forEach((handIndex) => {
    handSpecs(handIndex).forEach((spec) => addPlate(root, spec));
  });

  addPlate(bodyRig, { followBody: true, w: 0.18, h: 0.16, d: 0.02, local: new THREE.Vector3(0, -0.18, -0.16), appear: 1.05, phase: "body" });
  addPlate(bodyRig, { followBody: true, w: 0.08, h: 0.04, d: 0.012, local: new THREE.Vector3(0, -0.12, -0.15), appear: 1.15, phase: "body", gold: true });
  addPlate(bodyRig, { followBody: true, w: 0.09, h: 0.07, d: 0.016, local: new THREE.Vector3(-0.14, -0.1, -0.14), appear: 1.25, phase: "body" });
  addPlate(bodyRig, { followBody: true, w: 0.09, h: 0.07, d: 0.016, local: new THREE.Vector3(0.14, -0.1, -0.14), appear: 1.3, phase: "body" });
  addPlate(bodyRig, { followBody: true, w: 0.14, h: 0.08, d: 0.016, local: new THREE.Vector3(0, -0.3, -0.15), appear: 1.5, phase: "body" });
  addPlate(bodyRig, { followBody: true, w: 0.07, h: 0.06, d: 0.014, local: new THREE.Vector3(-0.1, -0.4, -0.14), appear: 1.7, phase: "body" });
  addPlate(bodyRig, { followBody: true, w: 0.07, h: 0.06, d: 0.014, local: new THREE.Vector3(0.1, -0.4, -0.14), appear: 1.78, phase: "body" });

  const chargeOrb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 18, 18), plateMat(false, 0.8));
  chargeOrb.visible = false;
  root.add(chargeOrb);
  const chargeRing = new THREE.Mesh(
    new THREE.RingGeometry(0.04, 0.055, 28),
    plateMat(true, 0.7),
  );
  chargeRing.visible = false;
  root.add(chargeRing);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.05, 1.6, 12, 1, true),
    plateMat(false, 0.0),
  );
  beam.visible = false;
  root.add(beam);

  const sfx = makeSfx();
  const world = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const look = new THREE.Vector3();
  const yaw = new THREE.Euler();

  let wanted = 0;
  let progress = 0;
  let charge = 0;
  let chargingHand = null;
  let blastFlash = 0;
  let lastPalm = null;

  const jointOf = (hands, plate) => {
    const hand = hands[plate.userData.handIndex];
    if (!hand) {
      return null;
    }
    if (plate.userData.joint === "forearm") {
      const wrist = hand.joints.wrist;
      const mid = hand.joints["middle-finger-metacarpal"];
      if (!wrist || !mid) {
        return null;
      }
      wrist.getWorldPosition(world);
      mid.getWorldPosition(look);
      const dir = world.clone().sub(look).normalize();
      const pos = world.clone().add(plate.userData.local.clone().applyQuaternion(wrist.getWorldQuaternion(quat)));
      pos.addScaledVector(dir, plate.userData.local.z);
      return { pos, quat: wrist.getWorldQuaternion(quat) };
    }
    const joint = hand.joints[plate.userData.joint];
    if (!joint) {
      return null;
    }
    joint.getWorldPosition(world);
    joint.getWorldQuaternion(quat);
    const pos = world.clone().add(plate.userData.local.clone().applyQuaternion(quat));
    return { pos, quat };
  };

  return {
    root,
    get on() {
      return wanted > 0.5;
    },
    get equipped() {
      return progress > 0.92;
    },
    get charging() {
      return charge > 0 && charge < 1;
    },
    get charge() {
      return charge;
    },
    async unlockAudio() {
      await sfx.unlock();
    },
    send() {
      wanted = 1;
    },
    dismiss() {
      wanted = 0;
      charge = 0;
      chargingHand = null;
      sfx.stopCharge();
      chargeOrb.visible = false;
      chargeRing.visible = false;
    },
    toggle() {
      if (wanted > 0.5) {
        this.dismiss();
      } else {
        this.send();
      }
    },
    update({ dt, camera, hands, palms, onBlast }) {
      const dir = wanted > 0.5 ? 1 : -1;
      progress = THREE.MathUtils.clamp(progress + dir * (dt / BUILD_S), 0, 1);
      const buildT = wanted > 0.5 ? progress * BUILD_S : (1 - progress) * BUILD_S;
      const peel = wanted < 0.5;

      camera.getWorldPosition(world);
      camera.getWorldQuaternion(quat);
      yaw.setFromQuaternion(quat, "YXZ");
      bodyRig.position.copy(world);
      bodyRig.rotation.set(0, yaw.y, 0);

      plates.forEach((plate) => {
        const t = peel ? BUILD_S - plate.userData.appear : plate.userData.appear;
        const live = peel ? progress > 0 && buildT <= t + 0.22 : buildT >= plate.userData.appear;
        if (!live) {
          plate.visible = false;
          plate.scale.setScalar(0.001);
          return;
        }
        plate.visible = true;
        const age = peel ? Math.max(0, t + 0.22 - buildT) : buildT - plate.userData.appear;
        const s = THREE.MathUtils.clamp(age / 0.16, 0, 1);
        plate.scale.setScalar(0.15 + s * 0.85);
        if (plate.userData.followBody) {
          plate.position.copy(plate.userData.local);
          return;
        }
        const pose = jointOf(hands, plate);
        if (!pose) {
          plate.visible = false;
          return;
        }
        plate.position.copy(pose.pos);
        plate.quaternion.copy(pose.quat);
      });

      let palm = null;
      if (this.equipped) {
        palm = palms.find((item) => item.open && item.facingAway) || null;
      }
      if (palm && palm.still) {
        if (chargingHand !== palm.hand) {
          chargingHand = palm.hand;
          charge = 0;
          sfx.startCharge();
        }
        charge = Math.min(1, charge + dt / CHARGE_S);
        lastPalm = palm;
        chargeOrb.visible = true;
        chargeRing.visible = true;
        chargeOrb.position.copy(palm.position);
        chargeRing.position.copy(palm.position);
        chargeOrb.scale.setScalar(0.6 + charge * 2.2);
        chargeRing.scale.setScalar(0.8 + charge * 2.4);
        chargeRing.lookAt(palm.position.clone().add(palm.normal));
        chargeOrb.material.opacity = 0.35 + charge * 0.6;
        if (charge >= 1) {
          sfx.blast();
          blastFlash = 1;
          charge = 0;
          chargingHand = null;
          chargeOrb.visible = false;
          chargeRing.visible = false;
          onBlast?.(palm.position.clone(), palm.normal.clone());
        }
      } else {
        if (chargingHand) {
          sfx.stopCharge();
        }
        chargingHand = null;
        charge = 0;
        chargeOrb.visible = false;
        chargeRing.visible = false;
      }

      if (blastFlash > 0 && lastPalm) {
        blastFlash = Math.max(0, blastFlash - dt * 2.8);
        beam.visible = true;
        beam.position.copy(lastPalm.position).addScaledVector(lastPalm.normal, 0.8);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lastPalm.normal.clone().normalize());
        beam.material.opacity = blastFlash * 0.55;
      } else {
        beam.visible = false;
      }
    },
  };
}
