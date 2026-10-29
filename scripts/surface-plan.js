import * as THREE from '../vendor/three.module.js';
import clip from '../vendor/polygon-clipping.module.js';
import { PLAN,aerialToBuilding } from './reference-plan.js';
import { CLOSE_REFERENCE,closeToBuilding } from './reference-close.js';

// One common topology for all immediate station surfaces. X/Z building-local
// polygons are boolean-clipped BEFORE drawing: grass/walks are real exclusions,
// not overlapping decals on an arbitrary oval pad.
const ring=points=>[...points.map(p=>[...p]),[...points[0]]];
export const polygon=points=>[[ring(points)]];
const rect=(x0,z0,x1,z1)=>polygon([[x0,z0],[x1,z0],[x1,z1],[x0,z1]]);
const union=shapes=>shapes.length?clip.union(...shapes):[];
const subtract=(shape,masks)=>shape.length&&masks.length?clip.difference(shape,...masks):shape;
export function ribbonPolygon(points,width,steps=160){
 const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
 const left=[],right=[];
 for(let i=0;i<=steps;i++){
  const p=curve.getPoint(i/steps),t=curve.getTangent(i/steps),nx=-t.z,nz=t.x;
  left.push([p.x+nx*width/2,p.z+nz*width/2]);right.push([p.x-nx*width/2,p.z-nz*width/2]);
 }
 return polygon([...left,...right.reverse()]);
}
let cached;
export function getSurfacePlan(){
 if(cached)return cached;
 const local=p=>p.map(closeToBuilding),wide=p=>p.map(aerialToBuilding);
 const {centerX:x,centerZ:z,depth,frontage}=PLAN.store;
 const west=x-depth/2,east=x+depth/2,north=z-frontage/2,south=z+frontage/2,w=1.45;
 const dx=PLAN.dumpster.x,dz=PLAN.dumpster.z;
 const store=rect(west,north,east,south),dumpster=rect(dx-2.4,dz-2.25,dx+2.4,dz+2.25);
 const outerWalkPixels=CLOSE_REFERENCE.rearSidewalk;
 const outerRaw=ribbonPolygon(local(outerWalkPixels),2.1);
 const wallWalks=[
  ['North-wall-sidewalk',rect(west-w,north-w,east,north)],
  ['Rear-wall-sidewalk',rect(west-w,north,west,south+w)],
  ['Sidewalk-beside-store',rect(west,south,dx-2.4,south+w)],
  ['South-wall-sidewalk-east',rect(dx+2.4,south,east,south+w)],
  ['Traced-store-front-walk',rect(east,north,east+1.65,south+w)]
 ];
 // Side connector is retained for the owner's flag-side pedestrian route.
 const wallUnion=union(wallWalks.map(s=>s[1]));
 const connector=subtract(ribbonPolygon(PLAN.storeLandscape.sideWalk,1.25),[wallUnion]);
 const approach=subtract(ribbonPolygon(local([[486,679],[498,705],[503,735],[504,759]]),1.45),[wallUnion,connector]);
 const outerWalk=subtract(outerRaw,[wallUnion,connector,approach]);
 const walks=union([...wallWalks.map(s=>s[1]),outerWalk,approach,connector]);
 const grassSpec=[
  ['Marked-car-wash-side-grass',polygon(local([[308,736],[365,723],[427,720],[471,710],[480,747],[281,759]]))],
  ['Marked-rear-store-grass',polygon(local([[267,785],[277,842],[282,903],[287,963],[301,1005],[278,980],[253,933],[243,878],[244,830]]))],
  ['Raised-grass-island',polygon(PLAN.storeLandscape.sideGrass)],
  ['Rear-grass-border',polygon(PLAN.storeLandscape.dumpsterWestGrass)],
  ['Grass-behind-dumpster',polygon(PLAN.storeLandscape.dumpsterRearGrass)]
 ];
 const grass=grassSpec.map(([name,p])=>{
  if(name==='Marked-car-wash-side-grass')p=clip.intersection(p,rect(-100,-100,100,north-w));
  if(name==='Marked-rear-store-grass')p=clip.intersection(p,rect(-100,north,west-w,south));
  return {name,polygons:subtract(p,[walks,store,dumpster])};
 });
 const roadMasks=[ribbonPolygon(wide(PLAN.frontage),12.2),ribbonPolygon(wide(PLAN.crossStreet),21)];
 const entrySpecs=[
  ['Forecourt-frontage-opening',ribbonPolygon(wide(PLAN.entranceFrontage),8.8)],
  ['Hotel-frontage-driveway',ribbonPolygon(wide(PLAN.hotelEntrance),8.5)],
  ['Cross-street-property-entrance',ribbonPolygon(wide(PLAN.crossStreetEntrance),7)],
  ['Rear-service-access-lane',ribbonPolygon(wide(PLAN.rearAccess),4)]
 ];
 const frontageGrass=subtract(polygon(wide(PLAN.frontageLawn)),[...roadMasks,...entrySpecs.map(s=>s[1])]);
 const junctionGrass=subtract(polygon(wide(PLAN.northLawn)),[...roadMasks,...entrySpecs.map(s=>s[1])]);
 const green=union([...grass.map(g=>g.polygons),frontageGrass,junctionGrass]);
 // Parcel limits follow the aerial's pedestrian edge. No freehand rounded apron.
 const pavedRaw=union([polygon(local(CLOSE_REFERENCE.forecourt)),polygon(local(CLOSE_REFERENCE.washApron)),...entrySpecs.map(s=>s[1])]);
 const pavement=subtract(pavedRaw,[green,walks,...roadMasks]);
 cached={pavement,grass,frontageGrass,junctionGrass,outerWalk,outerWalkPixels,wallWalks,approach,connector,walks,store,dumpster,roadMasks,entrySpecs};
 return cached;
}
export function surfaceMesh(name,multi,material,y=0.02,siteFrame=false){
 const shapes=multi.map(poly=>{
  const path=(points,Type)=>{const s=new Type();points.forEach(([x,z],i)=>{
   if(siteFrame){const a=(x+z)*Math.SQRT1_2-8,b=(-x+z)*Math.SQRT1_2;x=a;z=b;}
   if(i)s.lineTo(x,-z);else s.moveTo(x,-z);
  });s.closePath();return s;};
  const s=path(poly[0],THREE.Shape);for(const hole of poly.slice(1))s.holes.push(path(hole,THREE.Path));return s;
 });
 const g=new THREE.ShapeGeometry(shapes),uv=g.attributes.uv,p=g.attributes.position;
 for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)*0.03,p.getY(i)*0.03);
 const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;mesh.userData.surfacePolygons=multi;return mesh;
}
