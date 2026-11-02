// node --experimental-default-type=module tests/sidewalk-levels.mjs
// Sidewalk levelling: walks end up 6 in above the paving beside them, road-side
// curb strips come down flush with the walk (keeping a curb face to the road),
// planter curbs with a raised lawn behind stay, and walks held at the store's
// door thresholds are not lifted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WALK_LEVELS as W, buildHeightGrid, solveWalkLevels, isPavingColour } from '../scripts/sidewalk-levels.js';

const quad = (x0, z0, x1, z1, y) => [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1];
// Paving: lot west of the walk at 0.0, road east of the curb at -0.05.
const paving = [...quad(-10, -10, 0, 30, 0), ...quad(2.6, -10, 12, 30, -0.05)];
// Lawn behind the planter stretch (z 20-30) at 0.55; lawns are not paving.
const lawn = quad(2.6, 20, 8, 30, 0.55);
const ground = buildHeightGrid(paving), surface = buildHeightGrid([...paving, ...lawn]);
assert.equal(ground.query(-1, 5, 1), 0); assert.equal(ground.query(5, 5, 1), -0.05); assert.equal(ground.query(5, 5, -1), -Infinity);
assert.equal(surface.query(5, 25, 1), 0.55);

// Walk strip x 0-2 at lot level (top vertices every 0.5 m), one piece.
const walk = { x: [], y: [], z: [], up: [], comp: [] };
for (let z = -5; z <= 28; z += 0.5) for (const x of [0, 0.5, 1, 1.5, 2]) { walk.x.push(x); walk.y.push(0); walk.z.push(z); walk.up.push(1); walk.comp.push('w'); }
// Curb strip x 2.2-2.5, top 0.6: road side for z < 18 (piece 'road'), planter for z >= 20 (piece 'planter').
const curb = { x: [], y: [], z: [], up: [], comp: [] };
for (let z = -5; z <= 28; z += 0.5) for (const x of [2.2, 2.5]) { curb.x.push(x); curb.y.push(0.6); curb.z.push(z); curb.up.push(1); curb.comp.push(z < 19 ? 'road' : 'planter'); }
const onWalk = (x, z) => x >= -0.01 && x <= 2.01 && z >= -5 && z <= 28;
const res = solveWalkLevels({ walk, curb, ground, surface, onWalk });

for (let i = 0; i < walk.x.length; i++) {
  const lift = res.walkY[i] - walk.y[i];
  assert.ok(lift >= W.lift - 0.005 && lift <= W.lift + 0.06, `walk at x${walk.x[i]} z${walk.z[i]} sits 6 in above the lot (lift ${lift.toFixed(3)})`);
}
for (let c = 0; c < curb.x.length; c++) {
  if (curb.comp[c] === 'road') {
    assert.ok(Math.abs(res.curbY[c] - W.lift) < 0.07, `road-side curb flush with the walk at z${curb.z[c]} (${res.curbY[c].toFixed(3)})`);
    assert.ok(res.curbY[c] >= -0.05 + W.minCurbFace, 'keeps a curb face to the road');
  } else assert.equal(res.curbY[c], 0.6, 'planter curb with a raised lawn behind is untouched');
}
assert.ok(res.lowered > 0 && res.lifted > 0);

// Held walks (against the store) are not lifted; nothing is ever lowered.
const held = solveWalkLevels({ walk, curb, ground, surface, onWalk, hold: x => (x < 1 ? 0 : 1) });
for (let i = 0; i < walk.x.length; i++) {
  if (walk.x[i] < 1) assert.equal(held.walkY[i], walk.y[i]);
  assert.ok(held.walkY[i] >= walk.y[i]);
}

// Palette colours: grass and red stamped islands are not paving.
assert.equal(isPavingColour([0x5f, 0x6e, 0x3c]), false);
assert.equal(isPavingColour([0xd9, 0x61, 0x4c]), false);
for (const c of [[0xc9, 0xca, 0xc7], [0xe8, 0xe8, 0xe8], [0x49, 0x45, 0x44]]) assert.equal(isPavingColour(c), true);

// The page levels the model's sidewalks before rebuilding the storefront.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(html.indexOf('levelModelSidewalks(root') > 0 && html.indexOf('levelModelSidewalks(root') < html.indexOf('try { replaceModelStorefront(root); }'));
console.log('PASS: walks 6 in above the paving, road-side curbs flush with a curb face kept, planter curbs and door-level walks untouched');
