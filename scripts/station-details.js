import * as THREE from '../vendor/three.module.js';
import { CANOPY, STORE, canopyLightRows } from './station-geometry.js';

// Detail dimensions are photo estimates. Keep everything in the same local frame
// as the forecourt so orientation corrections don't detach the small hardware.
export function addStationDetails({ fuelGroup, storeGroup, islandZ, M, ctex, glowMat }) {
  const details = new THREE.Group(); details.name = 'Forecourt-fine-details'; fuelGroup.add(details);
  const shop = new THREE.Group(); shop.name = 'Storefront-fine-details'; storeGroup.add(shop);
  const seam = new THREE.MeshStandardMaterial({ color:0x777a77, roughness:0.95 });
  const rubber = new THREE.MeshStandardMaterial({ color:0x171b1d, roughness:0.9 });
  const paleMetal = new THREE.MeshStandardMaterial({ color:0xc6d8d6, roughness:0.48, metalness:0.35 });
  const warning = new THREE.MeshStandardMaterial({ color:0xf2c442, roughness:0.65 });
  const mesh = (geometry, material, x,y,z, parent=details) => {
    const m=new THREE.Mesh(geometry,material); m.position.set(x,y,z);
    m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  };
  const box=(w,h,d,mat,x,y,z,parent=details)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  // Repeated seams and bolts share geometry/material in one instanced draw call.
  function batch(name,geometry,material,positions,parent=details) {
    const inst=new THREE.InstancedMesh(geometry,material,positions.length);
    inst.name=name; const matrix=new THREE.Matrix4();
    positions.forEach((p,i)=>{ matrix.makeTranslation(...p); inst.setMatrixAt(i,matrix); });
    inst.instanceMatrix.needsUpdate=true; inst.receiveShadow=true; parent.add(inst); return inst;
  }
  function label(text,w,h,{background='#b9132b',color='#ffffff',size=42}={}) {
    const texture=ctex(512,128,(c,W,H)=>{
      c.fillStyle=background;c.fillRect(0,0,W,H);c.fillStyle=color;
      c.font=`bold ${size}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),glowMat(texture));
  }
  // Roof standing seams, soffit panel joints and a continuous fascia drip edge,
  // all following the measured canopy (station-geometry.js).
  const C=CANOPY,half=C.width/2;
  const roofRibs=[],soffitJoints=[];
  for(let z=C.startZ+0.2;z<C.endZ-0.2;z+=0.48) roofRibs.push([0,C.roofTop,z]);
  for(let z=C.startZ+0.2;z<C.endZ-0.2;z+=0.6) soffitJoints.push([0,C.clearance-0.024,z]);
  batch('Roof-standing-seams',new THREE.BoxGeometry(C.width-0.6,0.035,0.025),M.steel,roofRibs);
  batch('Soffit-panel-joints',new THREE.BoxGeometry(C.width-0.5,0.008,0.014),seam,soffitJoints);
  [-(half+0.02),half+0.02].forEach(x=>{
    box(0.055,0.085,C.length,M.redDark,x,C.fasciaBottom+0.14,C.centerZ);
    box(0.045,0.075,C.length,M.darkTrim,x,C.edgeTop-0.07,C.centerZ);
  });
  [C.startZ-0.07,C.endZ+0.07].forEach(z=>box(C.width+0.05,0.085,0.055,M.redDark,0,C.fasciaBottom+0.14,z));

  // Slim rims around the existing ceiling LEDs, not additional light sources.
  const lightRims=[];
  const lightSideRims=[];
  for(const z of canopyLightRows()) for(const x of [-4,4]) {
    [-0.565,0.565].forEach(d=>{lightRims.push([x,C.clearance,z+d]);lightSideRims.push([x+d,C.clearance,z]);});
  }
  batch('Recessed-LED-rims',new THREE.BoxGeometry(1.18,0.035,0.06),M.steel,lightRims);
  batch('Recessed-LED-side-rims',new THREE.BoxGeometry(0.06,0.035,1.06),M.steel,lightSideRims);

  const bolts=[];
  islandZ.forEach((z,row)=>{
    box(0.88,0.055,0.88,M.steel,0,0.26,z);
    for(const x of [-0.33,0.33]) for(const dz of [-0.33,0.33]) bolts.push([x,0.31,z+dz]);
    // Electrical conduit terminates at a small, red emergency-stop box.
    box(0.045,3.9,0.045,M.steel,0.355,2.26,z);
    box(0.13,0.3,0.23,M.red,0.41,1.72,z);
    const stop=mesh(new THREE.CylinderGeometry(0.047,0.047,0.035,12),warning,0.492,1.75,z);
    stop.rotation.z=Math.PI/2;
    // Round number discs are mounted on both sides of the centre column.
    for(const [side,x] of [-4,4].entries()) {
      const first=row*4+side*2+1;
      for(const [face,sign] of [[first,-1],[first+1,1]]) {
        const tex=ctex(128,128,(c,w,h)=>{
          c.clearRect(0,0,w,h);c.fillStyle='#ffffff';c.beginPath();c.arc(64,64,61,0,Math.PI*2);c.fill();
          c.fillStyle='#b9132b';c.beginPath();c.arc(64,64,53,0,Math.PI*2);c.fill();
          c.fillStyle='white';c.textAlign='center';c.textBaseline='middle';c.font='bold 62px Arial';c.fillText(String(face),64,67);
        });
        const disc=new THREE.Mesh(new THREE.CircleGeometry(0.17,24),glowMat(tex));
        disc.name=`Position-number-${face}`;disc.position.set(x,2.86,z+sign*0.37);
        if(sign<0)disc.rotation.y=Math.PI;details.add(disc);
      }
    }
    // Squeegee handles and wash reservoirs beside the existing waste cabinets.
    for(const x of [-1.85,1.85]) {
      box(0.23,0.36,0.23,rubber,x+0.49,0.73,z);
      box(0.026,0.7,0.026,paleMetal,x+0.49,1.11,z);
      box(0.2,0.045,0.045,rubber,x+0.49,1.47,z);
      const notice=label('WASH • WASTE',0.54,0.11,{background:'#24292c',size:35});
      notice.position.set(x,0.79,z+0.327);details.add(notice);
    }
    // Protective bollard caps, foot rings and subtle reflective collars.
    for(const x of [-5.05,5.05]) for(const dz of [-0.64,0.64]) {
      mesh(new THREE.CylinderGeometry(0.12,0.12,0.04,12),M.steel,x,0.25,z+dz);
      mesh(new THREE.SphereGeometry(0.08,12,8),paleMetal,x,1.17,z+dz);
      mesh(new THREE.CylinderGeometry(0.084,0.084,0.065,12),M.red,x,1.06,z+dz);
    }
  });
  batch('Column-anchor-bolts',new THREE.CylinderGeometry(0.045,0.045,0.045,6),M.steel,bolts);

  // Concrete slab control joints. Restrict them to the canopy apron instead of
  // drawing across grass, roads, accessible markings or other buildings.
  const longJoints=[];for(let x=-6;x<=6;x+=3)longJoints.push([x,0.013,C.centerZ]);
  batch('Apron-lengthwise-joints',new THREE.BoxGeometry(0.018,0.005,C.length),seam,longJoints);
  const crossJoints=[],jointStep=C.length/8;for(let i=0;i<=8;i++)crossJoints.push([0,0.013,C.startZ+i*jointStep]);
  batch('Apron-cross-joints',new THREE.BoxGeometry(C.width-0.2,0.005,0.018),seam,crossJoints);

  // Flush underground fill lids visible beside the canopy in the aerial photo.
  const lids=[];
  for(const x of [11.6,13.4]) for(const z of [-13,-5,3,11]) {
    lids.push([x,0.023,z]);
    mesh(new THREE.CylinderGeometry(0.32,0.32,0.025,24),M.steel,x,0.017,z);
    box(0.12,0.012,0.035,M.steel,x,0.042,z);
  }
  batch('Underground-fuel-fill-lids',new THREE.CylinderGeometry(0.27,0.27,0.025,24),rubber,lids);

  // Store entrance apron, scored sidewalk, door mats and accessible approach.
  // The wall-following sidewalk is owned by store-side-landscape.js; avoid
  // overlapping a second slab here. Keep the door mats and access marking.
  // Door locations are inherited from the source glTF's two entry openings.
  [-9.3,0.5].forEach(z=>box(1.1,0.018,1.8,rubber,-21.6,0.17,z,shop));
  const access=ctex(256,256,(c,w,h)=>{
    c.fillStyle='#245da7';c.fillRect(0,0,w,h);c.strokeStyle='white';c.fillStyle='white';c.lineWidth=14;
    c.beginPath();c.arc(133,51,18,0,Math.PI*2);c.fill();
    c.beginPath();c.moveTo(127,78);c.lineTo(120,145);c.lineTo(173,145);c.lineTo(194,191);c.lineTo(218,182);c.stroke();
    c.beginPath();c.arc(107,165,51,0.25*Math.PI,1.8*Math.PI);c.stroke();
    c.beginPath();c.moveTo(125,105);c.lineTo(172,105);c.stroke();
  });
  const symbol=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),new THREE.MeshStandardMaterial({map:access,roughness:0.95}));
  symbol.name='Accessible-parking-symbol';symbol.rotation.set(-Math.PI/2,0,Math.PI/2);symbol.position.set(-18.1,0.03,-15.2);shop.add(symbol);
  // Nose-in bays run toward the west-facing storefront, along local X.
  const hatch=[];for(let x=-20.4;x<-15.5;x+=0.65) hatch.push([x,0.029,-18.2]);
  batch('Accessible-access-aisle',new THREE.BoxGeometry(0.09,0.005,1.6),M.white,hatch,shop);
  // Service downpipes on the back corners of the shop, with low elbows.
  [-13.6,9.5].forEach(z=>{
    box(0.1,STORE.parapetTop-0.1,0.1,M.steel,-38.6,(STORE.parapetTop-0.1)/2,z,shop);
    box(0.42,0.1,0.1,M.steel,-38.8,0.14,z,shop);
  });
  return { details, shop };
}
