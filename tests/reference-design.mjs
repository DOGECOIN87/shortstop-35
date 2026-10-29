import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { FontLoader } from '../vendor/jsm/loaders/FontLoader.js';
import { createReferenceDesign } from '../scripts/reference-design.js';
const material=new THREE.MeshStandardMaterial();
const M=new Proxy({}, {get:()=>material});
const font=new FontLoader().parse(JSON.parse(fs.readFileSync(new URL('../assets/fonts/helvetiker_bold.typeface.json',import.meta.url),'utf8')));
const design=createReferenceDesign({M,font,ctex:()=>new THREE.Texture(),glowMat:()=>material,makeHeaderMaterial:()=>material});
for(const n of [1,3,5,7,9,11,13,15]){
 const pump=design.pump(n);const parts=[];pump.traverse(m=>parts.push(m));
 assert.equal(parts.filter(m=>m.name==='Hanging-fuel-hose').length,4);
 assert.equal(parts.filter(m=>m.name==='Screen-keypad-grade-selection').length,2);
 assert.equal(parts.filter(m=>m.name==='Techron-numbered-face').length,2);
 const b=new THREE.Box3().setFromObject(pump);assert.ok(b.min.y>0.2 && b.max.y<3.1);
}
const canopy=design.canopy([-17,-6,5,16]);
assert.equal(canopy.children.filter(m=>m.name==='Tan-masonry-column').length,4);
assert.equal(canopy.children.filter(m=>m.name==='Raised-TEXACO-letters').length,2);
assert.equal(canopy.children.filter(m=>m.name==='White-fascia').length,1);
assert.equal(canopy.children.filter(m=>m.name==='Long-red-ribbon').length,2);
const parts=[];canopy.traverse(m=>parts.push(m));
for(const name of ['Ad-post-base','Ad-post','Ad-frame','Blank-ad-panel']){
 assert.equal(parts.filter(m=>m.name===name).length,0,`${name} was removed by owner request`);
}
canopy.updateMatrixWorld(true);
const logos=parts.filter(m=>m.name==='Upright-canopy-star-face');assert.equal(logos.length,2);
for(const logo of logos){
 const rotation=logo.getWorldQuaternion(new THREE.Quaternion());
 const up=new THREE.Vector3(0,1,0).applyQuaternion(rotation);
 assert.ok(up.distanceTo(new THREE.Vector3(0,1,0))<1e-9,'star and T must remain upright on both canopy ends');
 const outward=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
 const center=logo.getWorldPosition(new THREE.Vector3());
 assert.ok(outward.z*(center.z+2)>0,'logo face must point out of its canopy end');
 assert.equal(logo.geometry.type,'CircleGeometry','avoid sideways cylinder-cap UVs');
}
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!/function lotLight\(|lotLight\(/.test(source),'removed forecourt poles must not return');
assert.ok(source.includes('canopySpots.push(lamp)'),'keep recessed canopy lighting');
canopy.traverse(m=>assert.ok(m.position.toArray().every(Number.isFinite)));
console.log('PASS: 8 double-faced dispensers, headers, controls, raised lettering, white/red canopy 4 masonry columns, upright outward-facing logos; no ad boards or forecourt light poles');
