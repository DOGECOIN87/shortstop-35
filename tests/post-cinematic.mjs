// node --experimental-default-type=module tests/post-cinematic.mjs
// Property blur outline and the cinematic tour loop.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { PROPERTY, FREEWAY, propertyDistance, blurAmount } from '../scripts/post-blur.js';
import { SHOTS, createCinematic } from '../scripts/cinematic.js';
import { WASH } from '../scripts/car-wash.js';
import { SITE_FIXES } from '../scripts/site-fixes.js';

// --- the property outline (storefront frame) ---------------------------------
const inside = {
  'store corners': [[-6.4, -9.9], [10.0, -9.9], [10.0, 10.1], [-6.4, 10.1]],
  'canopy corners': [[24.9, -18.5], [38.8, -17.9], [37.5, 14.9], [23.6, 14.3]],
  'pumps': [[27.2, -13.8], [35.2, 13.2]],
  'car wash corners': [[5.74, -33.74], [11.73, -28.53], [4.21, -19.95], [-1.86, -25.23]],
  'pay station, propane, palm, island light': [[-3.5, -23.4], SITE_FIXES.propane.at, SITE_FIXES.palm.at, SITE_FIXES.light.at],
  'rear drive behind the store': [[-11, 0], [-10, -8], [-8, 12]]
};
for (const [what, pts] of Object.entries(inside)) for (const p of pts) {
  assert.ok(propertyDistance(p) < -0.5, `${what} ${p} inside the property`);
  assert.equal(blurAmount(p), 0, `${what} stays sharp`);
}
// The freeway stays sharp (owner): I-35 and the frontage roads either side.
for (const [p, what] of [[[61.3, -5.6], 'frontage road at the store'], [[126.4, 24.2], 'I-35 main lanes'], [[172, -31.6], 'I-35 further south'],
  [[91.5, -20.3], 'frontage road to the south'], [[184, 44.1], 'opposite frontage road'], [[120, 55], 'northbound bridge']]) {
  assert.equal(blurAmount(p), 0, `${what} ${p} stays sharp`);
}
assert.ok(FREEWAY.length > 6 && FREEWAY.length <= 48, 'freeway corridors fit the shader array');
for (const [p, what] of [[[-30, -40], 'coffee kiosk lot'], [[-40, 35], 'Edelweiss Inn'], [[10, -80], 'cross street beyond']]) {
  assert.ok(propertyDistance(p) > PROPERTY.feather[1], `${what} outside`);
  assert.equal(blurAmount(p), 1, `${what} fully blurred`);
}
assert.ok(PROPERTY.outline.length <= 32, 'outline fits the shader array');

// --- the cinematic loop -------------------------------------------------------
const cine = createCinematic();
assert.ok(cine.duration > 45 && cine.duration < 150, `loop length ${cine.duration.toFixed(1)} s`);
const a = cine.sample(0), b = cine.sample(cine.duration);
assert.ok(a.pos.distanceTo(b.pos) < 1e-3 && a.aim.distanceTo(b.aim) < 1e-3, 'seamless loop');
const dt = 1 / 60;
let prev = cine.sample(0, { pos: new THREE.Vector3(), aim: new THREE.Vector3(), fov: 1 }), prevV = null, maxSpeed = 0, maxAccel = 0, prevD = null, maxTurn = 0;
const cur = { pos: new THREE.Vector3(), aim: new THREE.Vector3(), fov: 1 };
// Obstacles: store, car wash (rotated box), canopy deck, pump islands, pylons.
const washFrame = ([x, z]) => { const a = WASH.heading - 2 * Math.asin(0.019633694752808857), c = Math.cos(a), s = Math.sin(a); return [x * c - z * s, x * s + z * c]; };
for (let t = dt; t <= cine.duration + 1e-9; t += dt) {
  cine.sample(t, cur);
  const v = cur.pos.distanceTo(prev.pos) / dt; maxSpeed = Math.max(maxSpeed, v);
  if (prevV !== null) maxAccel = Math.max(maxAccel, Math.abs(v - prevV) / dt);
  prevV = v;
  const d = cur.pos.clone().sub(prev.pos);
  if (prevD && d.length() > 1e-4 && prevD.length() > 1e-4) maxTurn = Math.max(maxTurn, Math.acos(Math.min(1, d.clone().normalize().dot(prevD.clone().normalize()))) * 180 / Math.PI);
  prevD = d;
  const { x, y, z } = cur.pos;
  assert.ok(y > 1.8, `camera above head height (t=${t.toFixed(2)}, y=${y.toFixed(2)})`);
  assert.ok(!(x > -7 && x < 10.6 && z > -10.5 && z < 10.7 && y < 6), `not inside the store (t=${t.toFixed(2)})`);
  const [wx, wz] = washFrame([x, z]);
  assert.ok(!(wx > WASH.x[0] - 0.8 && wx < WASH.x[1] + 0.8 && wz > WASH.z[0] - 0.8 && wz < WASH.z[1] + 0.8 && y < 5.5), `not inside the car wash (t=${t.toFixed(2)})`);
  if (x > 22.5 && x < 40.5 && z > -19.5 && z < 16.5) {
    assert.ok(y < 4.3 || y > 6.5, `clear of the canopy deck (t=${t.toFixed(2)}, y=${y.toFixed(2)})`);
    if (y < 4.3) for (const iz of [-13.8, -4.8, 4.2, 13.2]) assert.ok(Math.abs(z - iz) > 2.2, `clear of the pump island at z ${iz} (t=${t.toFixed(2)})`);
  }
  for (const [px, pz, top] of [[39.0, -27.6, 14], [14.8, 39.3, 19.6], [6.7, 19.1, 20.3]]) assert.ok(Math.hypot(x - px, z - pz) > 3 || y > top + 2, `clear of the pylon/flagpole at ${px},${pz}`);
  [prev.pos, cur.pos] = [cur.pos.clone(), prev.pos];
}
assert.ok(maxSpeed < 12, `top speed ${maxSpeed.toFixed(1)} m/s`);
assert.ok(maxAccel < 3, `smooth speed changes (max ${maxAccel.toFixed(2)} m/s2)`);
assert.ok(maxTurn < 3, `no kinks or hairpins (max ${maxTurn.toFixed(2)} deg per frame)`);
assert.ok(SHOTS.some(s => s.pos[1] < 3), 'flies at eye level somewhere');

// The page uses both.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /createPostPipeline\(renderer/); assert.match(html, /post\.setPropertyFrame\(/); assert.match(html, /cinematic = createCinematic\(\)/);
console.log(`PASS: property outline (store, canopy, car wash, rear drive and the freeway sharp; neighbours blurred) and a ${cine.duration.toFixed(0)} s seamless tour loop (top speed ${maxSpeed.toFixed(1)} m/s, clear of buildings, canopy, pumps and pylons)`);
