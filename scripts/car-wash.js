import * as THREE from '../vendor/three.module.js';
import { BLOCK_TILE } from './block-wall.js';

// Car wash dressing, U-shaped perimeter sidewalk (EXIT end + east wall + ENTER
// end), and widened concrete approach & exit apron over the detailed Blender
// model, from the owner's night photos and site review: split-face block walls
// (light above a darker lower band) on the east, west, ENTER and EXIT walls,
// steel service doors on both end walls, a light grey fascia with a white LED
// strip under it, the red "CarWash" sign, the "WE APPRECIATE YOUR BUSINESS"
// banner, two blue posters, hose outlets, red stamped pads on the east
// sidewalk, widened concrete approach & curved rear drive turn, and trimmed
// EXIT-end concrete apron with straight curbed tie-in on the remaining west
// grass island.
//
// Frame: the model's car wash turned by WASH.heading in the glTF root (measured
// from shortstop_detailed.glb). Local +X faces the store (the banner side),
// -Z runs from the ENTER end (z -15.2) to the far/EXIT end (z -29.22).
export const WASH = Object.freeze({
  heading: -0.677,
  x: [-17.82, -9.88],     // west and east (banner/poster side) wall faces
  z: [-29.22, -15.2],     // far (EXIT) end and ENTER end wall faces
  wallTop: 4.0,
  fascia: [3.4, 4.8],
  // Model parts replaced here (wash frame): door, window, red stripes, and
  // untextured far-end equipment-room wall triangles.
  cutBoxes: Object.freeze([
    [-9.93, 0.4, -29.35, -9.5, 3.95, -15.1],   // east wall door, red stripes
    [-9.93, 1.2, -29.35, -9.0, 3.3, -15.1],    // east wall window
    [-13.50, 0.4, -29.30, -9.85, 3.98, -28.98],// far-end untextured wall
    [-9.95, 3.3, -30.2, -8.6, 4.95, -14.2],    // red fascia, east
    [-19.2, 3.3, -30.2, -17.75, 4.95, -14.2],  // red fascia, west
    [-19.2, 3.3, -30.4, -8.6, 4.95, -28.9],    // red fascia, far end
    [-19.2, 3.3, -15.3, -8.6, 4.95, -14.0]     // red fascia, ENTER end
  ]),
  door: Object.freeze({ x: -11.0, width: 0.92, height: 2.14 }),      // service door on ENTER end (+Z)
  farDoor: Object.freeze({ x: -11.68, width: 0.92, height: 2.14 }),  // service door on far/EXIT end (-Z)
  partialWallWidth: 2.2,       // ENTER-end wall width (x: -12.08..-9.88); leaves ENTER bay open
  farPartialWallWidth: 3.605,  // far-end equipment-room wall width (x: -13.485..-9.88); flush with bay partition
  // U-shaped 6 in raised concrete sidewalk + 0.16 m curb wrapping the far/EXIT
  // end, the full east wall, and the ENTER end (replacing the erroneous GLB
  // grass/curb blob at the ENTER corner).
  sidewalk: Object.freeze({
    eastX: [-9.86, -8.51],          // walk slab across east wall (tucks 2 cm under curb [-8.53, -8.37])
    eastZ: [-30.755, -13.75],       // palm-island curb (-30.755) to ENTER wrap (-13.75)
    farX: [-13.345, -9.84],         // walk slab across far-end wall (west curb at [-13.485, -13.325])
    farZ: [-30.755, -29.20],        // north curb at [-30.915, -30.755] flush with palm-island curb
    enterX: [-11.94, -9.84],        // walk slab across ENTER-end wall (west curb at [-12.08, -11.92])
    enterZ: [-15.20, -13.75],       // south curb at [-13.75, -13.59] in front of ENTER door
    clearEnterIsland: Object.freeze({ x: [-12.4, -7.1], z: [-18.6, -13.6] }),
    palmEastTieInRoot: Object.freeze({
      outer: Object.freeze([12.701, 1.288, -29.249]), // w(-8.424, -30.755)
      inner: Object.freeze([12.618, 1.288, -29.302])  // w(-8.530, -30.755)
    }),
    palmWestTieInRoot: Object.freeze({
      outer: Object.freeze([11.781, 1.325, -30.188]), // w(-9.729, -30.910)
      inner: Object.freeze([11.630, 1.325, -30.113])  // w(-9.799, -30.758)
    })
  }),
  // Palm & light-pole planter extension (west of existing palm island,
  // enclosing Grass-island-light-concrete-footing at (-12.008, -31.310) and
  // meeting the far-end door sidewalk along wz = -30.835).
  palmPlanterExt: Object.freeze({
    northWeldRoot: Object.freeze({
      outer: Object.freeze([15.010086, 1.306621, -34.055890]), // w(-9.6349, -35.9482) north/outer
      inner: Object.freeze([14.916205, 1.306621, -33.924457])  // w(-9.6257, -35.7870) south/inner
    }),
    joinNorthWash: Object.freeze([-9.6303, -35.8676]),
    joinSouthWash: Object.freeze([-9.7640, -30.8350]),
    westCurbX: -13.405,
    arcStartZ: -32.200
  }),
  // EXIT-end lawn trim & full-length west median strip: removes the wide
  // eastern bulb obstructing the car-wash exit apron, while connecting the
  // kept north-west grass island seamlessly down to the car-wash west exit
  // pier (wz = -29.27) with a continuous 0.16 m curbed grass strip.
  exitIslandTrim: Object.freeze({
    westWeldWash: Object.freeze([-18.0561, -41.5557]),
    eastMidWash: Object.freeze([-17.3400, -41.5557]),
    southWestWash: Object.freeze([-18.5200, -29.3500]),
    southEastWash: Object.freeze([-17.7000, -29.3500]),
    northCornerWash: Object.freeze([-16.5750, -50.4450]),
    northCutWash: Object.freeze([-16.6864, -50.5215]),
    westNorthWeldRoot: Object.freeze({
      outer: Object.freeze([11.874463, 2.170326, -43.730321]), // w(-18.1396, -41.5247) west/outer
      inner: Object.freeze([12.043449, 2.170326, -43.673993])  // w(-17.9726, -41.5866) east/inner
    }),
    northWeldRoot: Object.freeze({
      outer: Object.freeze([18.633891, 2.358088, -49.757478]), // south/inner at north curb
      inner: Object.freeze([18.652667, 2.358088, -49.907688])  // north/outer at north curb
    })
  }),
  // Smooth outer concrete curb centerline (wash frame) bordering the widened
  // car-wash approach and curved rear drive lane, from the front-west wash
  // pier (-17.70, -15.20) down to the rear drive south curb (-5.22, 13.45).
  curbWidth: 0.16,
  approachCurb: Object.freeze([
    [-17.70, -15.20],
    [-17.72, -13.10],
    [-17.76,  -9.00],
    [-17.70,  -5.00],
    [-17.45,  -1.00],
    [-16.85,   3.00],
    [-15.70,   6.50],
    [-14.05,   9.45],
    [-11.75,  11.60],
    [ -8.85,  12.78],
    [ -6.14,  13.28],
    [ -5.22,  13.45]
  ].map(pt => Object.freeze(pt))),
  approachSouthTieInRoot: Object.freeze({
    outer: Object.freeze([-12.570, 7.240]),
    inner: Object.freeze([-12.400, 7.180])
  }),
  banner: { z: -21.6, y: 2.55, w: 4.7, h: 0.44 },
  posters: [-25.4, -26.7],
  pads: [[-19.7, -16.5], [-25.6, -22.4]], // red stamped pads on the east sidewalk
  hoses: [[-18.6, 0.55], [-19.1, 0.55], [-25.0, 1.0], [-25.4, 1.0]]
});

const W = WASH;
const GRASS_PALETTE_U = 0.707;
const GRASS_PALETTE_TOL = 0.015;
const WALK_MATERIAL = 'SS Walk concrete';
const CURB_MATERIAL = 'SS Curb concrete';

// True when glTF root point (rx, rz) lies inside the car-wash building
// footprint (so levelModelSidewalks ignores interior equipment-room floors).
export function insideCarWashFootprint(rx, rz, margin = 0.15) {
  const c = Math.cos(W.heading), s = Math.sin(W.heading);
  const wx = rx * c - rz * s, wz = rx * s + rz * c;
  return wx >= W.x[0] - margin && wx <= W.x[1] + margin &&
         wz >= W.z[0] - margin && wz <= W.z[1] + margin;
}

export function sampleApproachCurb(steps = 76) {
  const curve = new THREE.CatmullRomCurve3(
    W.approachCurb.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false, 'centripetal'
  );
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPoint(i / steps);
    pts.push([p.x, p.z]);
  }
  return pts;
}

function buildClipPolylineWash(curbPts) {
  return [
    [-17.85, -19.60],
    [-17.85, -15.20],
    ...curbPts,
    [-4.65, 13.86],
    [-3.99, 14.20]
  ];
}

function buildClearPolygonWash(curbPts) {
  const innerDriveBoundary = [
    [-4.95, 13.35],
    [-6.50, 12.10],
    [-8.50, 10.50],
    [-9.80,  8.50],
    [-11.20, 6.00],
    [-12.40, 3.00],
    [-13.00, 0.00],
    [-13.00, -8.00],
    [-12.20, -14.50],
    [-12.05, -19.60],
    [-17.85, -19.60],
    [-17.85, -15.20]
  ];
  return [...curbPts, ...innerDriveBoundary];
}

// Polygon enclosing the removed EXIT-end grass & curb (south tail + east bulb),
// staying clear of the palm island (wx > -11.4, wz > -36.0) and keeping the
// western D-shaped grass lobe west of the straight cut line.
function buildExitIslandClearPolygonWash() {
  const E = W.exitIslandTrim;
  return [
    E.northCutWash,
    [-16.60, -52.20],
    [-9.10, -52.20],
    [-9.10, -37.00],
    [-13.80, -36.30],
    [-14.50, -32.10],
    [-18.65, -32.10],
    [-18.65, -41.52],
    E.westWeldWash,
    E.eastMidWash
  ];
}

// Oriented north-to-south so signedDistToPolyline <= 0 on the KEPT west lobe
// (z <= -41.55) and > 0 on the REMOVED east bulb; includes the north-corner
// return so no grass sliver pokes past the acute north-east corner.
function buildExitIslandClipLineWash() {
  const E = W.exitIslandTrim;
  return [
    [-17.20, -50.49],
    [-16.65, -50.46],
    [-16.61, -50.36],
    E.eastMidWash,
    [-17.40, -40.80]
  ];
}

// Sample smooth outer boundary points (south -> north) of the expanded
// palm + light-pole planter bed in wash coordinates.
function samplePalmPlanterOuterWash(arcSteps = 16, straightSteps = 5) {
  const P = W.palmPlanterExt;
  const zSouth = W.sidewalk.farZ[0] - W.curbWidth / 2; // -30.835
  const pts = [];
  for (let i = 0; i <= straightSteps; i++) {
    pts.push([P.westCurbX, zSouth + (P.arcStartZ - zSouth) * (i / straightSteps)]);
  }
  const dx = P.joinNorthWash[0] - P.westCurbX; // +3.7747
  const dz = P.joinNorthWash[1] - P.arcStartZ; // -3.6676
  for (let i = 1; i <= arcSteps; i++) {
    const th = (Math.PI / 2) * (1 - i / arcSteps); // pi/2 -> 0
    pts.push([
      P.joinNorthWash[0] - dx * Math.sin(th),
      P.arcStartZ + dz * Math.cos(th)
    ]);
  }
  return pts;
}

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi + 1e-18) + xi)) inside = !inside;
  }
  return inside;
}

function inEnterIslandClearBox(wx, wz) {
  const B = W.sidewalk.clearEnterIsland;
  return wx >= B.x[0] && wx <= B.x[1] && wz >= B.z[0] && wz <= B.z[1];
}

function signedDistToPolyline(px, pz, poly) {
  let bestDistSq = Infinity, bestSign = 1;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[i + 1];
    const dx = bx - ax, dz = bz - az;
    const lenSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
    const rx = px - (ax + dx * t), rz = pz - (az + dz * t);
    const dSq = rx * rx + rz * rz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestSign = (rx * dz - rz * dx) >= 0 ? 1 : -1;
    }
  }
  return bestSign * Math.sqrt(bestDistSq);
}

// Clip a single lawn triangle against half-plane d <= 0, appending kept sub-tris.
function clipGrassTriangle(va, vb, vc, na, nb, nc, i0, i1, i2, uv, d0, d1, d2, addClipVert, newIdx) {
  const verts = [
    { idx: i0, r: va.clone(), n: na.clone(), u: uv.getX(i0), v: uv.getY(i0), d: d0 },
    { idx: i1, r: vb.clone(), n: nb.clone(), u: uv.getX(i1), v: uv.getY(i1), d: d1 },
    { idx: i2, r: vc.clone(), n: nc.clone(), u: uv.getX(i2), v: uv.getY(i2), d: d2 }
  ];
  const outPoly = [];
  for (let k = 0; k < 3; k++) {
    const A = verts[k], B = verts[(k + 1) % 3];
    const aIn = A.d <= 0, bIn = B.d <= 0;
    if (aIn) outPoly.push(A);
    if (aIn !== bIn) {
      const alpha = A.d / (A.d - B.d);
      const rInt = A.r.clone().lerp(B.r, alpha);
      const nInt = A.n.clone().lerp(B.n, alpha).normalize();
      const uInt = A.u + (B.u - A.u) * alpha, vInt = A.v + (B.v - A.v) * alpha;
      const newId = addClipVert(rInt, nInt, uInt, vInt);
      outPoly.push({ idx: newId, r: rInt, n: nInt, u: uInt, v: vInt, d: 0 });
    }
  }
  if (outPoly.length >= 3) {
    for (let k = 1; k < outPoly.length - 1; k++) {
      newIdx.push(outPoly[0].idx, outPoly[k].idx, outPoly[k + 1].idx);
    }
    return true;
  }
  return false;
}

// Append the U-shaped EXIT + east + ENTER sidewalk slab into the model's
// SS Walk concrete mesh so levelModelSidewalks levels it 6 in above the drive.
function appendCarWashWalk(walkMesh, rootInv, washToRoot) {
  const g = walkMesh.geometry;
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  if (!pos || !g.index) return 0;
  const toR = rootInv.clone().multiply(walkMesh.matrixWorld);
  const fromR = toR.clone().invert();
  const nmInv = new THREE.Matrix3().getNormalMatrix(fromR);

  const extraP = [], extraN = [], extraU = [], extraIdx = [];
  let baseV = pos.count;
  const pLocal = new THREE.Vector3(), nLocal = new THREE.Vector3();
  const pushV = (wx, wy, wz, wnx, wny, wnz, uVal, vVal) => {
    const [rx, rz] = washToRoot(wx, wz);
    const [rnx, rnz] = wny > 0.9 ? [0, 0] : washToRoot(wnx, wnz);
    pLocal.set(rx, wy, rz).applyMatrix4(fromR);
    nLocal.set(rnx, wny, rnz).applyMatrix3(nmInv).normalize();
    extraP.push(pLocal.x, pLocal.y, pLocal.z);
    extraN.push(nLocal.x, nLocal.y, nLocal.z);
    extraU.push(uVal, vVal);
    return baseV++;
  };

  const S = W.sidewalk;
  const topY = 0.70;

  const addWalkPatch = (x0, x1, z0, z1, nx, nz) => {
    const grid = [];
    for (let j = 0; j <= nz; j++) {
      const wz = z0 + (z1 - z0) * (j / nz);
      const row = [];
      for (let i = 0; i <= nx; i++) {
        const wx = x0 + (x1 - x0) * (i / nx);
        row.push(pushV(wx, topY, wz, 0, 1, 0, (wx - W.x[1]) / 1.5, (wz - W.z[0]) / 1.5));
      }
      grid.push(row);
    }
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const a = grid[j][i], b = grid[j + 1][i], c = grid[j + 1][i + 1], d = grid[j][i + 1];
        extraIdx.push(a, b, c, a, c, d);
      }
    }
  };

  // East wall leg: x in [-9.86, -8.51], z in [-30.755, -13.75]
  addWalkPatch(S.eastX[0], S.eastX[1], S.eastZ[0], S.eastZ[1], 3, 34);
  // Far/EXIT end leg: x in [-13.345, -9.84], z in [-30.755, -29.20]
  addWalkPatch(S.farX[0], S.farX[1], S.farZ[0], S.farZ[1], 8, 3);
  // Near/ENTER end leg: x in [-11.94, -9.84], z in [-15.20, -13.75]
  addWalkPatch(S.enterX[0], S.enterX[1], S.enterZ[0], S.enterZ[1], 5, 3);

  const oldC = pos.count, totC = oldC + extraP.length / 3;
  const pArr = new Float32Array(totC * 3);
  const nArr = new Float32Array(totC * 3);
  const uArr = new Float32Array(totC * 2);
  for (let i = 0; i < oldC; i++) {
    pArr[3 * i] = pos.getX(i); pArr[3 * i + 1] = pos.getY(i); pArr[3 * i + 2] = pos.getZ(i);
    if (nor) { nArr[3 * i] = nor.getX(i); nArr[3 * i + 1] = nor.getY(i); nArr[3 * i + 2] = nor.getZ(i); }
    else { nArr[3 * i] = 0; nArr[3 * i + 1] = 1; nArr[3 * i + 2] = 0; }
    if (uv) { uArr[2 * i] = uv.getX(i); uArr[2 * i + 1] = uv.getY(i); }
  }
  pArr.set(extraP, oldC * 3);
  nArr.set(extraN, oldC * 3);
  uArr.set(extraU, oldC * 2);
  const ng = new THREE.BufferGeometry();
  ng.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
  ng.setAttribute('normal', new THREE.BufferAttribute(nArr, 3));
  ng.setAttribute('uv', new THREE.BufferAttribute(uArr, 2));
  ng.setIndex([...Array.from(g.index.array), ...extraIdx]);
  ng.computeBoundingBox();
  ng.computeBoundingSphere();
  walkMesh.geometry = ng;
  return extraIdx.length / 3;
}

// Helper to append a mitered 0.16 m curb strip in wash coordinates to the
// SS Curb concrete mesh, preserving exact constant width across 90° corners.
function appendWashCurbPolyline(ptsWash, halfW, topYFn, botDrop, washToRoot, pushV, extraIdx, snapEndRoot = null, capEnds = [false, false], snapStartRoot = null) {
  const rootPts = ptsWash.map(([lx, lz], i) => {
    const [rx, rz] = washToRoot(lx, lz);
    return { rx, rz, topY: topYFn(i / (ptsWash.length - 1)) };
  });

  const segN = [];
  for (let i = 0; i < rootPts.length - 1; i++) {
    let tx = rootPts[i + 1].rx - rootPts[i].rx, tz = rootPts[i + 1].rz - rootPts[i].rz;
    const len = Math.hypot(tx, tz) || 1; tx /= len; tz /= len;
    segN.push({ tx, tz, nx: tz, nz: -tx });
  }

  const rings = rootPts.map((pt, i) => {
    const nA = segN[Math.max(0, i - 1)], nB = segN[Math.min(segN.length - 1, i)];
    let bx = nA.nx + nB.nx, bz = nA.nz + nB.nz;
    const blen = Math.hypot(bx, bz) || 1; bx /= blen; bz /= blen;
    const miter = halfW / Math.max(0.55, bx * nA.nx + bz * nA.nz);
    return {
      lx: pt.rx - bx * miter, lz: pt.rz - bz * miter, lTopY: pt.topY,
      rx: pt.rx + bx * miter, rz: pt.rz + bz * miter, rTopY: pt.topY,
      tx: nB.tx, tz: nB.tz, nx: bx, nz: bz,
      botY: pt.topY - botDrop
    };
  });
  if (snapStartRoot) {
    rings[0].lx = snapStartRoot.outer[0];
    rings[0].lz = snapStartRoot.outer[1];
    if (snapStartRoot.outerY !== undefined) rings[0].lTopY = snapStartRoot.outerY;
    rings[0].rx = snapStartRoot.inner[0];
    rings[0].rz = snapStartRoot.inner[1];
    if (snapStartRoot.innerY !== undefined) rings[0].rTopY = snapStartRoot.innerY;
  }
  if (snapEndRoot) {
    const last = rings[rings.length - 1];
    last.lx = snapEndRoot.outer[0];
    last.lz = snapEndRoot.outer[1];
    if (snapEndRoot.outerY !== undefined) last.lTopY = snapEndRoot.outerY;
    last.rx = snapEndRoot.inner[0];
    last.rz = snapEndRoot.inner[1];
    if (snapEndRoot.innerY !== undefined) last.rTopY = snapEndRoot.innerY;
  }

  const topL = [], topR = [];
  for (const r of rings) {
    topL.push(pushV(r.lx, r.lTopY, r.lz, 0, 1, 0, r.lx / 1.5, r.lz / 1.5 + 1));
    topR.push(pushV(r.rx, r.rTopY, r.rz, 0, 1, 0, r.rx / 1.5, r.rz / 1.5 + 1));
  }
  for (let i = 0; i < rings.length - 1; i++) {
    extraIdx.push(topL[i], topL[i + 1], topR[i + 1], topL[i], topR[i + 1], topR[i]);
  }

  let arc = 0;
  for (let i = 0; i < rings.length - 1; i++) {
    const r0 = rings[i], r1 = rings[i + 1];
    const sn = segN[i];
    const segLen = Math.hypot(r1.rx - r0.rx, r1.rz - r0.rz);
    const u0 = arc / 1.5, u1 = (arc + segLen) / 1.5;
    arc += segLen;

    const et0 = pushV(r0.rx, r0.rTopY, r0.rz, sn.nx, 0, sn.nz, u0, r0.rTopY / 1.5);
    const eb0 = pushV(r0.rx, r0.botY, r0.rz, sn.nx, 0, sn.nz, u0, r0.botY / 1.5);
    const et1 = pushV(r1.rx, r1.rTopY, r1.rz, sn.nx, 0, sn.nz, u1, r1.rTopY / 1.5);
    const eb1 = pushV(r1.rx, r1.botY, r1.rz, sn.nx, 0, sn.nz, u1, r1.botY / 1.5);
    extraIdx.push(et0, et1, eb1, et0, eb1, eb0);

    const wt0 = pushV(r0.lx, r0.lTopY, r0.lz, -sn.nx, 0, -sn.nz, u0, r0.lTopY / 1.5);
    const wb0 = pushV(r0.lx, r0.botY, r0.lz, -sn.nx, 0, -sn.nz, u0, r0.botY / 1.5);
    const wt1 = pushV(r1.lx, r1.lTopY, r1.lz, -sn.nx, 0, -sn.nz, u1, r1.lTopY / 1.5);
    const wb1 = pushV(r1.lx, r1.botY, r1.lz, -sn.nx, 0, -sn.nz, u1, r1.botY / 1.5);
    extraIdx.push(wt0, wb1, wt1, wt0, wb0, wb1);
  }
  if (capEnds[0]) {
    const r = rings[0], sn = segN[0];
    const tl = pushV(r.lx, r.lTopY, r.lz, -sn.tx, 0, -sn.tz, 0, r.lTopY / 1.5);
    const tr = pushV(r.rx, r.rTopY, r.rz, -sn.tx, 0, -sn.tz, 0.1, r.rTopY / 1.5);
    const bl = pushV(r.lx, r.botY, r.lz, -sn.tx, 0, -sn.tz, 0, r.botY / 1.5);
    const br = pushV(r.rx, r.botY, r.rz, -sn.tx, 0, -sn.tz, 0.1, r.botY / 1.5);
    extraIdx.push(tl, tr, br, tl, br, bl);
  }
  if (capEnds[1]) {
    const r = rings[rings.length - 1], sn = segN[segN.length - 1];
    const tl = pushV(r.lx, r.lTopY, r.lz, sn.tx, 0, sn.tz, 0, r.lTopY / 1.5);
    const tr = pushV(r.rx, r.rTopY, r.rz, sn.tx, 0, sn.tz, 0.1, r.rTopY / 1.5);
    const bl = pushV(r.lx, r.botY, r.lz, sn.tx, 0, sn.tz, 0, r.botY / 1.5);
    const br = pushV(r.rx, r.botY, r.rz, sn.tx, 0, sn.tz, 0.1, r.botY / 1.5);
    extraIdx.push(tl, br, tr, tl, bl, br);
  }
}

// Reshape the car-wash ground & sidewalks before levelModelSidewalks(root):
//  1. Clip the raised grass mound over the widened approach & rear drive turn,
//     remove the erroneous ENTER-corner grass blob, and trim the EXIT-end
//     grass island along the exit lane;
//  2. Strip obsolete curbs and build the repositioned outer approach curb plus
//     the straight eastern curb closing the trimmed EXIT grass island;
//  3. Build the U-shaped EXIT + east + ENTER sidewalk + 0.16 m curb border.
export function reshapeCarWashApproach(root) {
  root.updateMatrixWorld(true);
  const rootInv = root.matrixWorld.clone().invert();
  const curbPts = sampleApproachCurb(76);
  const clearPoly = buildClearPolygonWash(curbPts);
  const clipPoly = buildClipPolylineWash(curbPts);
  const exitClearPoly = buildExitIslandClearPolygonWash();
  const exitClipLine = buildExitIslandClipLineWash();

  const c = Math.cos(W.heading), s = Math.sin(W.heading);
  const rootToWash = (rx, rz) => [rx * c - rz * s, rx * s + rz * c];
  const washToRoot = (lx, lz) => [lx * c + lz * s, -lx * s + lz * c];

  let removedGrass = 0, clippedGrass = 0, removedCurb = 0, addedCurb = 0, addedWalk = 0, addedGrass = 0;

  // Local concrete & palm-grass surface samplers populated during Step 1.
  const localConcTris = [];
  const palmGrassTris = [];
  const evalTriY = (tris, wx, wz, fallback) => {
    let bestY = NaN, nearY = fallback, nearD = Infinity;
    for (let i = 0; i < tris.length; i += 9) {
      const ax = tris[i], ay = tris[i + 1], az = tris[i + 2];
      const bx = tris[i + 3], by = tris[i + 4], bz = tris[i + 5];
      const cx = tris[i + 6], cy = tris[i + 7], cz = tris[i + 8];
      const denom = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(denom) > 1e-6) {
        const w0 = ((bz - cz) * (wx - cx) + (cx - bx) * (wz - cz)) / denom;
        const w1 = ((cz - az) * (wx - cx) + (ax - cx) * (wz - cz)) / denom;
        const w2 = 1 - w0 - w1;
        if (w0 >= -1e-4 && w1 >= -1e-4 && w2 >= -1e-4) {
          const y = w0 * ay + w1 * by + w2 * cy;
          if (!(y <= bestY)) bestY = y;
        }
      }
      const mx = (ax + bx + cx) / 3, mz = (az + bz + cz) / 3;
      const d = (wx - mx) ** 2 + (wz - mz) ** 2;
      if (d < nearD) { nearD = d; nearY = (ay + by + cy) / 3; }
    }
    return Number.isNaN(bestY) ? nearY : bestY;
  };
  const sampleConcreteY = (wx, wz) => evalTriY(localConcTris, wx, wz, 0.78);
  const samplePalmGrassY = (wx, wz) => evalTriY(palmGrassTris, wx, wz, sampleConcreteY(wx, wz) + 0.11);

  // 1. Clip raised grass triangles (palette u ≈ 0.707) cleanly along the new
  //    approach curb, palm join line, & EXIT-island cut line, remove the
  //    ENTER-corner blob, and append the two new curbed grass beds.
  const lawnMeshes = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (o.name === 'ADA_aisle_hatch_0' || o.userData?.isApproachLawn) lawnMeshes.push(o);
  });

  const palmJoinLine = [W.palmPlanterExt.joinSouthWash, W.palmPlanterExt.joinNorthWash];
  const CLIP_UNDER_CURB = 0.015;
  let grassStripsBuilt = false;

  for (const hatch of lawnMeshes) {
    const g = hatch.geometry;
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    if (!pos || !uv || !g.index) continue;
    const toR = rootInv.clone().multiply(hatch.matrixWorld);
    const fromR = toR.clone().invert();
    const upLocal = new THREE.Vector3(0, 1, 0).applyMatrix3(new THREE.Matrix3().getNormalMatrix(fromR)).normalize();
    const idx = g.index.array;
    const newIdx = [], extraPos = [], extraNor = [], extraUv = [];
    let nextVert = pos.count;

    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
    const na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    const addClipVert = (vRoot, nLocal, uVal, vVal) => {
      tmp.copy(vRoot).applyMatrix4(fromR);
      extraPos.push(tmp.x, tmp.y, tmp.z);
      extraNor.push(nLocal.x, nLocal.y, nLocal.z);
      extraUv.push(uVal, vVal);
      return nextVert++;
    };
    const addWashGrassVert = (wx, wy, wz) => {
      const [rx, rz] = washToRoot(wx, wz);
      va.set(rx, wy, rz);
      return addClipVert(va, upLocal, 0.70697, 0.70697);
    };

    for (let t = 0; t < idx.length; t += 3) {
      const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
      const u0Val = uv.getX(i0);
      if (Math.abs(u0Val - 0.481) < 0.02) {
        va.fromBufferAttribute(pos, i0).applyMatrix4(toR);
        vb.fromBufferAttribute(pos, i1).applyMatrix4(toR);
        vc.fromBufferAttribute(pos, i2).applyMatrix4(toR);
        if (Math.max(va.y, vb.y, vc.y) > 0.25 && Math.min(va.y, vb.y, vc.y) < 2.30 &&
            Math.max(va.x, vb.x, vc.x) > -6 && Math.min(va.x, vb.x, vc.x) < 26 &&
            Math.max(va.z, vb.z, vc.z) > -55 && Math.min(va.z, vb.z, vc.z) < -25) {
          const e1x = vb.x - va.x, e1z = vb.z - va.z, e2x = vc.x - va.x, e2z = vc.z - va.z;
          if (Math.abs(e1z * e2x - e1x * e2z) > 1e-4) {
            const [ax, az] = rootToWash(va.x, va.z);
            const [bx, bz] = rootToWash(vb.x, vb.z);
            const [cx, cz] = rootToWash(vc.x, vc.z);
            if (Math.max(ax, bx, cx) > -21.5 && Math.min(ax, bx, cx) < -6.5 &&
                Math.max(az, bz, cz) > -53.5 && Math.min(az, bz, cz) < -26.5) {
              localConcTris.push(ax, va.y, az, bx, vb.y, bz, cx, vc.y, cz);
            }
          }
        }
        newIdx.push(i0, i1, i2);
        continue;
      }
      if (Math.abs(u0Val - GRASS_PALETTE_U) > GRASS_PALETTE_TOL) {
        newIdx.push(i0, i1, i2);
        continue;
      }
      va.fromBufferAttribute(pos, i0).applyMatrix4(toR);
      vb.fromBufferAttribute(pos, i1).applyMatrix4(toR);
      vc.fromBufferAttribute(pos, i2).applyMatrix4(toR);
      if (Math.max(va.y, vb.y, vc.y) < -0.25 ||
          Math.min(va.x, vb.x, vc.x) > 24 || Math.max(va.x, vb.x, vc.x) < -24 ||
          Math.min(va.z, vb.z, vc.z) > 10 || Math.max(va.z, vb.z, vc.z) < -54) {
        newIdx.push(i0, i1, i2);
        continue;
      }
      const w0 = rootToWash(va.x, va.z), w1 = rootToWash(vb.x, vb.z), w2 = rootToWash(vc.x, vc.z);
      const cmx = (w0[0] + w1[0] + w2[0]) / 3, cmz = (w0[1] + w1[1] + w2[1]) / 3;
      if (inEnterIslandClearBox(cmx, cmz) || inEnterIslandClearBox(w0[0], w0[1]) ||
          inEnterIslandClearBox(w1[0], w1[1]) || inEnterIslandClearBox(w2[0], w2[1])) {
        removedGrass++;
        continue;
      }

      // Palm island grass (wx in [-11.6, -7.5], wz in [-36.2, -30.6]):
      // record top-surface heights and clip along palmJoinLine so the expanded
      // planter grass meets the kept eastern palm grass with zero overlap.
      if (cmx > -11.6 && cmx < -7.5 && cmz > -36.2 && cmz < -30.6) {
        if (Math.min(va.y, vb.y, vc.y) > 0.55) {
          palmGrassTris.push(w0[0], va.y, w0[1], w1[0], vb.y, w1[1], w2[0], vc.y, w2[1]);
        }
        const pd0 = signedDistToPolyline(w0[0], w0[1], palmJoinLine);
        const pd1 = signedDistToPolyline(w1[0], w1[1], palmJoinLine);
        const pd2 = signedDistToPolyline(w2[0], w2[1], palmJoinLine);
        if (pd0 <= 0 && pd1 <= 0 && pd2 <= 0) {
          newIdx.push(i0, i1, i2);
          continue;
        }
        if (pd0 > 0 && pd1 > 0 && pd2 > 0) {
          removedGrass++;
          continue;
        }
        if (nor) { na.fromBufferAttribute(nor, i0); nb.fromBufferAttribute(nor, i1); nc.fromBufferAttribute(nor, i2); }
        else { na.set(0, 1, 0); nb.set(0, 1, 0); nc.set(0, 1, 0); }
        if (clipGrassTriangle(va, vb, vc, na, nb, nc, i0, i1, i2, uv, pd0, pd1, pd2, addClipVert, newIdx)) {
          clippedGrass++;
        } else {
          removedGrass++;
        }
        continue;
      }

      // EXIT-end grass island trim (z in [-53, -32], x in [-20.5, -9.0]):
      if (Math.max(w0[1], w1[1], w2[1]) > -53.0 && Math.min(w0[1], w1[1], w2[1]) < -31.8 &&
          Math.max(w0[0], w1[0], w2[0]) > -20.5 && Math.min(w0[0], w1[0], w2[0]) < -9.0) {
        const ex0 = pointInPoly(w0[0], w0[1], exitClearPoly);
        const ex1 = pointInPoly(w1[0], w1[1], exitClearPoly);
        const ex2 = pointInPoly(w2[0], w2[1], exitClearPoly);
        if (ex0 && ex1 && ex2) {
          removedGrass++;
          continue;
        }
        if ((ex0 || ex1 || ex2 || pointInPoly(cmx, cmz, exitClearPoly)) &&
            Math.min(w0[1], w1[1], w2[1]) > -41.52) {
          removedGrass++;
          continue;
        }
        const ed0 = Math.max(signedDistToPolyline(w0[0], w0[1], exitClipLine) + 0.015, w0[1] + 41.55);
        const ed1 = Math.max(signedDistToPolyline(w1[0], w1[1], exitClipLine) + 0.015, w1[1] + 41.55);
        const ed2 = Math.max(signedDistToPolyline(w2[0], w2[1], exitClipLine) + 0.015, w2[1] + 41.55);
        const straddlesExitCut = (ed0 < 0 || ed1 < 0 || ed2 < 0) && (ed0 > 0 || ed1 > 0 || ed2 > 0) &&
          Math.max(w0[1], w1[1], w2[1]) <= -40.3 && Math.min(w0[1], w1[1], w2[1]) >= -51.5;
        if (ex0 || ex1 || ex2 || pointInPoly(cmx, cmz, exitClearPoly) || straddlesExitCut) {
          if (nor) { na.fromBufferAttribute(nor, i0); nb.fromBufferAttribute(nor, i1); nc.fromBufferAttribute(nor, i2); }
          else { na.set(0, 1, 0); nb.set(0, 1, 0); nc.set(0, 1, 0); }
          if (clipGrassTriangle(va, vb, vc, na, nb, nc, i0, i1, i2, uv, ed0, ed1, ed2, addClipVert, newIdx)) {
            clippedGrass++;
          } else {
            removedGrass++;
          }
          continue;
        }
        newIdx.push(i0, i1, i2);
        continue;
      }

      const in0 = pointInPoly(w0[0], w0[1], clearPoly);
      const in1 = pointInPoly(w1[0], w1[1], clearPoly);
      const in2 = pointInPoly(w2[0], w2[1], clearPoly);
      if (in0 && in1 && in2) {
        removedGrass++;
        continue;
      }

      const d0 = signedDistToPolyline(w0[0], w0[1], clipPoly) - CLIP_UNDER_CURB;
      const d1 = signedDistToPolyline(w1[0], w1[1], clipPoly) - CLIP_UNDER_CURB;
      const d2 = signedDistToPolyline(w2[0], w2[1], clipPoly) - CLIP_UNDER_CURB;

      if (!in0 && !in1 && !in2) {
        const straddlesCurb = (d0 < 0 || d1 < 0 || d2 < 0) && (d0 > 0 || d1 > 0 || d2 > 0) &&
          Math.min(w0[1], w1[1], w2[1]) > -19.5 && Math.max(w0[1], w1[1], w2[1]) < 14.0;
        if (!pointInPoly(cmx, cmz, clearPoly) && !straddlesCurb) {
          newIdx.push(i0, i1, i2);
          continue;
        }
      }
      if (d0 > 2.2 && d1 > 2.2 && d2 > 2.2) {
        if (!in0 && !in1 && !in2) {
          newIdx.push(i0, i1, i2);
          continue;
        }
        removedGrass++;
        continue;
      }

      if (nor) { na.fromBufferAttribute(nor, i0); nb.fromBufferAttribute(nor, i1); nc.fromBufferAttribute(nor, i2); }
      else { na.set(0, 1, 0); nb.set(0, 1, 0); nc.set(0, 1, 0); }
      if (clipGrassTriangle(va, vb, vc, na, nb, nc, i0, i1, i2, uv, d0, d1, d2, addClipVert, newIdx)) {
        clippedGrass++;
      } else {
        removedGrass++;
      }
    }

    // Append the two newly requested curbed grass beds directly into hatch:
    // (1) Expanded palm + street-lamp planter bed (west of palmJoinLine), and
    // (2) West exit-lane grass median strip (from Wash-wall-west to wz = -41.58).
    if (!grassStripsBuilt && hatch.name === 'ADA_aisle_hatch_0') {
      grassStripsBuilt = true;
      const beforeIdxLen = newIdx.length;

      // (1) Palm + light-pole planter grass bed
      const P = W.palmPlanterExt;
      const outerPts = samplePalmPlanterOuterWash(16, 5); // 22 pts south -> north
      const rows = outerPts.length - 1, cols = 6;
      const eastNorthOverlap = [-9.22, -35.75];
      const pGrid = [];
      for (let j = 0; j <= rows; j++) {
        const v = j / rows;
        const [ox, oz] = outerPts[j];
        const ex = P.joinSouthWash[0] + (eastNorthOverlap[0] - P.joinSouthWash[0]) * v;
        const ez = P.joinSouthWash[1] + (eastNorthOverlap[1] - P.joinSouthWash[1]) * v;
        const eastY = samplePalmGrassY(ex, ez);
        const row = [];
        for (let i = 0; i <= cols; i++) {
          const u = i / cols;
          const gx = ox + (ex - ox) * u, gz = oz + (ez - oz) * u;
          const concY = sampleConcreteY(gx, gz);
          const outerY = Math.min(concY + 0.125, Math.max(concY + 0.088, eastY - 0.025));
          const gy = outerY * (1 - u) + eastY * u;
          row.push(addWashGrassVert(gx, gy, gz));
        }
        pGrid.push(row);
      }
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const sw = pGrid[j][i], se = pGrid[j][i + 1];
          const nw = pGrid[j + 1][i], ne = pGrid[j + 1][i + 1];
          // +Y winding in (X east, Z south): (NW, SW, SE) and (NW, SE, NE)
          newIdx.push(nw, sw, se, nw, se, ne);
        }
      }

      // (2) West exit-lane median grass strip (wz = -29.35 -> -42.55)
      const E = W.exitIslandTrim;
      const mRows = 30, mCols = 3;
      const zS = E.southWestWash[1]; // -29.35
      const zN = -42.55;
      const xWNorth = -18.02, xENorth = -17.26;
      const mGrid = [];
      for (let j = 0; j <= mRows; j++) {
        const v = j / mRows;
        const gz = zS + (zN - zS) * v;
        const xW = gz >= -41.5557
          ? E.southWestWash[0] + (E.westWeldWash[0] - E.southWestWash[0]) * ((gz - zS) / (-41.5557 - zS))
          : E.westWeldWash[0] + (xWNorth - E.westWeldWash[0]) * ((gz + 41.5557) / (zN + 41.5557));
        const xE = gz >= -41.5557
          ? E.southEastWash[0] + (E.eastMidWash[0] - E.southEastWash[0]) * ((gz - zS) / (-41.5557 - zS))
          : E.eastMidWash[0] + (xENorth - E.eastMidWash[0]) * ((gz + 41.5557) / (zN + 41.5557));
        const row = [];
        for (let i = 0; i <= mCols; i++) {
          const u = i / mCols;
          const gx = xW + (xE - xW) * u;
          const concY = sampleConcreteY(gx, gz);
          const baseY = concY + 0.092;
          const blend = Math.max(0, Math.min(1, (v - 0.82) / 0.18));
          const gy = baseY * (1 - blend) + 1.695 * blend;
          row.push(addWashGrassVert(gx, gy, gz));
        }
        mGrid.push(row);
      }
      for (let j = 0; j < mRows; j++) {
        for (let i = 0; i < mCols; i++) {
          const sw = mGrid[j][i], se = mGrid[j][i + 1];
          const nw = mGrid[j + 1][i], ne = mGrid[j + 1][i + 1];
          newIdx.push(nw, sw, se, nw, se, ne);
        }
      }
      addedGrass = (newIdx.length - beforeIdxLen) / 3;
    }

    const oldCount = pos.count, totalCount = oldCount + extraPos.length / 3;
    const pArr = new Float32Array(totalCount * 3);
    const nArr = new Float32Array(totalCount * 3);
    const uArr = new Float32Array(totalCount * 2);
    for (let i = 0; i < oldCount; i++) {
      pArr[3 * i] = pos.getX(i); pArr[3 * i + 1] = pos.getY(i); pArr[3 * i + 2] = pos.getZ(i);
      if (nor) { nArr[3 * i] = nor.getX(i); nArr[3 * i + 1] = nor.getY(i); nArr[3 * i + 2] = nor.getZ(i); }
      else { nArr[3 * i] = 0; nArr[3 * i + 1] = 1; nArr[3 * i + 2] = 0; }
      uArr[2 * i] = uv.getX(i); uArr[2 * i + 1] = uv.getY(i);
    }
    pArr.set(extraPos, oldCount * 3);
    nArr.set(extraNor, oldCount * 3);
    uArr.set(extraUv, oldCount * 2);
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
    ng.setAttribute('normal', new THREE.BufferAttribute(nArr, 3));
    ng.setAttribute('uv', new THREE.BufferAttribute(uArr, 2));
    ng.setIndex(newIdx);
    ng.computeBoundingBox();
    ng.computeBoundingSphere();
    hatch.geometry = ng;
  }

  // 2. Append the U-shaped EXIT + east + ENTER sidewalk to SS Walk concrete.
  let walkMesh = null;
  root.traverse(o => {
    if (!walkMesh && o.isMesh && !o.isInstancedMesh && o.material?.name === WALK_MATERIAL) walkMesh = o;
  });
  if (walkMesh) addedWalk = appendCarWashWalk(walkMesh, rootInv, washToRoot);

  // 3. Remove obsolete inner, ENTER-island, and EXIT-island curbs, and append:
  //    (a) the repositioned outer approach curb ribbon,
  //    (b1) the continuous ENTER + east sidewalk curb,
  //    (b2) the far/EXIT sidewalk L-curb, and
  //    (c) the straight east curb closing the trimmed EXIT grass island.
  const curbMeshes = [];
  root.traverse(o => {
    if (o.isMesh && !o.isInstancedMesh && o.material?.name === CURB_MATERIAL) curbMeshes.push(o);
  });

  let ribbonBuilt = false;
  for (const curb of curbMeshes) {
    const g = curb.geometry;
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    if (!pos || !g.index) continue;
    const toR = rootInv.clone().multiply(curb.matrixWorld);
    const fromR = toR.clone().invert();
    const idx = g.index.array, keptIdx = [];
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();

    for (let t = 0; t < idx.length; t += 3) {
      const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
      va.fromBufferAttribute(pos, i0).applyMatrix4(toR);
      vb.fromBufferAttribute(pos, i1).applyMatrix4(toR);
      vc.fromBufferAttribute(pos, i2).applyMatrix4(toR);
      if (Math.max(va.y, vb.y, vc.y) < 2.65) {
        const [lx, lz] = rootToWash((va.x + vb.x + vc.x) / 3, (va.z + vb.z + vc.z) / 3);
        const inOldPalmWestCurb =
          (lx > -11.6 && lx < -9.66 && lz > -36.05 && lz < -30.94) ||
          (lx > -11.6 && lx < -9.81 && lz >= -30.94 && lz < -30.65);
        const inWestSouthPinch = (lx > -18.22 && lx < -17.20 && lz > -41.54 && lz < -40.85);
        if (pointInPoly(lx, lz, clearPoly) || inEnterIslandClearBox(lx, lz) ||
            pointInPoly(lx, lz, exitClearPoly) || inOldPalmWestCurb || inWestSouthPinch) {
          removedCurb++;
          continue;
        }
      }
      keptIdx.push(i0, i1, i2);
    }

    const extraP = [], extraN = [], extraU = [], extraIdx = [];
    if (!ribbonBuilt) {
      ribbonBuilt = true;
      const halfW = W.curbWidth / 2, botDrop = 0.55;
      let baseV = pos.count;
      const nmInv = new THREE.Matrix3().getNormalMatrix(fromR);
      const pLocal = new THREE.Vector3(), nLocal = new THREE.Vector3();
      const pushV = (rx, ry, rz, nx, ny, nz, uVal, vVal) => {
        pLocal.set(rx, ry, rz).applyMatrix4(fromR);
        nLocal.set(nx, ny, nz).applyMatrix3(nmInv).normalize();
        extraP.push(pLocal.x, pLocal.y, pLocal.z);
        extraN.push(nLocal.x, nLocal.y, nLocal.z);
        extraU.push(uVal, vVal);
        return baseV++;
      };

      // (a) Outer curved approach curb
      appendWashCurbPolyline(
        curbPts, halfW,
        t => 1.38 * (1 - t) + 0.38 * t,
        botDrop, washToRoot, pushV, extraIdx,
        W.approachSouthTieInRoot, [false, false]
      );

      // (b1) Continuous ENTER + east sidewalk curb
      const S = W.sidewalk;
      const enterCornerX = (W.x[1] - W.partialWallWidth) + halfW;
      const enterCurbZ = S.enterZ[1] + halfW;
      const eastCurbX = -8.53 + halfW;
      const enterEastPts = [];
      for (let i = 0; i <= 4; i++) {
        enterEastPts.push([enterCornerX, S.enterZ[0] + (enterCurbZ - S.enterZ[0]) * (i / 4)]);
      }
      for (let i = 1; i <= 9; i++) {
        enterEastPts.push([enterCornerX + (eastCurbX - enterCornerX) * (i / 9), enterCurbZ]);
      }
      for (let i = 1; i <= 34; i++) {
        enterEastPts.push([eastCurbX, enterCurbZ + (S.eastZ[0] - enterCurbZ) * (i / 34)]);
      }
      appendWashCurbPolyline(
        enterEastPts, halfW, () => S.palmEastTieInRoot.outer[1],
        botDrop, washToRoot, pushV, extraIdx,
        {
          outer: [S.palmEastTieInRoot.outer[0], S.palmEastTieInRoot.outer[2]],
          inner: [S.palmEastTieInRoot.inner[0], S.palmEastTieInRoot.inner[2]]
        },
        [true, false]
      );

      // (b2a) Continuous outer curb around the expanded palm + light-pole
      //       planter bed and south along the far-end door sidewalk's west edge
      //       (walking north->west->south so L=outer faces the exit lane).
      const P = W.palmPlanterExt;
      const farCurbZ = S.farZ[0] - halfW;
      const farCornerX = P.westCurbX; // -13.405
      const planterNorthToSouth = samplePalmPlanterOuterWash(16, 5).reverse();
      for (let i = 1; i <= 5; i++) {
        planterNorthToSouth.push([farCornerX, farCurbZ + (S.farZ[1] - farCurbZ) * (i / 5)]);
      }
      appendWashCurbPolyline(
        planterNorthToSouth, halfW,
        t => P.northWeldRoot.outer[1] * (1 - t) + S.palmWestTieInRoot.outer[1] * t,
        botDrop, washToRoot, pushV, extraIdx,
        null,
        [false, true],
        {
          outer: [P.northWeldRoot.outer[0], P.northWeldRoot.outer[2]],
          outerY: P.northWeldRoot.outer[1],
          inner: [P.northWeldRoot.inner[0], P.northWeldRoot.inner[2]],
          innerY: P.northWeldRoot.inner[1]
        }
      );

      // (b2b) Flush straight concrete divider curb separating the far-end door
      //       sidewalk (south) from the recessed grass planter bed (north).
      const dividerPts = [];
      const divStartX = farCornerX + halfW; // -13.325 (flush against inner face of west curb)
      for (let i = 0; i <= 10; i++) {
        dividerPts.push([divStartX + (-9.764 - divStartX) * (i / 10), farCurbZ]);
      }
      appendWashCurbPolyline(
        dividerPts, halfW, () => S.palmWestTieInRoot.outer[1],
        botDrop, washToRoot, pushV, extraIdx,
        {
          outer: [S.palmWestTieInRoot.outer[0], S.palmWestTieInRoot.outer[2]],
          inner: [S.palmWestTieInRoot.inner[0], S.palmWestTieInRoot.inner[2]]
        },
        [false, false]
      );

      // (c) Continuous 4-leg counter-clockwise curb around the west exit-lane
      //     grass median strip (west side wz=-41.56->-29.35, south return
      //     against Wash-wall-west, full 21 m east side, and mitered NE corner
      //     welded into northWeldRoot).
      const E = W.exitIslandTrim;
      const exitCurbPts = [];
      for (let i = 0; i <= 18; i++) {
        const u = i / 18;
        exitCurbPts.push([
          E.westWeldWash[0] + (E.southWestWash[0] - E.westWeldWash[0]) * u,
          E.westWeldWash[1] + (E.southWestWash[1] - E.westWeldWash[1]) * u
        ]);
      }
      for (let i = 1; i <= 4; i++) {
        const u = i / 4;
        exitCurbPts.push([
          E.southWestWash[0] + (E.southEastWash[0] - E.southWestWash[0]) * u,
          E.southWestWash[1]
        ]);
      }
      for (let i = 1; i <= 18; i++) {
        const u = i / 18;
        exitCurbPts.push([
          E.southEastWash[0] + (E.eastMidWash[0] - E.southEastWash[0]) * u,
          E.southEastWash[1] + (E.eastMidWash[1] - E.southEastWash[1]) * u
        ]);
      }
      for (let i = 1; i <= 14; i++) {
        const u = i / 14;
        exitCurbPts.push([
          E.eastMidWash[0] + (E.northCornerWash[0] - E.eastMidWash[0]) * u,
          E.eastMidWash[1] + (E.northCornerWash[1] - E.eastMidWash[1]) * u
        ]);
      }
      exitCurbPts.push(E.northCutWash);
      appendWashCurbPolyline(
        exitCurbPts, halfW,
        t => {
          const idxPt = Math.min(exitCurbPts.length - 1, Math.round(t * (exitCurbPts.length - 1)));
          const [wx, wz] = exitCurbPts[idxPt];
          return sampleConcreteY(wx, wz) + 0.575;
        },
        botDrop, washToRoot, pushV, extraIdx,
        {
          outer: [E.northWeldRoot.inner[0], E.northWeldRoot.inner[2]], // north (outer) edge
          outerY: E.northWeldRoot.inner[1],
          inner: [E.northWeldRoot.outer[0], E.northWeldRoot.outer[2]], // south (inner) edge
          innerY: E.northWeldRoot.outer[1]
        },
        [false, false],
        {
          outer: [E.westNorthWeldRoot.outer[0], E.westNorthWeldRoot.outer[2]], // west (outer) edge
          outerY: E.westNorthWeldRoot.outer[1],
          inner: [E.westNorthWeldRoot.inner[0], E.westNorthWeldRoot.inner[2]], // east (inner) edge
          innerY: E.westNorthWeldRoot.inner[1]
        }
      );

      addedCurb = extraIdx.length / 3;
    }

    const oldC = pos.count, totC = oldC + extraP.length / 3;
    const pArr = new Float32Array(totC * 3);
    const nArr = new Float32Array(totC * 3);
    const uArr = new Float32Array(totC * 2);
    for (let i = 0; i < oldC; i++) {
      pArr[3 * i] = pos.getX(i); pArr[3 * i + 1] = pos.getY(i); pArr[3 * i + 2] = pos.getZ(i);
      if (nor) { nArr[3 * i] = nor.getX(i); nArr[3 * i + 1] = nor.getY(i); nArr[3 * i + 2] = nor.getZ(i); }
      else { nArr[3 * i] = 0; nArr[3 * i + 1] = 1; nArr[3 * i + 2] = 0; }
      if (uv) { uArr[2 * i] = uv.getX(i); uArr[2 * i + 1] = uv.getY(i); }
    }
    pArr.set(extraP, oldC * 3);
    nArr.set(extraN, oldC * 3);
    uArr.set(extraU, oldC * 2);
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
    ng.setAttribute('normal', new THREE.BufferAttribute(nArr, 3));
    ng.setAttribute('uv', new THREE.BufferAttribute(uArr, 2));
    ng.setIndex([...keptIdx, ...extraIdx]);
    ng.computeBoundingBox();
    ng.computeBoundingSphere();
    curb.geometry = ng;
  }

  return { removedGrass, clippedGrass, addedGrass, removedCurb, addedCurb, addedWalk };
}

export function buildCarWash({ ctex, glowMat, mats, groundAt = () => 0.7 }) {
  const g = new THREE.Group();
  g.name = 'Car-wash-dressing';
  g.rotation.y = W.heading;
  const std = (color, roughness = 0.6, metalness = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const add = (m, name) => { m.name = name; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const box = (name, [x0, y0, z0, x1, y1, z1], mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, name);
  };
  const east = (name, w, h, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.rotation.y = Math.PI / 2; m.position.set(x, y, z);
    return add(m, name);
  };
  const [xw, xe] = W.x, [zf, zn] = W.z;
  const ground = (x, z) => { const y = groundAt(x, z); return Number.isFinite(y) ? y : 0.7; };
  const eastBase = (ground(xe + 0.6, zn - 1) + ground(xe + 0.6, zf + 1)) / 2;

  // Solid, fully textured walls: outside, bay-facing side, top and end caps
  // all share the same true-scale block finish (not one-sided facade planes).
  const band = eastBase + 1.1;
  const wallBase = eastBase - 0.8, thickness = 0.2;
  const masonryBox = (name, bounds, mat) => {
    const m = box(name, bounds, mat);
    const [x0, y0, z0, x1, y1, z1] = bounds;
    const dimensions = [[z1-z0,y1-y0],[z1-z0,y1-y0],
      [x1-x0,z1-z0],[x1-x0,z1-z0],[x1-x0,y1-y0],[x1-x0,y1-y0]];
    const uv = m.geometry.attributes.uv;
    dimensions.forEach(([w,h], face) => {
      for (let i=face*4; i<face*4+4; i++)
        uv.setXY(i, uv.getX(i)*w/BLOCK_TILE.w, uv.getY(i)*h/BLOCK_TILE.h);
    });
    return m;
  };
  const wall = (name, x0, z0, x1, z1, y0 = wallBase, y1 = W.wallTop) => {
    if (y0 < band) masonryBox(name+'-lower', [x0,y0,z0,x1,Math.min(band,y1),z1], mats.lower);
    if (y1 > band) masonryBox(name, [x0,Math.max(band,y0),z0,x1,y1,z1], mats.upper);
  };
  wall('Wash-wall-east', xe-thickness, zf-0.05, xe+0.05, zn+0.05);
  // The original glTF wall face projects about 0.15 m beyond xw. Cover it
  // completely so its untextured surface cannot hide the new block finish.
  wall('Wash-wall-west', xw-0.22, zf-0.05, xw+thickness, zn+0.05);

  // Partial ENTER-end (+Z) masonry wall framing the ENTER service door.
  const doorBase = ground(W.door.x, zn + 0.5);
  const doorLeft = W.door.x-W.door.width/2, doorRight = W.door.x+W.door.width/2;
  wall('Wash-enter-wall-left', xe-W.partialWallWidth, zn-thickness, doorLeft, zn+0.05);
  wall('Wash-enter-wall-right', doorRight, zn-thickness, xe-thickness, zn+0.05);
  wall('Wash-enter-wall-lintel', doorLeft, zn-thickness, doorRight, zn+0.05,
    doorBase+W.door.height+0.06);

  // Partial far-end / EXIT (-Z) masonry wall covering the equipment-room end
  // wall (x = -13.485 .. xe-thickness) and framing the far-end steel service door.
  const farDoorBase = ground(W.farDoor.x, zf - 0.5);
  const farDoorLeft = W.farDoor.x - W.farDoor.width / 2;
  const farDoorRight = W.farDoor.x + W.farDoor.width / 2;
  wall('Wash-far-wall-left', xe - W.farPartialWallWidth, zf - 0.05, farDoorLeft, zf + thickness);
  wall('Wash-far-wall-right', farDoorRight, zf - 0.05, xe - thickness, zf + thickness);
  wall('Wash-far-wall-lintel', farDoorLeft, zf - 0.05, farDoorRight, zf + thickness,
    farDoorBase + W.farDoor.height + 0.06);

  // Light grey fascia all round, a white LED strip under its front edge.
  const [fy0, fy1] = W.fascia, out = 0.42, t = 0.06;
  const fasciaMat = std(0xd9dcdd, 0.45, 0.15);
  box('Wash-fascia-east', [xe + out - t, fy0, zf - out, xe + out, fy1, zn + out], fasciaMat);
  box('Wash-fascia-west', [xw - out, fy0, zf - out, xw - out + t, fy1, zn + out], fasciaMat);
  box('Wash-fascia-far', [xw - out, fy0, zf - out, xe + out, fy1, zf - out + t], fasciaMat);
  box('Wash-fascia-enter', [xw - out, fy0, zn + out - t, xe + out, fy1, zn + out], fasciaMat);
  box('Wash-fascia-cap', [xw - out, fy1, zf - out, xe + out, fy1 + 0.03, zn + out], std(0xc9cccd, 0.6, 0.1));
  box('Wash-fascia-soffit', [xw - out, fy0 - 0.02, zf - out, xe + out, fy0, zn + out], std(0xe3e5e5, 0.6, 0));
  const led = glowMat(ctex(4, 4, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); }));
  led.color.set(0xeef3f5);
  box('Wash-LED-east', [xe + out - 0.12, fy0 - 0.05, zf - out, xe + out - t, fy0 - 0.02, zn + out], led);
  box('Wash-LED-enter', [xw - out, fy0 - 0.05, zn + out - 0.12, xe + out, fy0 - 0.02, zn + out - t], led);

  // Red "CarWash" panel with the white diagonal cut, on the fascia by the ENTER end.
  const signTex = ctex(512, 192, (c, w, h) => {
    c.fillStyle = '#f2f2f0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d4202f'; c.beginPath(); c.moveTo(w * 0.2, 0); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; c.font = '500 74px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('CarWash', w * 0.56, h * 0.54);
  });
  east('CarWash-sign', 2.0, 0.72, glowMat(signTex), xe + out + 0.01, (fy0 + fy1) / 2 - 0.02, zn - 2.1);

  // Steel service doors on both end walls (+Z ENTER end and -Z far/EXIT end).
  const frameMat = std(0x8e9396, 0.5, 0.4);
  const doorMat = std(0xa7acae, 0.45, 0.35);
  const handleMat = std(0x5d6063, 0.3, 0.8);
  box('Wash-door-frame-left', [doorLeft-0.06,doorBase,zn+0.055,doorLeft,doorBase+W.door.height+0.06,zn+0.10], frameMat);
  box('Wash-door-frame-right', [doorRight,doorBase,zn+0.055,doorRight+0.06,doorBase+W.door.height+0.06,zn+0.10], frameMat);
  box('Wash-door-frame-top', [doorLeft,doorBase+W.door.height,zn+0.055,doorRight,doorBase+W.door.height+0.06,zn+0.10], frameMat);
  box('Wash-door', [doorLeft,doorBase,zn+0.055,doorRight,doorBase+W.door.height,zn+0.11], doorMat);
  box('Wash-door-handle', [doorRight-0.18,doorBase+0.98,zn+0.11,doorRight-0.06,doorBase+1.02,zn+0.16], handleMat);

  box('Wash-far-door-frame-left', [farDoorLeft-0.06,farDoorBase,zf-0.10,farDoorLeft,farDoorBase+W.farDoor.height+0.06,zf-0.055], frameMat);
  box('Wash-far-door-frame-right', [farDoorRight,farDoorBase,zf-0.10,farDoorRight+0.06,farDoorBase+W.farDoor.height+0.06,zf-0.055], frameMat);
  box('Wash-far-door-frame-top', [farDoorLeft,farDoorBase+W.farDoor.height,zf-0.10,farDoorRight,farDoorBase+W.farDoor.height+0.06,zf-0.055], frameMat);
  box('Wash-far-door', [farDoorLeft,farDoorBase,zf-0.11,farDoorRight,farDoorBase+W.farDoor.height,zf-0.055], doorMat);
  box('Wash-far-door-handle', [farDoorLeft+0.06,farDoorBase+0.98,zf-0.16,farDoorLeft+0.18,farDoorBase+1.02,zf-0.11], handleMat);

  // Banner in a thin aluminium frame.
  const B = W.banner;
  const bannerTex = ctex(1024, 96, (c, w, h) => {
    c.fillStyle = '#f7f6f2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c8202f'; c.font = 'italic 900 66px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('WE APPRECIATE YOUR BUSINESS', w / 2, h / 2 + 3, w - 40);
  });
  box('Wash-banner-frame', [xe + 0.05, B.y - B.h / 2 - 0.03, B.z - B.w / 2 - 0.03, xe + 0.08, B.y + B.h / 2 + 0.03, B.z + B.w / 2 + 0.03], std(0xbfc5c7, 0.4, 0.5));
  east('Wash-banner', B.w, B.h, std(0xffffff, 0.6, 0, { map: bannerTex }), xe + 0.085, B.y, B.z);

  // Two framed blue posters.
  const posterTex = ctex(192, 256, (c, w, h) => {
    c.fillStyle = '#1d2f8c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; c.font = 'bold 24px Arial'; c.textAlign = 'center';
    ['WE', 'APPRECIATE', 'YOUR', 'BUSINESS'].forEach((t, i) => c.fillText(t, w / 2, 92 + i * 28));
  });
  for (const z of W.posters) {
    box('Wash-poster-frame', [xe + 0.05, 2.15, z - 0.34, xe + 0.08, 3.0, z + 0.34], std(0xb9bfc2, 0.4, 0.5));
    east('Wash-poster', 0.62, 0.8, std(0xffffff, 0.6, 0, { map: posterTex }), xe + 0.085, 2.575, z);
  }

  // Hose outlets: a black boot with a steel ring.
  for (const [z, h] of W.hoses) {
    const y = ground(xe + 0.5, z) + h;
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.06, 14), std(0x1a1a1a, 0.7));
    boot.rotation.z = Math.PI / 2; boot.position.set(xe + 0.08, y, z); add(boot, 'Wash-hose-outlet');
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 16), std(0xd0d3d5, 0.3, 0.8));
    ring.rotation.y = Math.PI / 2; ring.position.set(xe + 0.115, y, z); add(ring, 'Wash-hose-ring');
  }

  // Red stamped-brick pads along the east wall base, subdivided along the walk
  // so each pad hugs the curved sidewalk grade cleanly.
  const brickTex = ctex(256, 256, (c, w, h) => {
    c.fillStyle = '#b7232b'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(80,10,14,0.55)'; c.lineWidth = 3;
    for (let r = 0; r < 8; r++) {
      c.beginPath(); c.moveTo(0, r * 32); c.lineTo(w, r * 32); c.stroke();
      for (let k = 0; k < 4; k++) { const x = k * 64 + (r % 2) * 32; c.beginPath(); c.moveTo(x, r * 32); c.lineTo(x, r * 32 + 32); c.stroke(); }
    }
    c.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 90; i++) c.fillRect((i * 97) % w, (i * 61) % h, 3, 2);
  });
  brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
  const padMat = std(0xffffff, 0.75, 0, { map: brickTex, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const [z0, z1] of W.pads) {
    const x0 = xe + 0.06, x1 = xe + 1.34, cols = 2, rows = 8;
    const verts = [], uvs = [], indices = [];
    for (let j = 0; j <= rows; j++) {
      const z = z0 + (z1 - z0) * (j / rows);
      for (let i = 0; i <= cols; i++) {
        const x = x0 + (x1 - x0) * (i / cols);
        verts.push(x, ground(x, z) + 0.016, z);
        uvs.push((x - x0) / 0.8, (z - z0) / 0.8);
        if (i < cols && j < rows) {
          const a = j * (cols + 1) + i, b = a + cols + 1;
          indices.push(a, b, b + 1, a, b + 1, a + 1);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices); geo.computeVertexNormals();
    const pad = new THREE.Mesh(geo, padMat); pad.name = 'Wash-red-pad'; pad.receiveShadow = true; g.add(pad);
  }
  return g;
}
