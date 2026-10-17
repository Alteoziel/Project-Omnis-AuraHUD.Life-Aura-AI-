import * as THREE from "three";

const CYAN = 0x3df0ff;
const GOLD = 0xf0c14a;
const GRAVITY = 6.4;
const FALLBACK_WAIT = 4;
const CHUNK = 0.55;

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
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), edgeMat(0.75));
  const pip = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(0.08, w * 0.28), 0.008),
    new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
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

function poseMatrix(frame, space, referenceSpace) {
  const pose = frame.getPose(space, referenceSpace);
  if (!pose) {
    return null;
  }
  return new THREE.Matrix4().fromArray(pose.transform.matrix);
}

function collectVertices(raw, matrix) {
  const verts = [];
  if (!raw) {
    return verts;
  }
  if (typeof raw.length === "number" && (typeof raw[0] === "number" || ArrayBuffer.isView(raw))) {
    for (let i = 0; i + 2 < raw.length; i += 3) {
      verts.push(new THREE.Vector3(raw[i], raw[i + 1], raw[i + 2]).applyMatrix4(matrix));
    }
    return verts;
  }
  for (const point of raw) {
    verts.push(new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(matrix));
  }
  return verts;
}

function wallFromPoints(pts, cameraPos) {
  if (pts.length < 3) {
    return null;
  }
  const centroid = new THREE.Vector3();
  pts.forEach((p) => centroid.add(p));
  centroid.divideScalar(pts.length);
  const normal = new THREE.Vector3();
  for (let i = 0; i < pts.length - 2 && normal.lengthSq() < 1e-8; i += 1) {
    normal.copy(pts[i + 1]).sub(pts[i]).cross(pts[i + 2].clone().sub(pts[i]));
  }
  if (normal.lengthSq() < 1e-8) {
    return null;
  }
  normal.normalize();
  if (Math.abs(normal.y) > 0.55) {
    return null;
  }
  normal.y = 0;
  if (normal.lengthSq() < 1e-8) {
    return null;
  }
  normal.normalize();
  const toward = new THREE.Vector3(cameraPos.x, centroid.y, cameraPos.z).sub(centroid);
  if (toward.lengthSq() > 1e-8 && normal.dot(toward) < 0) {
    normal.negate();
  }
  const across = new THREE.Vector3(normal.z, 0, -normal.x);
  if (across.lengthSq() < 1e-6) {
    across.set(1, 0, 0);
  }
  across.normalize();
  let minY = Infinity;
  let maxY = -Infinity;
  let minL = Infinity;
  let maxL = -Infinity;
  pts.forEach((p) => {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    const lat = p.clone().sub(centroid).dot(across);
    minL = Math.min(minL, lat);
    maxL = Math.max(maxL, lat);
  });
  const width = maxL - minL;
  const height = maxY - minY;
  if (width < 0.7 || height < 0.85) {
    return null;
  }
  const origin = centroid.clone();
  origin.y = minY;
  origin.addScaledVector(across, (minL + maxL) / 2);
  origin.addScaledVector(normal, 0.03);
  return { origin, normal: normal.clone(), width, height };
}

function gridFor(width, height) {
  return {
    cols: Math.max(2, Math.min(10, Math.round(width / CHUNK))),
    rows: Math.max(2, Math.min(7, Math.round(height / CHUNK))),
  };
}

function signatureOf(walls) {
  return walls
    .map((wall) => {
      const x = wall.origin.x.toFixed(1);
      const z = wall.origin.z.toFixed(1);
      const y = wall.origin.y.toFixed(1);
      return `${x},${y},${z}:${wall.width.toFixed(1)}x${wall.height.toFixed(1)}`;
    })
    .sort()
    .join("|");
}

export function createHouse() {
  const root = new THREE.Group();
  root.name = "destructible-house";
  const chunks = [];
  const guides = new THREE.Group();
  root.add(guides);

  let floor = null;
  let floorY = 0.03;
  let mode = "preview";
  let wait = 0;
  let lastSig = "";
  let pendingSig = "";
  let pendingHits = 0;
  let note = null;

  const raycaster = new THREE.Raycaster();
  raycaster.far = 12;
  const hits = [];

  const clearBuilt = () => {
    chunks.splice(0).forEach((chunk) => root.remove(chunk));
    guides.clear();
    if (floor) {
      root.remove(floor);
      floor = null;
    }
  };

  const addGuide = (wall) => {
    const { width, height, origin, normal } = wall;
    const across = new THREE.Vector3(normal.z, 0, -normal.x).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const c = [
      origin.clone().addScaledVector(across, -width / 2),
      origin.clone().addScaledVector(across, width / 2),
      origin.clone().addScaledVector(across, width / 2).addScaledVector(up, height),
      origin.clone().addScaledVector(across, -width / 2).addScaledVector(up, height),
    ];
    const loop = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([...c, c[0]]),
      edgeMat(0.35),
    );
    guides.add(loop);
  };

  const buildWalls = (walls) => {
    clearBuilt();
    walls.forEach((wall) => {
      const { cols, rows } = gridFor(wall.width, wall.height);
      addWall(root, chunks, { ...wall, cols, rows });
      addGuide(wall);
    });
  };

  const buildFallback = (center) => {
    clearBuilt();
    root.position.set(center.x, 0, center.z);
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
    floor = new THREE.GridHelper(roomW, 16, 0x1a4a55, 0x0a2028);
    floor.position.y = 0.002;
    root.add(floor);
    floorY = 0.03;
  };

  const readWorld = (frame, referenceSpace, cameraPos) => {
    const walls = [];
    let foundFloor = null;
    const planes = frame.detectedPlanes;
    if (planes) {
      for (const plane of planes) {
        const matrix = poseMatrix(frame, plane.planeSpace, referenceSpace);
        if (!matrix || !plane.polygon?.length) {
          continue;
        }
        const pts = collectVertices(plane.polygon, matrix);
        const label = String(plane.semanticLabel || "").toLowerCase();
        if (plane.orientation === "horizontal" || label === "floor" || label === "ceiling") {
          if (label !== "ceiling" && pts.length) {
            const y = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
            if (foundFloor === null || y < foundFloor) {
              foundFloor = y;
            }
          }
          continue;
        }
        const wall = wallFromPoints(pts, cameraPos);
        if (wall) {
          walls.push(wall);
        }
      }
    }
    const meshes = frame.detectedMeshes;
    if (meshes && walls.length === 0) {
      for (const mesh of meshes) {
        const label = String(mesh.semanticLabel || "").toLowerCase().replace(/\s+/g, "");
        if (label === "floor" || label === "ceiling" || label === "globalmesh" || label === "global") {
          continue;
        }
        const matrix = poseMatrix(frame, mesh.meshSpace, referenceSpace);
        if (!matrix) {
          continue;
        }
        const pts = collectVertices(mesh.vertices, matrix);
        if (label && label !== "wall" && label !== "invisiblewall") {
          continue;
        }
        const wall = wallFromPoints(pts, cameraPos);
        if (wall) {
          walls.push(wall);
        }
      }
    }
    return { walls, floorY: foundFloor };
  };

  const adopt = (nextMode, walls, center, message) => {
    if (nextMode === "mapped") {
      root.position.set(0, 0, 0);
      buildWalls(walls);
    } else {
      buildFallback(center);
    }
    mode = nextMode;
    lastSig = nextMode === "mapped" ? signatureOf(walls) : "fallback";
    pendingSig = "";
    pendingHits = 0;
    note = message;
  };

  buildFallback(new THREE.Vector3());

  const knock = (chunk, _point, dir, force) => {
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
    get mode() {
      return mode;
    },
    consumeNote() {
      const next = note;
      note = null;
      return next;
    },
    beginSession() {
      wait = 0;
      mode = "pending";
      lastSig = "";
      pendingSig = "";
      pendingHits = 0;
      chunks.forEach((chunk) => {
        chunk.visible = false;
      });
      if (floor) {
        floor.visible = false;
      }
      guides.visible = false;
    },
    resetCenter() {
      wait = 0;
      mode = "preview";
      lastSig = "";
      root.position.set(0, 0, 0);
      floorY = 0.03;
      buildFallback(new THREE.Vector3());
    },
    sync(frame, referenceSpace, cameraPos, dt) {
      if (!frame || !referenceSpace) {
        wait += dt;
        if (mode === "pending" && wait >= FALLBACK_WAIT) {
          adopt("fallback", [], cameraPos, "ROOM FALLBACK  NO MESH");
        }
        return;
      }
      const world = readWorld(frame, referenceSpace, cameraPos);
      if (typeof world.floorY === "number") {
        floorY = world.floorY + 0.02;
      }
      if (world.walls.length > 0) {
        const sig = signatureOf(world.walls);
        if (mode === "mapped" && sig === lastSig) {
          pendingSig = "";
          pendingHits = 0;
          return;
        }
        if (sig === pendingSig) {
          pendingHits += 1;
        } else {
          pendingSig = sig;
          pendingHits = 1;
        }
        if (mode !== "mapped" || pendingHits >= 8) {
          adopt("mapped", world.walls, cameraPos, `ROOM MESH  ${world.walls.length} WALLS`);
        }
        return;
      }
      wait += dt;
      if (mode === "pending" && wait >= FALLBACK_WAIT) {
        adopt("fallback", [], cameraPos, "ROOM FALLBACK  NO MESH");
      }
    },
    blast(origin, dir) {
      raycaster.set(origin, dir.clone().normalize());
      hits.length = 0;
      const solids = chunks.filter((chunk) => chunk.visible).map((chunk) => chunk.userData.mesh);
      raycaster.intersectObjects(solids, false, hits);
      const first = hits[0];
      if (!first) {
        return null;
      }
      const epicenter = first.point.clone();
      let broken = 0;
      chunks.forEach((chunk) => {
        if (!chunk.visible) {
          return;
        }
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
      const settleY = floorY + (mode === "mapped" ? 0 : root.position.y);
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
        if (world.y < settleY) {
          chunk.position.y += settleY - world.y;
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
