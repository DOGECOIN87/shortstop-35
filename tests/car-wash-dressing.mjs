// node --experimental-default-type=module tests/car-wash-dressing.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { MeshoptDecoder } from '../vendor/jsm/libs/meshopt_decoder.module.js';
import { buildCarWash, reshapeCarWashApproach, sampleApproachCurb, WASH as W } from '../scripts/car-wash.js';
import { WALK_LEVELS, levelModelSidewalks } from '../scripts/sidewalk-levels.js';

const context = new Proxy({}, { get: (o,k) => o[k] ?? (() => {}), set: (o,k,v) => (o[k]=v,true) });
const mats = { upper: new THREE.MeshStandardMaterial({map:new THREE.Texture()}), lower: new THREE.MeshStandardMaterial({map:new THREE.Texture()}) };
const wash = buildCarWash({ mats, groundAt:()=>0.7,
  ctex:(w,h,paint)=>{paint(context,w,h);return new THREE.Texture();},
  glowMat:map=>new THREE.MeshStandardMaterial({map}) });
// Test in the car-wash frame, before its heading is applied.
wash.rotation.y = 0;
wash.updateMatrixWorld(true);
const door = wash.getObjectByName('Wash-door');
const farDoor = wash.getObjectByName('Wash-far-door');
const bounds = o=>new THREE.Box3().setFromObject(o);
const db = bounds(door);
const fdb = bounds(farDoor);
assert.ok(db.min.z > W.z[1], 'ENTER door is on the ENTER end, not the long east wall');
assert.equal(door.position.x, W.door.x);
assert.ok(db.max.x < W.x[1]-0.5, 'ENTER door is inset from the east corner');
assert.ok(fdb.max.z < W.z[0], 'far-end door is on the far/EXIT end (-Z)');
assert.ok(Math.abs((fdb.min.x + fdb.max.x) / 2 - W.farDoor.x) < 0.001, 'far-end door centered at W.farDoor.x');
assert.ok(fdb.max.x < W.x[1] - 0.5 && fdb.min.x > W.x[1] - W.farPartialWallWidth + 0.5, 'far-end door inset from both wall corners');
assert.ok(wash.getObjectByName('Wash-far-door-handle'), 'far-end door has lever handle');

const wallNames = [
  'Wash-wall-east','Wash-wall-west',
  'Wash-enter-wall-left','Wash-enter-wall-right','Wash-enter-wall-lintel',
  'Wash-far-wall-left','Wash-far-wall-right','Wash-far-wall-lintel'
];
for (const name of wallNames) {
  const mesh = wash.getObjectByName(name);
  assert.ok(mesh, name);
  assert.equal(mesh.material, mats.upper, 'matching block texture');
  assert.equal(mesh.geometry.attributes.position.count, 24, 'six solid textured faces, including bay side and caps');
  assert.ok(!bounds(mesh).intersectsBox(db), `${name} masonry does not cover ENTER door`);
  assert.ok(!bounds(mesh).intersectsBox(fdb), `${name} masonry does not cover far-end door`);
  for (const uv of mesh.geometry.attributes.uv.array) assert.ok(Number.isFinite(uv));
}
const west = bounds(wash.getObjectByName('Wash-wall-west'));
assert.ok(west.min.x < -17.97, 'block face covers the original west wall face at x≈-17.966');
assert.equal(wash.getObjectByName('Wash-approach-pavement'), undefined, 'legacy dark overlay slab is removed in favor of GLB grass/curb surgery');
const partial = bounds(wash.getObjectByName('Wash-enter-wall-left'));
assert.ok(partial.min.x > W.x[0]+4, 'ENTER partial wall leaves the main car-wash bay open');
const farPartial = bounds(wash.getObjectByName('Wash-far-wall-left'));
assert.ok(farPartial.min.x > W.x[0] + 4, 'far-end partial wall leaves the car-wash EXIT bay open');
assert.ok(!wash.getObjectByName('Wash-door-frame'), 'old side-wall door frame is removed');

// Verify index.html reshapes the car-wash approach BEFORE levelModelSidewalks.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const reshapeAt = html.indexOf('reshapeCarWashApproach(root)');
const levelAt = html.indexOf('levelModelSidewalks(root');
assert.ok(reshapeAt > 0 && reshapeAt < levelAt, 'index.html reshapes the car-wash approach before levelling sidewalks');

// Decode ADA_aisle_hatch_0 and East_slip_island_—_reference_concrete_island
// directly from shortstop_detailed.glb to verify real-model surgery + levelling.
await MeshoptDecoder.ready;
const glb = fs.readFileSync(new URL('../assets/web-station/shortstop_detailed.glb', import.meta.url));
const jsonLen = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLen));
const decodedViews = new Map();
function getBufferView(bvIdx) {
  if (decodedViews.has(bvIdx)) return decodedViews.get(bvIdx);
  const bv = gltf.bufferViews[bvIdx];
  const ext = bv.extensions?.EXT_meshopt_compression;
  let out;
  if (ext) {
    const src = bin.subarray(ext.byteOffset || 0, (ext.byteOffset || 0) + ext.byteLength);
    out = new Uint8Array(ext.count * ext.byteStride);
    MeshoptDecoder.decodeGltfBuffer(out, ext.count, ext.byteStride, src, ext.mode, ext.filter || 'NONE');
  } else {
    out = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  }
  decodedViews.set(bvIdx, out);
  return out;
}
function getAccessorAttr(accIdx) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const raw = getBufferView(acc.bufferView);
  const itemSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  const Typed = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[acc.componentType];
  const bpe = Typed.BYTES_PER_ELEMENT;
  const stride = (bv.byteStride || (itemSize * bpe)) / bpe;
  if (stride !== itemSize) {
    const arr = new Typed(raw.buffer, raw.byteOffset, acc.count * stride);
    return new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(arr, stride), itemSize, (acc.byteOffset || 0) / bpe, !!acc.normalized);
  }
  const arr = new Typed(raw.buffer, raw.byteOffset + (acc.byteOffset || 0), acc.count * itemSize);
  return new THREE.BufferAttribute(arr, itemSize, !!acc.normalized);
}
function buildGlbMesh(nodeName) {
  const node = gltf.nodes.find(n => (n.name || '').replaceAll(' ', '_') === nodeName);
  assert.ok(node, `GLB node ${nodeName}`);
  const prim = gltf.meshes[node.mesh].primitives[0];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', getAccessorAttr(prim.attributes.POSITION));
  if (prim.attributes.NORMAL !== undefined) geo.setAttribute('normal', getAccessorAttr(prim.attributes.NORMAL));
  if (prim.attributes.TEXCOORD_0 !== undefined) geo.setAttribute('uv', getAccessorAttr(prim.attributes.TEXCOORD_0));
  geo.setIndex(getAccessorAttr(prim.indices));
  const matName = gltf.materials[prim.material]?.name || '';
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: matName }));
  mesh.name = nodeName;
  if (node.translation) mesh.position.fromArray(node.translation);
  if (node.rotation) mesh.quaternion.fromArray(node.rotation);
  if (node.scale) mesh.scale.fromArray(node.scale);
  return mesh;
}

const root = new THREE.Group();
const hatch = buildGlbMesh('ADA_aisle_hatch_0');
const curb = buildGlbMesh('East_slip_island_—_reference_concrete_island');
const walk = buildGlbMesh('Frontage_sidewalk_(traced)');
root.add(hatch, curb, walk);
root.updateMatrixWorld(true);

const c = Math.cos(W.heading), s = Math.sin(W.heading);
const rootToWash = (rx, rz) => [rx * c - rz * s, rx * s + rz * c];
const countConcreteTris = () => {
  const toR = root.matrixWorld.clone().invert().multiply(hatch.matrixWorld);
  const p = hatch.geometry.attributes.position, u = hatch.geometry.attributes.uv, ix = hatch.geometry.index.array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  let n = 0;
  for (let t = 0; t < ix.length; t += 3) {
    if (Math.abs(u.getX(ix[t]) - 0.481) > 0.015) continue;
    a.fromBufferAttribute(p, ix[t]).applyMatrix4(toR);
    b.fromBufferAttribute(p, ix[t + 1]).applyMatrix4(toR);
    d.fromBufferAttribute(p, ix[t + 2]).applyMatrix4(toR);
    if (Math.max(a.y, b.y, d.y) < -0.25) continue;
    const [wx, wz] = rootToWash((a.x + b.x + d.x) / 3, (a.z + b.z + d.z) / 3);
    if (wx > -18 && wx < -8 && wz > -18 && wz < 13) n++;
  }
  return n;
};
const concreteBefore = countConcreteTris();
assert.ok(concreteBefore > 40, `expected underlying concrete slab triangles before surgery (${concreteBefore})`);

const stats = reshapeCarWashApproach(root);
assert.ok(stats.removedGrass > 300, `expected >300 grass triangles removed, got ${stats.removedGrass}`);
assert.ok(stats.clippedGrass > 100, `expected >100 boundary grass triangles cleanly clipped, got ${stats.clippedGrass}`);
assert.ok(stats.removedCurb > 500, `expected >500 obsolete inner curb triangles removed, got ${stats.removedCurb}`);
assert.ok(stats.addedCurb > 600, `expected >600 new approach & sidewalk curb triangles added, got ${stats.addedCurb}`);
assert.ok(stats.addedWalk > 200, `expected >200 L-shaped car-wash sidewalk triangles added, got ${stats.addedWalk}`);
assert.equal(countConcreteTris(), concreteBefore, 'every underlying concrete slab triangle is preserved');

// Verify no green grass (u ≈ 0.707) remains inside the car-wash bay mouth or widened approach/turn,
// while outer west grass buffer and store-side lawn remain present.
root.updateMatrixWorld(true);
const toRootH = root.matrixWorld.clone().invert().multiply(hatch.matrixWorld);
const hPos = hatch.geometry.attributes.position, hUv = hatch.geometry.attributes.uv, hIdx = hatch.geometry.index.array;
const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
let bayGrass = 0, widenedLaneGrass = 0, enterCornerGrass = 0;
let exitApronGrass = 0, keptExitWestGrass = 0, palmIslandGrass = 0;
let outerWestGrass = 0, storeLawnGrass = 0, underlyingConcrete = 0;
let westMedianStripGrass = 0, lampPlanterExtGrass = 0;
for (let t = 0; t < hIdx.length; t += 3) {
  const i0 = hIdx[t], i1 = hIdx[t + 1], i2 = hIdx[t + 2];
  const u = hUv.getX(i0);
  va.fromBufferAttribute(hPos, i0).applyMatrix4(toRootH);
  vb.fromBufferAttribute(hPos, i1).applyMatrix4(toRootH);
  vc.fromBufferAttribute(hPos, i2).applyMatrix4(toRootH);
  if (Math.max(va.y, vb.y, vc.y) < -0.25) continue;
  const [wx, wz] = rootToWash((va.x + vb.x + vc.x) / 3, (va.z + vb.z + vc.z) / 3);
  if (Math.abs(u - 0.481) < 0.015 && wx > -17.5 && wx < -14.5 && wz > -14 && wz < 8) underlyingConcrete++;
  if (Math.abs(u - 0.707) > 0.015) continue;
  if (wx > -17.6 && wx < -12.3 && wz > -18.5 && wz < -15.2) bayGrass++;
  if (wx > -17.2 && wx < -14.0 && wz > -14.0 && wz < 1.0) widenedLaneGrass++;
  if (wx > -12.3 && wx < -7.2 && wz > -18.5 && wz < -13.6) enterCornerGrass++;
  if ((wx > -17.15 && wx < -13.65 && wz > -40.8 && wz < -32.2) ||
      (wx > -16.4 && wx < -9.4 && wz > -51.5 && wz < -37.2)) exitApronGrass++;
  if (wx > -18.55 && wx < -17.30 && wz > -41.5 && wz < -29.4 && Math.min(va.y, vb.y, vc.y) > 0.95) westMedianStripGrass++;
  if (wx > -13.42 && wx < -10.40 && wz > -35.4 && wz < -30.85 && Math.min(va.y, vb.y, vc.y) > 0.70) lampPlanterExtGrass++;
  if (wx > -19.3 && wx < -17.2 && wz > -49.8 && wz < -42.0) keptExitWestGrass++;
  if (wx > -11.3 && wx < -8.0 && wz > -35.8 && wz < -31.0) palmIslandGrass++;
  if (wx < -18.5 && wx > -23.0 && wz > -5.0 && wz < 8.0) outerWestGrass++;
  if (wx > -9.5 && wx < -5.0 && wz > -6.0 && wz < 4.0) storeLawnGrass++;
}
assert.equal(bayGrass, 0, 'zero grass triangles block the car-wash bay entrance');
assert.equal(widenedLaneGrass, 0, 'zero grass triangles remain in the widened approach');
assert.equal(enterCornerGrass, 0, 'erroneous ENTER-corner grass island is removed');
assert.equal(exitApronGrass, 0, 'marked EXIT-end eastern grass apron & tail are removed');
assert.ok(westMedianStripGrass >= 120, `west exit-lane median grass strip connects Wash-wall-west to west island (${westMedianStripGrass})`);
assert.ok(lampPlanterExtGrass >= 100, `expanded palm/street-lamp planter grass bed is present (${lampPlanterExtGrass})`);
assert.ok(keptExitWestGrass > 30, `trimmed western EXIT grass lobe remains intact (${keptExitWestGrass})`);
assert.ok(palmIslandGrass > 40, `palm-tree island grass remains intact (${palmIslandGrass})`);
assert.ok(outerWestGrass > 50, 'outer property-edge grass buffer west of the new curb remains intact');
assert.ok(storeLawnGrass > 50, 'store-side lawn east of the rear drive lane remains intact');

// Run levelModelSidewalks and verify the repositioned curb is levelled cleanly (~6 in above concrete drive).
const lv = levelModelSidewalks(root);
assert.ok(lv.lowered > 0, 'sidewalk solver lowers curbs including the repositioned car-wash approach curb');

const toRootC = root.matrixWorld.clone().invert().multiply(curb.matrixWorld);
const cPos = curb.geometry.attributes.position, cNor = curb.geometry.attributes.normal, cIdx = curb.geometry.index.array;
let oldInnerCurb = 0, newOuterCurbTops = 0;
const sampled = sampleApproachCurb(20);
for (let t = 0; t < cIdx.length; t += 3) {
  const i0 = cIdx[t], i1 = cIdx[t + 1], i2 = cIdx[t + 2];
  va.fromBufferAttribute(cPos, i0).applyMatrix4(toRootC);
  vb.fromBufferAttribute(cPos, i1).applyMatrix4(toRootC);
  vc.fromBufferAttribute(cPos, i2).applyMatrix4(toRootC);
  if (Math.max(va.y, vb.y, vc.y) < -0.25) continue;
  const [wx, wz] = rootToWash((va.x + vb.x + vc.x) / 3, (va.z + vb.z + vc.z) / 3);
  if (wx > -15.5 && wx < -14.2 && wz > -13 && wz < 1) oldInnerCurb++;
  if (cNor.getY(i0) > 0.7) {
    for (const [sx, sz] of sampled) {
      if (Math.hypot(wx - sx, wz - sz) < 0.35) {
        newOuterCurbTops++;
        assert.ok(va.y > -0.15 && va.y < 1.05, `levelled outer curb top y=${va.y.toFixed(3)} follows site grade`);
        break;
      }
    }
  }
}
assert.equal(oldInnerCurb, 0, 'obsolete inner curb strip along narrow approach is removed');
assert.ok(newOuterCurbTops > 60, `repositioned outer curb top triangles present along curve (${newOuterCurbTops})`);

// Verify the U-shaped EXIT + east + ENTER sidewalk is present in SS Walk concrete,
// stands ~6 in above the adjacent drive, and leaves both ENTER and EXIT bay lanes clear.
const toRootW = root.matrixWorld.clone().invert().multiply(walk.matrixWorld);
const wPos = walk.geometry.attributes.position, wIdx = walk.geometry.index.array;
let eastWalkTris = 0, farWalkTris = 0, enterWalkTris = 0, exitBayWalkTris = 0, enterBayWalkTris = 0;
for (let t = 0; t < wIdx.length; t += 3) {
  va.fromBufferAttribute(wPos, wIdx[t]).applyMatrix4(toRootW);
  vb.fromBufferAttribute(wPos, wIdx[t + 1]).applyMatrix4(toRootW);
  vc.fromBufferAttribute(wPos, wIdx[t + 2]).applyMatrix4(toRootW);
  const [wx, wz] = rootToWash((va.x + vb.x + vc.x) / 3, (va.z + vb.z + vc.z) / 3);
  if (wx > -9.9 && wx < -8.4 && wz > -30.8 && wz < -13.7) {
    eastWalkTris++;
    assert.ok(va.y > 0.55 && va.y < 0.98, `east sidewalk levelled to ~6 in above grade (y=${va.y.toFixed(3)})`);
  }
  if (wx > -13.4 && wx < -9.8 && wz > -30.8 && wz < -29.1) {
    farWalkTris++;
    assert.ok(va.y > 0.70 && va.y < 0.98, `far-end door sidewalk levelled to ~6 in above grade (y=${va.y.toFixed(3)})`);
  }
  if (wx > -12.0 && wx < -9.8 && wz > -15.25 && wz < -13.7) {
    enterWalkTris++;
    assert.ok(va.y > 0.55 && va.y < 0.85, `ENTER-end door sidewalk levelled to ~6 in above grade (y=${va.y.toFixed(3)})`);
  }
  if (wx > -17.7 && wx < -13.55 && wz > -32.0 && wz < -28.5) exitBayWalkTris++;
  if (wx > -17.7 && wx < -12.15 && wz > -16.0 && wz < -13.0) enterBayWalkTris++;
}
assert.ok(eastWalkTris >= 190, `full-length east-wall sidewalk triangles present (${eastWalkTris})`);
assert.ok(farWalkTris >= 40, `far-end door sidewalk triangles present (${farWalkTris})`);
assert.ok(enterWalkTris >= 25, `ENTER-end door sidewalk triangles present (${enterWalkTris})`);
assert.equal(exitBayWalkTris, 0, 'car-wash exit bay lane remains unobstructed by sidewalk');
assert.equal(enterBayWalkTris, 0, 'car-wash enter bay lane remains unobstructed by sidewalk');
console.log('PASS: car-wash dressing, U-shaped sidewalk, widened approach, and trimmed EXIT grass apron');
