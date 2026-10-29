// node --experimental-default-type=module tests/store-side-landscape.mjs
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { addStoreSideLandscape } from '../scripts/store-side-landscape.js';
const M={};const stationLayout=new THREE.Group();
const painted=[];
const context={fillStyle:'',fillRect(...args){painted.push([this.fillStyle,...args]);},beginPath(){},lineTo(){},moveTo(){},closePath(){},fill(){}};
const result=addStoreSideLandscape({stationLayout,M,ctex:(w,h,paint)=>{paint(context,w,h);return new THREE.Texture();}});
assert.equal(result.group.parent,stationLayout);
for(const name of ['Sidewalk-beside-store','Traced-store-front-walk','Raised-grass-island','Screened-dumpster-area','Texas-flagpole','Waving-Texas-flag'])assert.ok(result.group.getObjectByName(name),name);
assert.ok(painted.some(p=>p[0]==='#002868' && p[3]===300 && p[4]===600),'blue hoist third');
assert.ok(painted.some(p=>p[0]==='#bf0a30' && p[1]===300 && p[2]===300),'red lower fly');
const shaft=result.pole.getObjectByName('Stainless-steel-flagpole-shaft');
assert.equal(shaft.material.color.getHex(),0xd1d5d7);
assert.equal(result.pole.getObjectByName('Silver-flagpole-finial').material,shaft.material);
const p=result.flag.geometry.attributes.position;
result.update(0);const initial=p.array.slice();result.update(1.25);
assert.ok(p.array.some((n,i)=>Math.abs(n-initial[i])>0.01),'cloth must animate');
for(let i=0;i<p.count;i++){
 assert.ok([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));
 if(Math.abs(initial[i*3])<1e-9)assert.ok(Math.abs(p.getX(i))+Math.abs(p.getZ(i))<1e-9,'hoist edge stays anchored');
}
assert.equal(result.flag.material.side,THREE.DoubleSide);
result.group.updateMatrixWorld(true);
const lawn=new THREE.Box3().setFromObject(result.group.getObjectByName('Raised-grass-island'));
const enclosure=new THREE.Box3().setFromObject(result.enclosure);
assert.ok(!lawn.intersectsBox(enclosure),'dumpster enclosure clear of lawn');
const store=new THREE.Box3(new THREE.Vector3(-38.5,0,-14),new THREE.Vector3(-24.5,5.4,10));
assert.ok(!store.intersectsBox(enclosure),'dumpster clear of store');
assert.ok(result.group.getObjectByName('Car-wash-to-store-walk'));
assert.ok(!result.group.getObjectByName('Car-wash-accessible-bay-island'),'owner-crossed grass island and its curb are removed');
assert.ok(result.group.getObjectByName('Store-side-connector-walk'));
assert.ok(!result.group.getObjectByName('Sidewalk-parking-edge'),'no rectangular bar across gate access');
assert.equal(result.enclosure.position.x,-32.25,'dumpster moved 1.2 m left');
for(const name of ['Grass-behind-dumpster','Rear-grass-border']){
 const patch=result.group.getObjectByName(name);assert.ok(patch,name);
 assert.ok(!new THREE.Box3().setFromObject(patch).intersectsBox(enclosure),`${name} clears enclosure`);
}
result.setRoofHeight(4.8);assert.ok(Math.abs(result.roofMount.position.y-4.83)<1e-8);
assert.equal(result.uplight.parent,result.roofMount);assert.ok(result.uplight.target.position.y>result.roofMount.position.y+6,'light aims upwards at flag');
const housing=result.roofMount.getObjectByName('Flag-floodlight-housing');
const axis=new THREE.Vector3(0,0,1).applyQuaternion(housing.quaternion);
const aim=result.uplight.target.position.clone().sub(result.roofMount.position).sub(housing.position).normalize();
assert.ok(axis.distanceTo(aim)<1e-8,'fixture and beam aim at same flag target');
result.update(2,true);assert.ok(result.uplight.intensity>0);result.update(2,false);assert.equal(result.uplight.intensity,0);
for(const t of [0,3,25,1000]){result.update(t);for(const value of p.array)assert.ok(Number.isFinite(value));}
console.log('PASS: connected side landscape, screened dumpster, Texas flag colors, anchored waving cloth and footprint clearance');

const wallWalks=result.group.getObjectByName('Store-wall-sidewalks');assert.ok(wallWalks);
for(const name of ['North-wall-sidewalk','Rear-wall-sidewalk','Sidewalk-beside-store','South-wall-sidewalk-east'])assert.ok(wallWalks.getObjectByName(name));
wallWalks.updateWorldMatrix(true,true);
const left=new THREE.Box3().setFromObject(wallWalks.getObjectByName('Sidewalk-beside-store'));
const right=new THREE.Box3().setFromObject(wallWalks.getObjectByName('South-wall-sidewalk-east'));
assert.ok(left.max.x<=result.enclosure.position.x-2.4+1e-6,'left walk stops at dumpster gap');
assert.ok(right.min.x>=result.enclosure.position.x+2.4-1e-6,'right walk starts beyond dumpster gap');
assert.ok(right.min.x-left.max.x>=4.79,'leave full dumpster width unpaved');
console.log('PASS: wall-hugging north/rear/south sidewalk sections with full-width dumpster gap');

for(const name of ['Marked-car-wash-side-grass','Marked-rear-store-grass']){
 const grass=result.group.getObjectByName(name);assert.ok(grass,name);
 const bounds=new THREE.Box3().setFromObject(grass);
 assert.ok(!bounds.intersectsBox(enclosure),'marked lawn clears dumpster');
 const pos=grass.geometry.attributes.position;assert.ok(pos.count>=6);
 assert.equal(grass.material.polygonOffset,true,'prevent apron bleeding through marked grass');
}
const northGrass=result.group.getObjectByName('Marked-car-wash-side-grass');
const rearGrass=result.group.getObjectByName('Marked-rear-store-grass');
const nb=new THREE.Box3().setFromObject(northGrass),rb=new THREE.Box3().setFromObject(rearGrass);
assert.ok(nb.max.z<-13.55,'grass remains beyond north wall sidewalk');
assert.ok(rb.max.x<-39.75,'grass remains beyond rear wall sidewalk');
console.log('PASS: both owner-marked lawn strips present, with wall-side sidewalks and dumpster clear');
