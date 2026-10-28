// Run: node --experimental-default-type=module tests/station-details.mjs
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { addStationDetails } from '../scripts/station-details.js';
const fuelGroup=new THREE.Group(),storeGroup=new THREE.Group();
const M=new Proxy({}, {get:()=>new THREE.MeshStandardMaterial()});
const {details,shop}=addStationDetails({fuelGroup,storeGroup,islandZ:[-17,-6,5,16],M,
  ctex:()=>new THREE.Texture(),glowMat:map=>new THREE.MeshStandardMaterial({map})});
assert.equal(details.parent,fuelGroup);assert.equal(shop.parent,storeGroup);
assert.equal(details.getObjectByName('Column-anchor-bolts').count,16);
assert.equal(details.getObjectByName('Underground-fuel-fill-lids').count,8);
assert.equal(details.children.filter(c=>c.name.startsWith('Position-number-')).length,16);
assert.equal(details.getObjectByName('Recessed-LED-rims').count,32);
assert.equal(details.getObjectByName('Recessed-LED-side-rims').count,32);
assert.ok(shop.getObjectByName('Accessible-parking-symbol'));
let draws=0;
for(const root of [details,shop]) root.traverse(o=>{
  assert.ok(o.position.toArray().every(Number.isFinite));
  if(o.isMesh){draws++;assert.ok(o.geometry.attributes.position.count>0);}
});
assert.ok(draws<180,`detail draw budget exceeded: ${draws}`);
console.log(`PASS: number signs, fill covers, anchor bolts, open-centre light rims, access marking, parent groups, finite coordinates; ${draws} added draw calls`);
