import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { PLAN,aerialToBuilding,aerialToSite } from '../scripts/reference-plan.js';
import { addSiteCirculation } from '../scripts/site-circulation.js';
import { createRoadClearance } from '../scripts/road-clearance.js';
const material=new THREE.MeshStandardMaterial(),M=new Proxy({},{get:()=>material});
const {group,obstacleSurfaces}=addSiteCirculation({world:new THREE.Group(),M,ctex:()=>new THREE.Texture(),glowMat:()=>material});
const apron=group.getObjectByName('Traced-forecourt-footprint');
assert.equal(group.children.filter(m=>m.name==='Traced-forecourt-footprint').length,1,'single continuous apron');
assert.ok(obstacleSurfaces.includes(apron),'decorations must clear expanded paving');
const clear=createRoadClearance([apron],0);
const toSite=([x,z])=>[(x+z)*Math.SQRT1_2-8,(-x+z)*Math.SQRT1_2];
for(const p of [[-47,-3],[-43,-18],[-40,25],[-29,35],[-15,37],[-28,-34]]){
 assert.equal(clear(...toSite(p),0),false,`owner-marked pavement at ${p} must be filled`);
}
assert.ok(PLAN.ownerPavementEnvelope.map(aerialToBuilding).some(p=>p[0]<=-49.9),'broad rear apron');
assert.ok(PLAN.ownerPavementEnvelope.map(aerialToBuilding).some(p=>p[1]>=41.9),'larger south apron');
for(const name of ['Traced-rear-pedestrian-walk','Traced-frontage-grass-island','Forecourt-frontage-opening','Hotel-frontage-driveway'])assert.ok(group.getObjectByName(name),name);
console.log('PASS: owner-marked rear/north/south pavement, single apron mesh, preserved walks/islands/entries and decoration clearance');
