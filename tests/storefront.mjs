// node --experimental-default-type=module tests/storefront.mjs
// The FoodMart storefront follows the owner's photos and stays inside the
// model's storefront zone: block pier between glazing and Amazon locker,
// decal kick panels, single door, fascia hiding the old lettering, and
// delineators standing where the model's bollards were.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { STOREFRONT as S, buildStorefront, storefrontFrame } from '../scripts/storefront.js';

const glowMat = () => new THREE.MeshStandardMaterial();
const posts = [[11.75, 0.42, -8.58], [11.75, 0.36, -3.58], [11.75, 0.36, 1.42]];
const group = buildStorefront({ ctex: () => new THREE.Texture(), glowMat, logoMap: new THREE.Texture(), posts });
const all = []; group.traverse(o => all.push(o));
const named = n => all.filter(o => o.name === n);
const local = o => { // bounds in the storefront frame (undo the group's heading)
  group.rotation.y = 0; group.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o, true); group.rotation.y = S.heading; return b;
};

// Bays tile the glazing exactly, with the door in the one gap.
const edges = S.bays.map(b => b.z);
assert.equal(edges[0][0], S.glazingZ[0]); assert.equal(edges.at(-1)[1], S.glazingZ[1]);
for (let i = 1; i < edges.length; i++) {
  const gap = [edges[i - 1][1], edges[i][0]];
  if (gap[0] !== gap[1]) assert.deepEqual(gap, S.doorZ, 'only the door interrupts the bays');
}
assert.equal(S.pierZ[1], S.glazingZ[0], 'pier meets the glazing');
assert.ok(S.pierZ[1] - S.pierZ[0] > 1.6 && S.pierZ[1] - S.pierZ[0] < 2.6, 'pier width as in photo 2');
for (const art of ['reddy-ice', 'geek-bar', 'candy', 'vape-art']) assert.equal(named(`Kick-panel-${art}`).length, 1, art);
assert.equal(named('Open-sign').length, 1);
// Photo details: frosted Reddy Ice upper glass, blinds over the candy bay, the
// vape poster on the A-frame, two receptacles, two cameras, dressed Amazon locker.
assert.equal(named('Window-blinds').length, 1);
assert.equal(named('Trash-receptacle').length, 2);
assert.equal(named('Security-camera').length, 2);
for (const n of ['Amazon-locker-front', 'Amazon-locker-side', 'Amazon-locker-light']) assert.equal(named(n).length, 1, n);
assert.equal(named('A-frame-poster')[0].material.map, named('Vape-poster')[0].material.map, 'A-frame shows the vape poster');
assert.equal(named('FoodMart-lettering').length, 1);
assert.equal(named('Entry-door').length, 1);
// Straight-on photo: a pair of doors with pulls, LED letter signs over the four
// bays south of the door, and an LED screen on the south block wall.
assert.equal(named('Door-leaf').length, 2, 'double doors');
assert.equal(named('Door-pull').length, 2);
assert.ok(S.doorZ[1] - S.doorZ[0] > 1.6, 'door pair is wide enough for two leaves');
const ledBays = S.bays.filter(b => b.led);
assert.deepEqual(ledBays.map(b => b.led), ['DELTA 8', '10THC', 'E-CIGS', 'CBD']);
for (const b of ledBays) assert.ok(b.z[0] >= S.doorZ[1], `${b.led} sign is south of the door`);
for (const n of ['CBD', 'E-CIGS', '10THC', 'DELTA 8']) assert.equal(named(`LED-sign-${n}`).length, 1, n);
const screen = local(named('LED-screen-housing')[0]);
assert.ok(screen.min.z >= S.glazingZ[1] && screen.max.z <= S.storeZ[1] && screen.min.y > 1.5 && screen.max.y < S.fasciaY[0], 'LED screen on the south block wall');

// Pier fixtures sit on the pier, between the glazing and the locker (z -7.4).
for (const name of ['Emergency-shutoff-sign', 'Extinguisher-cabinet', 'Vape-poster', 'Trash-receptacle', 'Switch-box']) {
  const [o] = named(name); assert.ok(o, name);
  const b = local(o);
  assert.ok(b.min.z >= S.pierZ[0] - 1e-6 && b.max.z <= S.pierZ[1] + 1e-6, `${name} on the pier`);
  assert.ok(b.min.x >= S.wallX - 1e-6 && b.max.y < S.fasciaY[0], `${name} in front of the wall, below the fascia`);
}

// Fascia hides the model's raised letters (x <= 10.16, y 3.9-4.9, |z| < 6.5)
// and the LED strip runs the full front.
const fascia = local(named('Fascia')[0]);
assert.ok(fascia.max.x > 10.2 && fascia.min.y <= 3.9 && fascia.max.y >= 4.9 && fascia.min.z < -9.9 && fascia.max.z > 10.1);
const led = local(named('LED-light-strip')[0]);
assert.ok(led.max.y <= fascia.min.y + 1e-6 && led.min.z <= -9.9 && led.max.z >= 10.1);

// The band around the store is grey now; red only on the sign over the doors.
assert.equal(named('Fascia')[0].material.color.getHexString(), '9fa3a6');
for (const n of ['Band-sleeve-north', 'Band-sleeve-south', 'Band-sleeve-back']) assert.equal(named(n).length, 1, n);
const signPanel = local(named('Sign-panel-red')[0]);
assert.ok(signPanel.min.z <= S.doorZ[0] && signPanel.max.z >= S.doorZ[1] && signPanel.max.z - signPanel.min.z < 7, 'red only over the door area');

// One delineator per removed bollard, standing on the bollard's foot.
const delineators = named('Delineator-post');
assert.equal(delineators.length, posts.length);
delineators.forEach((p, i) => assert.deepEqual(p.position.toArray(), posts[i]));

// Everything stays in the storefront zone and is finite.
const zone = local(group);
assert.ok(zone.min.x > S.band.backX - 0.1 && zone.max.x < 12.2 && zone.min.y >= 0.3 && zone.max.y < 5.1 && zone.min.z > -10.2 && zone.max.z < 10.4,
  `storefront zone ${zone.min.toArray()} .. ${zone.max.toArray()}`);
for (const o of all) if (o.isMesh) {
  const p = o.geometry.attributes.position.array;
  assert.ok(p.every(Number.isFinite), `${o.name} has finite geometry`);
}

// Cut boxes never reach the locker (z < -7.4) or the parked cars (x > 12).
for (const b of S.cutBoxes) assert.ok(b[2] >= -7.46 && b[3] <= 12, `cut box ${b}`);
const frame = storefrontFrame(), back = new THREE.Vector3(1, 0, 0).applyMatrix4(new THREE.Matrix4().makeRotationY(S.heading)).applyMatrix4(frame);
assert.ok(Math.abs(back.x - 1) < 1e-9 && Math.abs(back.z) < 1e-9, 'frame inverts the heading');

// Props settle onto the walk height under them.
import('../scripts/storefront.js').then(({ settleOnWalk }) => {
  const parent = new THREE.Group(); const g2 = buildStorefront({ ctex: () => new THREE.Texture(), glowMat, posts: [] }); parent.add(g2);
  settleOnWalk(g2, () => S.walkY + 0.08);
  const settled = []; g2.traverse(o => { if (o.userData.onWalk) settled.push(o); });
  assert.ok(settled.length >= 5, 'mat, two receptacles, cabinet and A-frame settle');
  for (const o of settled) assert.ok(Math.abs(o.position.y - 0.08 - (o.name === 'Entry-mat' ? S.walkY + 0.0075 : 0)) < 1e-6 || o.name === 'Entry-mat', `${o.name} raised onto the walk`);
});

// The page applies it to the detailed model.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /try \{ replaceModelStorefront\(root\); \}/);
console.log(`PASS: photo-matched storefront (${S.bays.length} bays, pier fixtures, fascia over old lettering, ${delineators.length} delineators), all inside the storefront zone`);
