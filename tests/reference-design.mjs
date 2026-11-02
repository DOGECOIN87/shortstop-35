import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { FontLoader } from '../vendor/jsm/loaders/FontLoader.js';
import { createReferenceDesign } from '../scripts/reference-design.js';
import { CANOPY } from '../scripts/station-geometry.js';
const material=new THREE.MeshStandardMaterial();
const M=new Proxy({}, {get:()=>material});
const font=new FontLoader().parse(JSON.parse(fs.readFileSync(new URL('../assets/fonts/helvetiker_bold.typeface.json',import.meta.url),'utf8')));
const design=createReferenceDesign({M,font,ctex:()=>new THREE.Texture()});
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
const logos=parts.filter(m=>m.name==='Upright-canopy-star-face');assert.equal(logos.length,2,'one roundel per long side at the TEXACO brand corner');
for(const logo of logos){
 const rotation=logo.getWorldQuaternion(new THREE.Quaternion());
 const up=new THREE.Vector3(0,1,0).applyQuaternion(rotation);
 assert.ok(up.distanceTo(new THREE.Vector3(0,1,0))<1e-9,'star and T must remain upright on both canopy ends');
 const outward=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
 const center=logo.getWorldPosition(new THREE.Vector3());
 assert.ok(outward.x*center.x>0.99*Math.abs(center.x),'logo faces outward from its long side (owner photos)');
 const atEnd=center.x>0?CANOPY.startZ:CANOPY.endZ; // long side on the left of its TEXACO corner (photos)
 assert.ok(Math.abs(center.z-atEnd)<2.5,'logo sits at its side\'s TEXACO corner (photos)');
 const lb=new THREE.Box3().setFromObject(logo);
 assert.ok(lb.max.y-CANOPY.fasciaBottom>1.6 && lb.max.y-lb.min.y>1.3,'roundel about as wide as the fascia is deep, standing above it');
 assert.ok(new THREE.Box3().setFromObject(logo).max.y>CANOPY.roofTop+0.5,'logo top stands above the roof line');
 assert.equal(logo.geometry.type,'CircleGeometry','avoid sideways cylinder-cap UVs');
}
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!/function lotLight\(|lotLight\(/.test(source),'removed forecourt poles must not return');
assert.ok(source.includes('canopySpots.push(lamp)'),'keep recessed canopy lighting');
canopy.traverse(m=>assert.ok(m.position.toArray().every(Number.isFinite)));
assert.equal(parts.filter(m=>m.name==='Column-pump-number-flag').length,8,'red pump-number flag on each side of every column');
// Diagonal slant (photos measured in perspective): level roof line; each long
// side is white over red split on a diagonal that is lowest at its TEXACO
// corner; the white covers about half the side, the far half is all red.
const box3=o=>new THREE.Box3().setFromObject(o);
const wedges=parts.filter(m=>m.name==='Canopy-white-slant');assert.equal(wedges.length,2);
const v=new THREE.Vector3();
for(const w of wedges){
 const b=box3(w),pos=w.geometry.attributes.position,len=b.max.z-b.min.z;
 assert.ok(len>0.45*CANOPY.length && len<0.65*CANOPY.length,'white covers about half the long side');
 const brandZ=b.getCenter(v).z>CANOPY.centerZ?CANOPY.endZ:CANOPY.startZ;
 assert.ok(Math.min(Math.abs(b.max.z-brandZ),Math.abs(b.min.z-brandZ))<0.1,'white starts at its TEXACO corner');
 let topNear=-Infinity,topFar=-Infinity,lowNear=Infinity,lowFar=Infinity;
 for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(w.matrixWorld);const near=Math.abs(v.z-brandZ)<len/2;
  if(near){topNear=Math.max(topNear,v.y);lowNear=Math.min(lowNear,v.y);}else{topFar=Math.max(topFar,v.y);lowFar=Math.min(lowFar,v.y);}}
 assert.ok(Math.abs(topNear-topFar)<1e-6,'roof line is level (photos)');
 assert.ok(lowFar-lowNear>0.8,'red/white split rises away from the TEXACO corner');
}
const neon=parts.filter(m=>m.name==='Canopy-slant-neon');assert.equal(neon.length,2);
for(const n of neon) assert.ok(Math.abs(n.rotation.x)>0.03 && n.geometry.parameters.depth>CANOPY.length*0.45,'neon follows the diagonal along the white panel');
const ribbons=parts.filter(m=>m.name==='Long-red-ribbon');
for(const r of ribbons){const b=box3(r);assert.ok(b.max.z-b.min.z>CANOPY.length-0.01,'red runs the full length of each side');}
assert.equal(parts.filter(m=>m.name==='Corner-diagonal-trim').length,2,'black trim down the diagonal end of each white panel');
assert.equal(parts.filter(m=>m.name==='Canopy-corner-LED').length,2);
assert.ok(parts.filter(m=>m.name==='Red-neon-halo').length>=5,'red neon halos along canopy LED lines at night');
const glowNight=design.canopyGlow.filter(g=>g.night>0).length;assert.ok(glowNight>=5,'canopy glow materials light up at night');
for(const n of [1,3]){const p=[];design.pump(n).traverse(m=>p.push(m));
 const count=name=>p.filter(m=>m.name===name).length;
 // Dispenser detail from the pump photo, on both faces.
 assert.equal(count('PIN-pad'),2);assert.equal(count('Card-reader'),2);assert.equal(count('Contactless-reader'),2);
 assert.equal(count('Grade-button'),8);assert.equal(count('Nozzle-handle'),4);assert.equal(count('Nozzle-holster'),4);
 assert.equal(count('Nozzle-swivel'),4);assert.equal(count('Hose-outlet'),4);assert.equal(count('Hose-breakaway'),4);
 assert.equal(count('Arched-head-cap'),1);
 const head=p.filter(m=>m.name==='Slanted-header-body');assert.equal(head.length,1);
 const pos=head[0].geometry.attributes.position;let top=0,bottom=0;
 for(let i=0;i<pos.count;i++){const x=Math.abs(pos.getX(i)),y=pos.getY(i);if(y>0.49)top=Math.max(top,x);if(y<0.01)bottom=Math.max(bottom,x);}
 assert.ok(top>bottom+0.04,'header ends slant outward toward the top (pump photo)');
 for(const f of p.filter(m=>m.name==='Techron-numbered-face'))assert.equal(f.geometry.type,'ShapeGeometry','face follows the slanted header outline');}
console.log('PASS: 8 double-faced dispensers, headers, controls, raised lettering, white/red canopy 4 masonry columns, brand-corner roundels above a level roof line, diagonal white/red long sides with neon and corner trim, number flags, slanted pump headers, detailed dispensers; no ad boards or forecourt light poles');
