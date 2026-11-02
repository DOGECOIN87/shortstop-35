import * as THREE from '../vendor/three.module.js';
import { TextGeometry } from '../vendor/jsm/geometries/TextGeometry.js';
import { CANOPY } from './station-geometry.js';

// Texaco pumps and canopy, matched to the owner's reference photos.
//
// Canopy (measured from the photos in perspective, as fractions of the
// canopy width W): the roof line is level and the fascia is deep all round.
// Each long side is red below and white above, split on a diagonal that is
// lowest at the TEXACO corner and rises along the side; the white ends about
// halfway along and the far half of the side is all red. At the TEXACO corner
// the white panel's end is cut on a diagonal with black trim, leaving a red
// triangle at the corner. Red neon runs along the bottom of the white panel,
// up that diagonal and across the top of the TEXACO face. The roundel (red
// disc, white star, red T) sits on the white panel at that corner, about
// 45% of it above the top edge. The TEXACO face carries a thick black coping
// and broad raised letters about 55% of the red face's height.
//
// Pump (Gilbarco-style dispenser in the pump photo): slanted two-tone header,
// arched electronics head with badge, price display, blue screen with soft
// keys, PIN pad, card and tap readers, receipt printer, grade buttons,
// instruction tiles, nozzles hung in boots, hoses dropping from outlets at
// the top, and a red lower door with the white roundel.

// Unlit additive glow whose brightness follows `emissiveIntensity`, so the
// time-of-day presets can drive it like the lit materials; hidden at zero.
class GlowMaterial extends THREE.MeshBasicMaterial {
  constructor(params,glow){super(params);this.glow=new THREE.Color(glow);this.emissiveIntensity=0;}
  get emissiveIntensity(){return this._glowLevel;}
  set emissiveIntensity(v){this._glowLevel=v;if(this.glow)this.color.copy(this.glow).multiplyScalar(v);this.visible=v>0;}
}

export function createReferenceDesign({M,ctex,font}) {
  const silver=new THREE.MeshStandardMaterial({color:0xc8cecf,metalness:0.25,roughness:0.36});
  const postMat=new THREE.MeshStandardMaterial({color:0xd9dcdc,metalness:0.2,roughness:0.42});
  const black=new THREE.MeshStandardMaterial({color:0x202326,roughness:0.62});
  const headMat=new THREE.MeshStandardMaterial({color:0x2c2f33,roughness:0.55,metalness:0.15});
  const bootMat=new THREE.MeshStandardMaterial({color:0x17191b,roughness:0.7});
  const hose=new THREE.MeshStandardMaterial({color:0x111314,roughness:0.85});
  const chrome=new THREE.MeshStandardMaterial({color:0xd8dce0,metalness:0.85,roughness:0.25});
  const white=new THREE.MeshStandardMaterial({color:0xf4f2eb,roughness:0.6});
  const panelWhite=new THREE.MeshStandardMaterial({color:0xf6f6f3,roughness:0.45});
  // White linear-slat soffit (both photos): fine grooves along the canopy length.
  const slatMap=ctex(128,32,(c,w,h)=>{
    c.fillStyle='#f6f3ea';c.fillRect(0,0,w,h);
    for(let i=0;i<8;i++){c.fillStyle='#c9c5ba';c.fillRect(i*16,0,2,h);c.fillStyle='#ffffff';c.fillRect(i*16+2,0,2,h);}
  },CANOPY.width/1.28,1);
  const underside=new THREE.MeshStandardMaterial({map:slatMap,color:0xffffff,roughness:0.8,emissive:0xe3ddca,emissiveIntensity:0.2});
  const stone=new THREE.MeshStandardMaterial({color:0xd8cfbb,roughness:0.9});
  const edge=new THREE.MeshStandardMaterial({color:0xa50d26,roughness:0.5});
  const rimMat=new THREE.MeshStandardMaterial({color:0x1c1e21,roughness:0.45,metalness:0.25});
  const liningMat=new THREE.MeshStandardMaterial({color:0x8d9093,roughness:0.9});
  const brickMap=ctex(512,512,(c,w,h)=>{
    c.fillStyle='#a49a81';c.fillRect(0,0,w,h);
    const colors=['#b7a485','#c3b092','#ad9c7e','#bdad91'];
    for(let y=0;y<16;y++)for(let x=-1;x<5;x++){
      c.fillStyle=colors[(x+y*3+8)%4];c.fillRect(x*128+(y%2)*64+1,y*32+1,125,29);
    }
  },1,3);
  const masonry=new THREE.MeshStandardMaterial({map:brickMap,roughness:0.96});

  function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
  function starPath(c,cx,cy,ro,ri){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?ri:ro;const x=cx+Math.cos(a)*q,y=cy+Math.sin(a)*q;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();}
  // T with a flared foot, as in the photos' roundels.
  function tPath(c,cx,cy,r){
    c.beginPath();
    c.moveTo(cx-0.3*r,cy-0.21*r);c.lineTo(cx+0.3*r,cy-0.21*r);c.lineTo(cx+0.3*r,cy-0.07*r);
    c.lineTo(cx+0.08*r,cy-0.07*r);c.lineTo(cx+0.08*r,cy+0.3*r);c.lineTo(cx+0.16*r,cy+0.46*r);
    c.lineTo(cx-0.16*r,cy+0.46*r);c.lineTo(cx-0.08*r,cy+0.3*r);c.lineTo(cx-0.08*r,cy-0.07*r);
    c.lineTo(cx-0.3*r,cy-0.07*r);c.closePath();
  }
  // Canopy and pump-header roundel: red disc, white star, red T.
  function drawRoundel(c,cx,cy,r){
    c.fillStyle='#d0102e';c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
    c.fillStyle='#fff';starPath(c,cx,cy+0.02*r,0.92*r,0.38*r);c.fill();
    c.fillStyle='#d0102e';tPath(c,cx,cy+0.04*r,r);c.fill();
  }
  // Lower dispenser door: red with a white disc, red star and white T.
  const lowerMap=ctex(512,304,(c,w,h)=>{
    c.fillStyle='#c8102e';c.fillRect(0,0,w,h);
    c.strokeStyle='rgba(0,0,0,0.25)';c.lineWidth=3;c.strokeRect(6,6,w-12,h-12);
    const cx=w/2,cy=h*0.5,r=h*0.43;
    c.fillStyle='#f7f7f4';c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
    c.fillStyle='#c8102e';starPath(c,cx,cy+0.02*r,0.93*r,0.38*r);c.fill();
    c.fillStyle='#f7f7f4';tPath(c,cx,cy+0.04*r,r);c.fill();
    c.fillStyle='rgba(0,0,0,0.35)';c.fillRect(w-58,h*0.47,18,8); // door lock
  });
  const lowerPanelMat=new THREE.MeshStandardMaterial({map:lowerMap,roughness:0.45,emissive:0xffffff,emissiveMap:lowerMap,emissiveIntensity:0});
  const roundelMap=ctex(256,256,(c)=>{c.clearRect(0,0,256,256);drawRoundel(c,128,128,127);});
  const roundelMat=new THREE.MeshStandardMaterial({map:roundelMap,transparent:true,roughness:0.4,emissive:0xffffff,emissiveMap:roundelMap,emissiveIntensity:0});

  // ---- Dispenser electronics face (pump photo), 1.0 m x 0.98 m ----
  const panelMap=ctex(512,502,(c,w,h)=>{
    const X=u=>u*w,Y=v=>v*h;
    c.fillStyle='#2a2d31';c.fillRect(0,0,w,h);
    // Left: dark media panel with a soft sheen.
    const gr=c.createLinearGradient(0,Y(0.06),0,Y(0.58));gr.addColorStop(0,'#2b2e32');gr.addColorStop(1,'#141618');
    c.fillStyle=gr;roundRect(c,X(0.03),Y(0.06),X(0.2),Y(0.52),6);c.fill();
    // Centre module.
    c.fillStyle='#35393d';roundRect(c,X(0.25),Y(0.02),X(0.5),Y(0.95),10);c.fill();
    // Red badge.
    c.fillStyle='#c8102e';roundRect(c,X(0.41),Y(0.035),X(0.18),Y(0.045),8);c.fill();
    c.fillStyle='#fff';c.font=`bold ${Y(0.032)}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText('TEXACO',X(0.5),Y(0.058));
    // Sale display flanked by speaker grilles.
    c.fillStyle='#1b1d20';for(const u of [0.285,0.655])for(let i=0;i<5;i++)c.fillRect(X(u)+i*X(0.012),Y(0.1),X(0.006),Y(0.12));
    c.fillStyle='#1e2124';c.fillRect(X(0.36),Y(0.09),X(0.28),Y(0.14));
    c.fillStyle='#b8c4b2';c.fillRect(X(0.37),Y(0.1),X(0.26),Y(0.12));
    c.fillStyle='#2c332b';c.font=`bold ${Y(0.045)}px monospace`;c.textAlign='right';c.textBaseline='alphabetic';
    c.fillText('0.00',X(0.62),Y(0.155));c.fillText('0.000',X(0.62),Y(0.21));
    c.font=`${Y(0.022)}px Arial`;c.textAlign='left';c.fillText('SALE',X(0.38),Y(0.15));c.fillText('GALLONS',X(0.38),Y(0.205));
    // Payment screen with soft keys.
    c.fillStyle='#1c1f22';c.fillRect(X(0.3),Y(0.25),X(0.4),Y(0.29));
    c.fillStyle='#3d78d6';c.fillRect(X(0.35),Y(0.27),X(0.3),Y(0.25));
    c.fillStyle='#fff';c.textAlign='center';c.font=`bold ${Y(0.035)}px Arial`;c.fillText('Welcome',X(0.5),Y(0.35));
    c.font=`${Y(0.022)}px Arial`;c.fillText('Insert card or',X(0.5),Y(0.41));c.fillText('tap to pay',X(0.5),Y(0.445));
    c.fillStyle='#e8e8e4';for(const u of [0.315,0.665])for(let i=0;i<4;i++)c.fillRect(X(u),Y(0.29+i*0.058),X(0.022),Y(0.032));
    // Receipt printer, help button.
    c.fillStyle='#1a1c1e';c.fillRect(X(0.28),Y(0.6),X(0.13),Y(0.07));c.fillStyle='#0b0c0d';c.fillRect(X(0.29),Y(0.625),X(0.11),Y(0.012));
    c.fillStyle='#f2f2ef';c.fillRect(X(0.285),Y(0.68),X(0.12),Y(0.035));c.fillStyle='#222';c.font=`bold ${Y(0.02)}px Arial`;c.fillText('RECEIPT',X(0.345),Y(0.705));
    c.fillStyle='#4a4e53';c.beginPath();c.arc(X(0.34),Y(0.575),Y(0.014),0,Math.PI*2);c.fill();
    // Grade strip behind the raised grade buttons.
    c.fillStyle='#1f2225';c.fillRect(X(0.26),Y(0.77),X(0.48),Y(0.2));
    c.fillStyle='#d9d9d4';c.font=`bold ${Y(0.02)}px Arial`;c.fillText('SELECT GRADE',X(0.5),Y(0.79));
    // Right: instruction tiles.
    const tiles=[['PAY','HERE'],['LIFT','NOZZLE'],['SELECT','GRADE'],['BEGIN','FUELING']];
    tiles.forEach(([a,b],i)=>{
      const y0=Y(0.06+i*0.125);c.fillStyle='#1f2225';roundRect(c,X(0.77),y0,X(0.2),Y(0.11),5);c.fill();
      c.strokeStyle='#e9e9e4';c.lineWidth=2;c.beginPath();c.arc(X(0.81),y0+Y(0.055),Y(0.025),0,Math.PI*2);c.stroke();
      c.fillStyle='#e9e9e4';c.font=`bold ${Y(0.022)}px Arial`;c.textAlign='left';c.fillText(a,X(0.845),y0+Y(0.05));c.fillText(b,X(0.845),y0+Y(0.08));
    });
    // Nozzle boot recesses at the outer edges.
    c.fillStyle='#16181a';c.fillRect(0,Y(0.62),X(0.02),Y(0.36));c.fillRect(X(0.98),Y(0.62),X(0.02),Y(0.36));
  });
  const panelMaterial=new THREE.MeshStandardMaterial({map:panelMap,emissiveMap:panelMap,emissive:0xffffff,emissiveIntensity:0.2,roughness:0.5});
  const keypadMap=ctex(96,112,(c,w,h)=>{
    c.fillStyle='#8b9196';c.fillRect(0,0,w,h);
    for(let r=0;r<4;r++)for(let k=0;k<3;k++){c.fillStyle='#d4d8da';roundRect(c,8+k*28,10+r*24,22,18,3);c.fill();c.fillStyle='#2a2d30';c.font='bold 12px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(['1','2','3','4','5','6','7','8','9','*','0','#'][r*3+k],19+k*28,19+r*24);}
  });
  const keypadMat=new THREE.MeshStandardMaterial({map:keypadMap,metalness:0.4,roughness:0.4});
  const cardMap=ctex(128,64,(c,w,h)=>{
    c.fillStyle='#c8102e';c.fillRect(0,0,w,h);c.fillStyle='#101112';c.fillRect(14,26,100,9);
    c.fillStyle='#fff';c.font='bold 11px Arial';c.textAlign='center';c.fillText('INSERT CARD',w/2,54);
  });
  const cardMat=new THREE.MeshStandardMaterial({map:cardMap,roughness:0.45});
  const tapMap=ctex(64,64,(c,w,h)=>{
    c.fillStyle='#3a3e42';c.fillRect(0,0,w,h);c.strokeStyle='#f0f0ec';c.lineWidth=3;
    for(const r of [8,15,22]){c.beginPath();c.arc(20,32,r,-0.7,0.7);c.stroke();}
  });
  const tapMat=new THREE.MeshStandardMaterial({map:tapMap,roughness:0.5});
  const gradeMats=['88','87','89','93'].map((g,i)=>{
    const map=ctex(64,96,(c,w,h)=>{
      c.fillStyle=i?'#f3f2ec':'#e9e9e3';c.fillRect(0,0,w,h);
      c.fillStyle='#2b2b2b';c.font='bold 9px Arial';c.textAlign='center';c.fillText(i?'UNLEADED':'E15',w/2,18);c.fillText(i===3?'SUPER':i===2?'PLUS':'REGULAR',w/2,30);
      c.fillStyle='#f2c81e';c.fillRect(6,46,w-12,42);c.fillStyle='#111';c.font='bold 28px Arial';c.fillText(g,w/2,78);
    });
    return new THREE.MeshStandardMaterial({map,emissive:0xffffff,emissiveMap:map,emissiveIntensity:0,roughness:0.5});
  });

  // After dark the TEXACO face, letters, roundels and neon glow (driven by
  // the time-of-day presets); the long-side red stays unlit except where the
  // neon halo washes over it, as in the night photo.
  const canopyBand=M.red.clone();canopyBand.emissive=new THREE.Color(0xff2236);canopyBand.emissiveIntensity=0;
  const sideRed=M.red.clone();
  const litLetters=white.clone();litLetters.emissive=new THREE.Color(0xffffff);litLetters.emissiveIntensity=0;
  const canopyGlow=[{material:canopyBand,night:0.42,golden:0.2},{material:litLetters,night:1.4,golden:0.45},
    {material:lowerPanelMat,night:0.35,golden:0.12},{material:roundelMat,night:1.0,golden:0.35},
    ...gradeMats.map(material=>({material,night:0.5,golden:0.15}))];
  function box(parent,w,h,d,material,x,y,z,name='',shadow=true){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.name=name;m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;
  }
  function cyl(parent,r,h,material,x,y,z,name='',seg=14){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),material);m.position.set(x,y,z);m.name=name;m.castShadow=true;parent.add(m);return m;
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
  // Nozzle hung in its boot: black body, trigger guard, chrome spout into the
  // boot and a chrome swivel where the hose joins (pump photo).
  const guardGeo=new THREE.TorusGeometry(0.045,0.008,6,14,Math.PI);
  function nozzle(parent,x,z,sign){
    box(parent,0.12,0.24,0.09,bootMat,x,1.39,z-sign*0.04,'Nozzle-holster');
    const body=box(parent,0.075,0.25,0.075,black,x,1.21,z,'Nozzle-handle');body.rotation.x=sign*0.08;
    const guard=new THREE.Mesh(guardGeo,black);guard.name='Nozzle-trigger-guard';guard.position.set(x,1.17,z+sign*0.05);
    guard.rotation.set(0,sign*Math.PI/2,Math.PI/2);parent.add(guard); // bulges toward the viewer
    const spout=cyl(parent,0.012,0.16,chrome,x,1.37,z-sign*0.015,'Nozzle-spout',8);spout.rotation.x=-sign*0.5;
    cyl(parent,0.026,0.12,chrome,x,1.03,z+sign*0.005,'Nozzle-swivel',12);
  }
  function pump(number) {
    const g=new THREE.Group();g.name=`Reference-dispenser-${number}-${number+1}`;
    box(g,1.16,0.08,0.72,black,0,0.26,0,'Foot-plinth');
    box(g,1.04,0.08,0.6,bootMat,0,0.34,0,'Kick-plate');
    box(g,1.02,0.62,0.58,M.red,0,0.69,0,'Texaco-red-cabinet');
    box(g,1.05,0.98,0.56,headMat,0,1.5,0,'Black-terminal-housing');
    // Arched cap over the electronics head (flattened: ~9 cm rise).
    const arch=new THREE.Mesh(new THREE.CylinderGeometry(0.29,0.29,0.54,28),headMat);arch.name='Arched-head-cap';
    arch.rotation.z=Math.PI/2;arch.scale.set(0.3,1,1);arch.position.set(0,1.99,0);arch.castShadow=true;g.add(arch);
    // Twin uprights carry the header clear of the head (pump photo: light
    // grey posts the full height of the dispenser).
    [-0.64,0.64].forEach(x=>{box(g,0.13,2.14,0.5,postMat,x,1.29,0,'Silver-frame');box(g,0.14,0.1,0.52,bootMat,x,0.27,0,'Post-foot');});
    const header=new THREE.Mesh(headerGeo,M.red);header.name='Slanted-header-body';header.position.y=headY;
    header.castShadow=header.receiveShadow=true;g.add(header);
    for(const [sign,n] of [[-1,number],[1,number+1]]){
      const back=sign<0,fz=sign*0.283;
      const graphic=new THREE.Mesh(headerFaceGeo,headerMaterial(n));graphic.name='Techron-numbered-face';
      graphic.position.set(0,headY,sign*(headD/2+0.004));if(back)graphic.rotation.y=Math.PI;g.add(graphic);
      face(g,1.0,0.98,panelMaterial,0,1.5,fz,back,'Screen-keypad-grade-selection');
      face(g,0.98,0.58,lowerPanelMat,0,0.69,sign*0.293,back,'Texaco-star-lower-panel');
      // Raised controls; x mirrors on the back face so both faces read the same.
      const X=u=>sign*(u-0.5),Y=v=>1.99-v*0.98;
      const pad=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.12,0.022),[headMat,headMat,headMat,headMat,keypadMat,keypadMat]);
      pad.name='PIN-pad';pad.position.set(X(0.5),Y(0.655),fz+sign*0.011);g.add(pad);
      const reader=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.065,0.05),[edge,edge,edge,edge,cardMat,cardMat]);
      reader.name='Card-reader';reader.position.set(X(0.645),Y(0.61),fz+sign*0.025);reader.castShadow=true;g.add(reader);
      const tap=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.075,0.012),[headMat,headMat,headMat,headMat,tapMat,tapMat]);
      tap.name='Contactless-reader';tap.position.set(X(0.645),Y(0.7),fz+sign*0.006);g.add(tap);
      gradeMats.forEach((mat,i)=>{
        const b=new THREE.Mesh(new THREE.BoxGeometry(0.095,0.135,0.018),[headMat,headMat,headMat,headMat,mat,mat]);
        b.name='Grade-button';b.position.set(X(0.32+i*0.12),Y(0.885),fz+sign*0.009);g.add(b);
      });
      // Nozzles hung on both sides of the head, hoses from the top outlets
      // down past the posts in a loop near the island, back up to the swivel.
      [-1,1].forEach(side=>{
        const nx=side*0.47,nz=sign*0.36;
        nozzle(g,nx,nz,sign);
        cyl(g,0.04,0.1,bootMat,side*0.58,2.31,sign*0.2,'Hose-outlet');
        const path=new THREE.CatmullRomCurve3([
          new THREE.Vector3(side*0.58,2.27,sign*0.2),new THREE.Vector3(side*0.71,1.95,sign*0.3),
          new THREE.Vector3(side*0.78,1.2,sign*0.38),new THREE.Vector3(side*0.76,0.55,sign*0.42),
          new THREE.Vector3(side*0.66,0.39,sign*0.44),new THREE.Vector3(side*0.54,0.52,sign*0.42),
          new THREE.Vector3(nx,0.97,nz+sign*0.005)
        ]);
        const tube=new THREE.Mesh(new THREE.TubeGeometry(path,40,0.024,8,false),hose);tube.name='Hanging-fuel-hose';tube.castShadow=true;g.add(tube);
        // Chrome breakaway coupling near the outlet.
        const t=path.getPointAt(0.12),dir=path.getTangentAt(0.12);
        const brk=cyl(g,0.032,0.09,chrome,t.x,t.y,t.z,'Hose-breakaway',12);brk.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
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
    // Footprint and soffit from the measured canopy (station-geometry.js:
    // 32.4 x 12.8 m, clearance ~4.2 m, roof deck 5.40 m). The fascia rises
    // above the roof deck as a parapet so its depth matches the photos.
    // Both ends carry TEXACO. As in both photos, facing a branded corner from
    // outside, its long side (white panel, roundel) is on the left and the
    // TEXACO face on the right: the +x side's corner is at the -Z end, the -x
    // side's at the +Z end (toward the road).
    const g=new THREE.Group();g.name='Reference-white-red-masonry-canopy';
    const C=CANOPY,W=C.width,L=C.length,cz=C.centerZ,half=W/2;
    const fasciaMid=(C.fasciaTop+C.fasciaBottom)/2;
    const FB=C.fasciaBottom,D=1.45,top=FB+D;       // level fascia top ~5.8 m
    const copeE=0.2,copeS=0.07,yT=top-copeS;       // black coping: ends / sides
    const outer=half+0.065,plateD=0.09;
    const soffit=box(g,W,C.soffitDepth,L,underside,0,C.clearance+C.soffitDepth/2,cz,'White-soffit');soffit.castShadow=false;
    box(g,W,C.fasciaDepth,L,white,0,fasciaMid,cz,'White-fascia');
    box(g,W,C.edgeDepth,L,M.darkTrim,0,C.edgeTop-C.edgeDepth/2,cz,'Black-top-edge');
    // Roof deck (lidar roof ~5.34-5.40 m) inside the parapet, with a grey
    // lining on the parapet's inner faces.
    box(g,W-0.1,0.07,L-0.2,M.roof,0,C.roofTop-0.035,cz,'Roof-surface');
    const lineH=top-C.roofTop,lineY=(top+C.roofTop)/2;
    for(const sx of [-1,1])box(g,0.04,lineH,L,liningMat,sx*(half-0.045),lineY,cz,'Parapet-lining',false);
    for(const z of [C.startZ+0.045,C.endZ-0.045])box(g,W-0.1,lineH,0.04,liningMat,0,lineY,z,'Parapet-lining',false);
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
    // Box / glow plane along a segment in the (z, y) plane at a given x.
    function segBox(p0,p1,x,thick,wide,mat,name){
      const dz=p1[0]-p0[0],dy=p1[1]-p0[1];
      const m=box(g,thick,wide,Math.hypot(dz,dy),mat,x,(p0[1]+p1[1])/2,(p0[0]+p1[0])/2,name,false);
      m.rotation.x=Math.atan2(-dy,dz);return m;
    }
    function segHalo(p0,p1,x,h){
      const dz=p1[0]-p0[0],dy=p1[1]-p0[1];
      const m=halo(Math.hypot(dz,dy),h,x,(p0[1]+p1[1])/2,(p0[0]+p1[0])/2);
      m.rotation.set(Math.atan2(dy,-dz),Math.PI/2,0,'XYZ');return m;
    }
    // Long-side fascia plate drawn in (z, y), extruded inward from its face.
    function sidePlate(points,material,sx,name,faceOffset=0){
      const s=new THREE.Shape();points.forEach(([z,y],i)=>i?s.lineTo(z,y):s.moveTo(z,y));s.closePath();
      const geo=new THREE.ExtrudeGeometry(s,{depth:plateD,bevelEnabled:false});
      geo.rotateY(-Math.PI/2); // shape x -> world z, extrusion -> world -x
      const f=outer+faceOffset,m=new THREE.Mesh(geo,material);m.name=name;m.position.x=sx>0?f:-(f-plateD);
      m.castShadow=m.receiveShadow=true;g.add(m);return m;
    }
    // Long sides. s runs from the side's brand corner toward its far end.
    const r0=FB+0.08*D,r1=FB+0.85*D,sEnd=0.55*L,s0=0.03,run=0.4*D;
    const diagS=y=>s0+run*(yT-y)/(yT-FB);            // corner diagonal
    const yN=top-copeE-0.03;                         // height of the top neon
    const R=0.72;
    for(const sx of [-1,1]){
      const brandZ=sx>0?C.startZ:C.endZ,dir=sx>0?1:-1,Z=s=>brandZ+dir*s;
      sidePlate([[Z(0),FB],[Z(L),FB],[Z(L),yT],[Z(0),yT]],sideRed,sx,'Long-red-ribbon');
      const sD=diagS(r0);
      sidePlate([[Z(s0),yT],[Z(sEnd),yT],[Z(sEnd),r1],[Z(sD),r0]],white,sx,'Canopy-white-slant',0.012);
      box(g,0.14,copeS,L,M.darkTrim,sx*(outer-0.03),top-copeS/2,cz,'Side-coping');
      // Black trim down the corner diagonal (the full fascia height).
      segBox([Z(s0),yT],[Z(diagS(FB)),FB],sx*(outer+0.02),0.03,0.07,M.darkTrim,'Corner-diagonal-trim');
      // Neon: along the bottom of the white panel, and up the corner diagonal
      // on its red side to the top neon of the TEXACO face.
      const nx=sx*(outer+0.035);
      const bottom=segBox([Z(sD),r0],[Z(sEnd),r1],nx,0.04,0.05,edgeLed,'Canopy-slant-neon');bottom.castShadow=false;
      segBox([Z(sD-0.05),r0],[Z(diagS(yN)-0.05),yN],nx,0.04,0.05,edgeLed,'Canopy-corner-LED');
      segHalo([Z(sD),r0],[Z(sEnd),r1],sx*(outer+0.07),0.5);
      segHalo([Z(sD-0.05),r0],[Z(diagS(yN)-0.05),yN],sx*(outer+0.07),0.45);
      // Roundel on the white panel at the brand corner, ~45% above the top.
      const emblem=new THREE.Group();emblem.name='Canopy-star-roundel';
      emblem.position.set(sx*(outer+0.012+0.062),FB+0.93*D,Z(0.465*D+R));emblem.rotation.y=sx*Math.PI/2;
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(R,R,0.12,64),rimMat);
      rim.name='Canopy-roundel-rim';rim.rotation.x=Math.PI/2;rim.castShadow=true;emblem.add(rim);
      const logo=new THREE.Mesh(new THREE.CircleGeometry(R-0.03,64),roundelMat);
      logo.name='Upright-canopy-star-face';logo.position.z=0.062;emblem.add(logo);
      // Back face too: the upper part shows above the roof from behind.
      const backLogo=new THREE.Mesh(logo.geometry,roundelMat);backLogo.name='Canopy-roundel-back';
      backLogo.position.z=-0.062;backLogo.rotation.y=Math.PI;emblem.add(backLogo);
      g.add(emblem);
    }
    // Ends: red face, thick black coping that overhangs both corners with
    // diagonal ends, raised TEXACO, neon along the top (photos).
    const faceTop=top-copeE,faceH=faceTop-FB,faceMid=(faceTop+FB-0.02)/2;
    const copeShape=new THREE.Shape();
    copeShape.moveTo(-(half+0.08),0);copeShape.lineTo(half+0.08,0);copeShape.lineTo(half+0.18,copeE);copeShape.lineTo(-(half+0.18),copeE);copeShape.closePath();
    const copeGeo=new THREE.ExtrudeGeometry(copeShape,{depth:0.24,bevelEnabled:false});
    for(const [z,out,brandSx] of [[C.endZ,1,-1],[C.startZ,-1,1]]){
      box(g,W+0.16,faceH+0.02,0.14,canopyBand,0,faceMid,z+out*0.07,'Red-brand-end');
      const cope=new THREE.Mesh(copeGeo,M.darkTrim);cope.name='Brand-end-coping';cope.castShadow=true;
      cope.position.set(0,faceTop,out>0?z-0.03:z+0.03-0.24);g.add(cope);
      // Both photos: the word spans ~13-66% of the face from the roundel corner.
      lettering(0.6*faceH,0.53*W,brandSx*(half-0.395*W),FB+faceH/2,z+out*0.14,out);
      const nz=z+out*0.165;
      box(g,W+0.16,0.05,0.05,edgeLed,0,yN,nz,'Canopy-end-top-LED',false);
      halo(W+0.16,0.5,0,yN,z+out*0.2);
      // Short neon return down the corner away from the roundel (night photo).
      const vh=0.3*faceH,vx=-brandSx*(half+0.055);
      box(g,0.05,vh,0.05,edgeLed,vx,yN-vh/2,nz,'Canopy-end-corner-LED',false);
      halo(0.3,vh,vx,yN-vh/2,z+out*0.2);
    }
    // Raised TEXACO in broad, closely set capitals.
    function lettering(capH,width,xc,y,z,facing){
      if(!font)return null;
      const grp=new THREE.Group();grp.name='Raised-TEXACO-letters';
      const probe=new TextGeometry('T',{font,size:1,height:0.01,curveSegments:1,bevelEnabled:false});probe.computeBoundingBox();
      const size=capH/(probe.boundingBox.max.y-probe.boundingBox.min.y);probe.dispose();
      const geos=[...'TEXACO'].map(ch=>{const t=new TextGeometry(ch,{font,size,height:0.11,curveSegments:4,bevelEnabled:true,bevelSize:0.008,bevelThickness:0.006,bevelSegments:1});t.scale(1.4,1,1);t.computeBoundingBox();return t;});
      const widths=geos.map(t=>t.boundingBox.max.x-t.boundingBox.min.x),sum=widths.reduce((a,b)=>a+b,0);
      const gap=Math.max(0.12*capH,(width-sum)/(geos.length-1));
      let x=-(sum+gap*(geos.length-1))/2;
      geos.forEach((t,i)=>{
        t.translate(x-t.boundingBox.min.x,-capH/2,0);x+=widths[i]+gap;
        const m=new THREE.Mesh(t,[litLetters,black]);m.castShadow=true;grp.add(m);
      });
      grp.position.set(xc,y,z);if(facing<0)grp.rotation.y=Math.PI;g.add(grp);return grp;
    }

    // Large red TECHRON graphic on the soffit above the pump lane in each
    // side's TEXACO half (photos); slightly self-lit so it reads on the
    // shaded underside as it does in both photos.
    const techronMap=ctex(1024,160,(c,w,h)=>{
      c.clearRect(0,0,w,h);c.fillStyle='#c8102e';
      const cx=90,cy=h/2;c.beginPath();
      for(let i=0;i<8;i++){const a=i*Math.PI/4,q=i%2?18:62;const x=cx+Math.cos(a)*q,y=cy+Math.sin(a)*q;if(i)c.lineTo(x,y);else c.moveTo(x,y);}
      c.closePath();c.fill();
      c.font='italic bold 118px Arial';c.textAlign='left';c.textBaseline='middle';c.fillText('TECHRON',175,cy+6);
      c.font='bold 26px Arial';c.fillText('®',c.measureText('TECHRON').width+175,cy-34);
    });
    const techronMat=new THREE.MeshStandardMaterial({map:techronMap,alphaTest:0.4,roughness:0.85,emissive:0xffffff,emissiveMap:techronMap,emissiveIntensity:0.35,
      polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    [-(half-2.1),half-2.1].forEach((x,k)=>{
      const graphic=new THREE.Mesh(new THREE.PlaneGeometry(9.6,1.5),techronMat);
      graphic.name='Soffit-Techron-graphic';graphic.rotation.set(Math.PI/2,0,k?Math.PI/2:-Math.PI/2);
      graphic.position.set(x,C.clearance-0.004,k?C.startZ+0.3*L:C.endZ-0.3*L);g.add(graphic);
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
