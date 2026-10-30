import * as THREE from '../vendor/three.module.js';
import { PLAN } from './reference-plan.js';
import { FLAGPOLE } from './station-geometry.js';
import {getSurfacePlan,surfaceMesh} from './surface-plan.js';

// Owner-marked side of the shop: local +Z end wall. Dimensions are estimates.
export function addStoreSideLandscape({stationLayout,M,ctex}) {
  const group=new THREE.Group();group.name='Store-side-landscape';stationLayout.add(group);
  function box(name,w,h,d,mat,x,y,z){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y,z);
    m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  }
  const walk=new THREE.MeshStandardMaterial({color:0xc9c5ba,roughness:0.95});
  const joint=new THREE.MeshStandardMaterial({color:0x827f75,roughness:1});
  const lawn=new THREE.MeshStandardMaterial({color:M.grass?.map?0xffffff:0x9c9772,map:M.grass?.map ?? null,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const steel=new THREE.MeshStandardMaterial({color:0xc6ccce,metalness:0.3,roughness:0.35});
  const stainless=new THREE.MeshStandardMaterial({name:'Brushed silver stainless steel',color:0xd1d5d7,metalness:0.45,roughness:0.3});
  const fence=new THREE.MeshStandardMaterial({color:0x8a7f69,roughness:0.96});
  const bin=new THREE.MeshStandardMaterial({color:0x24443c,roughness:0.8,metalness:0.1});
  const rubber=new THREE.MeshStandardMaterial({color:0x202526,roughness:0.95});
  // Render the same boolean-cut surfaces used to exclude paving. Their
  // shared edges cannot acquire a second, inconsistent legacy grass outline.
  const surfaces=getSurfacePlan();
  const perimeter=new THREE.Group();perimeter.name='Store-wall-sidewalks';group.add(perimeter);
  for(const [name,multi] of surfaces.wallWalks){
    const mesh=surfaceMesh(name,multi,walk,0.14);
    (name==='Traced-store-front-walk'?group:perimeter).add(mesh);
  }
  group.add(surfaceMesh('Car-wash-to-store-walk',surfaces.approach,walk,0.14));
  group.add(surfaceMesh('Store-side-connector-walk',surfaces.connector,walk,0.14));
  for(const {name,polygons} of surfaces.grass){
    group.add(surfaceMesh(name,polygons,lawn,0.065));
    for(const poly of polygons)for(const ring of poly)for(let i=1;i<ring.length;i++){
      const [ax,az]=ring[i-1],[bx,bz]=ring[i],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
      if(len<0.02)continue;
      const m=box('Planted-island-curb',0.12,0.14,len,walk,(ax+bx)/2,0.08,(az+bz)/2);m.rotation.y=Math.atan2(dx,dz);
    }
  }

  // Screened dumpster pad on the hotel-facing side, as in the wide aerial. Its gate faces
  // the service approach, away from the shop's pedestrian entrance.
  const enclosure=new THREE.Group();enclosure.name='Screened-dumpster-area';enclosure.position.set(PLAN.dumpster.x,0,PLAN.dumpster.z);group.add(enclosure);
  const piece=(name,w,h,d,mat,x,y,z)=>{const m=box(name,w,h,d,mat,0,0,0);enclosure.add(m);m.position.set(x,y,z);return m;};
  piece('Dumpster-concrete-pad',4.8,0.13,4.5,walk,0,0.065,0);
  for(const x of [-2.25,2.25])piece('Enclosure-side-wall',0.14,2.15,4.2,fence,x,1.14,0);
  piece('Enclosure-back-wall',4.5,2.15,0.14,fence,0,1.14,-2.03);
  for(const x of [-2.27,0,2.27])piece('Enclosure-gate-post',0.15,2.3,0.15,steel,x,1.2,2.05);
  for(const x of [-1.12,1.12]){
    piece('Dumpster-screen-gate',2.1,1.98,0.1,fence,x,1.12,2.04);
    piece('Gate-cross-rail',2.08,0.09,0.13,steel,x,0.65,2.12);
    piece('Gate-cross-rail',2.08,0.09,0.13,steel,x,1.65,2.12);
  }
  piece('Gate-latch',0.32,0.07,0.15,steel,0,1.16,2.15);
  piece('Green-dumpster-body',2.9,1.25,1.7,bin,0,0.96,-0.15);
  for(const x of [-0.74,0.74]){
    const lid=piece('Dumpster-lid',1.44,0.12,1.8,rubber,x,1.65,-0.15);lid.rotation.x=-0.08;
    piece('Dumpster-lid-handle',0.32,0.045,0.06,steel,x,1.72,0.57);
  }
  for(const x of [-1.24,1.24])for(const z of [-0.8,0.5])piece('Dumpster-caster',0.14,0.24,0.18,rubber,x,0.25,z);

  // Large Texas flag: blue hoist third, white upper fly, red lower fly, one star.
  const flagTexture=ctex(900,600,(c,w,h)=>{
    c.fillStyle='#ffffff';c.fillRect(0,0,w,h);c.fillStyle='#bf0a30';c.fillRect(w/3,h/2,w*2/3,h/2);
    c.fillStyle='#002868';c.fillRect(0,0,w/3,h);
    c.fillStyle='#ffffff';c.beginPath();
    for(let i=0;i<10;i++){
      const angle=-Math.PI/2+i*Math.PI/5,r=i%2?54:132;
      const x=w/6+Math.cos(angle)*r,y=h/2+Math.sin(angle)*r;
      if(i)c.lineTo(x,y);else c.moveTo(x,y);
    }
    c.closePath();c.fill();
  });
  const pole=new THREE.Group();pole.name='Texas-flagpole';pole.position.set(-26,0,16.2);pole.rotation.y=Math.PI/4;group.add(pole);
  const footing=new THREE.Mesh(new THREE.CylinderGeometry(0.47,0.54,0.24,24),walk);footing.position.y=0.2;pole.add(footing);
  // Height from 2017 lidar: a slender object reaching ~20.3 m stands at the
  // modelled flag position (was a 14 m estimate). See station-geometry.js.
  const H=FLAGPOLE.top-0.2, shaftH=H-0.22;
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.15,shaftH,32),stainless);shaft.name='Stainless-steel-flagpole-shaft';shaft.position.y=0.22+shaftH/2;shaft.castShadow=true;pole.add(shaft);
  const finial=new THREE.Mesh(new THREE.SphereGeometry(0.16,20,12),stainless);finial.name='Silver-flagpole-finial';finial.position.y=H+0.08;pole.add(finial);
  const rope=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,H-0.9,8),walk);rope.position.set(-0.1,(H-0.9)/2+0.2,0);pole.add(rope);
  const cleat=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.25,0.15),stainless);cleat.position.set(-0.13,1.5,0);pole.add(cleat);
  const width=5.4,height=3.6;
  const geometry=new THREE.PlaneGeometry(width,height,36,24);geometry.translate(width/2,-height/2,0);
  const rest=geometry.attributes.position.array.slice();geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const flag=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:flagTexture,side:THREE.DoubleSide,roughness:0.9,metalness:0}));
  flag.name='Waving-Texas-flag';flag.position.set(0.09,H-0.3,0);flag.castShadow=true;pole.add(flag);
  // A roof-mounted, upward-facing floodlight, not a ground light at the pole.
  const roofMount=new THREE.Group();roofMount.name='Roof-corner-flag-spotlight';
  roofMount.position.set(PLAN.store.centerX+PLAN.store.depth/2-0.3,5.2,PLAN.store.centerZ+PLAN.store.frontage/2-0.3);group.add(roofMount);
  const foot=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.08,0.36),stainless);foot.position.y=0.04;roofMount.add(foot);
  const bracket=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.24,0.1),steel);bracket.position.y=0.16;roofMount.add(bracket);
  const housing=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.3,0.26),rubber);housing.name='Flag-floodlight-housing';housing.position.y=0.3;roofMount.add(housing);
  const lens=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.22),new THREE.MeshStandardMaterial({color:0xfff0dc,emissive:0xffe7bd,emissiveIntensity:0,roughness:0.3}));lens.position.set(0,0,0.135);housing.add(lens);
  const uplight=new THREE.SpotLight(0xfff0dc,0,40,0.33,0.65,1.6);uplight.name='Roof-to-flag-spotlight';uplight.position.y=0.3;roofMount.add(uplight);group.add(uplight.target);
  // Pole and roof use the same station-local frame, so scene rotation is safe.
  const aim=pole.position.clone().add(new THREE.Vector3(2.2,H-0.3-1.55,0).applyAxisAngle(new THREE.Vector3(0,1,0),pole.rotation.y));
  uplight.target.position.copy(aim);
  function setRoofHeight(height){
    roofMount.position.y=height+0.03;
    housing.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),aim.clone().sub(roofMount.position).sub(housing.position).normalize());
  }
  setRoofHeight(5.2);
  function update(time,night=false){
    const p=geometry.attributes.position;
    // Broad, non-periodic-looking gust envelope with travelling folds and a
    // faster free-edge flutter. The attached blue edge remains exactly pinned.
    const gust=0.58+0.25*Math.sin(time*0.63)+0.13*Math.sin(time*1.17+1.8);
    const direction=0.2*Math.sin(time*0.27)+0.07*Math.sin(time*0.79);
    for(let i=0;i<p.count;i++){
      const x=Math.max(0,rest[i*3]),y=rest[i*3+1],u=Math.min(1,x/width),v=-y/height;
      const envelope=Math.pow(u,0.85),phase=u*8-time*(3.0+0.2*Math.sin(time*0.41));
      const billow=Math.sin(phase+v*1.3)*0.46*gust;
      const fold=Math.sin(u*16-time*5.1+v*2.4)*0.14*gust;
      const flutter=Math.sin(u*30-time*10.8+v*5)*0.09*u*u;
      const tension=0.045+0.055*(1-gust);
      p.setXYZ(i,x*(1-tension*envelope*(0.65+0.35*Math.sin(phase))),
        y-(0.3+0.2*(1-gust))*u*u+0.12*envelope*Math.sin(phase+v*2),
        envelope*(billow+fold+flutter+direction*x));
    }
    p.needsUpdate=true;geometry.computeVertexNormals();uplight.intensity=night?160:0;lens.material.emissiveIntensity=night?2:0;
  }
  // Prevent animated cloth being clipped using its initial flat bounding box.
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(width/2,-height/2,0),4.2);
  update(0);
  return {group,flag,pole,enclosure,roofMount,uplight,setRoofHeight,update};
}
