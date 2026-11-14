// node --experimental-default-type=module tests/north-yard.mjs
// The yard between the store's north-east corner and the car wash follows the
// owner's photos: a walk north to the car wash with a red ramp at the aisle,
// a west walk, a lawn with the pole light and signs, the outlined aisle hatch,
// a blue symbol square in the stall and the crossing to the car wash between
// its red pads. Pavement repaint turns the model's blue stall back to concrete.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { NORTH_YARD as Y, buildNorthYard, washToStore, storeToWash, insidePolygon, polygonArea, heightField } from '../scripts/north-yard.js';
import { WASH } from '../scripts/car-wash.js';
import { SITE_FIXES } from '../scripts/site-fixes.js';
import { PAVEMENT, splitLotTriangles } from '../scripts/pavement.js';

const close = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// frames round-trip
for (const p of [[-8.37, -20.33], [0, 0], [5, -30]]) { const q = storeToWash(washToStore(p)); assert.ok(close(q[0], p[0]) && close(q[1], p[1]), 'wash/store frames invert'); }

// The crossing's wide end is exactly the north walk's end; its narrow end sits
// on the car-wash sidewalk curb between the two red pads.
const crossing = Y.crossingWash.map(washToStore);
const [, , walkEndE, walkEndW] = Y.northWalk;
assert.ok(close(crossing[1][0], walkEndW[0], 1e-6) && close(crossing[1][1], walkEndW[1], 1e-6), 'crossing meets the walk (west corner)');
assert.ok(close(crossing[2][0], walkEndE[0], 1e-6) && close(crossing[2][1], walkEndE[1], 1e-6), 'crossing meets the walk (east corner)');
const narrow = [Y.crossingWash[0][1], Y.crossingWash[3][1]];
const [padA, padB] = WASH.pads;
assert.ok(Math.max(...narrow) < padA[0] && Math.min(...narrow) > padB[1], 'narrow end between the red pads');

// Lawn holds the pole, sign post, ROGUE sign and bush; walks and lawn stay
// clear of the propane island and the cabinet.
for (const k of ['pole', 'signPost', 'rogue']) assert.ok(insidePolygon(Y[k].at, Y.lawn), `${k} in the lawn`);
assert.ok(insidePolygon(Y.bush, Y.lawn), 'bush in the lawn');
assert.ok(polygonArea(Y.lawn) > 3, 'lawn is big enough for the pole and signs');
const cabinetX0 = SITE_FIXES.propane.at[0] - SITE_FIXES.propane.width / 2;
for (const poly of [Y.northWalk, Y.westWalk, Y.lawn]) for (const [x] of poly) assert.ok(x < cabinetX0 - 0.5 && x < 12.1, 'west of the propane island');
// Nothing lands on the car wash or its sidewalk (wash x > curb + drive is the yard side).
for (const poly of [Y.northWalk, Y.westWalk, Y.lawn]) for (const p of poly) assert.ok(storeToWash(p)[0] >= Y.curbWashX + Y.drive - 1e-6, 'yard stays on the store side of the drive');
// The ramp lines up with the aisle.
assert.ok(Y.rampZ[0] >= Y.aisle.z[0] && Y.rampZ[1] <= Y.aisle.z[1], 'ramp at the aisle');
assert.ok(close(Y.aisle.z[1], Y.stall.z[0]), 'stall beside the aisle');

// Build on a sloped stand-in ground.
const ground = (x, z) => 0.3 + 0.01 * x - 0.005 * z;
const { group, lights } = buildNorthYard({ ground });
const named = n => { const out = []; group.traverse(o => { if (o.name === n) out.push(o); }); return out; };
for (const n of ['North-walk', 'West-walk', 'Corner-lawn', 'Red-stamped-curb-ramp', 'Accessible-symbol', 'Stall-line', 'Lawn-twin-pole-light', 'Van-accessible-sign', 'ROGUE-stake-sign', 'Lawn-shrub'])
  assert.equal(named(n).length, 1, n);
assert.equal(named('Aisle-outline').length, 3, 'aisle outline (open at the walk)');
assert.ok(named('Aisle-stripe').length >= 5, 'diagonal aisle stripes');
assert.equal(named('Crossing-outline').length, 4); assert.equal(named('Crossing-stripe').length, 3);
assert.equal(lights.length, 1, 'pole light handed to the lighting presets');
assert.equal(group.getObjectByName('North-walk').material.name, PAVEMENT.walkMaterial, 'walk gets the pavement finish');

// Walk 6 in above the ground, down to the ramp at the aisle.
const top = (mesh, x, z) => { const p = mesh.geometry.attributes.position; let best = null, d = Infinity; for (let i = 0; i < p.count; i++) { const dd = Math.hypot(p.getX(i) - x, p.getZ(i) - z); if (dd < d) { d = dd; best = p.getY(i); } } return best; };
const walk = group.getObjectByName('North-walk');
const zMid = (Y.rampZ[0] + Y.rampZ[1]) / 2;
assert.ok(close(top(walk, 11.05, -19) - ground(11.05, -19), Y.walkHeight, 0.03), 'walk 6 in above the ground');
assert.ok(top(walk, 11.05, zMid) - ground(11.05, zMid) < 0.05, 'ramp drops to the aisle');
for (const o of [walk, group.getObjectByName('Corner-lawn')]) {
  const n = o.geometry.attributes.normal; for (let i = 0; i < n.count; i++) assert.ok(n.getY(i) > 0.9, `${o.name} faces up`);
}
group.traverse(o => { if (o.isMesh) assert.ok(o.geometry.attributes.position.array.every(Number.isFinite), `${o.name} finite`); });

// Height field from a model stand-in: a sloped plane, skipping walk tops.
{
  const root = new THREE.Group();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(40, 40, 8, 8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ name: 'PaletteMaterial001' }));
  plane.position.set(10, 0.3, -18);
  const walkSlab = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 6), new THREE.MeshStandardMaterial({ name: 'SS Walk concrete' })); walkSlab.position.set(11, 0.45, -18);
  root.add(plane, walkSlab);
  const h = heightField(root, new THREE.Matrix4(), [4, -26, 19, -10], 0.25, { skipMaterials: ['SS Walk concrete'] });
  assert.ok(close(h(11, -18), 0.3, 1e-4), 'walk tops are not ground');
}

// Pavement repaint: blue stall cell becomes lot paving, old aisle stripes go.
{
  const L = PAVEMENT.lotCell, quad = (x0, z0, x1, z1, cell) => ({ pos: [x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z0, x1, 0, z1, x0, 0, z1], uv: Array(12).fill(cell) });
  const parts = [quad(13, -14, 17, -12, L), quad(13, -14, 17, -12, 0.012), quad(13, -16, 17, -15, 0.004), quad(30, -14, 32, -12, 0.012)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(parts.flatMap(p => p.pos), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(parts.flatMap(p => p.uv), 2)); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ name: PAVEMENT.lotMaterial }));
  const h = 2 * Math.asin(0.019633694752808857);
  mesh.rotation.y = h; mesh.updateMatrixWorld(true); // built in the store frame, turned like the model
  const lot = splitLotTriangles(mesh, new THREE.MeshStandardMaterial(), { repaint: PAVEMENT.repaint, toStore: new THREE.Matrix4().makeRotationY(-h) });
  assert.equal(lot.geometry.index.count / 3, 4, 'lot plus the repainted stall');
  assert.equal(mesh.geometry.index.count / 3, 2, 'blue paint elsewhere is kept; old stripes dropped');
}
console.log(`PASS: north yard (walks, ${polygonArea(Y.lawn).toFixed(1)} m2 lawn with pole and signs, ramp at the aisle, aisle hatch, stall symbol, crossing between the pads) and stall repaint`);
