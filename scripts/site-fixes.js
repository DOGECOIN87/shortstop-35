import * as THREE from '../vendor/three.module.js';
import { STOREFRONT } from './storefront.js';

// Sidewalk and yard corrections the owner marked on screenshots of the live
// page, applied to the detailed Blender model after it loads:
//
//   * the named red air/water cabinet is hidden directly; the old broad cut
//     also removed triangles from the merged walk and curb beneath it;
//   * the plain grey box beside the south corner is cut without cutting the
//     merged walk or curb surfaces;
//   * the model's loose propane bottles are replaced by a white mesh exchange
//     cabinet on the paved edge beside the car-wash-side tree island;
//   * the palm and restored streetlight stand on the grass island by the car wash.
//
// Everything here is in the storefront frame used by scripts/storefront.js:
// +X out of the storefront toward the pumps, +Z south along the front wall,
// Y up. Boxes are [x0, y0, z0, x1, y1, z1] in that frame.
// The cabinet footprint is on the striped concrete rectangle immediately
// outside the nearer island, beside accessible parking (not on the grass bed).
const PROPANE_AT = Object.freeze([16.5, -19.0]);
export const SITE_FIXES = Object.freeze({
  cutBoxes: Object.freeze([
    [9.50, 0.15, 10.80, 12.60, 2.20, 13.90]    // grey placeholder box, south corner
  ]),
  protectedCutMaterials: Object.freeze(['SS Walk concrete', 'SS Curb concrete']),
  // Model parts hidden because they are removed or replaced, including the
  // instanced loose propane bottles stacked against the south wall.
  hideMeshes: Object.freeze([/^Air_&_water_machine$/, /^Propane_tank/]),
  palm: Object.freeze({ at: [14.5, -31.5], height: 7.2 }), // farther island, by the car wash
  light: Object.freeze({ at: [11.5, -31.5], height: 8.1 }), // grass island beside the palm
  propane: Object.freeze({
    at: PROPANE_AT,       // striped concrete rectangle beside accessible parking
    // Aim the front toward the nearest I-35 pavement in the model, not just
    // perpendicular to the store facade (highway nearest point ≈ [71.56, 55.25]).
    rotation: Math.atan2(-(71.56 - PROPANE_AT[0]), -(55.25 - PROPANE_AT[1])),
    width: 1.72, depth: 0.98, height: 2.02
  })
});

/* ------------------------------------------------------------------ materials */
function canvasTexture(size, draw) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function materials(lampMaterial = null) {
  const mesh = canvasTexture(64, (c, w) => {
    c.clearRect(0, 0, w, w);
    c.strokeStyle = '#e9ecec';
    c.lineWidth = 3;
    for (let i = 0; i <= w; i += 16) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i, w); c.stroke();
      c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke();
    }
  });
  if (mesh) mesh.repeat.set(6, 3);
  const sign = canvasTexture(512, (c, w) => {
    c.fillStyle = '#f4f4f1'; c.fillRect(0, 0, w, w);
    c.fillStyle = '#1f2fa8'; c.fillRect(0, 0, w, w * 0.5);
    c.fillStyle = '#ffffff';
    c.font = 'bold 96px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('PROPANE', w / 2, w * 0.26);
    c.fillStyle = '#c8202c'; c.fillRect(0, w * 0.5, w, w * 0.06);
    c.fillStyle = '#12141a'; c.font = 'bold 74px Arial';
    c.fillText('$19.99', w / 2, w * 0.72);
    c.font = 'bold 40px Arial';
    c.fillText('EXCHANGE', w / 2, w * 0.88);
  });
  return {
    steel: new THREE.MeshStandardMaterial({ color: 0xd7dadb, roughness: 0.42, metalness: 0.55 }),
    mesh: new THREE.MeshStandardMaterial({
      map: mesh, color: 0xeceeee, roughness: 0.5, metalness: 0.4,
      transparent: !!mesh, alphaTest: mesh ? 0.3 : 0, side: THREE.DoubleSide
    }),
    bottle: new THREE.MeshStandardMaterial({ color: 0xe8e9e6, roughness: 0.38, metalness: 0.3 }),
    cap: new THREE.MeshStandardMaterial({ color: 0x5b5f63, roughness: 0.6, metalness: 0.4 }),
    sign: new THREE.MeshStandardMaterial({ map: sign, color: sign ? 0xffffff : 0xf0f0ec, roughness: 0.6 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x8a7256, roughness: 0.9 }),
    frond: new THREE.MeshStandardMaterial({ color: 0x3f7a33, roughness: 0.75, side: THREE.DoubleSide }),
    lightBase: new THREE.MeshStandardMaterial({ color: 0x85837b, roughness: 0.92 }),
    lamp: lampMaterial || new THREE.MeshStandardMaterial({
      color: 0xfff2cf, emissive: 0xffdf9e, emissiveIntensity: 0.15, roughness: 0.3
    })
  };
}

/* ---------------------------------------------------------------------- palm */
export function buildPalm({ height = 7, trunkMat, frondMat, seed = 1 }) {
  const g = new THREE.Group();
  g.name = 'Palm';
  // Trunk: rings of a gently leaning segmented cylinder.
  const segs = 9, r0 = 0.24, r1 = 0.15, lean = 0.36;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const y0 = t0 * height, y1 = t1 * height;
    const x0 = lean * t0 * t0, x1 = lean * t1 * t1;
    const r = r0 + (r1 - r0) * t0;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r, height / segs, 10, 1), trunkMat);
    seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    seg.rotation.z = Math.atan2(x1 - x0, y1 - y0);
    seg.castShadow = seg.receiveShadow = true;
    g.add(seg);
  }
  // Crown: long fronds arching out and down.
  const topX = lean, topY = height, frondCount = 11;
  for (let i = 0; i < frondCount; i++) {
    const a = (i / frondCount) * Math.PI * 2 + seed * 0.7;
    const len = height * (0.42 + ((i * 37) % 7) / 22);
    const droop = 0.55 + ((i * 53) % 5) / 12;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(len * 0.45, len * 0.16, len, -len * 0.28 * droop);
    shape.quadraticCurveTo(len * 0.5, len * 0.02, 0, -0.09);
    const leaf = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), frondMat);
    leaf.rotation.set(-0.12 - (i % 3) * 0.05, -a, 0, 'YXZ');
    leaf.position.set(topX, topY - 0.12 - (i % 2) * 0.16, 0);
    leaf.castShadow = true;
    g.add(leaf);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), trunkMat);
  crown.position.set(topX, topY - 0.1, 0);
  g.add(crown);
  return g;
}

/* ------------------------------------------------ grass-island streetlight */
export function buildGrassIslandLight({ height = 8.1, poleMat, baseMat, lensMat }) {
  const group = new THREE.Group();
  group.name = 'Car-wash-grass-island-light';
  const add = (mesh, name) => { mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh; };
  const footing = add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.28, 20), baseMat), 'Grass-island-light-concrete-footing');
  footing.position.y = 0.14;
  const shaftH = height - 0.28;
  const shaft = add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.105, shaftH, 16), poleMat), 'Grass-island-light-pole');
  shaft.position.y = 0.28 + shaftH / 2;
  const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.0, 10), poleMat), 'Grass-island-light-arm');
  arm.rotation.z = -Math.PI / 2;
  arm.position.set(0.42, height - 0.12, 0);
  const head = add(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.28), poleMat), 'Grass-island-light-head');
  head.position.set(0.88, height - 0.12, 0);
  const lens = add(new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.025, 0.20), lensMat), 'Grass-island-light-lens');
  lens.position.set(0.9, height - 0.19, 0);
  const light = new THREE.SpotLight(0xffe8bb, 0, 22, Math.PI / 4, 0.72, 2);
  light.name = 'Grass-island-light-source';
  light.position.set(0.9, height - 0.2, 0);
  light.target.position.set(1.4, 0.02, 0);
  light.castShadow = false;
  group.add(light, light.target);
  return { group, light };
}

/* ----------------------------------------------------- propane exchange cage */
// A white steel mesh cabinet: corner posts, rails, mesh panels on three sides,
// a door on the front, a branded header over it and six 20 lb bottles inside.
// Built centred on the origin with its front facing -Z, base at y = 0.
export function buildPropaneCabinet(width = 1.72, depth = 0.98, height = 2.02, mats) {
  const g = new THREE.Group();
  g.name = 'Propane-exchange-cabinet';
  const hw = width / 2, hd = depth / 2;
  const bodyH = height - 0.42, rail = 0.045;
  const add = (mesh, name) => { mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };
  const box = (name, [x0, y0, z0, x1, y1, z1], mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, name);
  };
  // Frame.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box('cage-post', [sx * hw - 0.035, 0.03, sz * hd - 0.035, sx * hw + 0.035, bodyH, sz * hd + 0.035], mats.steel);
  }
  for (const y of [0.03, bodyH * 0.52, bodyH - rail]) {
    box('cage-rail', [-hw - 0.03, y, -hd - 0.03, hw + 0.03, y + rail, -hd + 0.03], mats.steel);
    box('cage-rail', [-hw - 0.03, y, hd - 0.03, hw + 0.03, y + rail, hd + 0.03], mats.steel);
    box('cage-rail', [-hw - 0.03, y, -hd - 0.03, -hw + 0.03, y + rail, hd + 0.03], mats.steel);
    box('cage-rail', [hw - 0.03, y, -hd - 0.03, hw + 0.03, y + rail, hd + 0.03], mats.steel);
  }
  // Mesh panels: back, both sides and the door.
  const panel = (name, w, h, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mats.mesh);
    m.position.set(x, y, z); m.rotation.y = ry;
    return add(m, name);
  };
  const panelH = bodyH - 0.12, panelY = bodyH / 2;
  panel('cage-mesh-back', width - 0.1, panelH, 0, panelY, hd - 0.02, 0);
  panel('cage-mesh-left', depth - 0.1, panelH, -hw + 0.02, panelY, 0, Math.PI / 2);
  panel('cage-mesh-right', depth - 0.1, panelH, hw - 0.02, panelY, 0, Math.PI / 2);
  panel('cage-mesh-door', width * 0.46, panelH, -width * 0.245, panelY, -hd + 0.02, 0);
  panel('cage-mesh-door', width * 0.46, panelH, width * 0.245, panelY, -hd + 0.02, 0);
  // Header over the door.
  box('cage-header', [-hw - 0.04, bodyH, -hd - 0.06, hw + 0.04, height, hd + 0.04], mats.steel);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.06, height - bodyH - 0.04), mats.sign);
  face.name = 'cage-header-sign';
  face.position.set(0, (bodyH + height) / 2, -hd - 0.07);
  face.rotation.y = Math.PI;
  face.castShadow = true;
  g.add(face);
  // Six bottles: two rows of three, as the exchange racks are loaded.
  const rows = Math.ceil(6 / 3), perRow = 3;
  for (let r = 0; r < rows; r++) for (let i = 0; i < perRow; i++) {
    const x = (i - (perRow - 1) / 2) * (width - 0.42) / (perRow - 1);
    const z = (r - (rows - 1) / 2) * (depth - 0.42) / Math.max(rows - 1, 1);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.62, 14), mats.bottle);
    b.position.set(x, 0.34, z); b.castShadow = b.receiveShadow = true;
    g.add(b);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.11, 10), mats.cap);
    collar.position.set(x, 0.7, z); collar.castShadow = true;
    g.add(collar);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14), mats.cap);
    skirt.position.set(x, 0.045, z);
    g.add(skirt);
  }
  return g;
}

/* ------------------------------------------------------------ model surgery */
// Drop triangles whose three corners all lie inside one of the boxes. The
// remaining vertices are shared, so the mesh keeps its UVs and normals.
export function cutMesh(mesh, frame, boxes) {
  const g = mesh.geometry, pos = g?.attributes?.position;
  if (!pos) return 0;
  const m = new THREE.Matrix4().multiplyMatrices(frame, mesh.matrixWorld);
  if (!g.boundingBox) g.computeBoundingBox();
  const bb = g.boundingBox.clone().applyMatrix4(m);
  if (!boxes.some(b => bb.max.x >= b[0] && bb.min.x <= b[3] && bb.max.y >= b[1] && bb.min.y <= b[4] && bb.max.z >= b[2] && bb.min.z <= b[5])) return 0;
  const inside = new Uint8Array(pos.count), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m);
    for (let k = 0; k < boxes.length; k++) {
      const b = boxes[k];
      if (v.x >= b[0] && v.x <= b[3] && v.y >= b[1] && v.y <= b[4] && v.z >= b[2] && v.z <= b[5]) { inside[i] = k + 1; break; }
    }
  }
  const index = g.index ? g.index.array : null;
  const tris = (index ? index.length : pos.count) / 3, kept = [];
  let removed = 0;
  for (let t = 0; t < tris; t++) {
    const a = index ? index[t * 3] : t * 3, b = index ? index[t * 3 + 1] : t * 3 + 1, c = index ? index[t * 3 + 2] : t * 3 + 2;
    if (inside[a] && inside[a] === inside[b] && inside[a] === inside[c]) removed++;
    else kept.push(a, b, c);
  }
  if (!removed) return 0;
  const cut = new THREE.BufferGeometry(); // same vertex data, new index
  for (const [name, attr] of Object.entries(g.attributes)) cut.setAttribute(name, attr);
  cut.setIndex(kept);
  cut.boundingBox = g.boundingBox; cut.boundingSphere = g.boundingSphere;
  mesh.geometry = cut;
  return removed;
}

// True when `o` sits under one of the named ancestor groups (our own props and
// the rebuilt storefront are never cut or used as ground).
function under(o, names) {
  for (let p = o; p; p = p.parent) if (names.includes(p.name)) return true;
  return false;
}

// Height of the model's surface at a store-frame point, or null off the mesh.
export function groundHeightAt(root, toWorld, x, z, from = 6) {
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3(x, from, z).applyMatrix4(toWorld);
  ray.set(origin, new THREE.Vector3(0, -1, 0));
  ray.far = from + 4;
  const targets = [];
  root.traverse(o => {
    if (!o.isMesh || !o.visible || o.isInstancedMesh) return;
    if (/car/i.test(o.name || '') || under(o, ['Site-fixes', 'FoodMart-storefront'])) return;
    targets.push(o);
  });
  const hit = ray.intersectObjects(targets, false)[0];
  if (!hit) return null;
  return hit.point.clone().applyMatrix4(toWorld.clone().invert()).y;
}

/* ------------------------------------------------------------------- public */
// Apply every fix to the loaded glTF root. Returns a summary for the console.
export function applySiteFixes(root, { frame, lampMaterial } = {}) {
  root.updateMatrixWorld(true);
  const storeFrame = frame || new THREE.Matrix4().makeRotationY(-STOREFRONT.heading);
  // store frame -> world, for the ground raycasts; props themselves are built
  // in the store frame and turned by the group's heading below.
  const toWorld = new THREE.Matrix4().multiplyMatrices(root.matrixWorld, new THREE.Matrix4().copy(storeFrame).invert());
  const cutFrame = new THREE.Matrix4().multiplyMatrices(storeFrame, root.matrixWorld.clone().invert());
  const F = SITE_FIXES, mats = materials(lampMaterial);
  let cut = 0, hidden = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    if (F.hideMeshes.some(re => re.test(o.name || ''))) { o.visible = false; hidden++; return; }
    if (o.isInstancedMesh || /car/i.test(o.name || '')) return;
    if (under(o, ['FoodMart-storefront'])) return;
    if (F.protectedCutMaterials.includes(o.material?.name || '')) return;
    cut += cutMesh(o, cutFrame, F.cutBoxes);
  });

  const added = new THREE.Group();
  added.name = 'Site-fixes';
  added.rotation.y = STOREFRONT.heading; // built in the store frame
  root.add(added);
  root.updateMatrixWorld(true);

  const groundAt = (x, z) => {
    const y = groundHeightAt(root, toWorld, x, z);
    return Number.isFinite(y) ? y : STOREFRONT.walkY;
  };

  const palm = buildPalm({ height: F.palm.height, trunkMat: mats.trunk, frondMat: mats.frond, seed: 2 });
  palm.position.set(F.palm.at[0], groundAt(F.palm.at[0], F.palm.at[1]) - 0.05, F.palm.at[1]);
  added.add(palm);

  const islandLight = buildGrassIslandLight({ height: F.light.height, poleMat: mats.steel, baseMat: mats.lightBase, lensMat: mats.lamp });
  islandLight.group.position.set(F.light.at[0], groundAt(F.light.at[0], F.light.at[1]) - 0.02, F.light.at[1]);
  added.add(islandLight.group);

  const cage = buildPropaneCabinet(F.propane.width, F.propane.depth, F.propane.height, mats);
  cage.position.set(F.propane.at[0], groundAt(F.propane.at[0], F.propane.at[1]) - 0.02, F.propane.at[1]);
  cage.rotation.y = F.propane.rotation;
  added.add(cage);

  root.updateMatrixWorld(true);
  return { cut, hidden, props: added.children.length, lights: [islandLight.light] };
}
