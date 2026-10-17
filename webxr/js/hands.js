import * as THREE from "three";

const PINCH_ON = 0.028;
const PINCH_OFF = 0.04;
const RAY_LENGTH = 1.6;

function glowMat(opacity = 0.9) {
  return new THREE.MeshBasicMaterial({
    color: 0x3df0ff,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function fingertipMarker() {
  return new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 12), glowMat(0.9));
}

function makeRay() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -RAY_LENGTH),
  ]);
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({
      color: 0x3df0ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  line.frustumCulled = false;
  line.visible = false;
  return line;
}

export function createHands(renderer, scene) {
  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];
  const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
  const raycaster = new THREE.Raycaster();
  raycaster.far = RAY_LENGTH;

  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const tip = new THREE.Vector3();
  const knuckle = new THREE.Vector3();
  const thumb = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  const jointOrigin = new THREE.Vector3();
  const jointDir = new THREE.Vector3();

  const visuals = hands.map((hand, index) => {
    scene.add(hand);
    const controller = controllers[index];
    scene.add(controller);
    controller.addEventListener("selectstart", () => {
      controller.userData.selectDown = true;
    });
    controller.addEventListener("selectend", () => {
      controller.userData.selectDown = false;
    });
    controller.addEventListener("squeezestart", () => {
      controller.userData.squeezeDown = true;
    });
    controller.addEventListener("squeezeend", () => {
      controller.userData.squeezeDown = false;
    });

    const indexDot = fingertipMarker();
    const thumbDot = fingertipMarker();
    indexDot.visible = false;
    thumbDot.visible = false;
    scene.add(indexDot, thumbDot);

    const laser = makeRay();
    scene.add(laser);
    const cursor = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 16), glowMat(0.95));
    cursor.visible = false;
    scene.add(cursor);

    hand.userData.pinched = false;
    hand.userData.fired = false;
    hand.userData.poked = false;
    hand.userData.grabbing = null;
    hand.userData.palmHist = [];
    hand.userData.swipeAt = 0;

    return { hand, controller, indexDot, thumbDot, laser, cursor };
  });

  const jointRay = (hand) => {
    const indexTip = hand.joints["index-finger-tip"];
    const indexProx = hand.joints["index-finger-phalanx-proximal"] || hand.joints["index-finger-metacarpal"];
    const thumbTip = hand.joints["thumb-tip"];
    if (!indexTip || !indexProx) {
      return null;
    }
    indexTip.getWorldPosition(tip);
    indexProx.getWorldPosition(knuckle);
    dir.copy(tip).sub(knuckle);
    if (dir.lengthSq() < 1e-8) {
      return null;
    }
    dir.normalize();
    origin.copy(tip);
    if (thumbTip) {
      thumbTip.getWorldPosition(thumb);
      origin.lerp(thumb, 0.35);
    }
    jointOrigin.copy(origin);
    jointDir.copy(dir);
    return { origin: jointOrigin, dir: jointDir, indexTip, thumbTip };
  };

  const controllerRay = (controller) => {
    if (!controller.visible) {
      return null;
    }
    controller.updateMatrixWorld(true);
    controller.getWorldPosition(origin);
    controller.getWorldQuaternion(quat);
    dir.set(0, 0, -1).applyQuaternion(quat);
    if (!Number.isFinite(origin.x) || origin.lengthSq() < 1e-8) {
      return null;
    }
    return { origin, dir };
  };

  const pinchState = (hand, thumbTip) => {
    if (!thumbTip) {
      return hand.userData.pinched ? "hold" : "open";
    }
    const distance = tip.distanceTo(thumb);
    if (!hand.userData.pinched && distance < PINCH_ON) {
      hand.userData.pinched = true;
      return "start";
    }
    if (hand.userData.pinched && distance > PINCH_OFF) {
      hand.userData.pinched = false;
      return "end";
    }
    return hand.userData.pinched ? "hold" : "open";
  };

  const setLaser = (laser, cursor, ray, hit) => {
    const points = laser.geometry.attributes.position;
    const end = hit
      ? hitPoint.copy(hit.point)
      : ray.origin.clone().addScaledVector(ray.dir, RAY_LENGTH);
    points.setXYZ(0, ray.origin.x, ray.origin.y, ray.origin.z);
    points.setXYZ(1, end.x, end.y, end.z);
    points.needsUpdate = true;
    laser.visible = true;
    laser.material.opacity = hit ? 0.95 : 0.4;
    cursor.visible = Boolean(hit);
    if (hit) {
      cursor.position.copy(hit.point);
      cursor.scale.setScalar(1.6);
    }
  };

  const palmOpen = (hand) => {
    const wrist = hand.joints.wrist || hand.joints["middle-finger-metacarpal"];
    const indexTip = hand.joints["index-finger-tip"];
    const pinky = hand.joints["pinky-finger-tip"];
    if (!wrist || !indexTip || !pinky || hand.userData.pinched) {
      return false;
    }
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    wrist.getWorldPosition(a);
    indexTip.getWorldPosition(b);
    pinky.getWorldPosition(c);
    return a.distanceTo(b) > 0.08 && a.distanceTo(c) > 0.07 && tip.distanceTo(thumb) > 0.055;
  };

  const localTip = new THREE.Vector3();

  const pokeHit = (row, worldTip) => {
    const hit = row.userData.hit;
    if (!hit) {
      return null;
    }
    hit.updateWorldMatrix(true, false);
    localTip.copy(worldTip);
    hit.worldToLocal(localTip);
    const { width = 0.4, height = 0.08 } = hit.geometry.parameters || {};
    const inXY = Math.abs(localTip.x) <= width / 2 && Math.abs(localTip.y) <= height / 2;
    if (!inXY) {
      return null;
    }
    if (localTip.z < 0.028 && localTip.z > -0.03) {
      return "poke";
    }
    if (localTip.z < 0.08 && localTip.z > -0.04) {
      return "hover";
    }
    return null;
  };

  const interact = ({ targets = [], onSelect, onGrabStart, onGrabMove, onGrabEnd, onSwipe } = {}) => {
    const hits = targets.map((row) => row.userData.hit).filter(Boolean);
    targets.forEach((row) => {
      row.userData.controllerHover = false;
    });

    visuals.forEach(({ hand, controller, indexDot, thumbDot, laser, cursor }) => {
      const joints = jointRay(hand);
      if (joints?.indexTip) {
        indexDot.position.copy(tip);
        indexDot.visible = true;
      } else {
        indexDot.visible = false;
      }
      if (joints?.thumbTip) {
        thumbDot.position.copy(thumb);
        thumbDot.visible = true;
      } else {
        thumbDot.visible = false;
      }

      let pokeTarget = null;
      let pokeKind = null;
      if (joints) {
        targets.forEach((row) => {
          const kind = pokeHit(row, tip);
          if (!kind) {
            return;
          }
          row.userData.controllerHover = true;
          if (kind === "poke") {
            pokeTarget = row;
            pokeKind = "poke";
          } else if (!pokeTarget) {
            pokeTarget = row;
            pokeKind = "hover";
          }
        });
      }

      if (pokeKind === "poke" && !hand.userData.poked && pokeTarget) {
        hand.userData.poked = true;
        if (pokeTarget.userData.kind === "grab") {
          hand.userData.grabbing = pokeTarget.userData.window || pokeTarget;
          onGrabStart?.(hand.userData.grabbing, tip.clone());
        } else {
          onSelect?.(pokeTarget);
        }
      }
      if (pokeKind !== "poke") {
        hand.userData.poked = false;
      }

      const ray = joints || controllerRay(controller);
      const pinch = joints ? pinchState(hand, joints.thumbTip) : "open";
      const xrClick = Boolean(controller.userData.selectDown || controller.userData.squeezeDown);
      const pinchPoint = origin.clone();

      if (hand.userData.grabbing) {
        laser.visible = false;
        cursor.visible = false;
        onGrabMove?.(hand.userData.grabbing, pinchPoint);
        if (pinch === "end" && !xrClick && pokeKind !== "poke") {
          onGrabEnd?.(hand.userData.grabbing);
          hand.userData.grabbing = null;
          hand.userData.fired = false;
        }
        return;
      }

      if (!ray) {
        laser.visible = false;
        cursor.visible = false;
        return;
      }

      raycaster.set(ray.origin, ray.dir);
      const found = raycaster.intersectObjects(hits, false);
      const target = found[0]?.object?.parent ?? null;
      const near = Boolean(pokeKind);
      if (near) {
        laser.visible = false;
        cursor.visible = Boolean(pokeTarget);
        if (pokeTarget) {
          pokeTarget.userData.hit.getWorldPosition(hitPoint);
          cursor.position.copy(hitPoint);
          cursor.scale.setScalar(1.8);
        }
      } else {
        setLaser(laser, cursor, ray, found[0]);
      }

      if (target && !near) {
        target.userData.controllerHover = true;
      }

      if (!near && target && (xrClick || pinch === "start") && !hand.userData.fired) {
        hand.userData.fired = true;
        controller.userData.selectDown = false;
        controller.userData.squeezeDown = false;
        if (target.userData.kind === "grab") {
          hand.userData.grabbing = target.userData.window || target;
          onGrabStart?.(hand.userData.grabbing, pinchPoint);
        } else {
          onSelect?.(target);
        }
      }
      if (!target) {
        controller.userData.selectDown = false;
        controller.userData.squeezeDown = false;
      }
      if (pinch === "end" || (!hand.userData.pinched && !xrClick)) {
        hand.userData.fired = false;
      }

      if (joints && palmOpen(hand)) {
        const wrist = hand.joints.wrist || hand.joints["middle-finger-metacarpal"];
        const pos = new THREE.Vector3();
        wrist.getWorldPosition(pos);
        const hist = hand.userData.palmHist;
        hist.push({ t: performance.now(), x: pos.x, y: pos.y });
        if (hist.length > 10) {
          hist.shift();
        }
        const first = hist[0];
        const last = hist[hist.length - 1];
        if (first && last && last.t - first.t < 420 && last.t - hand.userData.swipeAt > 700) {
          const dx = last.x - first.x;
          const dy = last.y - first.y;
          if (Math.abs(dx) > 0.16 || Math.abs(dy) > 0.16) {
            hand.userData.swipeAt = last.t;
            hand.userData.palmHist = [];
            onSwipe?.(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "up" : "down");
          }
        }
      } else {
        hand.userData.palmHist = [];
      }
    });
  };

  return {
    interact,
    fingertips() {
      const tips = [];
      visuals.forEach(({ hand }) => {
        const joint = hand.joints["index-finger-tip"];
        if (!joint) {
          return;
        }
        const pos = new THREE.Vector3();
        joint.getWorldPosition(pos);
        tips.push(pos);
      });
      return tips;
    },
    dispose() {
      visuals.forEach(({ hand, controller, indexDot, thumbDot, laser, cursor }) => {
        scene.remove(hand, controller, indexDot, thumbDot, laser, cursor);
      });
    },
  };
}
