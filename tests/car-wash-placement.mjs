import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { PLAN,aerialToBuilding } from '../scripts/reference-plan.js';
const w=PLAN.wash;
const corners=w.corners.map(aerialToBuilding);
const center=corners.reduce((sum,p)=>[sum[0]+p[0]/4,sum[1]+p[1]/4],[0,0]);
assert.ok(Math.hypot(w.x-center[0],w.z-center[1])<0.002,'wash centre uses same-image measured roof corners');
const roof=new THREE.Mesh(new THREE.BoxGeometry(w.width,0.12,w.depth));roof.position.set(w.x,4.2,w.z);roof.rotation.y=w.heading;
const localCorners=[[-w.width/2,-w.depth/2],[w.width/2,-w.depth/2],[w.width/2,w.depth/2],[-w.width/2,w.depth/2]];
for(const p of corners){
 const distances=localCorners.map(([x,z])=>new THREE.Vector3(x,0,z).applyEuler(roof.rotation).add(new THREE.Vector3(w.x,0,w.z)).distanceTo(new THREE.Vector3(p[0],0,p[1])));
 assert.ok(Math.min(...distances)<0.65,'rectangle corner must remain within image-fit tolerance');
}
const b=new THREE.Box3().setFromObject(roof);
assert.ok(b.max.z<PLAN.canopy.centerZ-PLAN.canopy.length/2,'wash stays beyond canopy end');
assert.ok(w.depth>w.width,'same-image roof has a longer bay direction, not the previous short square');
console.log('PASS: wash fits all four same-image aerial corners within 0.65 m, with canopy clearance');
