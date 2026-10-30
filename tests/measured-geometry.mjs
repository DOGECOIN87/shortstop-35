// node --experimental-default-type=module --loader ./tests/three-loader.mjs tests/measured-geometry.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { FontLoader } from '../vendor/jsm/loaders/FontLoader.js';
import { CANOPY, STORE, SITE_HEADING_DEG, canopyLightRows } from '../scripts/station-geometry.js';
import { createReferenceDesign } from '../scripts/reference-design.js';
import { addStationDetails } from '../scripts/station-details.js';
import { solarPosition, solarEvents, sunPresetVector } from '../scripts/sun-position.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// Lidar/OSM-measured canopy: 32.4 x 12.8 m, roof top 5.40 m (lidar ~5.34 m).
assert.equal(CANOPY.width, 12.8); assert.equal(CANOPY.length, 32.4);
near(CANOPY.roofTop, 5.40, 1e-9, 'canopy roof top');
assert.ok(CANOPY.edgeTop < CANOPY.roofTop, 'membrane caps the black edge so the roof reads light from above');
near(CANOPY.clearance, 4.195, 0.005, 'derived clearance (~13 ft 9 in, to confirm)');
const material = new THREE.MeshStandardMaterial(), M = new Proxy({}, { get: () => material });
const font = new FontLoader().parse(JSON.parse(fs.readFileSync(new URL('../assets/fonts/helvetiker_bold.typeface.json', import.meta.url), 'utf8')));
const design = createReferenceDesign({ M, font, ctex: () => new THREE.Texture(), glowMat: () => material, makeHeaderMaterial: () => material });
const islandZ = [-14, -5, 4, 13];
const canopy = design.canopy(islandZ); canopy.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(canopy);
near(box.max.x - box.min.x, CANOPY.width + 0.2, 0.25, 'canopy width incl. trim');
assert.ok(box.max.z - box.min.z > CANOPY.length && box.max.z - box.min.z < CANOPY.length + 0.9, 'canopy length incl. end faces and roundels');
const roof = new THREE.Box3().setFromObject(canopy.getObjectByName('Roof-surface'));
near(roof.max.y, CANOPY.roofTop, 1e-6, 'canopy roof line follows lidar (~5.4 m), not the old 6.87 m');
const badges = canopy.children.filter(c => c.name === 'Canopy-star-roundel');
assert.equal(badges.length, 2);
for (const b of badges) { const bb = new THREE.Box3().setFromObject(b); assert.ok(bb.max.y > CANOPY.roofTop + 0.5 && bb.max.y < 6.5, `roundel top ${bb.max.y} stands proud of the roof within lidar edge returns (<=6.5 m)`); }
assert.equal(canopy.children.filter(c => c.name === 'Soffit-Techron-graphic').length, 2, 'with TECHRON soffit graphics on both sides');
const soffit = canopy.getObjectByName('White-soffit');
near(soffit.position.y - soffit.geometry.parameters.height / 2, CANOPY.clearance, 1e-9, 'soffit underside');
for (const col of canopy.children.filter(c => c.name === 'Tan-masonry-column')) {
  const top = col.position.y + col.geometry.parameters.height / 2;
  assert.ok(top >= CANOPY.clearance && top <= CANOPY.clearance + 0.1, 'columns meet the soffit');
}
for (const z of islandZ) assert.ok(z - 0.9 > CANOPY.startZ && z + 0.9 < CANOPY.endZ, 'islands stay under the shorter canopy');
const rows = canopyLightRows(); assert.equal(rows.length, 8);
assert.ok(rows[0] > CANOPY.startZ && rows.at(-1) < CANOPY.endZ, 'light rows inside canopy');

// Detail hardware follows the same canopy.
const fuelGroup = new THREE.Group(), storeGroup = new THREE.Group();
const { details } = addStationDetails({ fuelGroup, storeGroup, islandZ, M, ctex: () => new THREE.Texture(), glowMat: () => material });
const ribs = details.getObjectByName('Roof-standing-seams'), mtx = new THREE.Matrix4(), p = new THREE.Vector3();
for (let i = 0; i < ribs.count; i++) { ribs.getMatrixAt(i, mtx); p.setFromMatrixPosition(mtx); assert.ok(p.z > CANOPY.startZ && p.z < CANOPY.endZ); near(p.y, CANOPY.roofTop, 1e-4, 'seams on roof'); }

// Store height and site heading.
near(STORE.parapetTop, 4.65, 1e-9, 'store parapet'); assert.ok(STORE.roofDeck < STORE.parapetTop);
near(SITE_HEADING_DEG, -40.81, 1e-9, 'fitted site heading');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(source.includes('const SITE_HEADING = SITE_HEADING_DEG * Math.PI / 180;'));
assert.ok(source.includes('building.scale.y=STORE.parapetTop/sourceTop;'));
assert.ok(source.includes('sunPresetVector(name, sunDate)'));

// Real sun at the store coordinate.
const sp = solarPosition(new Date(Date.UTC(2026, 9, 29, 18, 0)));
near(sp.elevation, 46.5, 0.3, 'Oct 29 1 pm CDT elevation'); near(sp.azimuth, 174.3, 0.5, 'Oct 29 1 pm CDT azimuth');
const ev = solarEvents(new Date(Date.UTC(2026, 9, 29, 12)));
near((ev.sunset - Date.UTC(2026, 9, 29, 23, 48)) / 60000, 0, 6, 'sunset ~6:48 pm CDT');
const day = sunPresetVector('day', new Date(Date.UTC(2026, 9, 29, 12))), golden = sunPresetVector('golden', new Date(Date.UTC(2026, 9, 29, 12)));
assert.ok(day[1] > 40 && day[2] > 0, 'day sun high and to the south (+Z is south)');
assert.ok(golden[0] < -50 && golden[1] < 12, 'golden sun low in the west');
assert.equal(sunPresetVector('night'), null, 'night keeps its moonlight');
console.log('PASS: measured canopy/store dimensions and heights, detail hardware, fitted heading, real sun positions');

// Car wash and inn follow lidar/OSM too.
import { WASH, INN } from '../scripts/station-geometry.js';
assert.ok(WASH.length > WASH.width && Math.abs(WASH.roofTop - 3.86) < 1e-9);
assert.ok(source.includes('wash.scale.set(WASH.width/11,WASH.roofTop/4.31,WASH.length/8)'));
near(INN.ridge, 9.2, 1e-9, 'inn ridge'); assert.ok(source.includes('pitchedRoof(12,86,INN.ridge-INN.wallHeight,-1.25,0)'));
console.log('PASS: car wash size/height and inn ridge from lidar');
assert.ok(source.includes("const bearing=((name==='reference'?4.1:49)+(SITE_HEADING_DEG+35))*Math.PI/180;"),'plan cameras keep the owner-chosen framing after the heading fit');
console.log('PASS: Aerial plan / Reference framing compensates the heading correction');
assert.ok(Array.isArray(design.canopyGlow) && design.canopyGlow.length === 3 && design.canopyGlow.every(g => g.material.emissiveIntensity === 0 && g.night > g.golden));
assert.ok(source.includes("canopyGlowMaterials.forEach(g => g.material.emissiveIntensity = name === 'night' ? g.night : name === 'golden' ? g.golden : 0);"));
console.log('PASS: canopy band, letters and star badges glow only at golden hour/night');

// Georeference helper, flagpole and pylons.
import { trueToSite, FLAGPOLE, PYLONS, SITE_ORIGIN_TRUE } from '../scripts/station-geometry.js';
const o = trueToSite(SITE_ORIGIN_TRUE); near(o[0], 0, 1e-9, 'origin x'); near(o[1], 0, 1e-9, 'origin z');
// A point due north of the site origin must land on world -Z after the site heading turn.
const n = trueToSite([SITE_ORIGIN_TRUE[0], SITE_ORIGIN_TRUE[1] + 10]), a = SITE_HEADING_DEG * Math.PI / 180;
near(n[0] * Math.cos(a) + n[1] * Math.sin(a), 0, 1e-9, 'north stays on the world z axis'); near(-n[0] * Math.sin(a) + n[1] * Math.cos(a), -10, 1e-9, 'north = world -Z');
near(FLAGPOLE.top, 20.3, 1e-9, 'flagpole top from lidar');
assert.ok(PYLONS.south.top > PYLONS.north.top && PYLONS.south.top < 20);
assert.ok(source.includes('pylon(...trueToSite(PYLONS.south.trueXY), PYLONS.south.top)'));
const landscape = fs.readFileSync(new URL('../scripts/store-side-landscape.js', import.meta.url), 'utf8');
assert.ok(landscape.includes('const H=FLAGPOLE.top-0.2'));
console.log('PASS: georeference helper, 20 m flagpole, measured pylon heights/position');
