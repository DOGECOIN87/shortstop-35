import * as THREE from '../vendor/three.module.js';
import { PLAN,aerialToSite } from './reference-plan.js';
import {getSurfacePlan,surfaceMesh} from './surface-plan.js';
import { OSM_ROADS, OSM_BUILDINGS, osmSite } from './osm-roads.js';
import { trueToSite } from './station-geometry.js';

// highwayDeck: lidar deck top 201.7 m vs store ground 196.2 m (5.5 m). Highway width: two
// 4-lane carriageways whose OSM centrelines are ~21.7 m apart, plus a central barrier.
// Inn pose fitted to the OSM Edelweiss Inn outline (77.3 m main block, 10.9 m deep): the
// 85 m traced model is shortened by lengthScale and moved ~7.4 m. Traced hotel parking
// moves with it through hotelShift() so the stalls keep their relation to the building.
const TRACED_HOTEL={x:-31.5,z:70,heading:1.517};
export const CIRCULATION={hotel:{x:-31.73,z:62.6,length:85,width:13,heading:1.5352,lengthScale:77.34/85},hotelDrive:{z:53.7,width:5.4},crossStreet:{z:-38,width:21},highwayDeck:5.5,highway:{width:36.1,laneLines:[-14.45,-10.85,-7.25,7.25,10.85,14.45],edges:[-3.65,3.65]}};

// Traced (screenshot) hotel-area point -> OSM-fitted inn frame, via inn-local coordinates.
export function hotelShift([x,z]){
  const o=TRACED_HOTEL,n=CIRCULATION.hotel,dx=x-o.x,dz=z-o.z;
  const lx=dx*Math.cos(o.heading)-dz*Math.sin(o.heading),lz=(dx*Math.sin(o.heading)+dz*Math.cos(o.heading))*n.lengthScale;
  return [n.x+lx*Math.cos(n.heading)+lz*Math.sin(n.heading),n.z-lx*Math.sin(n.heading)+lz*Math.cos(n.heading)];
}
export function addSiteCirculation({world,M,ctex,glowMat}) {
  const obstacleSurfaces=[];
  const group=new THREE.Group();group.name='Digitised-aerial-site';world.add(group);
  const white=new THREE.MeshBasicMaterial({color:0xe1dfd5,polygonOffset:true,polygonOffsetFactor:-12,polygonOffsetUnits:-12});
  // Overhead depth precision must not make grass/ground bleed through paving.
  const roadMaterial=M.asphalt.clone();Object.assign(roadMaterial,{polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const drivewayMaterial=M.concrete.clone();Object.assign(drivewayMaterial,{polygonOffset:true,polygonOffsetFactor:-8,polygonOffsetUnits:-8});
  function box(name,w,h,d,mat,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
  function polygon(name,pixels,mat,y=0.02,toSite=aerialToSite){
    const points=pixels.map(toSite),shape=new THREE.Shape();
    points.forEach(([x,z],i)=>{if(i)shape.lineTo(x,-z);else shape.moveTo(x,-z);});shape.closePath();
    const geometry=new THREE.ShapeGeometry(shape);
    const uv=geometry.attributes.uv,p=geometry.attributes.position;
    for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)*0.03,p.getY(i)*0.03);
    const mesh=new THREE.Mesh(geometry,mat);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.name=name;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  function siteRibbon(name,points,width,material,y=0.04){
    const path=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,y,z)),false,'centripetal');
    const positions=[],uv=[],indices=[],steps=160;
    for(let i=0;i<=steps;i++){
      const t=i/steps,center=path.getPoint(t),tangent=path.getTangent(t),normal=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
      for(const sign of [1,-1]){const v=center.clone().addScaledVector(normal,sign*width/2);positions.push(v.x,v.y,v.z);uv.push(v.x*0.03,-v.z*0.03);}
      if(i<steps){const a=2*i;indices.push(a,a+2,a+1,a+2,a+3,a+1);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.receiveShadow=true;group.add(mesh);if(!/walk/i.test(name))obstacleSurfaces.push(mesh);return {mesh,path};
  }
  const ribbon=(name,pixels,width,material,y)=>siteRibbon(name,pixels.map(aerialToSite),width,material,y);
  function curb(name,pixels,y=0.15){
    const path=new THREE.CatmullRomCurve3(pixels.map(p=>{const [x,z]=aerialToSite(p);return new THREE.Vector3(x,y,z);}),false,'centripetal');
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,120,0.085,6,false),M.curb);mesh.name=name;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  const surfaces=getSurfacePlan();
  const apron=surfaceMesh('Traced-forecourt-footprint',surfaces.pavement,M.concrete,0.025,true);
  group.add(apron);obstacleSurfaces.push(apron);
  // Paths remain available for traffic/clearance consumers, but their old
  // overlapping slabs are not drawn. The common apron mesh contains their
  // clipped footprints and terminates at the asphalt edge, not the road centre.
  const service=ribbon('Rear-service-access-lane',PLAN.rearAccess,4.0,M.concrete,0.026);
  const crossEntry=ribbon('Cross-street-property-entrance',PLAN.crossStreetEntrance,7,M.concrete,0.03);
  const mainEntry=ribbon('Forecourt-frontage-opening',PLAN.entranceFrontage,8.8,drivewayMaterial,0.07);
  const hotelEntry=ribbon('Hotel-frontage-driveway',PLAN.hotelEntrance,8.5,drivewayMaterial,0.07);
  for(const r of [service,crossEntry,mainEntry,hotelEntry]){r.mesh.visible=false;obstacleSurfaces.splice(obstacleSurfaces.indexOf(r.mesh),1);}
  const rearWalkMaterial=new THREE.MeshStandardMaterial({color:0xc6b99d,roughness:1});
  group.add(surfaceMesh('Traced-rear-pedestrian-walk',surfaces.outerWalk,rearWalkMaterial,0.14,true));
  group.add(surfaceMesh('Traced-junction-grass-island',surfaces.junctionGrass,M.grass,0.055,true));
  const frontageGrass=surfaceMesh('Traced-frontage-grass-island',surfaces.frontageGrass,M.grass,0.055,true);
  frontageGrass.userData.continuousBesideCanopy=true;group.add(frontageGrass);
  // Curbs use precisely the clipped lawn boundaries, including driveway cuts.
  // No smoothed tube may overshoot into the roadway or bridge an entrance.
  for(const [name,multi] of [['Continuous-curb-beside-canopy',surfaces.frontageGrass],['Junction-corner-curb',surfaces.junctionGrass]]){
    for(const poly of multi)for(const ring of poly)for(let i=1;i<ring.length;i++){
      const toSite=([x,z])=>new THREE.Vector3((x+z)*Math.SQRT1_2-8,0,(-x+z)*Math.SQRT1_2);
      const a=toSite(ring[i-1]),b=toSite(ring[i]),d=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(0.5);
      if(d.length()<0.02)continue;
      const m=box(name,0.12,0.14,d.length(),M.curb,mid.x,0.08,mid.z);m.rotation.y=Math.atan2(d.x,d.z);
    }
  }

  // Road network from OpenStreetMap (ODbL), georeferenced into the site frame.
  // Object names are kept for compatibility with existing consumers/tests.
  const frontage=siteRibbon('Traced-south-frontage-road',osmSite('frontage'),12.2,roadMaterial,0.035);
  siteRibbon('OSM-frontage-road-mainline',osmSite('frontageMainline'),10.5,roadMaterial,0.033);
  for(const [name,key] of [['OSM-frontage-to-SH46-ramp','rampToCross'],['OSM-south-turnaround','uturnSouth'],['OSM-north-turnaround','uturnNorth']])siteRibbon(name,osmSite(key),6.5,roadMaterial,0.031);
  const cross=siteRibbon('Traced-cross-street',osmSite('cross'),CIRCULATION.crossStreet.width,roadMaterial,0.038);
  const H=CIRCULATION.highway;
  const highway=siteRibbon('Traced-I35-deck',osmSite('highway').reverse(),H.width,roadMaterial,CIRCULATION.highwayDeck);
  siteRibbon('Opposite-frontage-road',osmSite('oppositeFrontage'),11.5,roadMaterial,0.035);
  // Open deck where OSM tags the I-35 bridges (over SH 46 and the turnarounds); embankment elsewhere.
  const bridges=[osmSite('bridgeNB'),osmSite('bridgeSB')];
  const segDist=(p,[a,b])=>{const ab=[b[0]-a[0],b[1]-a[1]],t=Math.max(0,Math.min(1,((p[0]-a[0])*ab[0]+(p[1]-a[1])*ab[1])/(ab[0]**2+ab[1]**2)));return Math.hypot(p[0]-a[0]-ab[0]*t,p[1]-a[1]-ab[1]*t);};
  for(let i=0;i<120;i++){
    const a=highway.path.getPoint(i/120),b=highway.path.getPoint((i+1)/120),mid=a.clone().add(b).multiplyScalar(0.5),direction=b.clone().sub(a);
    const onBridge=bridges.some(br=>segDist([mid.x,mid.z],br)<14);
    const h=onBridge?0.65:CIRCULATION.highwayDeck-0.15;
    const support=box(onBridge?'I35-open-span-deck':'I35-embankment',onBridge?H.width+0.5:H.width+4,h,direction.length()+0.2,onBridge?M.concrete:M.grass,mid.x,onBridge?CIRCULATION.highwayDeck-0.4:h/2,mid.z);
    support.rotation.y=Math.atan2(direction.x,direction.z);support.castShadow=false;
  }
  // Lane markings follow road tangents. Don't draw dashed lines through the
  // frontage/cross-street junction or a continuous curb across an entrance.
  const junctions=OSM_ROADS.junctions.map(trueToSite);
  function markings(road,offsets,y,skipIntersection=false){
    const length=road.path.getLength();
    for(let d=0;d<length;d+=8){
      const t=d/length,p=road.path.getPointAt(t),v=road.path.getTangentAt(t);
      if(skipIntersection&&junctions.some(j=>Math.hypot(p.x-j[0],p.z-j[1])<15))continue;
      const n=new THREE.Vector3(v.z,0,-v.x);
      for(const offset of offsets){const q=p.clone().addScaledVector(n,offset),line=box('Road-lane-dash',0.13,0.005,3.2,white,q.x,y,q.z);line.rotation.y=Math.atan2(v.x,v.z);}
    }
  }
  markings(frontage,[-2.05,2.05],0.047,true);
  markings(cross,[-7.5,-4.5,4.5,7.5],0.05,true);
  markings(highway,H.laneLines,CIRCULATION.highwayDeck+0.014);
  for(let d=0;d<highway.path.getLength();d+=3){
    const p=highway.path.getPointAt(d/highway.path.getLength()),v=highway.path.getTangentAt(d/highway.path.getLength());
    const median=box('I35-median-barrier',0.65,0.8,3.1,M.concrete,p.x,CIRCULATION.highwayDeck+0.4,p.z);median.rotation.y=Math.atan2(v.x,v.z);
  }
  const cp=cross.path;
  for(let d=0;d<cp.getLength();d+=3){
    const p=cp.getPointAt(d/cp.getLength());
    if(junctions.some(j=>Math.hypot(p.x-j[0],p.z-j[1])<18))continue; // no median across junctions/entrances
    const t=cp.getTangentAt(d/cp.getLength());const edge=box('Cross-street-median-curb',3.1,0.15,3.15,M.curb,p.x,0.105,p.z);edge.rotation.y=Math.atan2(t.x,t.z);
    const m=box('Cross-street-brick-median',2.8,0.04,3.15,M.brick,p.x,0.2,p.z);m.rotation.y=edge.rotation.y;
  }

  // Hotel parking is a single strip on the station-facing side, not a giant
  // generic parking rectangle. Its aisle/row are taken from the same image.
  const hotelPavement=new THREE.MeshStandardMaterial({color:0x7c7d76,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  polygon('Neighbouring-shop-parking',PLAN.neighbouringParking,hotelPavement,0.04);
  polygon('Mcdonalds-parking-footprint',PLAN.mcdonaldsParking,hotelPavement,0.04);
  polygon('Hotel-parking-pavement',PLAN.hotelParking,hotelPavement,0.045,p=>hotelShift(aerialToSite(p)));
  const row=PLAN.hotelCarRow.map(p=>hotelShift(aerialToSite(p))),start=new THREE.Vector3(row[0][0],0,row[0][1]),end=new THREE.Vector3(row[1][0],0,row[1][1]);
  const along=end.clone().sub(start).normalize(),towardHotel=new THREE.Vector3(-along.z,0,along.x);
  const parkingHeading=Math.atan2(towardHotel.x,towardHotel.z);
  const parkingSpots=[];
  for(let i=0;i<23;i++){
    const p=start.clone().lerp(end,i/22);
    const divider=p.clone().addScaledVector(along,-1.45);
    const line=box('Hotel-stall-separator',0.09,0.008,4.7,white,divider.x,0.09,divider.z);line.rotation.y=parkingHeading;
    if(i%4!==1)parkingSpots.push({x:p.x,z:p.z,heading:parkingHeading+(i%3===0?Math.PI:0)});
    const stop=p.clone().addScaledVector(towardHotel,2.1);
    const wheel=box('Hotel-wheel-stop',1.6,0.1,0.15,M.curb,stop.x,0.12,stop.z);wheel.rotation.y=parkingHeading;
  }
  // Follow the row's slight angle rather than stamping an axis-aligned rectangle.
  const walkPoints=[start,end].map(p=>{const v=p.clone().addScaledVector(towardHotel,3.25);return [v.x,v.z];});
  siteRibbon('Hotel-entrance-walk',walkPoints,1.05,M.curb,0.16);
  siteRibbon('Hotel-parking-drive-aisle',PLAN.hotelDrive.map(p=>hotelShift(aerialToSite(p))),5.4,hotelPavement,0.075);
  // The coffee kiosk and bagel-shop footprint are on the same traced plan.
  const [cx,cz]=aerialToSite(PLAN.coffee.center);
  const coffee=box('Coffee-kiosk',6,3.2,5,M.wallWhite,cx,1.6,cz);coffee.rotation.y=-0.7;
  const roof=box('Coffee-kiosk-roof',6.4,0.18,5.4,M.white,cx,3.3,cz);roof.rotation.y=-0.7;
  // Neighbouring buildings: OSM outlines (ODbL) with 2017 lidar roof heights (p50).
  const osmBuilding=(name,key,height)=>{
    const shape=new THREE.Shape();
    OSM_BUILDINGS[key].map(trueToSite).forEach(([x,z],i)=>{if(i)shape.lineTo(x,-z);else shape.moveTo(x,-z);});shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false}),[M.roof,M.wallWhite]);
    mesh.name=name;mesh.rotation.x=-Math.PI/2;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
  };
  osmBuilding('Traced-bagel-shop-building','einsteinBros',5.3); // name kept for existing consumers
  osmBuilding('OSM-retail-north','retailNorth',5.2);
  osmBuilding('OSM-retail-west','retailWest',5.2);
  const signMap=ctex(512,128,(c,w,h)=>{c.fillStyle='#163f31';c.fillRect(0,0,w,h);c.fillStyle='#eee0b9';c.font='bold 60px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('EDELWEISS INN',w/2,h/2);});
  const [sx,sz]=hotelShift([6,61.35]);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.5,1.2),glowMat(signMap));sign.position.set(sx,2.4,sz);sign.rotation.y=Math.PI+CIRCULATION.hotel.heading-TRACED_HOTEL.heading;group.add(sign);
  return {group,parkingSpots,service,frontage,highway,cross,obstacleSurfaces,signPositions:PLAN.signs.map(aerialToSite)};
}
