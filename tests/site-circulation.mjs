// node --experimental-default-type=module tests/site-circulation.mjs
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { addSiteCirculation,CIRCULATION } from '../scripts/site-circulation.js';
import { createRoadClearance } from '../scripts/road-clearance.js';
import { PLAN,aerialToBuilding,aerialToSite } from '../scripts/reference-plan.js';
const material=new THREE.MeshStandardMaterial();const M=new Proxy({}, {get:()=>material});
const world=new THREE.Group();
const result=addSiteCirculation({world,M,ctex:()=>new THREE.Texture(),glowMat:()=>material});
const {group,parkingSpots,service}=result;
assert.equal(group.parent,world);
for(const name of ['Traced-forecourt-footprint','Rear-service-access-lane','Traced-rear-pedestrian-walk','Traced-frontage-grass-island','Hotel-parking-pavement','Hotel-frontage-driveway','Traced-south-frontage-road','Traced-cross-street','Traced-I35-deck','Cross-street-property-entrance'])assert.ok(group.getObjectByName(name),name);
assert.ok(parkingSpots.length>=16);
for(const p of parkingSpots){
 const dx=p.x-CIRCULATION.hotel.x,dz=p.z-CIRCULATION.hotel.z;
 const frontDistance=Math.cos(CIRCULATION.hotel.heading)*dx-Math.sin(CIRCULATION.hotel.heading)*dz;
 assert.ok(frontDistance-2.3>CIRCULATION.hotel.width/2,'parked cars clear of angled motel frontage');
}
const row=PLAN.hotelCarRow.map(aerialToSite);
assert.ok(Math.abs(parkingSpots[0].x-row[0][0])<1e-6);
assert.ok(Math.abs(parkingSpots.at(-1).z-row[1][1])<1e-6);
assert.ok(group.getObjectByName('Continuous-curb-beside-canopy'));
assert.ok(!group.getObjectByName('Frontage-curb-north-of-driveway'),'no fake opening beside fuel-fill covers');
assert.ok(PLAN.entranceFrontage.map(aerialToBuilding).every(p=>p[1]>PLAN.canopy.centerZ+PLAN.canopy.length/2),'main driveway is beyond canopy, not beside it');
// Grass behind the store must not spill under its rectangular roof footprint.
for(const pixel of PLAN.rearLawn){const [x]=aerialToBuilding(pixel);assert.ok(x<PLAN.store.centerX-PLAN.store.depth/2,'rear lawn stays behind back wall');}
const rearPath=new THREE.CatmullRomCurve3(PLAN.rearSidewalk.map(p=>{const [x,z]=aerialToBuilding(p);return new THREE.Vector3(x,0,z);}),false,'centripetal');
for(let i=0;i<=200;i++){
 const p=rearPath.getPoint(i/200);
 assert.ok(!(Math.abs(p.x-PLAN.dumpster.x)<3.2&&Math.abs(p.z-PLAN.dumpster.z)<3.05),'curved rear sidewalk clears shifted dumpster pad');
}
assert.ok(service.path.getLength()<18,'dumpster approach must not become a vehicle loop behind the store');
assert.equal(PLAN.localReference,'Screenshot_20261028-111922_Chrome.jpg','use owner-selected close reference');
const onFrontage=createRoadClearance([result.frontage.mesh],0);
for(const entrance of [PLAN.entranceFrontage,PLAN.hotelEntrance]){
 const [x,z]=aerialToSite(entrance.at(-1));assert.equal(onFrontage(x,z),false,'driveway endpoints join rendered frontage, not a strip of grass');
}
const expected=[[-6.8,-19.6],[6.8,-19.6],[6.8,15.6],[-6.8,15.6]];
PLAN.canopy.corners.forEach((p,i)=>{
 const result=aerialToBuilding(p);assert.ok(Math.hypot(result[0]-expected[i][0],result[1]-expected[i][1])<1e-6);
});
assert.ok(!group.getObjectByName('Neighbouring-shop-row'),'untraced generic shopping strip must not return');
assert.ok(!group.getObjectByName('Curved-rear-grass-verge'),'old generic crescent must not return');
const frontage=aerialToSite([865,800]),highway=aerialToSite([1000,990]);
assert.ok(highway[0]-frontage[0]>45,'highway/frontage separation must not collapse to old 19 m');
assert.equal(result.highway.mesh.material.polygonOffset,true,'deck surface must not fight segmented supports');
assert.ok(group.getObjectByName('Cross-street-median-curb'));
const n=service.mesh.geometry.attributes.normal;for(let i=0;i<n.count;i++)assert.ok(n.getY(i)>0.99);
for(const road of [result.frontage,result.highway,result.cross])assert.ok(road.path.getLength()>100);
assert.ok(group.getObjectByName('Forecourt-frontage-opening').geometry.attributes.position.getY(0)>group.getObjectByName('Traced-frontage-grass-island').position.y,'driveway opening must not be overpainted by grass');
assert.ok(service.mesh.material===M.concrete,'rear drive must be concrete, not an invented black ring');
const camera=new THREE.PerspectiveCamera(46,1,0.1,600);camera.position.set(0,205,0.01);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
assert.ok(new THREE.Vector3(0,0,-10).project(camera).y>0);
console.log('PASS: four calibration anchors, traced footprints, highway setback, concrete rear access, parking clearance and road curves');
