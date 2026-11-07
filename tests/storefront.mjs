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
// Centred on that wall, as the owner asked.
assert.ok(Math.abs((screen.min.z + screen.max.z) / 2 - (S.glazingZ[1] + S.storeZ[1]) / 2) < 0.02, 'LED screen centred on the south block wall');

// Pier fixtures sit on the pier, between the glazing and the locker (z -7.4).
for (const name of ['Emergency-shutoff-sign', 'Extinguisher-cabinet', 'Vape-poster', 'Trash-receptacle', 'Switch-box']) {
  const [o] = named(name); assert.ok(o, name);
  const b = local(o);
  assert.ok(b.min.z >= S.pierZ[0] - 1e-6 && b.max.z <= S.pierZ[1] + 1e-6, `${name} on the pier`);
  assert.ok(b.min.x >= S.wallX - 1e-6 && b.max.y < S.fasciaY[0], `${name} in front of the wall, below the fascia`);
}

// Photos: a projecting fascia band (~0.9 m) under a set-back parapet that
// together cover the model's old fascia (y 3.9-4.9), and the LED strip runs
// the full front.
const fascia = local(named('Fascia')[0]), parapet = local(named('Parapet')[0]);
assert.ok(fascia.max.x > 10.4 && fascia.min.y <= 3.3 && fascia.max.y >= 4.1 && fascia.min.z < -10.3 && fascia.max.z > 10.5, 'fascia band runs past both corners');
assert.ok(parapet.min.y <= fascia.max.y + 1e-6 && parapet.max.y >= 4.99 && parapet.max.x >= 10.1 && parapet.max.x < fascia.max.x, 'parapet set back above the band');
const led = local(named('LED-light-strip')[0]);
assert.ok(led.max.y <= fascia.min.y + 1e-6 && led.min.z <= -9.9 && led.max.z >= 10.1);

// The band around the store is grey now; red only on the sign over the doors.
assert.equal(named('Fascia')[0].material.color.getHexString(), '9fa3a6');
for (const n of ['Band-sleeve-north', 'Band-sleeve-south', 'Band-sleeve-back']) assert.equal(named(n).length, 1, n);
const signPanel = local(named('Sign-panel')[0]);
assert.ok(signPanel.min.z <= S.doorZ[0] && signPanel.max.z >= S.doorZ[1] && signPanel.max.z - signPanel.min.z < 3.2, 'sign spans the doors (about 2.9 m)');
assert.ok(signPanel.min.y >= fascia.min.y && signPanel.max.y <= fascia.max.y, 'sign sits on the fascia band');

// Bays north of the doors are equal (straight-on photo).
const north = S.bays.filter(b => b.z[1] <= S.doorZ[0]).map(b => b.z[1] - b.z[0]);
assert.equal(north.length, 4);
for (const wdt of north) assert.ok(Math.abs(wdt - north[0]) < 1e-9, 'equal bays north of the doors');

// Three roof floodlights on the coping with spotlights aimed at the lot.
assert.equal(named('Roof-floodlight').length, 3);
assert.equal(group.userData.floodLights.length, 3);
for (const l of group.userData.floodLights) { l.updateMatrixWorld(true); l.target.updateMatrixWorld(true); }
for (const l of group.userData.floodLights) {
  const p = l.getWorldPosition(new THREE.Vector3()), t = l.target.getWorldPosition(new THREE.Vector3());
  assert.ok(p.y > 5 && t.y < 1 && t.x - p.x > 8, 'flood above the parapet, aimed down at the lot');
}
// Lit and animated displays: LED boards, OPEN sign, wall screen and the locker kiosk.
for (const n of ['LED-screen', 'Open-sign', 'Amazon-locker-screen', 'LED-sign-CBD']) assert.equal(named(n)[0].material.type, 'MeshBasicMaterial', `${n} is lit`);
assert.ok(group.userData.liveCanvases >= 7, 'animated canvases');
group.userData.applyLighting({ day: 0, golden: 0, night: 1 });
assert.ok(group.userData.floodLights.every(l => l.intensity > 50));
group.userData.applyLighting({ day: 1, golden: 0, night: 0 });
assert.ok(group.userData.floodLights.every(l => l.intensity === 0));
group.userData.animate(3.7); // no canvases in tests: must not throw

// One delineator per removed bollard, standing on the bollard's foot.
const delineators = named('Delineator-post');
assert.equal(delineators.length, posts.length);
delineators.forEach((p, i) => assert.deepEqual(p.position.toArray(), posts[i]));

// Everything stays in the storefront zone and is finite.
group.rotation.y = 0; group.updateMatrixWorld(true);
const zone = new THREE.Box3(); group.traverse(o => { if (o.isMesh) zone.expandByObject(o); }); group.rotation.y = S.heading;
assert.ok(zone.min.x > S.band.backX - 0.1 && zone.max.x < 12.2 && zone.min.y >= S.walkY - 0.65 && zone.max.y < 5.8 && zone.min.z > -10.5 && zone.max.z < 10.7,
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
  assert.ok(settled.length >= 4, 'two receptacles, cabinet and A-frame settle');
  for (const o of settled) assert.ok(Math.abs(o.position.y - 0.08) < 1e-6, `${o.name} raised onto the walk`);
  // The rubber mat follows the walk vertex by vertex: bevel at the walk, top 12 mm up.
  const mat = g2.getObjectByName('Entry-mat'), ys = mat.geometry.attributes.position;
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < ys.count; i++) { lo = Math.min(lo, ys.getY(i)); hi = Math.max(hi, ys.getY(i)); }
  assert.ok(Math.abs(lo - 0.082) < 1e-4 && Math.abs(hi - 0.094) < 1e-4, `mat follows the walk (${lo}..${hi})`);
});

// The page applies it to the detailed model.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /try \{ replaceModelStorefront\(root\); \}/);
console.log(`PASS: photo-matched storefront (${S.bays.length} bays, pier fixtures, fascia over old lettering, ${delineators.length} delineators), all inside the storefront zone`);
