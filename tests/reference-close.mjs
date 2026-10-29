import assert from 'node:assert/strict';
import { CLOSE_REFERENCE,closeToBuilding } from '../scripts/reference-close.js';
import { PLAN,aerialToBuilding } from '../scripts/reference-plan.js';
assert.equal(PLAN.localReference,'Screenshot_20261028-111922_Chrome.jpg');
assert.equal(CLOSE_REFERENCE.anchors.length,8);
for(const {pixel,local} of CLOSE_REFERENCE.anchors){
 const result=closeToBuilding(pixel);
 assert.ok(Math.hypot(result[0]-local[0],result[1]-local[1])<0.3,'joint store/canopy fit stays within digitisation tolerance');
}
for(const key of ['forecourt','frontageLawn','northLawn','entranceFrontage','crossStreetEntrance','washApron']){
 assert.equal(PLAN[key].length,CLOSE_REFERENCE[key].length,key);
 PLAN[key].forEach((pixel,i)=>{
  const actual=aerialToBuilding(pixel),expected=closeToBuilding(CLOSE_REFERENCE[key][i]);
  assert.ok(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<1e-7,`${key} must not drift between image frames`);
 });
}
assert.equal(PLAN.wash.corners.length,4);
PLAN.wash.corners.forEach((pixel,i)=>{
 const actual=aerialToBuilding(pixel),expected=closeToBuilding(CLOSE_REFERENCE.wash[i]);
 assert.ok(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<1e-7);
});
console.log('PASS: selected 111922 reference, eight shared anchors, car wash and ground outlines retain one calibration frame');
