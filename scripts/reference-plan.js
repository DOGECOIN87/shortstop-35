import { CLOSE_REFERENCE,closeToBuilding } from './reference-close.js';
// Coordinates digitised from Screenshot_20261028-111913_Chrome.jpg, normalised
// to 1256 x 1568. This flat overview is used for geometry; tilted views are not
// mixed into the calibration. The canopy corners tie it to the close 30 m scale
// reference, yielding an approximate 13.6 x 35.2 m roof (not surveyed).
export const PLAN = {
  image:{width:1256,height:1568},
  canopy:{width:13.6,length:35.2,centerZ:-2,corners:[[650,715],[715,711],[730,865],[667,870]]},
  store:{depth:16,frontage:21.4,centerX:-30.3,centerZ:-1.4},
  // Roof corners measured in the SAME flat image as canopy/ground boundaries.
  // Rectangle dimensions below are the opposing-edge mean, not a second-image guess.
  wash:{x:-23.601,z:-31.388,heading:-0.722,width:7.30,depth:11.23,
    corners:[[565,636],[593,656],[560,696],[528,674]]},
  dumpster:{x:-32.25,z:16.73},
  // Building-local outlines fitted to the flat aerial; oblique views supply context only.
  storeLandscape:{
    // Owner-marked lawn strips outside the wall-side pavement (2026-10-29).
    markedNorthGrass:[[-39.7,-13.7],[-39.7,-18.3],[-35,-21.8],[-30,-20.8],[-25.7,-20.8],[-23.2,-18.7],[-23.2,-13.7]],
    markedRearGrass:[[-39.85,-13.7],[-40.9,-13.7],[-42.15,-8],[-42.1,-3],[-41.4,2],[-39.85,8.3]],
    frontWalk:[[-22.25,-12.1],[-20.6,-12.1],[-20.6,9.3],[-21.1,11.2],[-23,11.2],[-23,9.4],[-22.25,9.4]],
    sideGrass:[[-28.6,12],[-24.1,12],[-23.9,15],[-24.8,19.2],[-27.6,20],[-28.6,18.8]],
    dumpsterRearGrass:[[-34.8,11.9],[-29.5,11.9],[-29.5,14],[-34.8,14]],
    dumpsterWestGrass:[[-38.5,10.9],[-35.3,10.9],[-35.3,19.2],[-36.4,20],[-37.5,16]],
    northWalk:[[-39.8,-20],[-35,-23],[-30,-22],[-25,-22],[-21,-19.5],[-21,-13]],
    sideWalk:[[-22.3,10.5],[-23,12],[-23,16],[-23.6,20.5],[-23.1,25],[-22.4,28.7]]
  },
  forecourt:[[593,586],[623,603],[639,632],[657,669],[687,702],[728,705],[747,718],[762,746],[773,781],[774,813],[759,842],[740,864],[720,895],[694,931],[670,966],[646,1003],[624,1032],[601,1020],[589,991],[579,959],[550,925],[530,900],[518,875],[513,849],[490,821],[481,790],[479,749],[488,723],[503,700],[528,683],[551,655],[570,623]],
  rearAccess:[[600,933],[573,918],[550,906]],
  crossStreetEntrance:[[615,625],[635,600],[658,573]],
  rearSidewalk:[[488,723],[479,749],[481,790],[490,821],[513,849],[518,875],[530,900],[550,925],[580,950]],
  rearLawn:[[488,750],[485,775],[488,806],[500,837],[504,849],[499,821],[496,791],[492,761]],
  northLawn:[[621,606],[636,623],[645,652],[662,674],[681,687],[704,707],[728,719],[747,718],[738,705],[720,697],[701,687],[681,673],[661,652],[645,630],[630,610]],
  frontageLawn:[[747,718],[762,746],[773,781],[774,813],[759,842],[740,864],[720,895],[694,931],[670,966],[646,1003],[624,1032],[638,1032],[659,1003],[686,966],[716,931],[741,895],[766,864],[801,842],[816,813],[816,781],[797,746],[768,718]],
  frontage:[[1200,320],[1100,480],[970,660],[900,735],[850,790],[824,840],[785,890],[742,940],[695,990],[650,1040],[607,1090],[560,1140],[400,1320]],
  highway:[[1420,520],[1220,760],[1080,925],[1000,1030],[840,1210],[600,1500]],
  crossStreet:[[400,300],[700,585],[910,750],[1150,960],[1350,1130]],
  hotelParking:[[298,814],[323,798],[609,1019],[625,1047],[599,1071],[554,1058],[296,859],[282,837]],
  hotelCarRow:[[310,840],[566,1039]],
  hotelDrive:[[329,820],[586,1018],[611,1051]],
  entranceFrontage:[[653,967],[680,979],[704,997]],
  hotelEntrance:[[599,1030],[611,1050],[620,1080]],
  signs:[[628,628],[670,935]],
  coffee:{center:[490,652],heading:-0.7},
  neighbouringParking:[[215,475],[300,408],[464,514],[420,589],[272,737],[166,650]],
  mcdonaldsParking:[[840,350],[1000,380],[1060,480],[980,590],[830,525],[790,460]],
  neighbouringRoof:[[239,482],[300,440],[404,551],[321,624]]
};
const H=[0.17182424718233594,-0.017786365948762494,-104.60927210053921,0.013207899234593746,0.18450443070723144,-156.76447252779852,-0.00010346488072869089,-0.00014436901312076184,1];
export function aerialToBuilding([x,y]) {
  const d=H[6]*x+H[7]*y+1;
  return [(H[0]*x+H[1]*y+H[2])/d,(H[3]*x+H[4]*y+H[5])/d];
}
export function aerialToSite(pixel) {
  const [x,z]=aerialToBuilding(pixel),c=Math.SQRT1_2;
  return [(x+z)*c-8,(-x+z)*c];
}

// Only local geometry is replaced by the owner's selected close reference.
// Surrounding highway/hotel context retains its separate wide-image frame.
// Convert close pixels through building coordinates into the wide-image frame
// so all existing road, traffic and clearance consumers share the same geometry.
function localToWidePixel([u,v]) {
  const a=H[0]-u*H[6],b=H[1]-u*H[7],c=u-H[2];
  const d=H[3]-v*H[6],e=H[4]-v*H[7],f=v-H[5],det=a*e-b*d;
  return [(c*e-b*f)/det,(a*f-c*d)/det];
}
const fromClose=points=>points.map(p=>localToWidePixel(closeToBuilding(p)));
PLAN.localReference=CLOSE_REFERENCE.filename;
for(const key of ['forecourt','rearSidewalk','rearAccess','crossStreetEntrance','frontageLawn','northLawn','entranceFrontage'])PLAN[key]=fromClose(CLOSE_REFERENCE[key]);
PLAN.washApron=fromClose(CLOSE_REFERENCE.washApron);
const washCorners=CLOSE_REFERENCE.wash.map(closeToBuilding);
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
PLAN.wash={
 x:washCorners.reduce((s,p)=>s+p[0],0)/4,z:washCorners.reduce((s,p)=>s+p[1],0)/4,
 width:(distance(washCorners[0],washCorners[1])+distance(washCorners[2],washCorners[3]))/2,
 depth:(distance(washCorners[1],washCorners[2])+distance(washCorners[3],washCorners[0]))/2,
 heading:Math.atan2(washCorners[0][1]-washCorners[1][1],washCorners[1][0]-washCorners[0][0]),
 corners:fromClose(CLOSE_REFERENCE.wash)
};
PLAN.storeLandscape.northWalk=CLOSE_REFERENCE.northWalk.map(closeToBuilding);
// The owner still wants the marked grass outside wall-side sidewalks. Fit its
// outer edges to the new image; clamp inner edges clear of the retained walk.
PLAN.storeLandscape.markedNorthGrass=[[281,740],[307,689],[344,656],[388,648],[429,668],[466,702],[481,741]].map(p=>{
 const [x,z]=closeToBuilding(p);return [x,Math.min(-13.7,z)];
});
const rearOuter=[[247,780],[236,835],[243,890],[260,945],[281,984]].map(closeToBuilding);
PLAN.storeLandscape.markedRearGrass=[[-39.85,rearOuter[0][1]],...rearOuter.map(([x,z])=>[Math.min(-39.95,x),z]),[-39.85,rearOuter.at(-1)[1]]];

// The owner-requested dumpster shift is retained; its short gate approach and
// the walking bypass accommodate that deliberate deviation from the photograph.
PLAN.rearAccess=[[-23,29],[-28,25],[-32.25,21.5]].map(localToWidePixel);

PLAN.frontage=[...fromClose(CLOSE_REFERENCE.frontage),[560,1140],[400,1320]];

