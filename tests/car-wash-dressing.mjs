// node --experimental-default-type=module tests/car-wash-dressing.mjs
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { buildCarWash, WASH as W } from '../scripts/car-wash.js';
const context = new Proxy({}, { get: (o,k) => o[k] ?? (() => {}), set: (o,k,v) => (o[k]=v,true) });
const mats = { upper: new THREE.MeshStandardMaterial({map:new THREE.Texture()}), lower: new THREE.MeshStandardMaterial({map:new THREE.Texture()}) };
const wash = buildCarWash({ mats, groundAt:()=>0.7,
  ctex:(w,h,paint)=>{paint(context,w,h);return new THREE.Texture();},
  glowMat:map=>new THREE.MeshStandardMaterial({map}) });
// Test in the car-wash frame, before its heading is applied.
wash.rotation.y = 0;
wash.updateMatrixWorld(true);
const door = wash.getObjectByName('Wash-door');
const bounds = o=>new THREE.Box3().setFromObject(o);
const db = bounds(door);
assert.ok(db.min.z > W.z[1], 'door is on the ENTER end, not the long east wall');
assert.equal(door.position.x, W.door.x);
assert.ok(db.max.x < W.x[1]-0.5, 'door is inset from the east corner');
const wallNames = ['Wash-wall-east','Wash-wall-west','Wash-enter-wall-left','Wash-enter-wall-right','Wash-enter-wall-lintel'];
for (const name of wallNames) {
  const mesh = wash.getObjectByName(name);
  assert.ok(mesh, name);
  assert.equal(mesh.material, mats.upper, 'matching block texture');
  assert.equal(mesh.geometry.attributes.position.count, 24, 'six solid textured faces, including bay side and caps');
  assert.ok(!bounds(mesh).intersectsBox(db), 'masonry does not cover the relocated door');
  for (const uv of mesh.geometry.attributes.uv.array) assert.ok(Number.isFinite(uv));
}
const west = bounds(wash.getObjectByName('Wash-wall-west'));
assert.ok(west.min.x < -17.97, 'block face covers the original west wall face at x≈-17.966');
const pavement = wash.getObjectByName('Wash-approach-pavement');
assert.ok(pavement, 'marked grass strip is covered with approach pavement');
const pavingBounds = bounds(pavement);
assert.ok(Math.abs(pavingBounds.min.x-W.approachPaving.x[0]) < 0.001);
assert.ok(Math.abs(pavingBounds.max.z-W.approachPaving.z[1]) < 0.001);
assert.ok(pavement.geometry.attributes.position.count > 100, 'paving samples the existing terrain grade');
const partial = bounds(wash.getObjectByName('Wash-enter-wall-left'));
assert.ok(partial.min.x > W.x[0]+4, 'partial wall leaves the main car-wash bay open');
assert.ok(!wash.getObjectByName('Wash-door-frame'), 'old side-wall door frame is removed');
console.log('PASS: end-wall service door, open bay, and block finish on all wall faces');
