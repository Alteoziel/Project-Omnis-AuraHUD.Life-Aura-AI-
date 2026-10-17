import * as THREE from "three";

const PINCH_ON = 0.019;
const PINCH_OFF = 0.028;
const POKE_ON = 0.028;

function fingertipMarker() {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x3df0ff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 12), mat);
}

export function createHands(renderer, scene) {
  const left = renderer.xr.getHand(0);
  const right = renderer.xr.getHand(1);
  scene.add(left, right);

  const markers = [];
  [left, right].forEach((hand) => {
    const index = fingertipMarker();
    const thumb = fingertipMarker();
    index.visible = false;
    thumb.visible = false;
    hand.userData.indexMarker = index;
    hand.userData.thumbMarker = thumb;
    scene.add(index, thumb);
    markers.push(index, thumb);
    hand.userData.pinched = false;
  });

  const indexWorld = new THREE.Vector3();
  const thumbWorld = new THREE.Vector3();
  const local = new THREE.Vector3();

  const syncMarkers = (hand) => {
    const index = hand.joints["index-finger-tip"];
    const thumb = hand.joints["thumb-tip"];
    const ready = Boolean(index && thumb);
    if (ready) {
      index.getWorldPosition(indexWorld);
      thumb.getWorldPosition(thumbWorld);
      hand.userData.indexMarker.position.copy(indexWorld);
      hand.userData.thumbMarker.position.copy(thumbWorld);
    }
    hand.userData.indexMarker.visible = ready;
    hand.userData.thumbMarker.visible = ready;
    return ready ? { index, thumb } : null;
  };

  const pinchState = (hand, joints) => {
    joints.index.getWorldPosition(indexWorld);
    joints.thumb.getWorldPosition(thumbWorld);
    const distance = indexWorld.distanceTo(thumbWorld);
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

  const interact = (buttons, onToggle) => {
    [left, right].forEach((hand) => {
      const joints = syncMarkers(hand);
      if (!joints) {
        return;
      }
      joints.index.getWorldPosition(indexWorld);
      const pinch = pinchState(hand, joints);
      buttons.forEach((row) => {
        row.worldToLocal(local.copy(indexWorld));
        const halfW = 0.15;
        const halfH = 0.028;
        const inside =
          Math.abs(local.x) <= halfW &&
          Math.abs(local.y) <= halfH &&
          Math.abs(local.z) <= POKE_ON;
        row.userData.controllerHover = Boolean(inside);
        if (inside && (pinch === "start" || (pinch === "hold" && !row.userData.fired))) {
          row.userData.fired = true;
          onToggle(row);
        }
        if (pinch === "end" || !inside) {
          row.userData.fired = false;
        }
      });
    });
  };

  return {
    interact,
    dispose() {
      markers.forEach((marker) => scene.remove(marker));
      scene.remove(left, right);
    },
  };
}
