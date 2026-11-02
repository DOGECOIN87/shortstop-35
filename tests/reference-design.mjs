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
 assert.ok(center.z>CANOPY.endZ-3 && center.z<CANOPY.endZ,'logo sits at the brand-end corner (photos)');
 assert.ok(new THREE.Box3().setFromObject(logo).max.y>CANOPY.roofTop+0.5,'logo top stands above the roof line');
 assert.equal(logo.geometry.type,'CircleGeometry','avoid sideways cylinder-cap UVs');
}
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!/function lotLight\(|lotLight\(/.test(source),'removed forecourt poles must not return');
assert.ok(source.includes('canopySpots.push(lamp)'),'keep recessed canopy lighting');
canopy.traverse(m=>assert.ok(m.position.toArray().every(Number.isFinite)));
assert.equal(parts.filter(m=>m.name==='Column-pump-number-flag').length,8,'red pump-number flag on each side of every column');
// Diagonal slant (photos): each long side's top edge rises to the brand end,
// with a white wedge over red split on the diagonal and neon along it.
const box3=o=>new THREE.Box3().setFromObject(o);
const wedges=parts.filter(m=>m.name==='Canopy-white-slant');assert.equal(wedges.length,2);
for(const w of wedges){
 const b=box3(w),pos=w.geometry.attributes.position,v=new THREE.Vector3();
 assert.ok(b.max.z>CANOPY.endZ-0.01 && b.min.z<CANOPY.startZ+3,'white wedge runs nearly the full length');
 let topAtBrand=-Infinity,topAtTip=-Infinity;
 for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(w.matrixWorld);
  if(v.z>CANOPY.endZ-0.01)topAtBrand=Math.max(topAtBrand,v.y);if(v.z<b.min.z+0.01)topAtTip=Math.max(topAtTip,v.y);}
 assert.ok(topAtBrand>CANOPY.roofTop+0.5 && topAtBrand-topAtTip>0.5,'top edge slants up to the brand end');
 const h=b.max.y-b.min.y;assert.ok(h>1.2,'wedge is tall at the brand corner');
}
const neon=parts.filter(m=>m.name==='Canopy-slant-neon');assert.equal(neon.length,2);
for(const n of neon) assert.ok(Math.abs(n.rotation.x)>0.015 && n.geometry.parameters.depth>CANOPY.length*0.85,'neon follows the long diagonal');
assert.equal(parts.filter(m=>m.name==='Canopy-corner-LED').length,2);
assert.ok(parts.filter(m=>m.name==='Red-neon-halo').length>=5,'red neon halos along canopy LED lines at night');
const glowNight=design.canopyGlow.filter(g=>g.night>0).length;assert.ok(glowNight>=5,'canopy glow materials light up at night');
for(const n of [1,3]){const p=[];design.pump(n).traverse(m=>p.push(m));
 const head=p.filter(m=>m.name==='Slanted-header-body');assert.equal(head.length,1);
 const pos=head[0].geometry.attributes.position;let top=0,bottom=0;
 for(let i=0;i<pos.count;i++){const x=Math.abs(pos.getX(i)),y=pos.getY(i);if(y>0.49)top=Math.max(top,x);if(y<0.01)bottom=Math.max(bottom,x);}
 assert.ok(top>bottom+0.04,'header ends slant outward toward the top (pump photo)');
 for(const f of p.filter(m=>m.name==='Techron-numbered-face'))assert.equal(f.geometry.type,'ShapeGeometry','face follows the slanted header outline');}
console.log('PASS: 8 double-faced dispensers, headers, controls, raised lettering, white/red canopy 4 masonry columns, upright brand-corner roundels, slanted long sides with diagonal white wedge and neon, number flags, slanted pump headers; no ad boards or forecourt light poles');
