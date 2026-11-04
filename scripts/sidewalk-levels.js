import * as THREE from '../vendor/three.module.js';

// Sidewalk and curb levels for the detailed Blender model (assets/web-station/
// shortstop_detailed.glb), corrected when the page loads.
//
// Measured in the model (Nov 2026): the raised curb borders stood ~0.5 m above
// the ground (lawns sit at grade, ~0.5 m below the curb tops), and walks were
// anywhere from level with the ground to ~0.4 m above it. The fix:
//  1. Walks: every part stands 6 in (0.152 m) above the ground at its nearest
//     edge, so each edge drops about 6 in (walks tilt with a cross-slope).
//     Walks against the store stay level with the door thresholds.
//  2. Curbs: borders along a walk are flush with the walk; every other raised
//     border (around lawns, islands) comes down to 6 in above the lower ground
//     beside it, or flush with the higher side where the ground steps across
//     it (it never drops below ground it holds back). Only ever lowered there.
// Lawns, roads, buildings and every other model part are not moved.
export const WALK_LEVELS = Object.freeze({
  lift: 0.152,        // walk top above the ground at its edges (6 in)
  reach: 2.5,         // how far out from a walk vertex its edge ground is looked for
  maxDrop: 0.6,
  cell: 0.5,          // ground height-grid cell (m)
  curbReach: 0.8,     // curb top vertices this close to a walk belong to its edge
  curbRing: [0.4, 0.8], // radii at which the ground beside a curb is sampled
  curbSmooth: 0.6,    // curb moves are averaged over this radius (both edges of a strip agree)
  smooth: 1.5,        // walk moves are averaged over this radius, so surfaces stay smooth
  maxLift: 0.6
});

const W = WALK_LEVELS;

// Height grid of upward-facing ground triangles: query(x, z, below) gives the
// highest ground at (x, z) that is at or below `below` (or -Infinity).
export function buildHeightGrid(tris, cell = W.cell) {
  const grid = new Map(), key = (i, j) => (i + 1e6) * 4e6 + (j + 1e6);
  const put = (i, j, h) => { const k = key(i, j); const a = grid.get(k); if (a) a.push(h); else grid.set(k, [h]); };
  for (let t = 0; t < tris.length; t += 9) {
    const ax = tris[t], ay = tris[t + 1], az = tris[t + 2], bx = tris[t + 3], by = tris[t + 4], bz = tris[t + 5], cx = tris[t + 6], cy = tris[t + 7], cz = tris[t + 8];
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(d) < 1e-9) continue;
    const x0 = Math.min(ax, bx, cx), x1 = Math.max(ax, bx, cx), z0 = Math.min(az, bz, cz), z1 = Math.max(az, bz, cz);
    const height = (x, z) => {
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
      return [l1, l2, 1 - l1 - l2, l1 * ay + l2 * by + (1 - l1 - l2) * cy];
    };
    let hit = false;
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) {
      const [l1, l2, l3, h] = height((i + 0.5) * cell, (j + 0.5) * cell);
      if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) { put(i, j, h); hit = true; }
    }
    if (!hit) put(Math.floor((ax + bx + cx) / 3 / cell), Math.floor((az + bz + cz) / 3 / cell), (ay + by + cy) / 3);
  }
  return {
    query(x, z, below) {
      const a = grid.get(key(Math.floor(x / cell), Math.floor(z / cell)));
      let best = -Infinity;
      if (a) for (const h of a) if (h <= below && h > best) best = h;
      return best;
    }
  };
}

// Points bucketed in a horizontal grid for radius queries.
function pointGrid(xs, zs, ids, cell) {
  const g = new Map(), key = (i, j) => (i + 1e6) * 4e6 + (j + 1e6);
  for (const id of ids) {
    const k = key(Math.floor(xs[id] / cell), Math.floor(zs[id] / cell));
    const a = g.get(k); if (a) a.push(id); else g.set(k, [id]);
  }
  return (x, z, r, fn) => {
    for (let i = Math.floor((x - r) / cell); i <= Math.floor((x + r) / cell); i++)
      for (let j = Math.floor((z - r) / cell); j <= Math.floor((z + r) / cell); j++) {
        const a = g.get(key(i, j)); if (!a) continue;
        for (const id of a) { const dx = xs[id] - x, dz = zs[id] - z; if (dx * dx + dz * dz <= r * r) fn(id, Math.sqrt(dx * dx + dz * dz)); }
      }
  };
}

// Core solve on plain arrays (root-frame metres). walk/curb: {x, y, z, up, comp}
// per vertex; surface: height grid of every ground surface (lawns included);
// exclude(x, z): ground that is not an edge to stand above (inside the store);
// onWalk/onCurb(x, z): the point is on a walk / curb top; hold(x, z) in 0..1
// scales walk moves (0 where a walk must stay at a door threshold).
// Returns new y arrays.
export function solveWalkLevels({ walk, curb, surface, exclude = () => false, onWalk = () => false, onCurb = () => false, hold = () => 1 }) {
  const n = walk.x.length, wy = Float64Array.from(walk.y);
  const tops = []; for (let i = 0; i < n; i++) if (walk.up[i]) tops.push(i);
  // 1. Each walk top vertex's edge ground: walk outward in 8 directions past
  // the walk and any curb strip; the nearest edge found decides (ties are
  // averaged), so a walk on a cross-slope tilts with the ground and every edge
  // stands `lift` above the ground right beside it. Ground more than 0.3 m
  // above the walk is a raised lawn, roof or wall, not an edge to stand above.
  const want = new Float64Array(n), has = new Uint8Array(n);
  for (const i of tops) {
    let bestR = Infinity, sum = 0, cnt = 0;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      for (let r = 0.25; r <= W.reach && r <= bestR + 1e-9; r += 0.25) {
        const x = walk.x[i] + Math.cos(a) * r, z = walk.z[i] + Math.sin(a) * r;
        if (exclude(x, z)) break;
        if (onWalk(x, z) || onCurb(x, z)) continue;
        const g = surface.query(x, z, walk.y[i] + 0.3);
        if (g > -Infinity) {
          if (r < bestR - 1e-9) { bestR = r; sum = 0; cnt = 0; }
          sum += g; cnt++;
        }
        break;
      }
    }
    if (cnt) { want[i] = Math.min(W.maxLift, Math.max(-W.maxDrop, sum / cnt + W.lift - walk.y[i])); has[i] = 1; }
  }
  // Spread over each connected walk (mean over `smooth`) so surfaces stay planar.
  const near = pointGrid(walk.x, walk.z, tops, W.smooth);
  const lift = new Float64Array(n);
  for (const i of tops) {
    let s = 0, c = 0;
    near(walk.x[i], walk.z[i], W.smooth, j => { if (has[j] && walk.comp[j] === walk.comp[i]) { s += want[j]; c++; } });
    lift[i] = (c ? s / c : 0) * Math.min(1, Math.max(0, hold(walk.x[i], walk.z[i])));
  }
  for (const i of tops) wy[i] = walk.y[i] + lift[i];

  // 2. Curbs. Along a walk: flush with the walk. Elsewhere: 6 in above the
  // higher ground beside the strip (lawn, island, lot), only ever lowering.
  const m = curb.x.length, cy = Float64Array.from(curb.y), ctops = [];
  for (let c = 0; c < m; c++) if (curb.up[c]) ctops.push(c);
  const nearWalk = pointGrid(walk.x, walk.z, tops, W.curbReach);
  const target = new Float64Array(m), set = new Uint8Array(m);
  for (const c of ctops) {
    let best = -1, bd = Infinity;
    nearWalk(curb.x[c], curb.z[c], W.curbReach, (i, d) => { if (d < bd && curb.y[c] - wy[i] < 1.2) { bd = d; best = i; } });
    if (best >= 0) { target[c] = wy[best]; set[c] = 1; continue; }
    let low = Infinity, high = -Infinity;
    for (const r of W.curbRing) for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, x = curb.x[c] + Math.cos(a) * r, z = curb.z[c] + Math.sin(a) * r;
      if (onCurb(x, z) || onWalk(x, z)) continue;
      const g = surface.query(x, z, curb.y[c] - 0.02);
      if (g > -Infinity) { low = Math.min(low, g); high = Math.max(high, g); }
    }
    // As low as it can go: 6 in above the lower side, but never below the
    // ground it holds back on the higher side.
    if (high > -Infinity) { target[c] = Math.min(curb.y[c], Math.max(low + W.lift, high)); set[c] = 1; }
  }
  // Average the moves over each strip so both of its edges and the corners agree.
  const nearCurb = pointGrid(curb.x, curb.z, ctops, W.curbSmooth);
  let lowered = 0;
  for (const c of ctops) {
    let s = 0, k = 0;
    nearCurb(curb.x[c], curb.z[c], W.curbSmooth, j => { if (set[j] && (!curb.comp || curb.comp[j] === curb.comp[c])) { s += target[j] - curb.y[j]; k++; } });
    if (!k) continue;
    cy[c] = curb.y[c] + s / k;
    if (Math.abs(s / k) > 0.01) lowered++;
  }
  return { walkY: wy, curbY: cy, lifted: tops.filter(i => lift[i] > 0.005).length, sunk: tops.filter(i => lift[i] < -0.005).length, lowered };
}

// ---- Model plumbing: bake quantised positions to float, solve, write back ----
// Positions are worked in the glTF root's frame (metres, Y up), wherever the root sits.
const toRoot = (mesh, root) => root.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
function bake(mesh, root) {
  const M = toRoot(mesh, root);
  const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal, n = pos.count;
  const nm = new THREE.Matrix3().getNormalMatrix(M), v = new THREE.Vector3(), q = new THREE.Vector3();
  const x = new Float64Array(n), y = new Float64Array(n), z = new Float64Array(n), up = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(M); x[i] = v.x; y[i] = v.y; z[i] = v.z;
    if (nor) up[i] = q.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize().y > 0.7 ? 1 : 0;
  }
  return { x, y, z, up };
}
// Coincident vertices (a top corner and the skirt faces meeting it) move together.
function coincident(P) {
  const groups = new Map(), of = new Int32Array(P.x.length);
  for (let i = 0; i < P.x.length; i++) {
    const k = `${Math.round(P.x[i] * 500)},${Math.round(P.y[i] * 500)},${Math.round(P.z[i] * 500)}`;
    if (!groups.has(k)) groups.set(k, i);
    of[i] = groups.get(k);
  }
  return of;
}
function components(mesh, of) {
  const n = of.length, par = Int32Array.from({ length: n }, (_, i) => i);
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
  const idx = mesh.geometry.index ? mesh.geometry.index.array : null, tri = idx ? idx.length : n;
  for (let t = 0; t < tri; t += 3) { const a = idx ? idx[t] : t; join(a, idx ? idx[t + 1] : t + 1); join(a, idx ? idx[t + 2] : t + 2); }
  for (let i = 0; i < n; i++) join(i, of[i]);
  return Int32Array.from({ length: n }, (_, i) => find(i));
}
function writeBack(mesh, root, P, newY, of) {
  // Every vertex follows the moved height of its coincident representative.
  const inv = toRoot(mesh, root).invert(), v = new THREE.Vector3(), n = P.x.length;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = of[i], dy = newY[r] - P.y[r];
    v.set(P.x[i], P.y[i] + dy, P.z[i]).applyMatrix4(inv);
    out[3 * i] = v.x; out[3 * i + 1] = v.y; out[3 * i + 2] = v.z;
  }
  mesh.geometry.setAttribute('position', new THREE.BufferAttribute(out, 3));
  mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
}

export function levelModelSidewalks(root, { exclude, hold } = {}) {
  root.updateMatrixWorld(true);
  const walks = [], curbs = [], ground = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const name = o.material?.name || '';
    if (name === 'SS Walk concrete') walks.push(o);
    else if (name === 'SS Curb concrete') curbs.push(o);
    else if (!/car|flag/i.test(o.name) && !/flag/i.test(name)) ground.push(o);
  });
  if (!walks.length) return { lifted: 0, lowered: 0 };
  // Gather walks and curbs first to bound the ground triangles that matter.
  const walkData = walks.map(m => { const P = bake(m, root), of = coincident(P); return { m, P, of, comp: components(m, of) }; });
  const curbData = curbs.map(m => { const P = bake(m, root), of = coincident(P); return { m, P, of, comp: components(m, of) }; });
  const box = new THREE.Box3(), pt = new THREE.Vector3();
  for (const { P } of [...walkData, ...curbData]) for (let i = 0; i < P.x.length; i++) box.expandByPoint(pt.set(P.x[i], P.y[i], P.z[i]));
  box.expandByScalar(3);
  const allTris = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const m of ground) {
    const M = toRoot(m, root);
    const g = m.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : null, count = idx ? idx.length : pos.count;
    if (!g.boundingBox) g.computeBoundingBox();
    if (!g.boundingBox.clone().applyMatrix4(M).intersectsBox(box)) continue;
    for (let t = 0; t < count; t += 3) {
      a.fromBufferAttribute(pos, idx ? idx[t] : t).applyMatrix4(M);
      b.fromBufferAttribute(pos, idx ? idx[t + 1] : t + 1).applyMatrix4(M);
      c.fromBufferAttribute(pos, idx ? idx[t + 2] : t + 2).applyMatrix4(M);
      if (!box.containsPoint(a) && !box.containsPoint(b) && !box.containsPoint(c)) continue;
      e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
      const len = e1.length(); if (len < 1e-9 || Math.abs(e1.y) / len < 0.7) continue; // up or down faces of slabs
      allTris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
  }
  // Footprint of the walks' top faces (fine cells), to skip samples on the walk.
  const walkTris = [];
  for (const { m } of walkData) {
    const M = toRoot(m, root), g = m.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : null, count = idx ? idx.length : pos.count;
    for (let t = 0; t < count; t += 3) {
      a.fromBufferAttribute(pos, idx ? idx[t] : t).applyMatrix4(M);
      b.fromBufferAttribute(pos, idx ? idx[t + 1] : t + 1).applyMatrix4(M);
      c.fromBufferAttribute(pos, idx ? idx[t + 2] : t + 2).applyMatrix4(M);
      e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
      const len = e1.length(); if (len < 1e-9 || e1.y / len < 0.7) continue;
      walkTris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
  }
  const walkGrid = buildHeightGrid(walkTris, 0.25);
  const curbTris = [];
  for (const m of curbs) {
    const M = toRoot(m, root), g = m.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : null, count = idx ? idx.length : pos.count;
    for (let t = 0; t < count; t += 3) {
      a.fromBufferAttribute(pos, idx ? idx[t] : t).applyMatrix4(M);
      b.fromBufferAttribute(pos, idx ? idx[t + 1] : t + 1).applyMatrix4(M);
      c.fromBufferAttribute(pos, idx ? idx[t + 2] : t + 2).applyMatrix4(M);
      e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
      const len = e1.length(); if (len < 1e-9 || e1.y / len < 0.7) continue;
      curbTris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
  }
  const curbGrid = buildHeightGrid(curbTris, 0.25);
  const onCurb = (x, z) => curbGrid.query(x, z, Infinity) > -Infinity;
  const onWalk = (x, z) => walkGrid.query(x, z, Infinity) > -Infinity;
  // Solve walks and curbs together (curb decisions use the lifted walk heights).
  const cat = list => {
    const o = { x: [], y: [], z: [], up: [], comp: [] };
    list.forEach(({ P, comp }, k) => { for (let i = 0; i < P.x.length; i++) { o.x.push(P.x[i]); o.y.push(P.y[i]); o.z.push(P.z[i]); o.up.push(P.up[i]); o.comp.push(comp ? `${k}:${comp[i]}` : 0); } });
    return o;
  };
  const res = solveWalkLevels({ walk: cat(walkData), curb: cat(curbData), surface: buildHeightGrid(allTris), exclude, onWalk, onCurb, hold });
  let off = 0;
  for (const d of walkData) {
    // Representatives take the largest move among their coincident vertices
    // (top faces move; the skirt faces meeting them follow).
    const y = Float64Array.from(d.P.y);
    for (let i = 0; i < d.P.x.length; i++) { const r = d.of[i], dy = res.walkY[off + i] - d.P.y[i]; if (Math.abs(dy) > Math.abs(y[r] - d.P.y[r])) y[r] = d.P.y[r] + dy; }
    writeBack(d.m, root, d.P, y, d.of); off += d.P.x.length;
  }
  off = 0;
  for (const d of curbData) {
    const y = Float64Array.from(d.P.y);
    for (let i = 0; i < d.P.x.length; i++) { const r = d.of[i], dy = res.curbY[off + i] - d.P.y[i]; if (Math.abs(dy) > Math.abs(y[r] - d.P.y[r])) y[r] = d.P.y[r] + dy; }
    writeBack(d.m, root, d.P, y, d.of); off += d.P.x.length;
  }
  return { lifted: res.lifted, sunk: res.sunk, lowered: res.lowered };
}
