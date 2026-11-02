import * as THREE from '../vendor/three.module.js';

// Sidewalk levels for the detailed Blender model (assets/web-station/
// shortstop_detailed.glb), corrected when the page loads.
//
// Measured in the model (Nov 2026): walks sit 0.0-0.25 m above the lot or road
// beside them, but the curb strips between a walk and the road/lot stand
// ~0.45 m above the walk (0.5-0.75 m above the lot), so every walk looks sunk
// behind a low wall. The fix:
//  1. Walks: raise any part that is less than 0.152 m (6 in) above the paving
//     beside it, smoothly per connected walk, never lowering (the storefront
//     walk stays level with the store floor at the doors).
//  2. Curbs: where a curb strip borders a walk and the ground on its far side
//     is lower than the walk (road, lot, forecourt), bring the strip's top down
//     flush with the walk, keeping at least 0.1 m of curb face to that ground.
//     Strips with a raised lawn behind them (planter edges) are left alone.
// Lawns, roads, buildings and every other model part are not moved.
export const WALK_LEVELS = Object.freeze({
  lift: 0.152,        // walk top above the adjacent paving (6 in)
  ring: 1.0,          // how far from a walk vertex the adjacent paving is sampled
  cell: 0.5,          // ground height-grid cell (m)
  curbReach: 0.8,     // curb top vertices this close to a walk belong to its edge
  beyond: 0.9,        // ground sampled this far past a curb vertex (its far side)
  minCurbFace: 0.1,   // curb face kept above the far-side ground
  smooth: 3.0,        // walk lift is spread over this radius, so walks stay planar
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

// Core solve on plain arrays (world metres). walk/curb: {x, y, z, up, comp?}
// arrays of equal length per mesh; ground: height grid; exclude(x, z) marks
// ground that must not count as paving (inside the store). Returns new y arrays.
// onWalk(x, z): true where the walk itself covers the point, so a ring sample
// there is not the paving beside the walk.
// hold(x, z) in 0..1 scales the lift (0 where a walk must stay at a door threshold).
// surface: every ground surface (lawns included), used to tell planter curbs
// from road-side curbs; ground: paving only, used for the walk lift.
export function solveWalkLevels({ walk, curb, ground, surface = ground, exclude = () => false, onWalk = () => false, hold = () => 1 }) {
  const n = walk.x.length, wy = Float64Array.from(walk.y);
  const tops = []; for (let i = 0; i < n; i++) if (walk.up[i]) tops.push(i);
  // 1. Lift needed at each walk top vertex: paving within `ring`, at most a
  // little above the walk (higher surfaces are lawns, roofs or the walk's own
  // planters, not the paving it should stand above).
  const need = new Float64Array(n);
  for (const i of tops) {
    let lot = -Infinity;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, x = walk.x[i] + Math.cos(a) * W.ring, z = walk.z[i] + Math.sin(a) * W.ring;
      if (exclude(x, z) || onWalk(x, z)) continue;
      lot = Math.max(lot, ground.query(x, z, walk.y[i] + 0.1));
    }
    if (lot > -Infinity) need[i] = Math.min(W.maxLift, Math.max(0, lot + W.lift - walk.y[i]));
  }
  // Spread each walk's lift (max then mean over `smooth`) so surfaces stay planar.
  const near = pointGrid(walk.x, walk.z, tops, W.smooth);
  const dil = new Float64Array(n), lift = new Float64Array(n);
  for (const i of tops) near(walk.x[i], walk.z[i], W.smooth, j => { if (walk.comp[j] === walk.comp[i] && need[j] > dil[i]) dil[i] = need[j]; });
  for (const i of tops) {
    let s = 0, c = 0;
    near(walk.x[i], walk.z[i], W.smooth, j => { if (walk.comp[j] === walk.comp[i]) { s += dil[j]; c++; } });
    lift[i] = Math.max(need[i], c ? s / c : 0) * Math.min(1, Math.max(0, hold(walk.x[i], walk.z[i])));
  }
  for (const i of tops) wy[i] = walk.y[i] + lift[i];

  // 2. Curb strips along walks with lower ground behind them come down flush.
  const m = curb.x.length, cy = Float64Array.from(curb.y);
  const nearWalk = pointGrid(walk.x, walk.z, tops, W.curbReach);
  // Votes per connected curb piece: a piece that edges a raised lawn anywhere
  // is a planter and stays whole, so no curb is half lowered.
  const plan = new Map(), votes = new Map(), vote = (k, f) => { const v = votes.get(k) || [0, 0]; v[f]++; votes.set(k, v); };
  for (let c = 0; c < m; c++) {
    if (!curb.up[c]) continue;
    let best = -1, bd = Infinity;
    nearWalk(curb.x[c], curb.z[c], W.curbReach, (i, d) => {
      const rise = curb.y[c] - wy[i];
      if (rise > 0.08 && rise < 1.2 && d < bd) { bd = d; best = i; }
    });
    if (best < 0 || bd < 1e-3) continue;
    const dx = (curb.x[c] - walk.x[best]) / bd, dz = (curb.z[c] - walk.z[best]) / bd;
    const bx = curb.x[c] + dx * W.beyond, bz = curb.z[c] + dz * W.beyond;
    const far = surface.query(bx, bz, curb.y[c] + 0.05);
    const k = curb.comp ? curb.comp[c] : 0;
    if (far === -Infinity || far > wy[best] - 0.05) { vote(k, 1); continue; } // raised lawn behind: a planter edge
    vote(k, 0); plan.set(c, Math.max(wy[best], far + W.minCurbFace));
  }
  let lowered = 0;
  for (const [c, y] of plan) {
    const [low, planter] = votes.get(curb.comp ? curb.comp[c] : 0);
    if (planter > 0.1 * (low + planter)) continue;
    cy[c] = y; lowered++;
  }
  return { walkY: wy, curbY: cy, lifted: tops.filter(i => lift[i] > 0.005).length, needed: tops.filter(i => need[i] > 0.005).length, lowered };
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

// The model's lots, lawns and stamped islands share palette materials; a
// triangle's palette colour (sampled at its UV) tells paving from grass or the
// red stamped island infill, which a walk does not need to stand above.
export function isPavingColour([r, g, b]) {
  if (g > r + 8 && g > b + 15) return false;    // grass
  if (r > g + 60 && r > b + 60) return false;   // red stamped concrete (islands)
  return true;
}
function paletteSampler() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true }), cache = new Map();
  return (map, u, v) => {
    const img = map?.image; if (!img || !img.width) return null;
    let d = cache.get(img);
    if (!d) { canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0); d = ctx.getImageData(0, 0, img.width, img.height); cache.set(img, d); }
    const wrap = q => ((q % 1) + 1) % 1, x = Math.min(d.width - 1, Math.floor(wrap(u) * d.width)), y = Math.min(d.height - 1, Math.floor(wrap(v) * d.height));
    const i = 4 * (y * d.width + x); return [d.data[i], d.data[i + 1], d.data[i + 2]];
  };
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
  // Gather walk data first to bound the ground triangles that matter.
  const walkData = walks.map(m => { const P = bake(m, root), of = coincident(P); return { m, P, of, comp: components(m, of) }; });
  const box = new THREE.Box3();
  for (const { P } of walkData) for (let i = 0; i < P.x.length; i++) box.expandByPoint(new THREE.Vector3(P.x[i], P.y[i], P.z[i]));
  box.expandByScalar(3);
  const sample = paletteSampler(); let skipped = 0;
  const tris = [], allTris = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const m of ground) {
    const M = toRoot(m, root);
    const g = m.geometry, pos = g.attributes.position, uv = g.attributes.uv, idx = g.index ? g.index.array : null, count = idx ? idx.length : pos.count;
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
      if (sample && uv && m.material?.map) {
        const i0 = idx ? idx[t] : t, i1 = idx ? idx[t + 1] : t + 1, i2 = idx ? idx[t + 2] : t + 2;
        const col = sample(m.material.map, (uv.getX(i0) + uv.getX(i1) + uv.getX(i2)) / 3, (uv.getY(i0) + uv.getY(i1) + uv.getY(i2)) / 3);
        if (col && !isPavingColour(col)) { skipped++; continue; }
      }
      tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
  }
  const grid = buildHeightGrid(tris);
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
  const onWalk = (x, z) => walkGrid.query(x, z, Infinity) > -Infinity;
  const curbData = curbs.map(m => { const P = bake(m, root), of = coincident(P); return { m, P, of, comp: components(m, of) }; });
  // Solve walks and curbs together (curb decisions use the lifted walk heights).
  const cat = list => {
    const o = { x: [], y: [], z: [], up: [], comp: [] };
    list.forEach(({ P, comp }, k) => { for (let i = 0; i < P.x.length; i++) { o.x.push(P.x[i]); o.y.push(P.y[i]); o.z.push(P.z[i]); o.up.push(P.up[i]); o.comp.push(comp ? `${k}:${comp[i]}` : 0); } });
    return o;
  };
  const res = solveWalkLevels({ walk: cat(walkData), curb: cat(curbData), ground: grid, surface: buildHeightGrid(allTris), exclude, onWalk, hold });
  let off = 0;
  for (const d of walkData) {
    // Representatives take the max lift of their coincident top vertices.
    const y = Float64Array.from(d.P.y);
    for (let i = 0; i < d.P.x.length; i++) { const r = d.of[i], ny = res.walkY[off + i]; if (ny - d.P.y[i] > y[r] - d.P.y[r]) y[r] = d.P.y[r] + (ny - d.P.y[i]); }
    writeBack(d.m, root, d.P, y, d.of); off += d.P.x.length;
  }
  off = 0;
  for (const d of curbData) {
    const y = Float64Array.from(d.P.y);
    for (let i = 0; i < d.P.x.length; i++) { const r = d.of[i], ny = res.curbY[off + i]; if (ny - d.P.y[i] < y[r] - d.P.y[r]) y[r] = d.P.y[r] + (ny - d.P.y[i]); }
    writeBack(d.m, root, d.P, y, d.of); off += d.P.x.length;
  }
  return { lifted: res.lifted, needed: res.needed, lowered: res.lowered, paving: tris.length / 9, skipped };
}
