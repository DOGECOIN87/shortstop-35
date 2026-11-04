// node --experimental-default-type=module tests/sidewalk-levels.mjs
// Sidewalk and curb levelling: every walk edge stands 6 in above the ground
// right beside it, curb borders along walks are flush with the walk, every
// other raised border comes down to 6 in above the lower ground beside it (but
// never below a raised island it holds), and walks held at the store's door
// thresholds do not move.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WALK_LEVELS as W, buildHeightGrid, solveWalkLevels } from '../scripts/sidewalk-levels.js';

const quad = (x0, z0, x1, z1, y) => [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1];
// Lot west of the walk at 0.0; road east of the walk's curb at -0.05; a lawn
// bed at grade (x 8.3-10, z -5..15) and a raised island (x 8.3-10, z 20..28, 0.58).
const surface = buildHeightGrid([...quad(-10, -10, 0, 40, 0), ...quad(2.6, -10, 20, 40, -0.05), ...quad(8.3, -5, 10, 15, 0), ...quad(8.3, 20, 10, 28, 0.58)]);
assert.equal(surface.query(-1, 5, 1), 0); assert.equal(surface.query(5, 5, 1), -0.05); assert.equal(surface.query(5, 5, -1), -Infinity);
assert.equal(surface.query(9, 25, 1), 0.58);

// Walk strip x 0-2 at lot level, one piece; curb strips 0.6 tall.
const walk = { x: [], y: [], z: [], up: [], comp: [] };
for (let z = -5; z <= 15; z += 0.5) for (const x of [0, 0.5, 1, 1.5, 2]) { walk.x.push(x); walk.y.push(0); walk.z.push(z); walk.up.push(1); walk.comp.push('w'); }
const curb = { x: [], y: [], z: [], up: [], comp: [] };
const strip = (x0, z0, z1, id) => { for (let z = z0; z <= z1; z += 0.5) for (const x of [x0, x0 + 0.3]) { curb.x.push(x); curb.y.push(0.6); curb.z.push(z); curb.up.push(1); curb.comp.push(id); } };
strip(2.2, -5, 15, 'walk-edge'); strip(8.0, -5, 15, 'lawn-edge'); strip(8.0, 20, 28, 'island-edge');
const onCurb = (x, z) => (x >= 2.19 && x <= 2.51 && z >= -5 && z <= 15) || (x >= 7.99 && x <= 8.31);
const onWalk = (x, z) => x >= -0.01 && x <= 2.01 && z >= -5 && z <= 15;
const res = solveWalkLevels({ walk, curb, surface, onWalk, onCurb });

for (let i = 0; i < walk.x.length; i++) {
  if (walk.z[i] < -3 || walk.z[i] > 13) continue; // walk ends
  const y = res.walkY[i];
  assert.ok(y >= -0.05 + W.lift - 0.01 && y <= W.lift + 0.01, `walk at x${walk.x[i]} z${walk.z[i]} stands 6 in above its edge ground (${y.toFixed(3)})`);
  if (walk.x[i] === 0) assert.ok(Math.abs(y - W.lift) < 0.03, 'west edge 6 in above the lot');
}
for (let c = 0; c < curb.x.length; c++) {
  if (curb.z[c] < -3 || (curb.z[c] > 13 && curb.z[c] < 22) || curb.z[c] > 26) continue;
  const y = res.curbY[c], id = curb.comp[c];
  if (id === 'walk-edge') assert.ok(Math.abs(y - (-0.05 + W.lift)) < 0.04, `curb along the walk is flush with it (${y.toFixed(3)})`);
  if (id === "lawn-edge") assert.ok(Math.abs(y - (-0.05 + W.lift)) < 0.02, `lawn border lowered to 6 in above the lower ground (road) (${y.toFixed(3)})`);
  if (id === 'island-edge') assert.ok(y >= 0.58 - 1e-9 && y <= 0.6 + 1e-9, `raised island keeps its border (${y.toFixed(3)})`);
}
assert.ok(res.lowered > 0);

// Held walks (against the store) do not move.
const held = solveWalkLevels({ walk, curb, surface, onWalk, onCurb, hold: x => (x < 1 ? 0 : 1) });
for (let i = 0; i < walk.x.length; i++) if (walk.x[i] < 1) assert.equal(held.walkY[i], walk.y[i]);

// The page levels the model's sidewalks before rebuilding the storefront.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(html.indexOf('levelModelSidewalks(root') > 0 && html.indexOf('levelModelSidewalks(root') < html.indexOf('try { replaceModelStorefront(root); }'));
console.log('PASS: walk edges 6 in above the ground, curbs along walks flush, other raised borders 6 in above the ground (raised islands kept), door-level walks untouched');
