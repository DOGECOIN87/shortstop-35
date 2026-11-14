import * as THREE from '../vendor/three.module.js';
import { STOREFRONT } from './storefront.js';
import { WASH } from './car-wash.js';
import { buildGrassIslandLight, buildShrub } from './site-fixes.js';

// The yard between the store's north-east corner, the van-accessible stall,
// the propane island and the car wash, from the owner's night photos
// (Nov 2026). The detailed model paints the whole stall blue and leaves this
// area as plain lot concrete; the photos show:
//
//   * a walk running north from the storefront walk to the car wash, with a
//     red stamped-brick curb ramp where the van-accessible aisle meets it;
//   * a short walk west from that corner along the store's north lawn strip;
//   * a lawn between the two walks holding a twin-head pole light on a tall
//     round concrete base, the "Parking Only / Van Accessible" sign post and a
//     ROGUE nicotine-pouch stake sign;
//   * the aisle as a bold white outline with diagonal stripes, the stall as
//     bare concrete with a blue square and white wheelchair symbol;
//   * a white hatched trapezoid crossing the drive from the walk's end to the
//     car wash's sidewalk, between its two red pads.
//
// Storefront frame (scripts/storefront.js): +X out of the storefront toward
// the pumps, +Z south, Y up. Points on the car-wash side are given in the
// car-wash frame (scripts/car-wash.js) and converted. Sizes are estimates
// from the photos; positions follow the model's store, island and car wash.
const WASH_TO_STORE = WASH.heading - STOREFRONT.heading;
export function washToStore([wx, wz]) {
  const c = Math.cos(WASH_TO_STORE), s = Math.sin(WASH_TO_STORE);
  return [wx * c + wz * s, -wx * s + wz * c];
}
export function storeToWash([x, z]) {
  const c = Math.cos(WASH_TO_STORE), s = Math.sin(WASH_TO_STORE);
  return [x * c - z * s, x * s + z * c];
}

// Car-wash sidewalk outer curb (wash x) and the drive in front of it.
const CURB_WX = -8.37, DRIVE = 4.0, LAWN_WX = CURB_WX + DRIVE;
// Store-frame z where the line wash x = LAWN_WX crosses store x.
const driveEdgeZ = x => { const c = Math.cos(WASH_TO_STORE), s = Math.sin(WASH_TO_STORE); return (LAWN_WX - x * c) / -s; };
const driveEdgeX = z => { const c = Math.cos(WASH_TO_STORE), s = Math.sin(WASH_TO_STORE); return (LAWN_WX + z * s) / c; };

const WALK_X = [10.05, 12.05];       // north walk: continues the storefront walk
const JUNCTION_Z = -14.95;           // where it leaves the storefront walk
const WEST_WALK_Z = [-15.05, -13.55]; // west walk, outside the north lawn strip's curb
const AISLE = Object.freeze({ x: [12.1, 17.5], z: [-16.45, -14.15] });
const STALL = Object.freeze({ x: [12.1, 17.5], z: [-14.15, -11.5] });
const RAMP_Z = [AISLE.z[0] + 0.1, AISLE.z[1] - 0.1];

export const NORTH_YARD = Object.freeze({
  walkX: WALK_X, junctionZ: JUNCTION_Z, westWalkZ: WEST_WALK_Z,
  aisle: AISLE, stall: STALL, rampZ: RAMP_Z,
  drive: DRIVE, curbWashX: CURB_WX,
  walkHeight: 0.152, rampHeight: 0.02, lawnHeight: 0.12,
  // north walk: from the junction to the drive edge (cut on the drive's line)
  northWalk: Object.freeze([[WALK_X[0], JUNCTION_Z], [WALK_X[1], JUNCTION_Z], [WALK_X[1], driveEdgeZ(WALK_X[1])], [WALK_X[0], driveEdgeZ(WALK_X[0])]]),
  westWalk: Object.freeze([[WALK_X[0], WEST_WALK_Z[1]], [WALK_X[0], WEST_WALK_Z[0]], [driveEdgeX(WEST_WALK_Z[0]), WEST_WALK_Z[0]], [driveEdgeX(WEST_WALK_Z[1]), WEST_WALK_Z[1]]]),
  lawn: Object.freeze([[WALK_X[0] - 0.02, WEST_WALK_Z[0] - 0.02], [WALK_X[0] - 0.02, driveEdgeZ(WALK_X[0] - 0.02) + 0.06], [driveEdgeX(WEST_WALK_Z[0] - 0.02) + 0.06, WEST_WALK_Z[0] - 0.02]]),
  // trapezoid (wash frame): narrow end on the curb between the red pads,
  // wide end on the walk's end; the ENTER-side edge square to the wall
  crossingWash: Object.freeze((() => {
    const w = storeToWash([WALK_X[0], driveEdgeZ(WALK_X[0])]), e = storeToWash([WALK_X[1], driveEdgeZ(WALK_X[1])]);
    return [[CURB_WX, w[1]], w, e, [CURB_WX, w[1] - 1.52]];
  })()),
  pole: Object.freeze({ at: [9.35, -16.5], height: 8.6 }),
  signPost: Object.freeze({ at: [9.3, -15.75], facing: [0.89, 0.45] }),
  rogue: Object.freeze({ at: [9.5, -15.4], facing: [0.69, 0.72] }),
  bush: Object.freeze([8.25, -15.45])
});
const Y = NORTH_YARD;

/* ---------------------------------------------------------- polygon helpers */
// Clip a polygon to a convex polygon (Sutherland-Hodgman). Both CCW or both
// CW; points are [x, z].
function clip(subject, window) {
  let out = subject;
  const n = window.length, area = signedArea(window);
  for (let i = 0; i < n && out.length; i++) {
    const a = window[i], b = window[(i + 1) % n];
    const inside = p => ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) * area >= 0;
    const cut = (p, q) => {
      const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
      const t = d1 / (d1 - d2);
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    };
    const input = out; out = [];
    for (let k = 0; k < input.length; k++) {
      const p = input[k], q = input[(k + 1) % input.length];
      if (inside(q)) { if (!inside(p)) out.push(cut(p, q)); out.push(q); }
      else if (inside(p)) out.push(cut(p, q));
    }
  }
  return out;
}
function signedArea(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
export function polygonArea(poly) { return Math.abs(signedArea(poly)); }
export function insidePolygon([x, z], poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], c = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]);
    if (Math.abs(c) < 1e-9) continue;
    if (!s) s = Math.sign(c); else if (Math.sign(c) !== s) return false;
  }
  return true;
}

// Top surface of a convex polygon on a grid (so it follows the ground), with
// its vertical edge faces down to `bottom(x, z)`. Returns { top, sides }.
function slabGeometry(poly, height, { step = 0.5, bottom = null, uv = null } = {}) {
  const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const pos = [], uvs = [], idx = [];
  const push = ([x, z]) => { pos.push(x, height(x, z), z); const t = uv ? uv(x, z) : [z, x]; uvs.push(t[0], t[1]); return pos.length / 3 - 1; };
  for (let x = x0; x < x1 - 1e-6; x += step) for (let z = z0; z < z1 - 1e-6; z += step) {
    const cell = [[x, z], [x, Math.min(z + step, z1)], [Math.min(x + step, x1), Math.min(z + step, z1)], [Math.min(x + step, x1), z]];
    const piece = clip(cell, poly).filter((q, k, a) => { const r = a[(k + a.length - 1) % a.length]; return k === 0 ? Math.hypot(q[0] - a[a.length - 1][0], q[1] - a[a.length - 1][1]) > 1e-5 : Math.hypot(q[0] - r[0], q[1] - r[1]) > 1e-5; });
    if (piece.length < 3 || polygonArea(piece) < 1e-6) continue;
    const ids = piece.map(push);
    // faces up: (x, z) cell corners above run clockwise seen from above
    for (let k = 1; k < ids.length - 1; k++) idx.push(ids[0], ids[k], ids[k + 1]);
  }
  const top = new THREE.BufferGeometry();
  top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  top.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  top.setIndex(idx); fixWinding(top, 1); top.computeVertexNormals();
  let sides = null;
  if (bottom) {
    const sp = [], si = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / step));
      for (let k = 0; k < n; k++) {
        const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], q = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n];
        const base = sp.length / 3;
        sp.push(p[0], height(...p), p[1], q[0], height(...q), q[1], q[0], bottom(...q), q[1], p[0], bottom(...p), p[1]);
        si.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    sides = new THREE.BufferGeometry();
    sides.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sides.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(sp.length / 3 * 2), 2));
    sides.setIndex(si); sides.computeVertexNormals();
  }
  return { top, sides };
}
// Make every triangle face up (sign = 1) regardless of the clip order.
function fixWinding(g, sign) {
  const p = g.attributes.position, ix = g.index.array, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < ix.length; t += 3) {
    a.fromBufferAttribute(p, ix[t]); b.fromBufferAttribute(p, ix[t + 1]); c.fromBufferAttribute(p, ix[t + 2]);
    const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
    if (ny * sign < 0) { const k = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = k; }
  }
}

/* --------------------------------------------------------- ground heights */
// Height field of the model's upward surfaces over a store-frame box, so the
// new pieces follow the lot's slope without hundreds of raycasts.
export function heightField(root, toStore, [x0, z0, x1, z1], step = 0.25, { skip = [], skipMaterials = [], maxY = 1.6 } = {}) {
  const nx = Math.ceil((x1 - x0) / step) + 1, nz = Math.ceil((z1 - z0) / step) + 1;
  const h = new Float32Array(nx * nz).fill(NaN);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Matrix4();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
    for (let p = o; p; p = p.parent) if (skip.includes(p.name)) return;
    if (/car/i.test(o.name || '') && !/^car_wash/i.test(o.name || '')) return;
    if (skipMaterials.includes(o.material?.name)) return; // walk and curb tops are not ground
    const g = o.geometry, pos = g?.attributes?.position;
    if (!pos) return;
    m.multiplyMatrices(toStore, o.matrixWorld);
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox.clone().applyMatrix4(m);
    if (bb.max.x < x0 || bb.min.x > x1 || bb.max.z < z0 || bb.min.z > z1) return;
    const ix = g.index ? g.index.array : null, tris = (ix ? ix.length : pos.count) / 3;
    for (let t = 0; t < tris; t++) {
      a.fromBufferAttribute(pos, ix ? ix[t * 3] : t * 3).applyMatrix4(m);
      b.fromBufferAttribute(pos, ix ? ix[t * 3 + 1] : t * 3 + 1).applyMatrix4(m);
      c.fromBufferAttribute(pos, ix ? ix[t * 3 + 2] : t * 3 + 2).applyMatrix4(m);
      const tx0 = Math.min(a.x, b.x, c.x), tx1 = Math.max(a.x, b.x, c.x), tz0 = Math.min(a.z, b.z, c.z), tz1 = Math.max(a.z, b.z, c.z);
      if (tx1 < x0 || tx0 > x1 || tz1 < z0 || tz0 > z1) continue;
      const d = (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z);
      if (Math.abs(d) < 1e-9) continue;
      // upward-facing only
      const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z), len = Math.hypot(
        (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y), ny, (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
      if (Math.abs(ny) < 0.7 * len) continue;
      const i0 = Math.max(0, Math.ceil((tx0 - x0) / step)), i1 = Math.min(nx - 1, Math.floor((tx1 - x0) / step));
      const j0 = Math.max(0, Math.ceil((tz0 - z0) / step)), j1 = Math.min(nz - 1, Math.floor((tz1 - z0) / step));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const px = x0 + i * step, pz = z0 + j * step;
        const w1 = ((b.x - px) * (c.z - pz) - (c.x - px) * (b.z - pz)) / d, w2 = ((c.x - px) * (a.z - pz) - (a.x - px) * (c.z - pz)) / d, w3 = 1 - w1 - w2;
        if (w1 < -1e-6 || w2 < -1e-6 || w3 < -1e-6) continue;
        const y = w1 * a.y + w2 * b.y + w3 * c.y;
        if (y > maxY) continue;
        const k = i * nz + j;
        if (!(h[k] >= y)) h[k] = y;
      }
    }
  });
  const at = (i, j) => h[Math.min(nx - 1, Math.max(0, i)) * nz + Math.min(nz - 1, Math.max(0, j))];
  // Bilinear lookup; holes borrow the nearest found neighbour.
  return (x, z, fallback = STOREFRONT.walkY) => {
    const fx = (x - x0) / step, fz = (z - z0) / step, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const v = [[at(i, j), (1 - tx) * (1 - tz)], [at(i + 1, j), tx * (1 - tz)], [at(i, j + 1), (1 - tx) * tz], [at(i + 1, j + 1), tx * tz]];
    let s = 0, w = 0;
    for (const [y, k] of v) if (Number.isFinite(y)) { s += y * k; w += k; }
    if (w > 0) return s / w;
    for (let r = 1; r < 8; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { const y = at(i + di, j + dj); if (Number.isFinite(y)) return y; }
    return fallback;
  };
}

/* ---------------------------------------------------------------- textures */
function canvas(w, h, draw) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
// Red stamped-concrete running-bond brick (photos), 1 texture tile = 0.6 m.
function drawRedBrick(c, w, h) {
  c.fillStyle = '#b3232c'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { c.fillStyle = i % 3 ? 'rgba(255,120,120,0.10)' : 'rgba(60,0,0,0.14)'; c.fillRect((i * 37) % w, (i * 61) % h, 2, 2); }
  c.strokeStyle = 'rgba(70,6,10,0.55)'; c.lineWidth = 2;
  const rows = 8, bw = w / 2;
  for (let r = 0; r <= rows; r++) { c.beginPath(); c.moveTo(0, r * h / rows); c.lineTo(w, r * h / rows); c.stroke(); }
  for (let r = 0; r < rows; r++) for (let k = 0; k <= 2; k++) { const x = k * bw + (r % 2) * bw / 2; c.beginPath(); c.moveTo(x, r * h / rows); c.lineTo(x, (r + 1) * h / rows); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(0, 0, w, h);
}
// International symbol of access on a blue square.
export function drawAccessSymbol(c, w, h) {
  c.fillStyle = '#2f62c8'; c.fillRect(0, 0, w, h);
  accessGlyph(c, w / 256);
}
// The white wheelchair figure alone, in a 256-unit box scaled by s.
function accessGlyph(c, s) {
  c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.arc(118 * s, 52 * s, 17 * s, 0, Math.PI * 2); c.fill();                // head
  c.lineWidth = 20 * s; c.beginPath(); c.moveTo(112 * s, 82 * s); c.lineTo(104 * s, 150 * s); c.lineTo(164 * s, 150 * s); c.lineTo(186 * s, 200 * s); c.stroke(); // body, seat, leg
  c.beginPath(); c.moveTo(108 * s, 112 * s); c.lineTo(152 * s, 112 * s); c.stroke();     // arm
  c.lineWidth = 16 * s; c.beginPath(); c.arc(108 * s, 170 * s, 48 * s, -1.0, Math.PI * 1.25); c.stroke(); // wheel
}
function drawSignPlate(c, w, h) {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#2257b8'; c.fillRect(8, 8, w - 16, h * 0.74 - 8);
  c.save(); c.translate(w / 2 - 50, 22); accessGlyph(c, 0.4); c.restore();
  c.fillStyle = '#ffffff'; c.font = 'bold 30px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('PARKING', w / 2, h * 0.5); c.fillText('ONLY', w / 2, h * 0.62);
  c.fillStyle = '#ffffff'; c.fillRect(8, h * 0.76, w - 16, h * 0.22);
  c.strokeStyle = '#1f7a45'; c.lineWidth = 5; c.strokeRect(14, h * 0.77, w - 28, h * 0.2);
  c.fillStyle = '#1f7a45'; c.font = 'bold 24px Arial'; c.fillText('VAN', w / 2, h * 0.83); c.fillText('ACCESSIBLE', w / 2, h * 0.93);
}
function drawRogue(c, w, h) {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#111'; c.font = '20px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  ['WARNING: This product', 'contains nicotine. Nicotine', 'is an addictive chemical.'].forEach((t, i) => c.fillText(t, w / 2, 26 + i * 24));
  c.fillStyle = '#3fb4c4'; c.fillRect(0, 104, w, 240);
  c.fillStyle = '#123a44'; c.font = 'bold 52px Arial'; c.textAlign = 'left';
  ['BOLDER.', 'BIGGER.', 'BETTER.'].forEach((t, i) => c.fillText(t, 14, 140 + i * 56));
  c.font = 'bold 24px Arial'; c.fillStyle = '#123a44'; c.fillText('NICOTINE POUCHES', 14, 320);
  c.fillStyle = '#16181a'; c.fillRect(0, 344, w, h - 344);
  c.fillStyle = '#ffffff'; c.font = 'bold 46px Arial'; c.fillText('GO ROGUE.', 14, 384);
  c.fillStyle = '#9aa3a8'; c.fillRect(10, 414, 120, 90);
  c.fillStyle = '#3fb4c4'; c.beginPath(); c.arc(w * 0.62, 470, 62, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#123a44'; c.font = 'bold 34px Arial'; c.textAlign = 'center'; c.fillText('ROGUE', w * 0.62, 470);
}

/* ------------------------------------------------------------------ build */
// `ground(x, z)` gives the model surface height at a store-frame point;
// `mats.grass` is the model's lawn material (palette); `lawnUV` its palette cell.
export function buildNorthYard({ ground, mats = {}, lawnUV = [0.707, 0.707] }) {
  const group = new THREE.Group();
  group.name = 'North-yard';
  group.rotation.y = STOREFRONT.heading;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // Named like the model's paving so scripts/pavement.js gives them the same
  // finish and joint grid as the existing walks and curbs.
  const walkMat = mats.walk || std({ name: 'SS Walk concrete', color: 0xc9c3b8, roughness: 0.85, side: THREE.DoubleSide });
  const curbMat = mats.curb || std({ name: 'SS Curb concrete', color: 0xbdb6a8, roughness: 0.9, side: THREE.DoubleSide });
  const grassMat = mats.grass || std({ color: 0x5f6e3c, roughness: 0.95 });
  const paint = (color, extra = {}) => std({ color, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, ...extra });
  const white = paint(0xf2f1ec);
  const add = (geo, mat, name, shadow = false) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.receiveShadow = true; m.castShadow = shadow; group.add(m); return m; };
  const below = (x, z) => ground(x, z) - 0.03;

  // ---- north walk with the curb ramp at the aisle ----
  const rampH = z => {
    const [r0, r1] = Y.rampZ, f = 0.7;
    if (z >= r0 && z <= r1) return Y.rampHeight;
    const t = z > r1 ? (z - r1) / f : (r0 - z) / f;
    return Y.rampHeight + (Y.walkHeight - Y.rampHeight) * Math.min(1, t);
  };
  const walkTop = (x, z) => ground(x, z) + rampH(z);
  const nw = slabGeometry(Y.northWalk, walkTop, { step: 0.35, bottom: below });
  add(nw.top, walkMat, 'North-walk'); add(nw.sides, walkMat, 'North-walk-edge');
  const rampPoly = [[Y.walkX[0] + 0.04, Y.rampZ[0]], [Y.walkX[1] - 0.04, Y.rampZ[0]], [Y.walkX[1] - 0.04, Y.rampZ[1]], [Y.walkX[0] + 0.04, Y.rampZ[1]]];
  const brick = canvas(256, 256, drawRedBrick);
  const ramp = slabGeometry(rampPoly, (x, z) => walkTop(x, z) + 0.004, { step: 0.35, uv: (x, z) => [z / 0.6, x / 0.6] });
  add(ramp.top, paint(brick ? 0xffffff : 0xb3232c, { map: brick, roughness: 0.7 }), 'Red-stamped-curb-ramp');

  // ---- west walk along the north lawn strip ----
  const ww = slabGeometry(Y.westWalk, (x, z) => ground(x, z) + Y.walkHeight, { step: 0.35, bottom: below });
  add(ww.top, walkMat, 'West-walk'); add(ww.sides, walkMat, 'West-walk-edge');

  // ---- lawn between the walks ----
  const lawn = slabGeometry(Y.lawn, (x, z) => ground(x, z) + Y.lawnHeight, { step: 0.35, bottom: below, uv: () => lawnUV });
  add(lawn.top, grassMat, 'Corner-lawn'); add(lawn.sides, curbMat, 'Corner-lawn-curb');

  // ---- van-accessible aisle: outline and diagonal stripes ----
  const lineW = 0.1, at = (x, z) => ground(x, z) + 0.006;
  const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const [ax0, ax1] = Y.aisle.x, [az0, az1] = Y.aisle.z;
  const stripe = (poly, name, mat = white) => { const s = slabGeometry(poly, at, { step: 0.5 }); add(s.top, mat, name); };
  stripe(rect(ax0, az0, ax1, az0 + lineW), 'Aisle-outline');
  stripe(rect(ax0, az1 - lineW, ax1, az1), 'Aisle-outline');
  stripe(rect(ax1 - lineW, az0, ax1, az1), 'Aisle-outline');
  const inner = rect(ax0, az0 + lineW, ax1 - lineW, az1 - lineW);
  for (let k = 0; ax0 + k * 0.9 - (az1 - az0) < ax1; k++) {
    const x = ax0 + 0.35 + k * 0.9; // 45-degree bands, ~0.9 m apart (photos)
    const band = [[x, az0], [x + 0.13, az0], [x + 0.13 + (az1 - az0), az1], [x + (az1 - az0), az1]];
    const piece = clip(band, inner);
    if (piece.length >= 3 && polygonArea(piece) > 0.01) stripe(piece, 'Aisle-stripe');
  }
  // stall: far line and the blue symbol square near its open end
  stripe(rect(Y.stall.x[0], Y.stall.z[1] - lineW, Y.stall.x[1], Y.stall.z[1]), 'Stall-line');
  const isa = canvas(256, 256, drawAccessSymbol);
  const size = 1.4, sx1 = Y.stall.x[1] - 0.6, sx0 = sx1 - size, szc = (Y.stall.z[0] + Y.stall.z[1]) / 2, sz0 = szc - size / 2, sz1 = szc + size / 2;
  // read from the open end of the stall: texture up toward the store (-x)
  const sym = slabGeometry(rect(sx0, sz0, sx1, sz1), at, { step: 0.35, uv: (x, z) => [(sz1 - z) / size, (sx1 - x) / size] });
  add(sym.top, paint(isa ? 0xffffff : 0x2f62c8, { map: isa }), 'Accessible-symbol');

  // ---- hatched crossing from the walk's end to the car wash sidewalk ----
  const toS = p => washToStore(p);
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
  for (const [i, j] of edges) {
    const a = Y.crossingWash[i], b = Y.crossingWash[j], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = [-(b[1] - a[1]) / len * lineW / 2, (b[0] - a[0]) / len * lineW / 2];
    stripe([[a[0] - n[0], a[1] - n[1]], [b[0] - n[0], b[1] - n[1]], [b[0] + n[0], b[1] + n[1]], [a[0] + n[0], a[1] + n[1]]].map(toS), 'Crossing-outline');
  }
  for (const t of [0.3, 0.55, 0.8]) { // three diagonal stripes (photo of the car-wash side)
    const wx = Y.curbWashX + Y.drive * t, band = [[wx - 0.9, -24.5], [wx - 0.78, -24.5], [wx + 0.92, -19.2], [wx + 0.8, -19.2]];
    const piece = clip(band, Y.crossingWash);
    if (piece.length >= 3 && polygonArea(piece) > 0.01) stripe(piece.map(toS), 'Crossing-stripe');
  }

  // ---- props in the lawn ----
  const steel = std({ color: 0x9da3a7, roughness: 0.45, metalness: 0.6 });
  const poleMats = { poleMat: std({ color: 0x1e2023, roughness: 0.5, metalness: 0.45 }), baseMat: std({ color: 0xbab6aa, roughness: 0.92 }), lensMat: mats.lamp || std({ color: 0xfff2cf, emissive: 0xffdf9e, emissiveIntensity: 0.15 }) };
  const pole = buildGrassIslandLight({ height: Y.pole.height, ...poleMats });
  pole.group.name = 'Lawn-twin-pole-light';
  pole.group.position.set(Y.pole.at[0], ground(...Y.pole.at) + Y.lawnHeight - 0.05, Y.pole.at[1]);
  pole.group.rotation.y = Math.PI / 2; // heads either side along the walk
  group.add(pole.group);

  const face = (dir) => Math.atan2(dir[0], dir[1]); // rotation.y that turns +Z toward dir
  const post = new THREE.Group(); post.name = 'Van-accessible-sign'; group.add(post);
  post.position.set(Y.signPost.at[0], ground(...Y.signPost.at) + Y.lawnHeight, Y.signPost.at[1]);
  post.rotation.y = face(Y.signPost.facing);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 10), steel); p.position.y = 1.2; p.castShadow = true; post.add(p);
  const plate = canvas(240, 400, drawSignPlate);
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.53), std({ map: plate, color: plate ? 0xffffff : 0x2257b8, roughness: 0.5, side: THREE.DoubleSide }));
  signM.position.set(0, 2.05, 0.035); signM.castShadow = true; signM.name = 'Van-accessible-sign-plate'; post.add(signM);

  const rogue = new THREE.Group(); rogue.name = 'ROGUE-stake-sign'; group.add(rogue);
  rogue.position.set(Y.rogue.at[0], ground(...Y.rogue.at) + Y.lawnHeight, Y.rogue.at[1]);
  rogue.rotation.y = face(Y.rogue.facing);
  for (const x of [-0.2, 0.2]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 6), steel); st.position.set(x, 0.2, -0.01); rogue.add(st); }
  const rt = canvas(300, 520, drawRogue);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 1.0), std({ map: rt, color: rt ? 0xffffff : 0x3fb4c4, roughness: 0.55, side: THREE.DoubleSide }));
  board.position.y = 0.82; board.castShadow = true; board.name = 'ROGUE-board'; rogue.add(board);

  const bush = buildShrub({ shrub: std({ color: 0x4a6e3a, roughness: 0.9, flatShading: true }) }, 4);
  bush.name = 'Lawn-shrub'; bush.scale.setScalar(0.75);
  bush.position.set(Y.bush[0], ground(...Y.bush) + Y.lawnHeight - 0.05, Y.bush[1]);
  group.add(bush);

  return { group, lights: [pole.light] };
}
