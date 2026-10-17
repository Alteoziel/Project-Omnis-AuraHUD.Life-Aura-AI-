import * as THREE from "three";

const PINCH_ON = 0.024;
const PINCH_OFF = 0.034;
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
    const cursor = new THREE.Mesh(new THREE.SphereGeometry(0.01, 16, 16), glowMat(0.95));
    cursor.visible = false;
    scene.add(cursor);

    hand.userData.pinched = false;
    hand.userData.fired = false;

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
    return { origin, dir, indexTip, thumbTip };
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
    const end = hit ? hitPoint.copy(hit.point) : origin.clone().addScaledVector(dir, RAY_LENGTH);
    points.setXYZ(0, ray.origin.x, ray.origin.y, ray.origin.z);
    points.setXYZ(1, end.x, end.y, end.z);
    points.needsUpdate = true;
    laser.visible = true;
    laser.material.opacity = hit ? 0.85 : 0.28;
    cursor.visible = Boolean(hit);
    if (hit) {
      cursor.position.copy(hit.point);
      cursor.scale.setScalar(hit ? 1.35 : 1);
    }
  };

  const interact = (buttons, onToggle) => {
    const hits = buttons.map((row) => row.userData.hit);
    buttons.forEach((row) => {
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

      const ray = controllerRay(controller) || (joints ? { origin, dir } : null);
      if (!ray) {
        laser.visible = false;
        cursor.visible = false;
        return;
      }

      raycaster.set(ray.origin, ray.dir);
      const found = raycaster.intersectObjects(hits, false);
      const target = found[0]?.object?.parent ?? null;
      setLaser(laser, cursor, ray, found[0]);

      if (target) {
        target.userData.controllerHover = true;
      }

      const pinch = joints ? pinchState(hand, joints.thumbTip) : "open";
      const xrClick = Boolean(controller.userData.selectDown || controller.userData.squeezeDown);
      if (target && (xrClick || pinch === "start") && !hand.userData.fired) {
        hand.userData.fired = true;
        controller.userData.selectDown = false;
        controller.userData.squeezeDown = false;
        onToggle(target);
      }
      if (!target) {
        controller.userData.selectDown = false;
        controller.userData.squeezeDown = false;
      }
      if (pinch === "end" || (!hand.userData.pinched && !xrClick)) {
        hand.userData.fired = false;
      }
    });
  };

  return {
    interact,
    dispose() {
      visuals.forEach(({ hand, controller, indexDot, thumbDot, laser, cursor }) => {
        scene.remove(hand, controller, indexDot, thumbDot, laser, cursor);
      });
    },
  };
}
