import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { addSiteCirculation } from '../scripts/site-circulation.js';
import { createRoadClearance } from '../scripts/road-clearance.js';
const material=new THREE.MeshStandardMaterial(),M=new Proxy({},{get:()=>material});
const result=addSiteCirculation({world:new THREE.Group(),M,ctex:()=>new THREE.Texture(),glowMat:()=>material});
const clear=createRoadClearance(result.obstacleSurfaces);
assert.ok(result.obstacleSurfaces.length>=9,'include opposite frontage, hotel aisle and property entrances');
for(const road of [result.frontage,result.cross,result.highway,result.service]){
 for(const t of [0.1,0.45,0.8]){const p=road.path.getPoint(t);assert.equal(clear(p.x,p.z),false,'road centre must reject obstacles');}
}
for(const mesh of result.obstacleSurfaces){
 const p=mesh.geometry.attributes.position;
 mesh.updateMatrix();const edge=new THREE.Vector3().fromBufferAttribute(p,0).applyMatrix4(mesh.matrix);
 assert.equal(clear(edge.x,edge.z,0.9),false,'road/paved apron edges need foliage clearance too');
}
assert.equal(clear(-250,-250,4),true);
assert.equal(clear(NaN,0,1),false);
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const [name,r] of [['streetLight','3.1'],['tree','4*s'],['shrub','0.9']]){
 const start=source.indexOf(`function ${name}(`);assert.ok(source.slice(start,start+150).includes(`hasRoadClearance(x,z,${r})`),`${name} must use road clearance`);
}
assert.ok(!source.includes('streetLight(23.6,'),'remove obsolete straight-road lamp placements');
console.log('PASS: exact road triangle footprints, curve centres, edges, all driveways and guarded trees/shrubs/streetlights');
