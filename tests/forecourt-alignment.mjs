// Run: node --experimental-default-type=module tests/forecourt-alignment.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const body=source.slice(source.indexOf('/* parked vehicles */'),source.indexOf('/* moving traffic */'));
for(const name of ['beetleG','sedanP','pickupP']) {
  const match=body.match(new RegExp(name+'\\.rotation\\.y\\s*=\\s*([^;]+);'));
  assert.ok(match,`${name} needs explicit pump-side parking heading`);
  const heading=Function('return ('+match[1]+')')();
  const forward=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),heading);
  assert.ok(Math.abs(forward.z)<1e-9,`${name} points at pump rather than alongside it`);
}
assert.ok(source.includes('parkedBmw.rotation.y=-Math.PI/2'));
assert.ok(!source.includes("load('./assets/concrete.jpg')"),'old high-contrast pavement must not return');
const circulation=fs.readFileSync(new URL('../scripts/site-circulation.js',import.meta.url),'utf8');
assert.ok(circulation.includes("polygon('Traced-forecourt-footprint',PLAN.ownerPavementEnvelope??PLAN.forecourt,M.concrete"));
assert.ok(source.includes('m.material=storefrontFrameMat'));
console.log('PASS: fuelling car headings, consistent concrete material, storefront frames');
