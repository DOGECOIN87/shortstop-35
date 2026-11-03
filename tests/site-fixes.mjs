// node --experimental-default-type=module tests/site-fixes.mjs
// The sidewalk props the owner circled are gone, the propane bottles have a
// proper exchange cage in their place, and the palm stands in the bed by the
// car wash. Geometry is checked in the storefront frame (store -> root local).
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { STOREFRONT as S } from '../scripts/storefront.js';
import { SITE_FIXES as F, applySiteFixes, buildPalm, buildPropaneCabinet, cutMesh } from '../scripts/site-fixes.js';

const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// --- the cut: a box of triangles inside the red cabinet's box disappears ----
const box = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
const mesh = new THREE.Mesh(box);
const store = new THREE.Matrix4().makeRotationY(-S.heading);
const [red] = F.cutBoxes;
const frame = new THREE.Matrix4().multiplyMatrices(store, mesh.matrixWorld.clone().invert());
// (`mesh` is its own root here: its matrixWorld is the root's)
const before = mesh.geometry.index.count;
const removed = cutMesh(mesh, frame, F.cutBoxes.map(b => b.slice(0, 3).concat(b.slice(3))));
assert.equal(removed, 0, 'a mesh far from the boxes is untouched');
const centre = [(red[0] + red[3]) / 2, (red[1] + red[4]) / 2, (red[2] + red[5]) / 2];
const host = new THREE.Group(); // stands in for the glTF root
const placed = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4, 2, 2, 2));
const toRoot = store.clone().invert(); // store -> root local
placed.position.copy(new THREE.Vector3().fromArray(centre).applyMatrix4(toRoot));
host.add(placed); host.updateMatrixWorld(true);
// index.html cuts with storefrontFrame() * root.matrixWorld^-1, i.e. root-local -> store.
const frame2 = new THREE.Matrix4().multiplyMatrices(store, host.matrixWorld.clone().invert());
assert.ok(cutMesh(placed, frame2, F.cutBoxes) > 0, 'triangles inside the red cabinet box are cut');
assert.equal(placed.geometry.index.count, 0, 'the whole box inside the region is removed');

// --- the boxes cover both props the owner circled -----------------------------
const covers = (p) => F.cutBoxes.some(b => p[0] > b[0] && p[0] < b[3] && p[1] > b[1] && p[1] < b[4] && p[2] > b[2] && p[2] < b[5]);
// The red air/water cabinet runs along the walk south of the store corner.
assert.ok(covers([11.0, 0.8, 17.5]), 'red cabinet is inside a cut box');
// The grey box stood at the south corner, where the model's bottles are.
assert.ok(covers([11.0, 1.2, 12.4]), 'grey box is inside a cut box');
assert.ok(F.hideMeshes[0].test('Propane_tank_00002'), 'the loose bottles are hidden');
assert.ok(!F.hideMeshes[0].test('Propane-exchange-cabinet'), 'the new cage is not hidden');

// --- the exchange cage ------------------------------------------------------
const mats = new Proxy({}, { get: () => new THREE.MeshStandardMaterial() });
const cage = buildPropaneCabinet(F.propane.width, F.propane.depth, F.propane.height, mats);
cage.updateMatrixWorld(true);
const cb = new THREE.Box3().setFromObject(cage);
const size = cb.getSize(new THREE.Vector3());
assert.ok(close(size.x, F.propane.width, 0.2) && close(size.z, F.propane.depth, 0.2), 'cage footprint');
assert.ok(size.y > 1.9 && size.y < 2.2, 'cage is head height, not a wall');
assert.ok(close(cb.min.y, 0, 0.02), 'cage sits on its base');
cage.rotation.y = F.propane.rotation;
cage.position.fromArray([F.propane.at[0], 0, F.propane.at[1]]);
cage.updateMatrixWorld(true);
const pb = new THREE.Box3().setFromObject(cage);
assert.ok(pb.min.x > 15 && pb.max.x < 18, 'cage sits on the paved edge beside the island');
assert.ok(pb.min.z > -33 && pb.max.z < -30, 'cage is beside the car-wash-side tree island');
assert.ok(close(Math.hypot(F.propane.at[0] - F.palm.at[0], F.propane.at[1] - F.palm.at[1]), 2.0, 0.02), 'cage is beside, not on, the landscaped island');
const front = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), F.propane.rotation);
const towardHighway = new THREE.Vector3(71.56 - F.propane.at[0], 0, 55.25 - F.propane.at[1]).normalize();
assert.ok(front.dot(towardHighway) > 0.999, 'cage door faces the nearest I-35 pavement');
const names = [];
cage.traverse(o => names.push(o.name));
for (const n of ['cage-header-sign', 'cage-mesh-door', 'cage-mesh-back']) assert.ok(names.includes(n), n);
assert.equal(names.filter(n => n === 'cage-mesh-door').length, 2, 'two door leaves');
assert.ok(names.filter(n => n === 'cage-post').length === 4, 'four corner posts');

// --- the palm ---------------------------------------------------------------
const palm = buildPalm({ height: F.palm.height, trunkMat: mats.trunk, frondMat: mats.frond });
palm.updateMatrixWorld(true);
const palmBox = new THREE.Box3().setFromObject(palm);
assert.ok(palmBox.max.y > 6.6 && palmBox.max.y < 7.6, 'palm is storey-and-a-half tall');
assert.ok(palmBox.min.y > -0.2 && palmBox.min.y < 0.2, 'palm base at its origin');
assert.deepEqual(F.palm.at, [14.5, -31.5], 'palm remains on the tree island by the car wash');

// --- applySiteFixes on a stand-in root --------------------------------------
const root = new THREE.Group();
const victim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6, 2, 2, 2));
victim.position.copy(new THREE.Vector3().fromArray(centre).applyMatrix4(toRoot));
const bottles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial(), 6);
bottles.name = 'Propane_tank_00002';
root.add(victim, bottles);
root.updateMatrixWorld(true);
const summary = applySiteFixes(root);
assert.ok(summary.cut > 0, 'applySiteFixes cuts the highlighted props');
assert.equal(bottles.visible, false, 'applySiteFixes hides the loose bottles');
assert.equal(summary.props, 2, 'palm and cage added');
const group = root.getObjectByName('Site-fixes');
assert.ok(group, 'props live in one group');
assert.ok(close(group.rotation.y, S.heading), 'props are built in the storefront frame');
const cageInRoot = root.getObjectByName('Propane-exchange-cabinet');
assert.ok(cageInRoot, 'cage added to the model');
console.log('site fixes ok:', summary);
