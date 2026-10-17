import * as THREE from "three";

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
  return new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 12), glowMat(0.95));
}

export function createHands(renderer, scene) {
  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];

  const tip = new THREE.Vector3();
  const thumb = new THREE.Vector3();
  const localTip = new THREE.Vector3();
  const palmA = new THREE.Vector3();
  const palmB = new THREE.Vector3();
  const palmC = new THREE.Vector3();
  const wristPos = new THREE.Vector3();

  const visuals = hands.map((hand) => {
    scene.add(hand);
    const indexDot = fingertipMarker();
    const thumbDot = fingertipMarker();
    indexDot.visible = false;
    thumbDot.visible = false;
    scene.add(indexDot, thumbDot);
    hand.userData.poked = false;
    hand.userData.grabbing = null;
    hand.userData.palmHist = [];
    hand.userData.swipeAt = 0;
    hand.userData.stillHist = [];
    return { hand, indexDot, thumbDot };
  });

  const readTips = (hand) => {
    const indexTip = hand.joints["index-finger-tip"];
    const thumbTip = hand.joints["thumb-tip"];
    if (!indexTip) {
      return null;
    }
    indexTip.getWorldPosition(tip);
    if (thumbTip) {
      thumbTip.getWorldPosition(thumb);
    }
    return { indexTip, thumbTip: thumbTip || null };
  };

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
    if (localTip.z < 0.032 && localTip.z > -0.028) {
      return "poke";
    }
    if (localTip.z < 0.09 && localTip.z > -0.04) {
      return "hover";
    }
    return null;
  };

  const palmOpen = (hand) => {
    const wrist = hand.joints.wrist || hand.joints["middle-finger-metacarpal"];
    const indexTip = hand.joints["index-finger-tip"];
    const pinky = hand.joints["pinky-finger-tip"];
    const thumbTip = hand.joints["thumb-tip"];
    if (!wrist || !indexTip || !pinky || !thumbTip) {
      return false;
    }
    wrist.getWorldPosition(palmA);
    indexTip.getWorldPosition(palmB);
    pinky.getWorldPosition(palmC);
    thumbTip.getWorldPosition(thumb);
    return palmA.distanceTo(palmB) > 0.08 && palmA.distanceTo(palmC) > 0.07 && palmB.distanceTo(thumb) > 0.055;
  };

  const palmNormal = new THREE.Vector3();
  const palmCenter = new THREE.Vector3();
  const camFwd = new THREE.Vector3();
  const fromCam = new THREE.Vector3();

  const palms = (cameraPos, camQuat) => {
    camFwd.set(0, 0, -1).applyQuaternion(camQuat);
    return visuals
      .map(({ hand }, index) => {
        const wrist = hand.joints.wrist;
        const indexTip = hand.joints["index-finger-tip"];
        const pinky = hand.joints["pinky-finger-tip"];
        const thumbTip = hand.joints["thumb-tip"];
        if (!wrist || !indexTip || !pinky || !thumbTip) {
          return null;
        }
        wrist.getWorldPosition(palmA);
        indexTip.getWorldPosition(palmB);
        pinky.getWorldPosition(palmC);
        thumbTip.getWorldPosition(thumb);
        const open = palmA.distanceTo(palmB) > 0.08 && palmA.distanceTo(palmC) > 0.07 && palmB.distanceTo(thumb) > 0.055;
        palmNormal.copy(palmB).sub(palmA).cross(palmC.clone().sub(palmA));
        if (palmNormal.lengthSq() < 1e-8) {
          return null;
        }
        palmNormal.normalize();
        if (palmNormal.dot(camFwd) < 0) {
          palmNormal.negate();
        }
        palmCenter.copy(palmA).add(palmB).add(palmC).multiplyScalar(1 / 3);
        fromCam.copy(palmCenter).sub(cameraPos).normalize();
        const facingAway = open && palmNormal.dot(camFwd) > 0.52 && palmNormal.dot(fromCam) > 0.12;
        const hist = hand.userData.stillHist;
        hist.push(palmCenter.clone());
        if (hist.length > 8) {
          hist.shift();
        }
        const still = hist.length > 3 && hist[0].distanceTo(palmCenter) < 0.045;
        return {
          hand,
          index,
          open,
          facingAway,
          still,
          position: palmCenter.clone(),
          normal: palmNormal.clone(),
        };
      })
      .filter(Boolean);
  };

  const interact = ({ targets = [], onSelect, onGrabStart, onGrabMove, onGrabEnd, onSwipe, skipSwipe = false } = {}) => {
    targets.forEach((row) => {
      row.userData.controllerHover = false;
    });

    visuals.forEach(({ hand, indexDot, thumbDot }) => {
      const joints = readTips(hand);
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

      if (hand.userData.grabbing) {
        onGrabMove?.(hand.userData.grabbing, tip.clone());
        if (joints) {
          const hold = hand.userData.grabbing;
          hold.getWorldPosition(wristPos);
          if (tip.distanceTo(wristPos) > 0.2) {
            onGrabEnd?.(hold);
            hand.userData.grabbing = null;
            hand.userData.poked = false;
          }
        }
        return;
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
          } else if (pokeKind !== "poke") {
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

      if (joints && palmOpen(hand) && !skipSwipe) {
        const wrist = hand.joints.wrist || hand.joints["middle-finger-metacarpal"];
        wrist.getWorldPosition(wristPos);
        const hist = hand.userData.palmHist;
        hist.push({ t: performance.now(), x: wristPos.x, y: wristPos.y });
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
    palms,
    xrHands: hands,
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
      visuals.forEach(({ hand, indexDot, thumbDot }) => {
        scene.remove(hand, indexDot, thumbDot);
      });
    },
  };
}
