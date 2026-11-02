import * as THREE from '../vendor/three.module.js';
import { TextGeometry } from '../vendor/jsm/geometries/TextGeometry.js';
import { CANOPY } from './station-geometry.js';

// Texaco pumps and canopy, matched to the owner's reference photos:
//  - pump: header flares wider toward the top; its face is split by a
//    diagonal into a white wedge (red star roundel) and red (with TECHRON +
//    pump number);
//  - canopy: one TEXACO brand end facing the road, long sides whose top edge
//    slants up to that end, with a long white wedge over red split on the
//    diagonal and red neon along that diagonal at night.
// Unlit additive glow whose brightness follows `emissiveIntensity`, so the
// time-of-day presets can drive it like the lit materials; hidden at zero.
class GlowMaterial extends THREE.MeshBasicMaterial {
  constructor(params,glow){super(params);this.glow=new THREE.Color(glow);this.emissiveIntensity=0;}
  get emissiveIntensity(){return this._glowLevel;}
  set emissiveIntensity(v){this._glowLevel=v;if(this.glow)this.color.copy(this.glow).multiplyScalar(v);this.visible=v>0;}
}

export function createReferenceDesign({M,ctex,font}) {
  const silver=new THREE.MeshStandardMaterial({color:0xc8cecf,metalness:0.25,roughness:0.36});
  const black=new THREE.MeshStandardMaterial({color:0x202326,roughness:0.62});
  const hose=new THREE.MeshStandardMaterial({color:0x111314,roughness:0.85});
  const white=new THREE.MeshStandardMaterial({color:0xf4f2eb,roughness:0.6});
  // White linear-slat soffit (both photos): fine grooves along the canopy length.
  const slatMap=ctex(128,32,(c,w,h)=>{
    c.fillStyle='#f6f3ea';c.fillRect(0,0,w,h);
    for(let i=0;i<8;i++){c.fillStyle='#c9c5ba';c.fillRect(i*16,0,2,h);c.fillStyle='#ffffff';c.fillRect(i*16+2,0,2,h);}
  },CANOPY.width/1.28,1);
  const underside=new THREE.MeshStandardMaterial({map:slatMap,color:0xffffff,roughness:0.8,emissive:0xe3ddca,emissiveIntensity:0.2});
  const stone=new THREE.MeshStandardMaterial({color:0xd8cfbb,roughness:0.9});
  const edge=new THREE.MeshStandardMaterial({color:0xa50d26,roughness:0.5});
  const rimMat=new THREE.MeshStandardMaterial({color:0x2a2d31,roughness:0.5,metalness:0.2});
  const brickMap=ctex(512,512,(c,w,h)=>{
    c.fillStyle='#a49a81';c.fillRect(0,0,w,h);
    const colors=['#b7a485','#c3b092','#ad9c7e','#bdad91'];
    for(let y=0;y<16;y++)for(let x=-1;x<5;x++){
      c.fillStyle=colors[(x+y*3+8)%4];c.fillRect(x*128+(y%2)*64+1,y*32+1,125,29);
    }
  },1,3);
  const masonry=new THREE.MeshStandardMaterial({map:brickMap,roughness:0.96});
  const panelMap=ctex(512,768,(c,w,h)=>{
    c.fillStyle='#181b1d';c.fillRect(0,0,w,h);
    c.fillStyle='#cbd5ca';c.fillRect(35,24,270,83);c.fillStyle='#232b25';c.font='30px monospace';c.fillText('0.00',146,60);c.fillText('0.000',126,94);
    c.fillStyle='#aab4b6';c.fillRect(27,139,286,210);c.fillStyle='#32648c';c.fillRect(42,154,256,180);
    c.fillStyle='white';c.font='bold 27px Arial';c.textAlign='center';c.fillText('Welcome',170,213);c.font='20px Arial';c.fillText('Select payment',170,256);
    c.fillStyle='#8c9599';c.fillRect(354,202,118,16);c.fillRect(354,286,118,46);
    c.fillStyle='#b9bfc0';c.fillRect(365,364,94,115);c.fillStyle='#1b2224';
    for(let y=0;y<4;y++)for(let x=0;x<3;x++)c.fillRect(373+x*27,375+y*24,19,16);
    c.fillStyle='#b9bfc0';c.fillRect(49,402,240,18);c.fillStyle='#16181a';c.fillRect(63,408,213,7);
    for(let i=0;i<3;i++){
      const x=33+i*98;c.fillStyle='#dbc73e';c.fillRect(x,554,82,106);c.fillStyle='#111';c.font='bold 35px Arial';c.fillText(['87','89','93'][i],x+41,604);c.font='15px Arial';c.fillText('PRESS',x+41,641);
    }
    c.fillStyle='#ddd';c.font='18px Arial';c.fillText('with TECHRON',w/2,721);
  });
  const panelMaterial=new THREE.MeshStandardMaterial({map:panelMap,emissiveMap:panelMap,emissive:0xffffff,emissiveIntensity:0.2,roughness:0.55});
  // Lower dispenser panel: white disc, red star, white T (pump photo).
  const starMap=ctex(256,256,(c)=>{
    c.clearRect(0,0,256,256);c.fillStyle='#fff';c.beginPath();c.arc(128,128,120,0,Math.PI*2);c.fill();
    c.fillStyle='#c8102e';c.beginPath();
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?47:106;const x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();c.fill();
    c.fillStyle='#fff';c.fillRect(78,96,100,19);c.fillRect(116,105,24,92);
  });
  const starMaterial=new THREE.MeshStandardMaterial({map:starMap,transparent:true,roughness:0.4,emissive:0xffffff,emissiveMap:starMap,emissiveIntensity:0});
  // Canopy and pump-header roundel: red disc, white star, red T (all photos).
  function drawRoundel(c,cx,cy,r){
    c.fillStyle='#d0102e';c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
    c.fillStyle='#fff';c.beginPath();
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?0.38*r:0.92*r;const x=cx+Math.cos(a)*q,y=cy+Math.sin(a)*q;if(i)c.lineTo(x,y);else c.moveTo(x,y);}
    c.closePath();c.fill();
    c.fillStyle='#d0102e';c.fillRect(cx-0.3*r,cy-0.2*r,0.6*r,0.15*r);c.fillRect(cx-0.075*r,cy-0.08*r,0.15*r,0.5*r);
  }
  const roundelMap=ctex(256,256,(c)=>{c.clearRect(0,0,256,256);drawRoundel(c,128,128,127);});
  const roundelMat=new THREE.MeshStandardMaterial({map:roundelMap,transparent:true,roughness:0.4,emissive:0xffffff,emissiveMap:roundelMap,emissiveIntensity:0});
  // After dark the TEXACO blade, letters, roundels and neon glow (driven by
  // the time-of-day presets); the long-side red stays unlit except where the
  // neon halo washes over it, as in the night photo.
  const canopyBand=M.red.clone();canopyBand.emissive=new THREE.Color(0xff2236);canopyBand.emissiveIntensity=0;
  const sideRed=M.red.clone();
  const litLetters=white.clone();litLetters.emissive=new THREE.Color(0xffffff);litLetters.emissiveIntensity=0;
  const canopyGlow=[{material:canopyBand,night:0.42,golden:0.2},{material:litLetters,night:1.4,golden:0.45},
    {material:starMaterial,night:1.2,golden:0.4},{material:roundelMat,night:1.0,golden:0.35}];
  function box(parent,w,h,d,material,x,y,z,name=''){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function face(parent,w,h,material,x,y,z,back=false,name=''){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);m.position.set(x,y,z);if(back)m.rotation.y=Math.PI;m.name=name;parent.add(m);return m;
  }

  // ---- Pump header (pump photo) ----
  // Front elevation is an inverted trapezoid: the ends slant outward toward
  // the top. The face graphic is mapped over the header's bounding box.
  const headWb=1.5,headWt=1.61,headH=0.5,headD=0.66,headY=2.36;
  const headShape=new THREE.Shape();
  headShape.moveTo(-headWb/2,0);headShape.lineTo(headWb/2,0);headShape.lineTo(headWt/2,headH);headShape.lineTo(-headWt/2,headH);headShape.closePath();
  const headerGeo=new THREE.ExtrudeGeometry(headShape,{depth:headD,bevelEnabled:false});headerGeo.translate(0,0,-headD/2);
  const headerFaceGeo=new THREE.ShapeGeometry(headShape);
  {const p=headerFaceGeo.attributes.position,uv=headerFaceGeo.attributes.uv;
   for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)+headWt/2)/headWt,p.getY(i)/headH);}
  const headerMats=new Map();
  function headerMaterial(n){
    if(headerMats.has(n))return headerMats.get(n);
    const map=ctex(512,160,(c,w,h)=>{
      // Face-normalised (u across the face at that height, v down from the
      // top) to canvas: the face narrows toward the bottom.
      const inset=(headWt-headWb)/2/headWt*w,P=(u,v)=>[inset*v+u*(w-2*inset*v),v*h];
      c.fillStyle='#d0102e';c.fillRect(0,0,w,h);
      // White wedge, traced from the pump photo: full width along the top,
      // a thin sliver at the right end, dropping on the diagonal to a point
      // low on the left with a short return up to the left edge.
      c.fillStyle='#f4f4f1';c.beginPath();
      [[0,0],[1,0],[1,0.153],[0.157,0.859],[0,0.267]].forEach(([u,v],i)=>{const [x,y]=P(u,v);if(i)c.lineTo(x,y);else c.moveTo(x,y);});
      c.closePath();c.fill();
      const [rx,ry]=P(0.223,0.42);drawRoundel(c,rx,ry,0.324*h);
      c.fillStyle='#fff';c.textBaseline='alphabetic';c.textAlign='left';
      let [x,y]=P(0.538,0.744);c.font='bold 20px Arial';c.fillText('with',x,y);
      [x,y]=P(0.507,0.924);c.font='bold 37px Arial';c.fillText('TECHRON',x,y,0.287*w);
      [x,y]=P(0.893,0.916);c.font='bold 67px Arial';c.textAlign='center';c.fillText(String(n),x,y,0.13*w);
    });
    const m=new THREE.MeshStandardMaterial({map,emissive:0xffffff,emissiveMap:map,emissiveIntensity:0,roughness:0.5});
    canopyGlow.push({material:m,night:0.55,golden:0.3});headerMats.set(n,m);return m;
  }
  function pump(number) {
    const g=new THREE.Group();g.name=`Reference-dispenser-${number}-${number+1}`;
    box(g,1.16,0.08,0.72,black,0,0.26,0,'Foot-plinth');
    box(g,1.02,0.7,0.61,M.red,0,0.65,0,'Texaco-red-cabinet');
    box(g,1.05,0.9,0.62,black,0,1.44,0,'Black-terminal-housing');
    box(g,1.05,0.16,0.56,black,0,1.97,0,'Terminal-hood');
    // Twin brushed-steel uprights carry the header clear of the cabinet.
    [-0.64,0.64].forEach(x=>box(g,0.13,2.12,0.5,silver,x,1.3,0,'Silver-frame'));
    const header=new THREE.Mesh(headerGeo,M.red);header.name='Slanted-header-body';header.position.y=headY;
    header.castShadow=header.receiveShadow=true;g.add(header);
    for(const [sign,n] of [[-1,number],[1,number+1]]){
      const back=sign<0;
      const graphic=new THREE.Mesh(headerFaceGeo,headerMaterial(n));graphic.name='Techron-numbered-face';
      graphic.position.set(0,headY,sign*(headD/2+0.004));if(back)graphic.rotation.y=Math.PI;g.add(graphic);
      face(g,0.83,0.82,panelMaterial,0,1.46,sign*0.318,back,'Screen-keypad-grade-selection');
      face(g,0.61,0.61,starMaterial,0,0.66,sign*0.312,back,'Texaco-star-lower-panel');
      // Two holstered nozzles and smooth hanging hoses per face, clear of ground.
      [-1,1].forEach(side=>{
        const x=side*0.62,z=sign*0.39;
        box(g,0.12,0.3,0.12,black,x,1.23,z,'Nozzle-holster');
        const grip=box(g,0.06,0.23,0.07,silver,x,1.3,z+sign*0.06,'Nozzle-handle');grip.rotation.z=side*0.23;
        const path=new THREE.CatmullRomCurve3([
          new THREE.Vector3(x,2.3,z),new THREE.Vector3(side*0.8,1.45,z+sign*0.06),
          new THREE.Vector3(side*0.83,0.44,z+sign*0.2),new THREE.Vector3(side*0.71,0.34,z+sign*0.23),
          new THREE.Vector3(side*0.56,0.5,z+sign*0.2),new THREE.Vector3(x,1.19,z+sign*0.06)
        ]);
        const tube=new THREE.Mesh(new THREE.TubeGeometry(path,28,0.022,7,false),hose);tube.name='Hanging-fuel-hose';tube.castShadow=true;g.add(tube);
      });
    }
    return g;
  }
  // Small red pump-number flag that projects from a canopy column.
  const flagMats=new Map();
  function flagMaterial(n){
    if(!flagMats.has(n)){
      const map=ctex(128,128,(c,w,h)=>{
        c.fillStyle='#c8102e';c.fillRect(0,0,w,h);c.strokeStyle='#fff';c.lineWidth=6;c.strokeRect(8,8,w-16,h-16);
        c.fillStyle='#fff';c.font='bold 78px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(String(n),w/2,h/2+4);
      });
      const m=new THREE.MeshStandardMaterial({map,emissive:0xffffff,emissiveMap:map,emissiveIntensity:0,roughness:0.5});
      canopyGlow.push({material:m,night:0.6,golden:0.2});flagMats.set(n,m);
    }
    return flagMats.get(n);
  }

  // ---- Canopy (canopy photos) ----
  function canopy(islandZ) {
    // Sized to the measured canopy (station-geometry.js): 32.4 x 12.8 m,
    // roof 5.40 m. The TEXACO brand end is the +Z end (toward the road); its
    // blade rises 0.7 m above the roof line (lidar: signage reaches ~6.1 m).
    const g=new THREE.Group();g.name='Reference-white-red-masonry-canopy';
    const C=CANOPY,W=C.width,L=C.length,cz=C.centerZ,half=W/2;
    const fasciaMid=(C.fasciaTop+C.fasciaBottom)/2;
    const lift=0.7,brandTop=C.edgeTop+lift,endBottom=C.fasciaBottom-0.02;
    // Long-side top edge: one straight slant from the plain end up to the
    // brand end (photos: a single straight line, no kink).
    const topY=z=>C.edgeTop+lift*(z-C.startZ)/L;
    // White wedge: tallest at the brand corner, tapering to a tip ~2 m short of
    // the plain end; below its diagonal edge the fascia is red (thin at the
    // brand corner, full height at the plain end).
    const zTip=C.startZ+2.2,tipY=topY(zTip),yb0=C.fasciaBottom+0.18;
    const outer=half+0.065,plateD=0.09;
    const soffit=box(g,W,C.soffitDepth,L,underside,0,C.clearance+C.soffitDepth/2,cz,'White-soffit');soffit.castShadow=false;
    box(g,W,C.fasciaDepth,L,white,0,fasciaMid,cz,'White-fascia');
    // Edge filler up to the roof line, hidden behind the side plates and ends.
    box(g,W,C.edgeDepth,L,M.darkTrim,0,C.edgeTop-C.edgeDepth/2,cz,'Black-top-edge');
    // Roof membrane caps the fascia stack (lidar roof ~5.34-5.40 m).
    box(g,W-0.1,0.07,L-0.2,M.roof,0,C.roofTop-0.035,cz,'Roof-surface');
    // Neon: dark red channel by day, bright red at night.
    const edgeLed=new THREE.MeshStandardMaterial({color:0x9a0f22,emissive:0xff2236,emissiveIntensity:0,roughness:0.4});
    canopyGlow.push({material:edgeLed,night:2.2,golden:0.6});
    // Soft additive halos around the neon fake the bloom in the night photo.
    const haloMap=ctex(16,128,(c,w,h)=>{
      const gr=c.createLinearGradient(0,0,0,h);
      gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(0.5,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(0,0,0,1)');
      c.fillStyle=gr;c.fillRect(0,0,w,h);
    });
    haloMap.colorSpace=THREE.NoColorSpace;
    // Unlit, so it adds nothing but its glow, and not drawn at all while the
    // glow is off (even a black lit material leaks a faint sky tint by day).
    const neonHalo=new GlowMaterial({map:haloMap,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide},0xff1530);
    canopyGlow.push({material:neonHalo,night:1.5,golden:0.35});
    function halo(len,h,x,y,z){
      const m=new THREE.Mesh(new THREE.PlaneGeometry(len,h),neonHalo);m.name='Red-neon-halo';
      m.position.set(x,y,z);m.renderOrder=2;g.add(m);return m;
    }
    // Long-side fascia plate drawn in (z, y) and extruded outward along x.
    function sidePlate(points,material,sx,name){
      const s=new THREE.Shape();points.forEach(([z,y],i)=>i?s.lineTo(z,y):s.moveTo(z,y));s.closePath();
      const geo=new THREE.ExtrudeGeometry(s,{depth:plateD,bevelEnabled:false});
      geo.rotateY(-Math.PI/2); // shape x -> world z, extrusion -> world -x
      const m=new THREE.Mesh(geo,material);m.name=name;m.position.x=sx>0?outer:-(outer-plateD);
      m.castShadow=m.receiveShadow=true;g.add(m);return m;
    }
    const slope=Math.atan2(lift,L),diagLen=Math.hypot(C.endZ-zTip,tipY-yb0),diagAng=Math.atan2(tipY-yb0,C.endZ-zTip);
    const diagZ=(zTip+C.endZ)/2,diagY=(tipY+yb0)/2;
    for(const sx of [-1,1]){
      sidePlate([[C.endZ,brandTop],[C.endZ,yb0],[zTip,tipY]],white,sx,'Canopy-white-slant');
      sidePlate([[C.startZ,C.fasciaBottom],[C.endZ,C.fasciaBottom],[C.endZ,yb0],[zTip,tipY],[C.startZ,C.edgeTop]],sideRed,sx,'Long-red-ribbon');
      // Dark coping along the slanted top edge.
      const cope=box(g,0.13,0.06,Math.hypot(L,lift),M.darkTrim,sx*(outer-0.045),(C.edgeTop+brandTop)/2+0.03,cz,'Slanted-top-coping');
      cope.rotation.x=-slope;
      // Red neon along the diagonal, from the wedge tip down to the brand corner.
      const neon=box(g,0.04,0.05,diagLen,edgeLed,sx*(outer+0.02),diagY,diagZ,'Canopy-slant-neon');
      neon.rotation.x=diagAng;neon.castShadow=false;
      halo(diagLen,0.5,sx*(outer+0.06),diagY,diagZ).rotation.set(diagAng,Math.PI/2,0,'XYZ');
    }
    // TEXACO brand end: red blade, neon up both corners and along the top.
    const brandZ=C.endZ+0.07,brandH=brandTop-endBottom,brandMid=(brandTop+endBottom)/2;
    box(g,W+0.2,brandH,0.14,canopyBand,0,brandMid,brandZ,'Red-brand-end');
    box(g,W+0.24,0.06,0.18,M.darkTrim,0,brandTop+0.03,brandZ,'Brand-end-coping');
    box(g,W+0.2,0.05,0.05,edgeLed,0,brandTop-0.05,C.endZ+0.165,'Canopy-end-top-LED').castShadow=false;
    halo(W+0.2,0.55,0,brandTop-0.05,C.endZ+0.2);
    const vH=brandTop-yb0,vMid=(brandTop+yb0)/2;
    for(const sx of [-1,1]){
      box(g,0.05,vH,0.05,edgeLed,sx*(half+0.085),vMid,C.endZ+0.125,'Canopy-corner-LED').castShadow=false;
      halo(0.3,vH,sx*(half-0.03),vMid,C.endZ+0.2);
      halo(0.55,vH,sx*(half+0.16),vMid,C.endZ+0.02).rotation.y=Math.PI/2;
    }
    // Plain end: standard-height red fascia, unlit at night (night photo).
    const plainZ=C.startZ-0.07,plainH=C.edgeTop-endBottom,plainMid=(C.edgeTop+endBottom)/2;
    box(g,W+0.2,plainH,0.14,sideRed,0,plainMid,plainZ,'Red-plain-end');
    box(g,W+0.24,0.06,0.18,M.darkTrim,0,C.edgeTop+0.03,plainZ,'Plain-end-coping');
    // Raised TEXACO in broad, closely set capitals (photos: caps ~45% of the
    // blade height, word ~7x as wide as the caps are tall); smaller on the
    // plain end.
    function lettering(capH,width,y,z,facing){
      if(!font)return null;
      const grp=new THREE.Group();grp.name='Raised-TEXACO-letters';
      const probe=new TextGeometry('T',{font,size:1,height:0.01,curveSegments:1,bevelEnabled:false});probe.computeBoundingBox();
      const size=capH/(probe.boundingBox.max.y-probe.boundingBox.min.y);probe.dispose();
      const geos=[...'TEXACO'].map(ch=>{const t=new TextGeometry(ch,{font,size,height:0.11,curveSegments:4,bevelEnabled:true,bevelSize:0.008,bevelThickness:0.006,bevelSegments:1});t.scale(1.2,1,1);t.computeBoundingBox();return t;});
      const widths=geos.map(t=>t.boundingBox.max.x-t.boundingBox.min.x),sum=widths.reduce((a,b)=>a+b,0);
      const gap=Math.max(0.06*capH,(width-sum)/(geos.length-1));
      let x=-(sum+gap*(geos.length-1))/2;
      geos.forEach((t,i)=>{
        t.translate(x-t.boundingBox.min.x,-capH/2,0);x+=widths[i]+gap;
        const m=new THREE.Mesh(t,[litLetters,black]);m.castShadow=true;grp.add(m);
      });
      grp.position.set(0,y,z);if(facing<0)grp.rotation.y=Math.PI;g.add(grp);return grp;
    }
    lettering(0.45*brandH,7.2*0.45*brandH,brandMid,C.endZ+0.14,1);
    lettering(0.45*plainH,7.2*0.45*plainH,plainMid,C.startZ-0.14,-1);
    // Star roundels on the long sides at the brand corners, mounted on the
    // white wedge, top level with the slanted top edge (photos).
    const R=0.66;
    for(const sx of [-1,1]){
      const zc=C.endZ-1.55;
      const emblem=new THREE.Group();emblem.name='Canopy-star-roundel';
      emblem.position.set(sx*(outer+0.06),topY(zc)+0.02-R,zc);
      emblem.rotation.y=sx*Math.PI/2;
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(R,R,0.12,56),rimMat);
      rim.name='Canopy-roundel-rim';rim.rotation.x=Math.PI/2;rim.castShadow=true;emblem.add(rim);
      const logo=new THREE.Mesh(new THREE.CircleGeometry(R-0.005,56),roundelMat);
      logo.name='Upright-canopy-star-face';logo.position.z=0.062;emblem.add(logo);
      g.add(emblem);
    }

    // "with TECHRON" graphic printed on the white soffit along both long sides,
    // read from the pump lanes (new-design reference).
    const techronMap=ctex(1024,128,(c,w,h)=>{
      c.clearRect(0,0,w,h);c.fillStyle='#c8102e';c.font='italic bold 84px Arial';c.textAlign='center';c.textBaseline='middle';
      c.fillText('with TECHRON',w/2,h/2+4);
    });
    const techronMat=new THREE.MeshStandardMaterial({map:techronMap,alphaTest:0.4,roughness:0.85,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    [-(half-1.35),half-1.35].forEach((x,k)=>{
      const graphic=new THREE.Mesh(new THREE.PlaneGeometry(9.6,1.2),techronMat);
      graphic.name='Soffit-Techron-graphic';graphic.rotation.set(Math.PI/2,0,k?Math.PI/2:-Math.PI/2);
      graphic.position.set(x,C.clearance-0.004,cz);g.add(graphic);
    });
    islandZ.forEach((z,idx)=>{
      const colTop=C.clearance+0.05,colH=colTop-0.3;
      box(g,0.84,colH,0.84,masonry,0,0.3+colH/2,z,'Tan-masonry-column');
      box(g,0.92,0.42,0.92,masonry,0,0.44,z,'Column-base-collar');
      box(g,0.96,0.06,0.96,stone,0,0.66,z,'Column-stone-band');
      box(g,0.94,0.08,0.94,stone,0,C.clearance-0.75,z,'Column-stone-band');
      box(g,0.98,0.12,0.98,white,0,C.clearance-0.06,z,'Column-capital');
      // Pump-number flags project from the column toward each dispenser.
      [[-1,idx*4+1],[1,idx*4+3]].forEach(([sx,n])=>{
        const flag=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.34,0.03),[edge,edge,edge,edge,flagMaterial(n+1),flagMaterial(n)]);
        flag.name='Column-pump-number-flag';flag.position.set(sx*0.6,C.clearance-1.15,z);flag.castShadow=true;g.add(flag);
        box(g,0.12,0.04,0.03,silver,sx*0.46,C.clearance-1.15,z,'Flag-bracket');
      });
    });
    return g;
  }
  return {pump,canopy,panelMaterial,underside,canopyGlow};
}
