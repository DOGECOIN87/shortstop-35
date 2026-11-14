import * as THREE from '../vendor/three.module.js';

// A looping cinematic camera flight around the station (the page's Tour).
// One closed, centripetal Catmull-Rom path for the camera and one for its aim,
// travelled at a speed that eases between keyframes (fast in the air, slow at
// eye level past the pumps and the storefront), so the loop has no seam and
// no sudden change of pace. Keyframes are in the storefront frame (+X toward
// the pumps, +Z south along the store front, Y up, metres); `fov` scales the
// page's normal field of view (wider at eye level).
export const SHOTS = Object.freeze([
  { pos: [78, 40, -40], aim: [16, 1, -2], speed: 9, fov: 0.92 },      // high over the north-east corner
  { pos: [94, 30, 6], aim: [20, 1, 0], speed: 9, fov: 0.92 },         // out over the frontage road
  { pos: [74, 19, 46], aim: [24, 2, 4], speed: 8, fov: 0.96 },        // round to the south, descending
  { pos: [52, 6, 30], aim: [32, 2.5, 9], speed: 5.5, fov: 1.04 },     // down toward the canopy's south lane
  { pos: [44, 2.8, 8.7], aim: [28, 2.3, 8.7], speed: 3.2, fov: 1.14 },  // into the lane between islands 3 and 4
  { pos: [30, 2.5, 8.7], aim: [16, 2.4, 7.5], speed: 2.6, fov: 1.18 },  // between the pumps
  { pos: [21, 3.0, 6.5], aim: [10, 2.4, 7.5], speed: 2.2, fov: 1.15 },  // LED screen and window signs, over the parked cars
  { pos: [20.5, 3.3, -3], aim: [10, 2.7, -1.5], speed: 2.0, fov: 1.12 }, // doors and the FoodMart sign
  { pos: [20, 3.6, -10], aim: [9.5, 2.2, -8.5], speed: 2.2, fov: 1.1 },  // the Amazon locker and pier
  { pos: [19, 5.5, -15], aim: [7, 0.8, -21], speed: 3.0, fov: 1.06 },   // down over the van aisle, ramp and corner lawn
  { pos: [21.5, 7, -28.5], aim: [6, 2.0, -26], speed: 4.0, fov: 1.02 },  // along the car wash, palm beyond
  { pos: [34, 22, -58], aim: [12, 1, -14], speed: 8, fov: 0.95 }        // pull back and up to the north
].map(s => Object.freeze(s)));

// Build the loop. Returns { duration, sample(t, out) } where sample fills
// out.pos / out.aim (Vector3, storefront frame) and out.fov (scale).
export function createCinematic(shots = SHOTS) {
  const pos = new THREE.CatmullRomCurve3(shots.map(s => new THREE.Vector3(...s.pos)), true, 'centripetal');
  const aim = new THREE.CatmullRomCurve3(shots.map(s => new THREE.Vector3(...s.aim)), true, 'centripetal');
  const DIV = 24000; // fine arc-length table: no frame-to-frame speed jitter
  pos.arcLengthDivisions = DIV;
  const n = shots.length, L = pos.getLength();
  // Arc length at each keyframe (curve parameter t = i / n).
  const lengths = pos.getLengths(DIV), knotS = shots.map((_, i) => lengths[Math.round(i / n * DIV)]);
  const smooth = x => x * x * (3 - 2 * x);
  // Speed along the loop: eased between consecutive keyframes' speeds.
  const speedAt = s => {
    s = ((s % L) + L) % L;
    let i = n - 1; while (i > 0 && knotS[i] > s) i--;
    const s0 = knotS[i], s1 = i + 1 < n ? knotS[i + 1] : L, k = (s - s0) / Math.max(1e-6, s1 - s0);
    return shots[i].speed + (shots[(i + 1) % n].speed - shots[i].speed) * smooth(k);
  };
  // time -> arc length table (dt = ds / v)
  const N = 2400, ds = L / N, times = new Float64Array(N + 1);
  for (let k = 1; k <= N; k++) times[k] = times[k - 1] + ds / speedAt((k - 0.5) * ds);
  const duration = times[N];
  const sAt = t => {
    t = ((t % duration) + duration) % duration;
    let lo = 0, hi = N;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] <= t) lo = mid; else hi = mid; }
    return (lo + (t - times[lo]) / Math.max(1e-9, times[hi] - times[lo])) * ds;
  };
  // Curve parameter for an arc length (the aim and fov follow the same knots).
  const uOf = s => pos.getUtoTmapping(s / L);
  const fovAt = u => {
    const f = u * n, i = Math.floor(f) % n, k = smooth(f - Math.floor(f));
    return shots[i].fov + (shots[(i + 1) % n].fov - shots[i].fov) * k;
  };
  return {
    duration, length: L,
    sample(t, out = { pos: new THREE.Vector3(), aim: new THREE.Vector3(), fov: 1 }) {
      const s = sAt(t), u = uOf(s);
      pos.getPoint(u, out.pos); aim.getPoint(u, out.aim); out.fov = fovAt(u);
      return out;
    }
  };
}
