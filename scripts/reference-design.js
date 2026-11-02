import * as THREE from '../vendor/three.module.js';
import { TextGeometry } from '../vendor/jsm/geometries/TextGeometry.js';
import { CANOPY } from './station-geometry.js';

export function createReferenceDesign({M,ctex,glowMat,makeHeaderMaterial,font}) {
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
  const starMap=ctex(256,256,(c)=>{
    c.clearRect(0,0,256,256);c.fillStyle='#fff';c.beginPath();c.arc(128,128,120,0,Math.PI*2);c.fill();
    c.fillStyle='#c8102e';c.beginPath();
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?47:106;const x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();c.fill();
    c.fillStyle='#fff';c.fillRect(78,96,100,19);c.fillRect(116,105,24,92);
  });
  const starMaterial=new THREE.MeshStandardMaterial({map:starMap,transparent:true,roughness:0.4,emissive:0xffffff,emissiveMap:starMap,emissiveIntensity:0});
  // Illuminated new-design canopy branding: red band, TEXACO letters and star
  // badges glow after dark (driven by the time-of-day presets). Brushed to
  // match the owner's night reference — the TEXACO sign and star roundels
  // glow brightly like the real station.
  const canopyBand=M.red.clone();canopyBand.emissive=new THREE.Color(0xff2236);canopyBand.emissiveIntensity=0;
  const litLetters=white.clone();litLetters.emissive=new THREE.Color(0xffffff);litLetters.emissiveIntensity=0;
  const canopyGlow=[{material:canopyBand,night:0.42,golden:0.2},{material:litLetters,night:1.4,golden:0.45},{material:starMaterial,night:1.2,golden:0.4}];
  function box(parent,w,h,d,material,x,y,z,name=''){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function face(parent,w,h,material,x,y,z,back=false,name=''){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);m.position.set(x,y,z);if(back)m.rotation.y=Math.PI;m.name=name;parent.add(m);return m;
  }
  // Gable-shaped header: a triangular prism whose ridge runs across the
  // dispenser, extruded along X (pump-photo reference: white sloped top with
  // a star roundel, red "with TECHRON" band beneath).
  function prism(parent,len,base,rise,material,x,y,z,name=''){
    const s=new THREE.Shape();s.moveTo(-base/2,0);s.lineTo(base/2,0);s.lineTo(0,rise);s.closePath();
    const geo=new THREE.ExtrudeGeometry(s,{depth:len,bevelEnabled:false});
    geo.rotateY(Math.PI/2);geo.translate(-len/2,0,0);
    const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function pump(number) {
    const g=new THREE.Group();g.name=`Reference-dispenser-${number}-${number+1}`;
    box(g,1.16,0.08,0.72,black,0,0.26,0,'Foot-plinth');
    box(g,1.02,0.7,0.61,M.red,0,0.65,0,'Texaco-red-cabinet');
    box(g,1.05,0.9,0.62,black,0,1.44,0,'Black-terminal-housing');
    box(g,1.05,0.16,0.56,black,0,1.97,0,'Terminal-hood');
    // Twin brushed-steel uprights carry the header clear of the cabinet.
    [-0.64,0.64].forEach(x=>box(g,0.13,2.12,0.5,silver,x,1.3,0,'Silver-frame'));
    // Header: red band with the pump number, white gable above with roundels.
    const bandY=2.36,bandH=0.3,headW=1.56,headD=0.7,rise=0.36;
    box(g,headW,bandH,headD,M.red,0,bandY+bandH/2,0,'Swept-Techron-header');
    box(g,headW+0.04,0.03,headD+0.04,M.redDark,0,bandY+0.015,0,'Header-drip-edge');
    prism(g,headW,headD,rise,white,0,bandY+bandH,0,'White-gable-header');
    const slope=Math.atan2(rise,headD/2),rr=0.16;
    for(const [sign,n] of [[-1,number],[1,number+1]]){
      const back=sign<0;
      face(g,headW-0.02,bandH-0.02,makeHeaderMaterial(n),0,bandY+bandH/2,sign*(headD/2+0.003),back,'Techron-numbered-face');
      // Roundel on each sloped face of the gable.
      const badge=new THREE.Mesh(new THREE.CircleGeometry(rr,40),starMaterial);
      badge.name='Header-star-roundel';
      badge.position.set(0,bandY+bandH+rise/2+0.004,sign*(headD/4+0.004));
      badge.rotation.set(-(Math.PI/2-slope),back?Math.PI:0,0,'YXZ');
      g.add(badge);
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
  function canopy(islandZ) {
    // Texaco canopy matched to the owner's photos, sized to the measured
    // canopy (station-geometry.js): 32.4 x 12.8 m, top 5.40 m.
    //  - Long sides: white upper fascia over a red lower band, red LED reveal.
    //  - Ends: taller all-red blade fascia with raised white TEXACO letters,
    //    LED lines along the top and bottom edges.
    //  - Star roundel standing proud of the roofline at the corner, on the
    //    long side next to each TEXACO end.
    //  - White slatted soffit with "with TECHRON" printed on it.
    //  - Tan block columns with red pump-number flags.
    const g=new THREE.Group();g.name='Reference-white-red-masonry-canopy';
    const C=CANOPY,W=C.width,L=C.length,cz=C.centerZ,half=W/2;
    const fasciaMid=(C.fasciaTop+C.fasciaBottom)/2;
    const soffit=box(g,W,C.soffitDepth,L,underside,0,C.clearance+C.soffitDepth/2,cz,'White-soffit');soffit.castShadow=false;
    box(g,W,C.fasciaDepth,L,white,0,fasciaMid,cz,'White-fascia');
    box(g,W+0.16,C.edgeDepth,L+0.14,M.darkTrim,0,C.edgeTop-C.edgeDepth/2,cz,'Black-top-edge');
    // Roof membrane caps the fascia stack (lidar roof ~5.34-5.40 m).
    box(g,W-0.1,0.07,L-0.2,M.roof,0,C.roofTop-0.035,cz,'Roof-surface');
    const edgeLed=new THREE.MeshStandardMaterial({color:0xff2236,emissive:0xff2236,emissiveIntensity:0});
    canopyGlow.push({material:edgeLed,night:2.2,golden:0.6});
    // Red neon at night: soft additive halo planes around every LED line fake
    // the bloom seen in the night photo. Black + additive = invisible by day;
    // the time-of-day presets drive emissiveIntensity up after dark.
    const haloMap=ctex(16,128,(c,w,h)=>{
      const gr=c.createLinearGradient(0,0,0,h);
      gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(0.5,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(0,0,0,1)');
      c.fillStyle=gr;c.fillRect(0,0,w,h);
    });
    haloMap.colorSpace=THREE.NoColorSpace;
    const neonHalo=new THREE.MeshStandardMaterial({color:0x000000,emissive:0xff1530,emissiveMap:haloMap,emissiveIntensity:0,
      transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    canopyGlow.push({material:neonHalo,night:1.5,golden:0.35});
    function halo(len,h,x,y,z,rotY){
      const m=new THREE.Mesh(new THREE.PlaneGeometry(len,h),neonHalo);m.name='Red-neon-halo';
      m.position.set(x,y,z);m.rotation.y=rotY;m.renderOrder=2;g.add(m);return m;
    }
    const bandH=C.fasciaDepth*0.42;
    [-(half+0.02),half+0.02].forEach(x=>{
      box(g,0.09,bandH,L,canopyBand,x,C.fasciaBottom+bandH/2,cz,'Long-red-ribbon');
      box(g,0.055,0.045,L,M.redDark,x,C.fasciaBottom+0.01,cz,'Red-lower-reveal');
      box(g,0.06,0.04,L+0.1,edgeLed,x+Math.sign(x)*0.04,C.fasciaBottom-0.02,cz,'Canopy-edge-LED');
      halo(L+0.3,0.55,x+Math.sign(x)*0.09,C.fasciaBottom-0.02,cz,Math.PI/2);
    });
    // Ends: the TEXACO blade rises above the long fascia and is joined to it
    // by a short tapered wing on each long side.
    const lift=0.42,endTop=C.edgeTop+lift,endBottom=C.fasciaBottom-0.02,endH=endTop-endBottom,endMid=(endTop+endBottom)/2;
    [C.startZ-0.07,C.endZ+0.07].forEach((z,i)=>{
      const out=i?1:-1;
      box(g,W+0.2,endH,0.14,canopyBand,0,endMid,z,'Red-brand-end');
      box(g,W+0.24,0.05,0.06,edgeLed,0,endTop+0.005,z+out*0.05,'Canopy-end-top-LED');
      box(g,W+0.24,0.05,0.06,edgeLed,0,endBottom-0.02,z+out*0.05,'Canopy-end-bottom-LED');
      halo(W+0.24,0.55,0,endTop+0.005,z+out*0.1,0);
      halo(W+0.24,0.55,0,endBottom-0.02,z+out*0.1,0);
      // Neon line along the sloped top of each tapered wing.
      [-1,1].forEach(sx=>{
        const len=Math.hypot(3.2,lift),ang=Math.atan2(lift,3.2);
        const strip=box(g,0.06,0.05,len,edgeLed,sx*(half+0.03),C.edgeTop+lift/2+0.03,z-out*1.6,'Canopy-wing-LED');
        strip.rotation.x=-out*ang;
        const hl=halo(len,0.45,sx*(half+0.09),C.edgeTop+lift/2+0.03,z-out*1.6,0);hl.rotation.set(-out*ang,Math.PI/2,0,'XYZ');
      });
      // Tapered wing: red, from the blade top down to the long-side roofline.
      [-1,1].forEach(sx=>{
        const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(3.2,0);s.lineTo(0,lift);s.closePath();
        const geo=new THREE.ExtrudeGeometry(s,{depth:0.1,bevelEnabled:false});
        geo.rotateY(i?Math.PI/2:-Math.PI/2);
        const wing=new THREE.Mesh(geo,canopyBand);wing.name='Tapered-end-wing';
        wing.position.set(sx*(half+0.03)+(i?-0.05:0.05),C.edgeTop,z);
        wing.castShadow=true;g.add(wing);
      });
      // True extruded lettering, with dark sidewalls, not flattened fascia text.
      if(font){
        const ls=0.64*endH;
        const text=new TextGeometry('TEXACO',{font,size:ls,height:0.11,curveSegments:4,bevelEnabled:true,bevelSize:0.008,bevelThickness:0.006,bevelSegments:1});
        text.computeBoundingBox();const tb=text.boundingBox;text.translate(-(tb.max.x-tb.min.x)/2-tb.min.x,-(tb.max.y+tb.min.y)/2,0);
        const letters=new THREE.Mesh(text,[litLetters,black]);letters.name='Raised-TEXACO-letters';letters.position.set(0,endMid,z+out*0.075);if(!i)letters.rotation.y=Math.PI;letters.castShadow=true;g.add(letters);
      }
      // Star roundels on both long sides at the corner, standing above the roof
      // (photos: it overlaps the corner where the TEXACO blade meets the side).
      // Stays inside the lidar envelope: overall width ~13.0 m, top < 6.5 m.
      const R=0.9;
      for(const sx of [-1,1]){
      const emblem=new THREE.Group();emblem.name='Canopy-star-roundel';
      emblem.position.set(sx*(half+0.07),endTop-0.25,z-out*(R+0.35));
      emblem.rotation.y=sx*Math.PI/2;
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(R,R,0.18,48),white);
      rim.name='Canopy-roundel-rim';rim.rotation.x=Math.PI/2;rim.castShadow=true;emblem.add(rim);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(R,0.045,8,48),M.redDark);
      ring.name='Canopy-roundel-red-ring';ring.position.z=0.05;emblem.add(ring);
      const logo=new THREE.Mesh(new THREE.CircleGeometry(R-0.04,48),starMaterial);
      logo.name='Upright-canopy-star-face';logo.position.z=0.092;emblem.add(logo);
      g.add(emblem);
      }
    });

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
