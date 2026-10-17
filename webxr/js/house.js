import * as THREE from "three";

const CYAN = 0x3df0ff;
const GOLD = 0xf0c14a;
const GRAVITY = 6.4;
const FLOOR_Y = 0.03;

function plateMat(opacity = 0.42) {
  return new THREE.MeshBasicMaterial({
    color: 0x0c2430,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function edgeMat(opacity = 0.7) {
  return new THREE.LineBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function makeChunk(w, h, d) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plateMat(0.48));
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
    edgeMat(0.75),
  );
  const pip = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.08, w * 0.28), 0.008), plateMat(0.9));
  pip.material = new THREE.MeshBasicMaterial({
    color: GOLD,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  pip.position.z = d / 2 + 0.001;
  group.add(mesh, edge, pip);
  group.userData = {
    mesh,
    edge,
    w,
    h,
    d,
    loose: false,
    settled: false,
    velocity: new THREE.Vector3(),
    spin: new THREE.Vector3(),
    home: new THREE.Vector3(),
    hit: mesh,
  };
  group.userData.mesh.userData.chunk = group;
  return group;
}

function addWall(root, chunks, { width, height, cols, rows, origin, normal, door }) {
  const cw = width / cols;
  const ch = height / rows;
  const across = new THREE.Vector3(normal.z, 0, -normal.x);
  if (across.lengthSq() < 1e-6) {
    across.set(1, 0, 0);
  }
  across.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(new THREE.Vector3(), normal.clone().negate(), up),
  );

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (door) {
        const x0 = col * cw;
        const y0 = row * ch;
        if (x0 >= door.x && x0 < door.x + door.w && y0 < door.h) {
          continue;
        }
      }
      const chunk = makeChunk(cw * 0.96, ch * 0.94, 0.055);
      const lateral = (col + 0.5) * cw - width / 2;
      const vertical = (row + 0.5) * ch;
      chunk.position.copy(origin);
      chunk.position.addScaledVector(across, lateral);
      chunk.position.addScaledVector(up, vertical);
      chunk.quaternion.copy(quat);
      chunk.userData.home.copy(chunk.position);
      chunk.userData.homeQuat = chunk.quaternion.clone();
      root.add(chunk);
      chunks.push(chunk);
    }
  }
}

export function createHouse() {
  const root = new THREE.Group();
  root.name = "destructible-house";

  const chunks = [];
  const roomW = 4.2;
  const roomD = 4.2;
  const wallH = 2.35;
  const cols = 6;
  const rows = 4;

  addWall(root, chunks, {
    width: roomW,
    height: wallH,
    cols,
    rows,
    origin: new THREE.Vector3(0, 0, -roomD / 2),
    normal: new THREE.Vector3(0, 0, -1),
    door: { x: 1.5, w: 0.95, h: 2.0 },
  });
  addWall(root, chunks, {
    width: roomW,
    height: wallH,
    cols,
    rows,
    origin: new THREE.Vector3(0, 0, roomD / 2),
    normal: new THREE.Vector3(0, 0, 1),
  });
  addWall(root, chunks, {
    width: roomD,
    height: wallH,
    cols,
    rows,
    origin: new THREE.Vector3(-roomW / 2, 0, 0),
    normal: new THREE.Vector3(-1, 0, 0),
  });
  addWall(root, chunks, {
    width: roomD,
    height: wallH,
    cols,
    rows,
    origin: new THREE.Vector3(roomW / 2, 0, 0),
    normal: new THREE.Vector3(1, 0, 0),
  });
  addWall(root, chunks, {
    width: 1.8,
    height: 1.4,
    cols: 3,
    rows: 3,
    origin: new THREE.Vector3(0.55, 0, -0.2),
    normal: new THREE.Vector3(0, 0, -1),
  });

  const floor = new THREE.GridHelper(roomW, 16, 0x1a4a55, 0x0a2028);
  floor.position.y = 0.002;
  root.add(floor);

  const raycaster = new THREE.Raycaster();
  raycaster.far = 8;
  const hits = [];
  let centered = false;

  const knock = (chunk, point, dir, force) => {
    if (chunk.userData.settled && chunk.userData.loose) {
      chunk.userData.settled = false;
    }
    chunk.userData.loose = true;
    const push = dir.clone().normalize().multiplyScalar(force);
    push.y += 1.1 + Math.random() * 0.8;
    push.add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2));
    chunk.userData.velocity.add(push);
    chunk.userData.spin.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8);
    chunk.position.add(dir.clone().multiplyScalar(0.02));
    chunk.userData.mesh.material.opacity = 0.72;
    chunk.userData.edge.material.opacity = 1;
    chunk.userData.edge.material.color.setHex(GOLD);
  };

  return {
    root,
    chunks,
    centerOn(world) {
      if (centered) {
        return;
      }
      root.position.set(world.x, 0, world.z);
      centered = true;
    },
    resetCenter() {
      centered = false;
      root.position.set(0, 0, 0);
    },
    blast(origin, dir) {
      raycaster.set(origin, dir.clone().normalize());
      hits.length = 0;
      const solids = chunks.map((chunk) => chunk.userData.mesh);
      raycaster.intersectObjects(solids, false, hits);
      const first = hits[0];
      if (!first) {
        return null;
      }
      const epicenter = first.point.clone();
      let broken = 0;
      chunks.forEach((chunk) => {
        const dist = chunk.getWorldPosition(new THREE.Vector3()).distanceTo(epicenter);
        if (dist > 0.72) {
          return;
        }
        const falloff = 1 - dist / 0.72;
        knock(chunk, epicenter, dir, 3.6 * falloff + 1.2);
        broken += 1;
      });
      return { point: epicenter, broken };
    },
    update(dt) {
      chunks.forEach((chunk) => {
        if (!chunk.userData.loose || chunk.userData.settled) {
          return;
        }
        chunk.userData.velocity.y -= GRAVITY * dt;
        chunk.position.addScaledVector(chunk.userData.velocity, dt);
        chunk.rotation.x += chunk.userData.spin.x * dt;
        chunk.rotation.y += chunk.userData.spin.y * dt;
        chunk.rotation.z += chunk.userData.spin.z * dt;
        const world = chunk.getWorldPosition(new THREE.Vector3());
        if (world.y < FLOOR_Y + root.position.y) {
          chunk.position.y += FLOOR_Y + root.position.y - world.y;
          if (chunk.userData.velocity.y < 0) {
            chunk.userData.velocity.y *= -0.22;
          }
          chunk.userData.velocity.x *= 0.55;
          chunk.userData.velocity.z *= 0.55;
          chunk.userData.spin.multiplyScalar(0.55);
          if (chunk.userData.velocity.length() < 0.18) {
            chunk.userData.velocity.set(0, 0, 0);
            chunk.userData.spin.set(0, 0, 0);
            chunk.userData.settled = true;
            chunk.userData.edge.material.color.setHex(CYAN);
            chunk.userData.edge.material.opacity = 0.45;
          }
        }
      });
    },
  };
}
