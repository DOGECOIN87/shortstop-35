// node --experimental-default-type=module tests/site-fixes.mjs
// The sidewalk props the owner circled are gone, the grass-island light and
// palm are restored, and the propane cage stands on the striped concrete
// rectangle outside the nearer island beside accessible parking.
// Geometry is checked in the storefront frame (store -> root local).
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { STOREFRONT as S } from '../scripts/storefront.js';
import { SITE_FIXES as F, applySiteFixes, buildGrassIslandLight, buildPalm, buildPropaneCabinet, cutMesh } from '../scripts/site-fixes.js';

const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// --- the cut: a box of triangles inside the grey placeholder's box disappears
const box = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
const mesh = new THREE.Mesh(box);
const store = new THREE.Matrix4().makeRotationY(-S.heading);
const [grey] = F.cutBoxes;
const frame = new THREE.Matrix4().multiplyMatrices(store, mesh.matrixWorld.clone().invert());
// (`mesh` is its own root here: its matrixWorld is the root's)
const before = mesh.geometry.index.count;
const removed = cutMesh(mesh, frame, F.cutBoxes.map(b => b.slice(0, 3).concat(b.slice(3))));
assert.equal(removed, 0, 'a mesh far from the boxes is untouched');
const centre = [(grey[0] + grey[3]) / 2, (grey[1] + grey[4]) / 2, (grey[2] + grey[5]) / 2];
const host = new THREE.Group(); // stands in for the glTF root
const placed = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4, 2, 2, 2));
const toRoot = store.clone().invert(); // store -> root local
placed.position.copy(new THREE.Vector3().fromArray(centre).applyMatrix4(toRoot));
host.add(placed); host.updateMatrixWorld(true);
// index.html cuts with storefrontFrame() * root.matrixWorld^-1, i.e. root-local -> store.
const frame2 = new THREE.Matrix4().multiplyMatrices(store, host.matrixWorld.clone().invert());
assert.ok(cutMesh(placed, frame2, F.cutBoxes) > 0, 'triangles inside the grey placeholder box are cut');
assert.equal(placed.geometry.index.count, 0, 'the whole box inside the region is removed');

// --- the named air/water machine is hidden; pavement in both marked areas stays
const covers = (p) => F.cutBoxes.some(b => p[0] > b[0] && p[1] > b[1] && p[2] > b[2] && p[0] < b[3] && p[1] < b[4] && p[2] < b[5]);
assert.equal(F.cutBoxes.length, 1, 'only the grey placeholder uses a spatial cut');
assert.ok(F.hideMeshes.some(re => re.test('Air_&_water_machine')), 'the named red air/water machine is hidden exactly');
// The grey box stood at the south corner, where the model's bottles are.
assert.ok(covers([11.0, 1.2, 12.4]), 'grey box is inside a cut box');
assert.deepEqual(F.protectedCutMaterials, ['SS Walk concrete', 'SS Curb concrete']);
assert.ok(F.hideMeshes.some(re => re.test('Propane_tank_00002')), 'the loose bottles are hidden');
assert.ok(!F.hideMeshes.some(re => re.test('Propane-exchange-cabinet')), 'the new cage is not hidden');

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
assert.ok(pb.min.x > 18 && pb.max.x < 22, 'cage sits fully inside the user-outlined concrete rectangle');
assert.ok(pb.min.z > -21 && pb.max.z < -17, 'cage is beside the accessible-parking area');
assert.deepEqual(F.propane.at, [20.0, -19.0], 'cage is inside the user-outlined concrete rectangle');
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
assert.deepEqual(F.palm.at, [14.5, -31.5], 'palm on the farther marked island by the car wash');

// --- the restored grass-island light ----------------------------------------
const islandLight = buildGrassIslandLight({ height: F.light.height, poleMat: mats.steel, baseMat: mats.lightBase, lensMat: mats.lamp });
islandLight.group.updateMatrixWorld(true);
const lightBox = new THREE.Box3().setFromObject(islandLight.group);
assert.ok(close(lightBox.min.y, 0, 0.02), 'light footing sits on its base plane');
assert.ok(lightBox.max.y > 7.9 && lightBox.max.y < 8.2, 'streetlight reaches its expected height');
assert.equal(islandLight.light.name, 'Grass-island-light-source');
assert.deepEqual(F.light.at, [11.5, -31.5], 'light is restored on the car-wash-side grass island');
assert.ok(close(F.light.at[1], F.palm.at[1]) && F.light.at[0] < F.palm.at[0] - 2, 'light shares the grass bed without overlapping the palm');

// --- applySiteFixes on a stand-in root --------------------------------------
const root = new THREE.Group();
const victim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6, 2, 2, 2));
victim.position.copy(new THREE.Vector3().fromArray(centre).applyMatrix4(toRoot));
const airWater = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
airWater.name = 'Air_&_water_machine';
const walk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4, 2, 2, 2), new THREE.MeshStandardMaterial({ name: 'SS Walk concrete' }));
walk.position.copy(new THREE.Vector3().fromArray(centre).applyMatrix4(toRoot));
const curb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4, 2, 2, 2), new THREE.MeshStandardMaterial({ name: 'SS Curb concrete' }));
curb.position.copy(new THREE.Vector3().fromArray(centre).applyMatrix4(toRoot));
const walkTriangles = walk.geometry.index.count, curbTriangles = curb.geometry.index.count;
const bottles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial(), 6);
bottles.name = 'Propane_tank_00002';
root.add(victim, airWater, walk, curb, bottles);
root.updateMatrixWorld(true);
const summary = applySiteFixes(root);
assert.ok(summary.cut > 0, 'applySiteFixes cuts the highlighted props');
assert.equal(bottles.visible, false, 'applySiteFixes hides the loose bottles');
assert.equal(airWater.visible, false, 'applySiteFixes hides the named air/water machine');
assert.equal(walk.geometry.index.count, walkTriangles, 'the sidewalk is not cut where the removed box stood');
assert.equal(curb.geometry.index.count, curbTriangles, 'the curb is not cut where the removed box stood');
assert.equal(summary.hidden, 2, 'the air/water machine and bottles are hidden');
assert.equal(summary.props, 3, 'palm, grass-island light and cage added');
assert.equal(summary.lights.length, 1, 'spotlight is returned for time-of-day control');
const group = root.getObjectByName('Site-fixes');
assert.ok(group, 'props live in one group');
assert.ok(close(group.rotation.y, S.heading), 'props are built in the storefront frame');
const cageInRoot = root.getObjectByName('Propane-exchange-cabinet');
assert.ok(cageInRoot, 'cage added to the model');
console.log('site fixes ok:', summary);
