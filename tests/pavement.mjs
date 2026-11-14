// node --experimental-default-type=module tests/pavement.mjs
// Pavement finishes: the lot concrete palette cell is split out of the merged
// ground mesh with plan UVs in metres, walks/curbs/roads get the new
// materials mapped in the storefront frame, and cars and our own props are
// left alone. Also checked against the real shortstop_detailed.glb.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { MeshoptDecoder } from '../vendor/jsm/libs/meshopt_decoder.module.js';
import { PAVEMENT as P, pavementUV, splitLotTriangles, applyPavement } from '../scripts/pavement.js';
import { STOREFRONT as S } from '../scripts/storefront.js';

const close = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// --- UV rules -----------------------------------------------------------------
{
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(1, 0, 0);
  const [u, v] = pavementUV(new THREE.Vector3(13, 0.4, 3), up, 1.5, [10, -9.9]);
  assert.ok(close(u, (3 + 9.9) / 1.5) && close(v, 2), 'top faces: u along the store front, v out from it, in tiles');
  const [u2, v2] = pavementUV(new THREE.Vector3(13, 0.3, 3), side, 1.2);
  assert.ok(close(u2, 3 / 1.2) && close(v2, 0.3 / 1.2), 'curb faces use length and height, not smeared');
  // walk joints start at the wall and the north wall
  assert.deepEqual(P.walkOrigin, [S.wallX, S.band.northZ]);
}

// --- splitting the lot cell out of a merged mesh ------------------------------
const quad = (x0, z0, x1, z1, cell) => ({
  pos: [x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z0, x1, 0, z1, x0, 0, z1],
  uv: Array(12).fill(cell)
});
function mergedMesh(name = 'ADA_aisle_hatch_0') {
  const parts = [quad(12, -5, 20, 5, P.lotCell), quad(20, -5, 24, 5, 0.707), quad(24, -5, 30, 5, P.lotCell)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(parts.flatMap(p => p.pos), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(parts.flatMap(p => p.uv), 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ name: P.lotMaterial }));
  m.name = name; return m;
}
{
  const merged = mergedMesh();
  const lot = splitLotTriangles(merged, new THREE.MeshStandardMaterial());
  assert.equal(lot.geometry.index.count / 3, 4, 'both lot quads move to the paving mesh');
  assert.equal(merged.geometry.index.count / 3, 2, 'grass stays in the merged mesh');
  assert.equal(lot.parent, merged, 'paving inherits the merged mesh transform');
  assert.equal(lot.geometry.attributes.position.count, 12, 'only the moved vertices are copied (stand-in is non-indexed)');
}

// --- applyPavement on a stand-in root -----------------------------------------
{
  const root = new THREE.Group();
  const merged = mergedMesh();
  const mk = (name, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 1.6), new THREE.MeshStandardMaterial({ name: mat })); m.name = name; m.position.set(11, 0.4, 2); return m; };
  const walk = mk('Frontage_sidewalk_(traced)', P.walkMaterial), curb = mk('East_slip_island', P.curbMaterial), road = mk('Frontage_road', P.asphaltMaterial);
  const car = mk('Car_at_storefront_4', P.walkMaterial), carWash = mk('Car_wash_apron', P.walkMaterial);
  const ours = new THREE.Group(); ours.name = 'FoodMart-storefront'; const ourWalk = mk('Mat', P.walkMaterial); ours.add(ourWalk);
  root.add(merged, walk, curb, road, car, carWash, ours);
  const stats = applyPavement(root, { skip: ['FoodMart-storefront'] });
  assert.deepEqual(stats, { lotMeshes: 1, lotTriangles: 4, walks: 2, curbs: 1, roads: 1 });
  assert.equal(car.material.name, P.walkMaterial, 'parked cars are not touched');
  assert.notEqual(car.material, walk.material);
  assert.equal(walk.material, carWash.material, 'the car-wash walk shares the new walk finish');
  assert.equal(ourWalk.material.name, P.walkMaterial); assert.notEqual(ourWalk.material, walk.material, 'our own props are skipped');
  for (const m of [walk, curb, road]) assert.ok(m.material.side === THREE.DoubleSide, `${m.name} keeps double-sided like the model`);
  // Lot UVs are store-frame metres over the 9.2 m (2 x 2 panel) tile.
  const lot = merged.getObjectByName('Lot-concrete-paving');
  const uv = lot.geometry.attributes.uv, pos = lot.geometry.attributes.position, h = -S.heading;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), xs = x * Math.cos(h) + z * Math.sin(h), zs = -x * Math.sin(h) + z * Math.cos(h);
    assert.ok(close(uv.getX(i), (zs - P.lotOrigin[1]) / (2 * P.lotPanel), 1e-4) && close(uv.getY(i), (xs - P.lotOrigin[0]) / (2 * P.lotPanel), 1e-4), 'lot plan UVs');
  }
}

// --- the real model: the lot cell covers the lot and forecourt -----------------
await MeshoptDecoder.ready;
const glb = fs.readFileSync(new URL('../assets/web-station/shortstop_detailed.glb', import.meta.url));
const jsonLen = glb.readUInt32LE(12), gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
const bin = glb.subarray(20 + jsonLen + 8, 20 + jsonLen + 8 + glb.readUInt32LE(20 + jsonLen));
const view = i => {
  const bv = gltf.bufferViews[i], ext = bv.extensions?.EXT_meshopt_compression;
  if (!ext) return bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const out = new Uint8Array(ext.count * ext.byteStride);
  MeshoptDecoder.decodeGltfBuffer(out, ext.count, ext.byteStride, bin.subarray(ext.byteOffset || 0, (ext.byteOffset || 0) + ext.byteLength), ext.mode, ext.filter || 'NONE');
  return out;
};
const attr = i => {
  const a = gltf.accessors[i], bv = gltf.bufferViews[a.bufferView], raw = view(a.bufferView);
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const T = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType];
  const stride = (bv.byteStride || n * T.BYTES_PER_ELEMENT) / T.BYTES_PER_ELEMENT;
  const arr = new T(raw.buffer, raw.byteOffset + (a.byteOffset || 0), (a.count - 1) * stride + n);
  const norm = v => !a.normalized ? v : T === Int16Array ? Math.max(v / 32767, -1) : T === Uint16Array ? v / 65535 : T === Int8Array ? Math.max(v / 127, -1) : T === Uint8Array ? v / 255 : v;
  const out = new Float32Array(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = norm(arr[k * stride + c]);
  return new THREE.BufferAttribute(out, n);
};
const node = gltf.nodes.find(n => n.name === 'ADA aisle hatch 0');
const prim = gltf.meshes[node.mesh].primitives.find(p => gltf.materials[p.material].name === P.lotMaterial);
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', attr(prim.attributes.POSITION));
geo.setAttribute('uv', attr(prim.attributes.TEXCOORD_0));
const idx = attr(prim.indices); geo.setIndex(Array.from(idx.array));
const real = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: P.lotMaterial }));
if (node.translation) real.position.fromArray(node.translation);
if (node.rotation) real.quaternion.fromArray(node.rotation);
if (node.scale) real.scale.fromArray(node.scale);
const before = geo.index.count / 3;
const paving = splitLotTriangles(real, new THREE.MeshStandardMaterial());
let area = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), pi = paving.geometry.index.array, pp = paving.geometry.attributes.position;
for (let t = 0; t < pi.length; t += 3) { a.fromBufferAttribute(pp, pi[t]); b.fromBufferAttribute(pp, pi[t + 1]); c.fromBufferAttribute(pp, pi[t + 2]); area += b.sub(a).cross(c.sub(a)).length() / 2 * real.scale.x * real.scale.z; }
assert.ok(area > 5000, `lot concrete area ${area.toFixed(0)} m2 is the whole lot and forecourt`);
assert.equal(real.geometry.index.count / 3 + pi.length / 3, before, 'no triangles lost');
console.log(`PASS: pavement UVs, lot split (${(pi.length / 3)} triangles, ${area.toFixed(0)} m2 on the real model), walk/curb/road finishes, cars and props untouched`);
