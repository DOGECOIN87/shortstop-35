import * as THREE from '../vendor/three.module.js';
import { STOREFRONT } from './storefront.js';
import { PYLONS } from './station-geometry.js';

// Sidewalk and yard corrections the owner marked on screenshots of the live
// page, applied to the detailed Blender model after it loads:
//
//   * the named red air/water cabinet is hidden directly; the old broad cut
//     also removed triangles from the merged walk and curb beneath it;
//   * the plain grey box beside the south corner is cut without cutting the
//     merged walk or curb surfaces;
//   * the model's loose propane bottles are replaced by the stainless,
//     perforated RapidXchange propane exchange cabinet (owner's night photos)
//     on the paved edge of the car-wash-side tree island, with the Swisher
//     Sweets and MOJO floor stands either side of it, and the island gets its
//     crape myrtle, landscape rocks and "Thank You / Drive Safely" sign;
//   * three shrubs stand in the grass strip along the store's north wall;
//   * the palm and restored twin-head pole light stand on the grass island by
//     the car wash.
//
// Everything here is in the storefront frame used by scripts/storefront.js:
// +X out of the storefront toward the pumps, +Z south along the front wall,
// Y up. Boxes are [x0, y0, z0, x1, y1, z1] in that frame.
// The entire cabinet footprint is inside the user-outlined concrete rectangle
// lower-right of the nearer island, beside accessible parking (clear of grass).
// Owner’s clarified preview: use the strip immediately beside the island,
// not the open forecourt farther out toward the pumps.
// Slide back 0.75 m toward the grass curb without changing the door direction.
const PROPANE_AT = Object.freeze([14.0, -17.25]);
export const SITE_FIXES = Object.freeze({
  cutBoxes: Object.freeze([
    [9.50, 0.15, 10.80, 12.60, 2.20, 13.90]    // grey placeholder box, south corner
  ]),
  protectedCutMaterials: Object.freeze(['SS Walk concrete', 'SS Curb concrete']),
  // Model parts hidden because they are removed or replaced, including the
  // instanced loose propane bottles stacked against the south wall.
  hideMeshes: Object.freeze([/^Air_&_water_machine$/, /^Propane_tank/]),
  palm: Object.freeze({ at: [14.5, -31.5], height: 7.2 }), // farther island, by the car wash
  light: Object.freeze({ at: [11.5, -31.5], height: 8.1 }), // grass island beside the palm
  propane: Object.freeze({
    at: PROPANE_AT,       // striped concrete rectangle beside accessible parking
    // Local -Z is the door side. Turn it toward +Z (the parked vehicles),
    // leaving the back along -Z against the nearer grass-island edge.
    rotation: Math.PI,
    // RapidXchange cabinet in the photos: portrait front ~1.15 x 1.7 m.
    width: 1.15, depth: 0.98, height: 1.72
  }),
  // Floor stands either side of the cabinet front (photos): Swisher Sweets
  // on the left as you face it, MOJO on the right.
  stands: Object.freeze([
    Object.freeze({ kind: 'swisher', at: [PROPANE_AT[0] - 0.98, -16.66] }),
    Object.freeze({ kind: 'mojo', at: [PROPANE_AT[0] + 0.98, -16.72] })
  ]),
  // The tree island behind the cabinet (grass x 12.3-16.3, z -20..-18).
  tree: Object.freeze({ at: [13.7, -19.0], height: 4.3 }),
  thankYou: Object.freeze({ at: [15.3, -19.05], rotation: -Math.PI / 2 }), // faces drivers leaving toward the pumps
  // Grass strip along the north wall (z -13.5..-11.5).
  shrubs: Object.freeze([[9.0, -12.5], [4.6, -12.5], [0.4, -12.4]])
});

/* ------------------------------------------------------------------ materials */
function canvasTex(w, h, draw) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function canvasTexture(size, draw) { return canvasTex(size, size, (c, w) => draw(c, w)); }

function materials(lampMaterial = null) {
  // Stainless sheet with staggered oval perforations (cabinet sides and back).
  const perf = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#c4c8cb'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { c.fillStyle = y % 4 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; c.fillRect(0, y, w, 1); }
    c.globalCompositeOperation = 'destination-out';
    for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) {
      c.beginPath(); c.ellipse(k * 64 + (r % 2) * 32 + 32, r * 32 + 16, 22, 8, 0, 0, Math.PI * 2); c.fill();
    }
  });
  if (perf) perf.repeat.set(4, 6);
  const header = canvasTex(512, 64, (c, w, h) => {
    c.fillStyle = '#f4f4f2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d3fae'; c.fillRect(6, 6, 150, h - 12);
    c.fillStyle = '#ffffff'; c.font = 'italic bold 25px Arial'; c.textBaseline = 'middle'; c.fillText('RapidXchange', 14, h / 2 + 1);
    c.strokeStyle = '#c8202c'; c.lineWidth = 3; c.strokeRect(164, 6, 82, h - 12);
    c.fillStyle = '#1d1f2a'; c.font = 'bold 13px Arial'; ['Propane', 'Cylinder', 'Xchange'].forEach((t, i) => c.fillText(t, 172, 18 + i * 14));
    for (const x of [254, 382]) { c.strokeRect(x, 8, 120, h - 16); c.font = 'bold 26px Arial'; c.fillText('$', x + 8, h / 2 + 1); }
  });
  const front = canvasTex(512, 720, rapidXchangeArt);
  const swisher = canvasTex(256, 768, (c, w, h) => standeeArt(c, w, h, 'FRESH'));
  const swisherBack = canvasTex(256, 768, (c, w, h) => standeeArt(c, w, h, 'RICH'));
  const mojo = canvasTex(256, 720, mojoArt);
  const thanks = canvasTex(512, 384, (c, w, h) => {
    c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f6b3a'; c.font = 'bold 104px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Thank', w / 2, 82); c.fillText('You', w / 2, 186);
    c.fillStyle = '#e8762c'; c.fillRect(0, 252, w, 14);
    c.fillStyle = '#1f6b3a'; c.fillRect(0, 266, w, h - 266);
    c.fillStyle = '#ffffff'; c.font = 'bold 66px Arial'; c.fillText('Drive Safely.', w / 2, 326);
  });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd7dadb, roughness: 0.42, metalness: 0.55 });
  return {
    steel,
    stainless: new THREE.MeshStandardMaterial({ color: 0xc9cdd0, roughness: 0.34, metalness: 0.72 }),
    mesh: new THREE.MeshStandardMaterial({
      map: perf, color: 0xffffff, roughness: 0.36, metalness: 0.7,
      transparent: false, alphaTest: perf ? 0.5 : 0, side: THREE.DoubleSide
    }),
    front: new THREE.MeshStandardMaterial({ map: front, color: front ? 0xffffff : 0x5a6ec8, roughness: 0.45, metalness: 0.1 }),
    sign: new THREE.MeshStandardMaterial({ map: header, color: header ? 0xffffff : 0xf0f0ec, roughness: 0.5 }),
    bottle: new THREE.MeshStandardMaterial({ color: 0xe8e9e6, roughness: 0.38, metalness: 0.3 }),
    cap: new THREE.MeshStandardMaterial({ color: 0x5b5f63, roughness: 0.6, metalness: 0.4 }),
    swisher: new THREE.MeshStandardMaterial({ map: swisher, color: swisher ? 0xffffff : 0x161616, roughness: 0.55 }),
    swisherBack: new THREE.MeshStandardMaterial({ map: swisherBack, color: swisherBack ? 0xffffff : 0x161616, roughness: 0.55 }),
    standeeEdge: new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.6 }),
    mojo: new THREE.MeshStandardMaterial({ map: mojo, color: mojo ? 0xffffff : 0x7b3fe4, roughness: 0.5 }),
    mojoEdge: new THREE.MeshStandardMaterial({ color: 0x6a33cc, roughness: 0.55 }),
    cup: new THREE.MeshStandardMaterial({ color: 0xf6f6f4, roughness: 0.45 }),
    thanks: new THREE.MeshStandardMaterial({ map: thanks, color: thanks ? 0xffffff : 0xf4f4f0, roughness: 0.55, side: THREE.DoubleSide }),
    post: new THREE.MeshStandardMaterial({ color: 0xa9adb0, roughness: 0.45, metalness: 0.6 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x7d6b58, roughness: 0.85 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x5f7b3b, roughness: 0.85, flatShading: true }),
    leavesWarm: new THREE.MeshStandardMaterial({ color: 0x7c7a3e, roughness: 0.85, flatShading: true }),
    shrub: new THREE.MeshStandardMaterial({ color: 0x46703a, roughness: 0.9, flatShading: true }),
    rock: new THREE.MeshStandardMaterial({ color: 0xc9c3b4, roughness: 0.95, flatShading: true }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x8a7256, roughness: 0.9 }),
    frond: new THREE.MeshStandardMaterial({ color: 0x3f7a33, roughness: 0.75, side: THREE.DoubleSide }),
    lightBase: new THREE.MeshStandardMaterial({ color: 0xbab6aa, roughness: 0.92 }),
    poleBlack: new THREE.MeshStandardMaterial({ color: 0x1e2023, roughness: 0.5, metalness: 0.45 }),
    lamp: lampMaterial || new THREE.MeshStandardMaterial({
      color: 0xfff2cf, emissive: 0xffdf9e, emissiveIntensity: 0.15, roughness: 0.3
    })
  };
}

/* ------------------------------------------------------------- sign artwork */
// RapidXchange cabinet front, redrawn after the photos (no source artwork).
function rapidXchangeArt(c, w, h) {
  const top = h * 0.56;
  const g = c.createRadialGradient(w * 0.5, top * 0.35, 20, w * 0.5, top * 0.4, w * 0.75);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#dfe6fb'); g.addColorStop(1, '#2a46b8');
  c.fillStyle = g; c.fillRect(0, 0, w, top);
  c.save(); c.globalAlpha = 0.35; c.fillStyle = '#ffffff';
  for (let i = 0; i < 14; i++) { const a = -Math.PI + i * Math.PI / 13; c.beginPath(); c.moveTo(w / 2, top * 0.3); c.lineTo(w / 2 + Math.cos(a) * w, top * 0.3 + Math.sin(a) * w); c.lineTo(w / 2 + Math.cos(a + 0.08) * w, top * 0.3 + Math.sin(a + 0.08) * w); c.fill(); }
  c.restore();
  // lower half: red into blue, with the door's perforations
  const lg = c.createLinearGradient(0, top, 0, h * 0.86); lg.addColorStop(0, '#c62a42'); lg.addColorStop(1, '#3b3f9e');
  c.fillStyle = lg; c.fillRect(0, top, w, h * 0.86 - top);
  // big X and the logo
  c.fillStyle = '#2442b4'; c.font = 'bold 230px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('X', w * 0.58, top * 0.3);
  c.fillStyle = '#5aa6ff'; c.beginPath(); c.moveTo(w * 0.58, 22); c.quadraticCurveTo(w * 0.62, 56, w * 0.58, 70); c.quadraticCurveTo(w * 0.54, 56, w * 0.58, 22); c.fill();
  c.lineJoin = 'round'; c.font = 'italic bold 66px Arial'; c.lineWidth = 9; c.strokeStyle = '#ffffff';
  c.strokeText('Rapid  change', w / 2, top * 0.32); c.fillStyle = '#d4243c'; c.fillText('Rapid  change', w / 2, top * 0.32);
  c.fillStyle = '#1d2a6e'; c.font = 'italic 18px Arial'; c.fillText('Quality and Safety to Go', w * 0.66, top * 0.42);
  c.fillStyle = '#ffffff'; c.font = 'bold 24px Arial'; c.fillText('Relax – It’s Filled with Safety!', w * 0.62, top * 0.53);
  c.fillStyle = '#d4243c'; c.beginPath(); c.roundRect ? c.roundRect(w * 0.47, top * 0.6, w * 0.4, 34, 17) : c.rect(w * 0.47, top * 0.6, w * 0.4, 34); c.fill();
  c.fillStyle = '#ffffff'; c.font = 'bold 20px Arial'; c.fillText('RapidXchange.com', w * 0.67, top * 0.6 + 18);
  c.fillStyle = '#1f3fa8'; c.fillRect(w * 0.55, top * 0.75, 30, 30); c.fillStyle = '#ffffff'; c.font = 'bold 24px Arial'; c.fillText('f', w * 0.55 + 15, top * 0.75 + 17);
  c.font = 'bold 20px Arial'; c.textAlign = 'left'; c.fillText('facebook!', w * 0.55 + 38, top * 0.75 + 17); c.textAlign = 'center';
  // mascot with a cylinder
  const mx = w * 0.27, my = top * 0.62;
  c.fillStyle = '#5a6c9a'; c.fillRect(mx - 52, my + 40, 104, 200);                 // coveralls
  c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(mx, my, 44, 0, Math.PI * 2); c.fill();  // face
  c.fillStyle = '#7d8fb8'; c.beginPath(); c.arc(mx, my - 18, 46, Math.PI, 0); c.fill(); c.fillRect(mx - 46, my - 22, 120, 14); // cap
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(mx - 14, my + 2, 8, 0, Math.PI * 2); c.arc(mx + 14, my + 2, 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#111'; c.beginPath(); c.arc(mx - 12, my + 3, 3.5, 0, Math.PI * 2); c.arc(mx + 16, my + 3, 3.5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#7a2a1a'; c.lineWidth = 4; c.beginPath(); c.arc(mx, my + 14, 18, 0.2, Math.PI - 0.2); c.stroke();
  c.fillStyle = '#d4243c'; c.font = 'bold 40px Arial'; c.fillText('Q', mx + 22, my + 110);
  c.fillStyle = '#f2f2f0'; c.beginPath(); c.roundRect ? c.roundRect(mx - 120, my + 70, 82, 110, 26) : c.rect(mx - 120, my + 70, 82, 110); c.fill();
  c.fillStyle = '#d4243c'; c.font = 'italic bold 15px Arial'; c.fillText('RapidX', mx - 79, my + 128);
  // flame drop
  const fx = w * 0.72, fy = h * 0.72;
  const fg = c.createLinearGradient(0, fy - 110, 0, fy + 80); fg.addColorStop(0, '#9fd2ff'); fg.addColorStop(1, '#1d3fae');
  c.fillStyle = fg; c.beginPath(); c.moveTo(fx, fy - 120); c.bezierCurveTo(fx + 30, fy - 60, fx + 90, fy - 10, fx + 80, fy + 30);
  c.bezierCurveTo(fx + 70, fy + 90, fx - 70, fy + 90, fx - 80, fy + 30); c.bezierCurveTo(fx - 90, fy - 10, fx - 30, fy - 60, fx, fy - 120); c.fill();
  c.fillStyle = '#ffffff'; c.font = 'italic bold 22px Arial'; c.fillText('RapidXchange', w * 0.48, h * 0.66);
  c.fillStyle = '#f6e04a'; c.save(); c.translate(w * 0.5, h * 0.76); c.rotate(Math.PI / 4); c.fillRect(-14, -14, 28, 28); c.restore();
  // perforation slots across the lower panel
  c.fillStyle = 'rgba(12,14,30,0.75)';
  for (let r = 0; r < 7; r++) for (let k = 0; k < 9; k++) {
    const x = 32 + k * 56 + (r % 2) * 28, y = top + 36 + r * 34;
    if (x > w * 0.36 && x < w * 0.62 && y < h * 0.79) continue;
    c.beginPath(); c.ellipse(x, y, 17, 6, 0, 0, Math.PI * 2); c.fill();
  }
  // bottom warning band
  c.fillStyle = '#f4f4f2'; c.fillRect(0, h * 0.86, w, h * 0.14);
  c.fillStyle = '#c8202c'; c.font = 'bold 26px Arial'; c.fillText('NO SMOKING  PROPANE FLAMMABLE', w / 2, h * 0.885);
  c.font = '13px Arial'; c.fillText('DO NOT BRING LP-GAS CYLINDERS INTO THE BUILDING', w / 2, h * 0.913);
  c.font = '24px Arial'; c.fillText('24-Hour Emergency Number:', w / 2, h * 0.945); c.fillText('(910) 592-0199', w / 2, h * 0.977);
  c.fillStyle = 'rgba(12,14,30,0.7)';
  for (const y of [h * 0.95, h * 0.982]) for (const x of [36, 80, 432, 476]) { c.beginPath(); c.ellipse(x, y, 14, 5, 0, 0, Math.PI * 2); c.fill(); }
}

// Swisher Sweets floor standee (front "FRESH", back "RICH" in the photos).
function standeeArt(c, w, h, word) {
  c.fillStyle = '#121212'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffffff'; c.fillRect(14, 14, w - 28, 150);
  c.fillStyle = '#111'; c.font = '17px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  ['WARNING:', 'This product', 'contains nicotine.', 'Nicotine is an', 'addictive chemical.'].forEach((t, i) => c.fillText(t, w / 2, 38 + i * 24));
  c.fillStyle = '#e0302a'; c.font = 'bold 76px Arial Narrow, Arial'; c.fillText(word, w / 2, 230);
  c.fillStyle = '#7a1418'; c.beginPath(); c.moveTo(w / 2 - 70, 290); c.lineTo(w / 2 + 70, 290); c.lineTo(w / 2 + 62, 350); c.lineTo(w / 2, 372); c.lineTo(w / 2 - 62, 350); c.closePath(); c.fill();
  c.fillStyle = '#f4e3c0'; c.font = 'bold 22px Arial'; c.fillText('SWISHER', w / 2, 316); c.font = 'bold 15px Arial'; c.fillText('SWEETS', w / 2, 340);
  c.fillStyle = '#ffffff'; c.font = 'bold 26px Arial'; c.fillText('ROLLED TO', w / 2, 408); c.fillText('REFRESH', w / 2, 438);
  c.fillStyle = '#d8642a'; c.fillRect(w / 2 - 72, 476, 144, 252);
  c.fillStyle = '#2a1608'; c.fillRect(w / 2 - 60, 492, 120, 220);
  c.fillStyle = '#7a1418'; c.fillRect(w / 2 - 50, 510, 100, 54);
  c.fillStyle = '#f4e3c0'; c.font = 'bold 18px Arial'; c.fillText('SWISHER', w / 2, 537);
  c.fillStyle = '#f2f2f2'; c.font = 'bold 44px Arial'; c.fillText('LEAF', w / 2, 640);
}

// MOJO energy pouch floor standee.
function mojoArt(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8a4cf0'); g.addColorStop(1, '#6a2fd6');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#2d6be8'; c.fillRect(0, 30, w, 70);
  c.fillStyle = '#ffffff'; c.font = 'bold 54px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MOJO', w / 2, 62);
  c.font = 'bold 12px Arial'; c.fillText('ENERGY POUCHES', w / 2, 92);
  c.fillStyle = '#f4f2ee'; c.fillRect(w / 2 - 70, 130, 140, 240);
  c.fillStyle = '#f08a2c'; c.fillRect(w / 2 - 54, 150, 108, 118);
  c.fillStyle = '#20202a'; c.font = 'bold 36px Arial'; c.fillText('MO', w / 2, 190); c.fillText('JO', w / 2, 228);
  c.fillStyle = '#e9e9f2'; c.fillRect(w / 2 - 46, 290, 92, 60);
  c.fillStyle = '#ffffff'; c.font = 'bold 15px Arial'; c.textAlign = 'left';
  [['#ff5a7a', 'POP INTO MOUTH.'], ['#ff8a2c', 'ENJOY FOR ABOUT'], ['#f6d32c', 'CRUSH YOUR DAY.']].forEach(([col, t], i) => {
    c.fillStyle = col; c.fillRect(26, 432 + i * 82, 22, 18); c.fillStyle = '#ffffff'; c.fillText(t, 58, 442 + i * 82);
  });
}

/* ---------------------------------------------------------------------- palm */
export function buildPalm({ height = 7, trunkMat, frondMat, seed = 1 }) {
  const g = new THREE.Group();
  g.name = 'Palm';
  // Trunk: rings of a gently leaning segmented cylinder.
  const segs = 9, r0 = 0.24, r1 = 0.15, lean = 0.36;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const y0 = t0 * height, y1 = t1 * height;
    const x0 = lean * t0 * t0, x1 = lean * t1 * t1;
    const r = r0 + (r1 - r0) * t0;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r, height / segs, 10, 1), trunkMat);
    seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    seg.rotation.z = Math.atan2(x1 - x0, y1 - y0);
    seg.castShadow = seg.receiveShadow = true;
    g.add(seg);
  }
  // Crown: long fronds arching out and down.
  const topX = lean, topY = height, frondCount = 11;
  for (let i = 0; i < frondCount; i++) {
    const a = (i / frondCount) * Math.PI * 2 + seed * 0.7;
    const len = height * (0.42 + ((i * 37) % 7) / 22);
    const droop = 0.55 + ((i * 53) % 5) / 12;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(len * 0.45, len * 0.16, len, -len * 0.28 * droop);
    shape.quadraticCurveTo(len * 0.5, len * 0.02, 0, -0.09);
    const leaf = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), frondMat);
    leaf.rotation.set(-0.12 - (i % 3) * 0.05, -a, 0, 'YXZ');
    leaf.position.set(topX, topY - 0.12 - (i % 2) * 0.16, 0);
    leaf.castShadow = true;
    g.add(leaf);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), trunkMat);
  crown.position.set(topX, topY - 0.1, 0);
  g.add(crown);
  return g;
}

/* ------------------------------------------------ grass-island streetlight */
// Owner's night photos: a square black pole on a tall round concrete base,
// with two round flat LED heads on short arms either side of the top.
export function buildGrassIslandLight({ height = 8.1, poleMat, baseMat, lensMat }) {
  const group = new THREE.Group();
  group.name = 'Car-wash-grass-island-light';
  const add = (mesh, name) => { mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh; };
  const baseH = 0.95;
  const footing = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, baseH, 24), baseMat), 'Grass-island-light-concrete-footing');
  footing.position.y = baseH / 2;
  const cover = add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.36), poleMat), 'Grass-island-light-base-cover');
  cover.position.y = baseH + 0.08;
  const shaftH = height - baseH - 0.16;
  const shaft = add(new THREE.Mesh(new THREE.BoxGeometry(0.13, shaftH, 0.13), poleMat), 'Grass-island-light-pole');
  shaft.position.y = baseH + 0.16 + shaftH / 2;
  for (const sx of [-1, 1]) {
    const arm = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), poleMat), 'Grass-island-light-arm');
    arm.position.set(sx * 0.3, height - 0.12, 0);
    const head = add(new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.08, 28), poleMat), 'Grass-island-light-head');
    head.position.set(sx * 0.78, height - 0.1, 0);
    const lens = add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.012, 28), lensMat), 'Grass-island-light-lens');
    lens.position.set(sx * 0.78, height - 0.146, 0); lens.castShadow = false;
  }
  const light = new THREE.SpotLight(0xf2f5ff, 0, 26, Math.PI / 2.6, 0.7, 1.8);
  light.name = 'Grass-island-light-source';
  light.position.set(0, height - 0.2, 0);
  light.target.position.set(0.4, 0.02, 0);
  light.castShadow = false;
  group.add(light, light.target);
  return { group, light };
}

/* ----------------------------------------------------- propane exchange cage */
// RapidXchange cabinet (owner's night photos): stainless frame and lid,
// perforated stainless sides and back, a full-height printed front door with
// a lock, the price strip across the top and the cylinders inside.
// Built centred on the origin with its front facing -Z, base at y = 0.
export function buildPropaneCabinet(width = 1.15, depth = 0.98, height = 1.72, mats) {
  const g = new THREE.Group();
  g.name = 'Propane-exchange-cabinet';
  const hw = width / 2, hd = depth / 2, legH = 0.05, headerH = 0.13, bodyTop = height - headerH;
  const add = (mesh, name) => { mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };
  const box = (name, [x0, y0, z0, x1, y1, z1], mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, name);
  };
  const steel = mats.stainless || mats.steel;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box('cage-foot', [sx * (hw - 0.06) - 0.03, 0, sz * (hd - 0.06) - 0.03, sx * (hw - 0.06) + 0.03, legH, sz * (hd - 0.06) + 0.03], steel);
    box('cage-post', [sx * hw - 0.025, legH, sz * hd - 0.025, sx * hw + 0.025, bodyTop, sz * hd + 0.025], steel);
  }
  box('cage-floor', [-hw, legH, -hd, hw, legH + 0.03, hd], steel);
  box('cage-lid', [-hw - 0.015, bodyTop, -hd - 0.015, hw + 0.015, bodyTop + 0.03, hd + 0.015], steel);
  for (const y of [legH + 0.03, bodyTop - 0.04]) box('cage-rail', [-hw, y, hd - 0.025, hw, y + 0.04, hd + 0.005], steel);
  // Perforated panels on the back and both sides.
  const panel = (name, w, h, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mats.mesh);
    m.position.set(x, y, z); m.rotation.y = ry;
    return add(m, name);
  };
  const panelH = bodyTop - legH - 0.06, panelY = legH + 0.03 + panelH / 2;
  panel('cage-mesh-back', width - 0.05, panelH, 0, panelY, hd - 0.005, 0);
  panel('cage-mesh-left', depth - 0.05, panelH, -hw + 0.005, panelY, 0, Math.PI / 2);
  panel('cage-mesh-right', depth - 0.05, panelH, hw - 0.005, panelY, 0, Math.PI / 2);
  // Printed front door, hinged on the left, lock on the right.
  box('cage-door', [-hw + 0.02, legH + 0.03, -hd - 0.02, hw - 0.02, bodyTop - 0.01, -hd + 0.005], steel);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.08, bodyTop - legH - 0.08), mats.front);
  art.name = 'cage-door-graphic'; art.rotation.y = Math.PI; art.position.set(0, (legH + 0.03 + bodyTop - 0.01) / 2, -hd - 0.022);
  art.receiveShadow = true; g.add(art);
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), steel);
  lock.name = 'cage-lock'; lock.rotation.x = Math.PI / 2; lock.position.set(hw - 0.085, bodyTop * 0.6, -hd - 0.035); g.add(lock);
  // Price strip across the top front.
  box('cage-header', [-hw - 0.015, bodyTop + 0.03, -hd - 0.015, hw + 0.015, height, -hd + 0.05], steel);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.04, headerH - 0.05), mats.sign);
  face.name = 'cage-header-sign';
  face.position.set(0, (bodyTop + 0.03 + height) / 2, -hd - 0.017);
  face.rotation.y = Math.PI;
  g.add(face);
  // Six 20 lb cylinders on the floor, seen through the perforations.
  for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
    const x = (i - 1) * (width - 0.4) / 2, z = (r - 0.5) * (depth - 0.42);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.6, 14), mats.bottle);
    b.position.set(x, legH + 0.33, z); b.castShadow = b.receiveShadow = true; g.add(b);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.11, 10), mats.cap);
    collar.position.set(x, legH + 0.69, z); g.add(collar);
  }
  return g;
}

/* --------------------------------------------- floor stands beside the cage */
// Swisher Sweets: a tall black standee; MOJO: a purple board on a white cup.
// Built with the printed face toward -Z, base at y = 0.
export function buildFloorStand(kind, mats) {
  const g = new THREE.Group();
  const add = (mesh, name, shadow = true) => { mesh.name = name; mesh.castShadow = shadow; mesh.receiveShadow = true; g.add(mesh); return mesh; };
  if (kind === 'swisher') {
    g.name = 'Swisher-Sweets-stand';
    const w = 0.34, h = 0.98, d = 0.16;
    const body = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.standeeEdge), 'Stand-body');
    body.position.y = h / 2;
    const front = add(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, h - 0.01), mats.swisher), 'Stand-face', false);
    front.rotation.y = Math.PI; front.position.set(0, h / 2, -d / 2 - 0.002);
    const back = add(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, h - 0.01), mats.swisherBack), 'Stand-face', false);
    back.position.set(0, h / 2, d / 2 + 0.002);
  } else {
    g.name = 'MOJO-stand';
    const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.13, 20), mats.cup), 'Stand-cup');
    cup.position.y = 0.065;
    const w = 0.3, h = 0.86, d = 0.1, y0 = 0.11;
    const body = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.mojoEdge), 'Stand-body');
    body.position.y = y0 + h / 2;
    const front = add(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, h - 0.01), mats.mojo), 'Stand-face', false);
    front.rotation.y = Math.PI; front.position.set(0, y0 + h / 2, -d / 2 - 0.002);
  }
  return g;
}

/* ------------------------------------------------ island tree, rocks, signs */
// Multi-stem crape myrtle with an open, irregular crown (photos).
export function buildCrapeMyrtle({ height = 4.3, mats, seed = 3 }) {
  const g = new THREE.Group();
  g.name = 'Crape-myrtle';
  const rnd = (k) => { const x = Math.sin(seed * 91.7 + k * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const stemTop = height * 0.45;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + rnd(i), lean = 0.22 + rnd(i + 5) * 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, stemTop / Math.cos(lean), 8), mats.bark);
    stem.name = 'Tree-stem';
    stem.position.set(Math.cos(a) * Math.tan(lean) * stemTop / 2, stemTop / 2, Math.sin(a) * Math.tan(lean) * stemTop / 2);
    stem.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
    stem.castShadow = true; g.add(stem);
  }
  for (let i = 0; i < 11; i++) {
    const a = i * 2.39 + rnd(i) * 0.6, r = 0.35 + rnd(i + 20) * 1.0, y = stemTop + 0.3 + rnd(i + 40) * (height - stemTop - 0.9);
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + rnd(i + 60) * 0.35, 1), i % 4 === 1 ? mats.leavesWarm : mats.leaves);
    blob.name = 'Tree-foliage';
    blob.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    blob.scale.set(1, 0.72, 1); blob.castShadow = true; blob.receiveShadow = true; g.add(blob);
  }
  return g;
}

export function buildRocks(mats, count = 5) {
  const g = new THREE.Group();
  g.name = 'Landscape-rocks';
  for (let i = 0; i < count; i++) {
    const r = 0.1 + (i % 3) * 0.05;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mats.rock);
    rock.name = 'Landscape-rock';
    rock.position.set(Math.cos(i * 1.7) * (0.4 + i * 0.08), r * 0.45, Math.sin(i * 1.7) * (0.35 + i * 0.06));
    rock.rotation.set(i, i * 0.7, i * 0.3); rock.scale.y = 0.7; rock.castShadow = true; rock.receiveShadow = true;
    g.add(rock);
  }
  return g;
}

// "Thank You / Drive Safely." sign on two posts, face toward +Z.
export function buildThankYouSign(mats) {
  const g = new THREE.Group();
  g.name = 'Thank-you-sign';
  for (const x of [-0.3, 0.3]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.32, 0.04), mats.post);
    post.name = 'Sign-post'; post.position.set(x, 0.66, -0.03); post.castShadow = true; g.add(post);
  }
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.57), mats.thanks);
  panel.name = 'Thank-you-panel'; panel.position.set(0, 1.0, 0); panel.castShadow = true; g.add(panel);
  return g;
}

// Low rounded shrub of clustered lumps, ~1.1 m tall.
export function buildShrub(mats, seed = 1) {
  const g = new THREE.Group();
  g.name = 'Wall-shrub';
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + seed, r = i ? 0.28 + (i % 3) * 0.08 : 0;
    const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 + ((i + seed) % 3) * 0.06, 1), mats.shrub);
    lump.name = 'Shrub-lump';
    lump.position.set(Math.cos(a) * r, 0.42 + (i ? (i % 2) * 0.22 : 0.4), Math.sin(a) * r);
    lump.castShadow = true; lump.receiveShadow = true; g.add(lump);
  }
  return g;
}

/* ------------------------------------------------------------ model surgery */
// Drop triangles whose three corners all lie inside one of the boxes. The
// remaining vertices are shared, so the mesh keeps its UVs and normals.
export function cutMesh(mesh, frame, boxes) {
  const g = mesh.geometry, pos = g?.attributes?.position;
  if (!pos) return 0;
  const m = new THREE.Matrix4().multiplyMatrices(frame, mesh.matrixWorld);
  if (!g.boundingBox) g.computeBoundingBox();
  const bb = g.boundingBox.clone().applyMatrix4(m);
  if (!boxes.some(b => bb.max.x >= b[0] && bb.min.x <= b[3] && bb.max.y >= b[1] && bb.min.y <= b[4] && bb.max.z >= b[2] && bb.min.z <= b[5])) return 0;
  const inside = new Uint8Array(pos.count), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m);
    for (let k = 0; k < boxes.length; k++) {
      const b = boxes[k];
      if (v.x >= b[0] && v.x <= b[3] && v.y >= b[1] && v.y <= b[4] && v.z >= b[2] && v.z <= b[5]) { inside[i] = k + 1; break; }
    }
  }
  const index = g.index ? g.index.array : null;
  const tris = (index ? index.length : pos.count) / 3, kept = [];
  let removed = 0;
  for (let t = 0; t < tris; t++) {
    const a = index ? index[t * 3] : t * 3, b = index ? index[t * 3 + 1] : t * 3 + 1, c = index ? index[t * 3 + 2] : t * 3 + 2;
    if (inside[a] && inside[a] === inside[b] && inside[a] === inside[c]) removed++;
    else kept.push(a, b, c);
  }
  if (!removed) return 0;
  const cut = new THREE.BufferGeometry(); // same vertex data, new index
  for (const [name, attr] of Object.entries(g.attributes)) cut.setAttribute(name, attr);
  cut.setIndex(kept);
  cut.boundingBox = g.boundingBox; cut.boundingSphere = g.boundingSphere;
  mesh.geometry = cut;
  return removed;
}

// True when `o` sits under one of the named ancestor groups (our own props and
// the rebuilt storefront are never cut or used as ground).
function under(o, names) {
  for (let p = o; p; p = p.parent) if (names.includes(p.name)) return true;
  return false;
}

// Height of the model's surface at a store-frame point, or null off the mesh.
export function groundHeightAt(root, toWorld, x, z, from = 6) {
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3(x, from, z).applyMatrix4(toWorld);
  ray.set(origin, new THREE.Vector3(0, -1, 0));
  ray.far = from + 4;
  const targets = [];
  root.traverse(o => {
    if (!o.isMesh || !o.visible || o.isInstancedMesh) return;
    if (/car/i.test(o.name || '') || under(o, ['Site-fixes', 'FoodMart-storefront'])) return;
    targets.push(o);
  });
  const hit = ray.intersectObjects(targets, false)[0];
  if (!hit) return null;
  return hit.point.clone().applyMatrix4(toWorld.clone().invert()).y;
}

/* ------------------------------------------------------------------- public */
// Apply every fix to the loaded glTF root. Returns a summary for the console.
export function applySiteFixes(root, { frame, lampMaterial } = {}) {
  root.updateMatrixWorld(true);
  const storeFrame = frame || new THREE.Matrix4().makeRotationY(-STOREFRONT.heading);
  // store frame -> world, for the ground raycasts; props themselves are built
  // in the store frame and turned by the group's heading below.
  const toWorld = new THREE.Matrix4().multiplyMatrices(root.matrixWorld, new THREE.Matrix4().copy(storeFrame).invert());
  const cutFrame = new THREE.Matrix4().multiplyMatrices(storeFrame, root.matrixWorld.clone().invert());
  const F = SITE_FIXES, mats = materials(lampMaterial);
  let cut = 0, hidden = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    if (F.hideMeshes.some(re => re.test(o.name || ''))) { o.visible = false; hidden++; return; }
    if (o.isInstancedMesh || /car/i.test(o.name || '')) return;
    if (under(o, ['FoodMart-storefront'])) return;
    if (F.protectedCutMaterials.includes(o.material?.name || '')) return;
    cut += cutMesh(o, cutFrame, F.cutBoxes);
  });

  const added = new THREE.Group();
  added.name = 'Site-fixes';
  added.rotation.y = STOREFRONT.heading; // built in the store frame
  root.add(added);
  root.updateMatrixWorld(true);

  const groundAt = (x, z) => {
    const y = groundHeightAt(root, toWorld, x, z);
    return Number.isFinite(y) ? y : STOREFRONT.walkY;
  };

  const palm = buildPalm({ height: F.palm.height, trunkMat: mats.trunk, frondMat: mats.frond, seed: 2 });
  palm.position.set(F.palm.at[0], groundAt(F.palm.at[0], F.palm.at[1]) - 0.05, F.palm.at[1]);
  added.add(palm);

  const islandLight = buildGrassIslandLight({ height: F.light.height, poleMat: mats.steel, baseMat: mats.lightBase, lensMat: mats.lamp });
  islandLight.group.position.set(F.light.at[0], groundAt(F.light.at[0], F.light.at[1]) - 0.02, F.light.at[1]);
  added.add(islandLight.group);

  const cage = buildPropaneCabinet(F.propane.width, F.propane.depth, F.propane.height, mats);
  cage.position.set(F.propane.at[0], groundAt(F.propane.at[0], F.propane.at[1]) - 0.02, F.propane.at[1]);
  cage.rotation.y = F.propane.rotation;
  added.add(cage);

  for (const s of F.stands) {
    const stand = buildFloorStand(s.kind, mats);
    stand.position.set(s.at[0], groundAt(s.at[0], s.at[1]) - 0.01, s.at[1]);
    stand.rotation.y = F.propane.rotation; // faces the parking, like the cabinet
    added.add(stand);
  }
  const tree = buildCrapeMyrtle({ height: F.tree.height, mats });
  tree.position.set(F.tree.at[0], groundAt(F.tree.at[0], F.tree.at[1]) - 0.05, F.tree.at[1]);
  added.add(tree);
  const rocks = buildRocks(mats);
  rocks.position.set(F.tree.at[0] + 0.2, groundAt(F.tree.at[0] + 0.2, F.tree.at[1]) - 0.02, F.tree.at[1]);
  added.add(rocks);
  const thanks = buildThankYouSign(mats);
  thanks.position.set(F.thankYou.at[0], groundAt(F.thankYou.at[0], F.thankYou.at[1]) - 0.05, F.thankYou.at[1]);
  thanks.rotation.y = F.thankYou.rotation;
  added.add(thanks);
  F.shrubs.forEach(([x, z], i) => {
    const shrub = buildShrub(mats, i + 1);
    shrub.position.set(x, groundAt(x, z) - 0.05, z);
    added.add(shrub);
  });

  root.updateMatrixWorld(true);
  return { cut, hidden, props: added.children.length, lights: [islandLight.light] };
}

/* ------------------------------------------------------- pylon sign emblems */
// The model's two price pylons have a blank light-grey cabinet face above the
// prices (front and back). Find those faces (palette cell u ~ 0.113 near each
// pylon, above the price panels) and lay the Texaco roundel over both sides:
// red disc, white star, red T, on the dark cabinet, lit at night.
export const PYLON_EMBLEM = Object.freeze({ cell: 0.113, tolerance: 0.0015, radius: 3.5, minY: 9.5, inset: 0.06, offset: 0.018 });

export function drawPylonEmblem(c, w, h) {
  c.fillStyle = '#17191c'; c.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.43;
  c.fillStyle = '#f4f4f2'; c.beginPath(); c.arc(cx, cy, R * 1.04, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d0102c'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f4f4f2'; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.4 : R * 0.93; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  c.closePath(); c.fill();
  // red T with a flared foot, outlined in black like the brand mark
  const T = () => { c.beginPath(); c.rect(cx - R * 0.3, cy - R * 0.22, R * 0.6, R * 0.13); c.rect(cx - R * 0.075, cy - R * 0.22, R * 0.15, R * 0.5);
    c.moveTo(cx - R * 0.075, cy + R * 0.24); c.lineTo(cx - R * 0.17, cy + R * 0.33); c.lineTo(cx + R * 0.17, cy + R * 0.33); c.lineTo(cx + R * 0.075, cy + R * 0.24); c.closePath(); };
  c.lineWidth = R * 0.03; c.strokeStyle = '#111'; T(); c.stroke();
  c.fillStyle = '#d0102c'; T(); c.fill();
}

// Returns the emblem meshes added (2 per pylon found). `ctex(w, h, draw)`
// makes a canvas texture; `glowMat(tex)` a time-of-day lit sign material.
export function addPylonEmblems(root, { ctex, glowMat }) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const E = PYLON_EMBLEM, centres = [PYLONS.north.trueXY, PYLONS.south.trueXY].map(([e, n]) => [e, -n]);
  const found = centres.map(() => ({ pts: [], n: new THREE.Vector3(), ref: null }));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nrm = new THREE.Vector3();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.material?.name !== 'PaletteMaterial001') return;
    const g = o.geometry, pos = g.attributes.position, uv = g.attributes.uv;
    if (!uv) return;
    const m = new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld);
    const idx = g.index ? g.index.array : null, tris = (idx ? idx.length : pos.count) / 3;
    const inCell = i => Math.abs(uv.getX(i) - E.cell) < E.tolerance;
    for (let t = 0; t < tris; t++) {
      const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
      if (!inCell(i0) || !inCell(i1) || !inCell(i2)) continue;
      a.fromBufferAttribute(pos, i0).applyMatrix4(m); b.fromBufferAttribute(pos, i1).applyMatrix4(m); c.fromBufferAttribute(pos, i2).applyMatrix4(m);
      const cy = (a.y + b.y + c.y) / 3, cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3;
      if (cy < E.minY) continue;
      const k = centres.findIndex(([x, z]) => Math.hypot(cx - x, cz - z) < E.radius);
      if (k < 0) continue;
      nrm.subVectors(b, a).cross(c.clone().sub(a));
      const area = nrm.length() / 2; if (area < 1e-4) continue; nrm.normalize();
      if (Math.abs(nrm.y) > 0.3) continue;
      const f = found[k];
      if (area > 0.05) { if (!f.ref) f.ref = nrm.clone(); f.n.addScaledVector(nrm, (nrm.dot(f.ref) < 0 ? -1 : 1) * area); }
      f.pts.push(a.clone(), b.clone(), c.clone());
    }
  });
  const added = [];
  const group = new THREE.Group(); group.name = 'Pylon-emblems'; root.add(group);
  found.forEach((f, k) => {
    if (f.pts.length < 6 || f.n.lengthSq() < 1e-6) return;
    const n = f.n.setY(0).normalize(), t = new THREE.Vector3(n.z, 0, -n.x);
    const d = f.pts.map(p => p.dot(n)), tt = f.pts.map(p => p.dot(t)), yy = f.pts.map(p => p.y);
    const [d0, d1] = [Math.min(...d), Math.max(...d)], [t0, t1] = [Math.min(...tt), Math.max(...tt)], [y0, y1] = [Math.min(...yy), Math.max(...yy)];
    const size = Math.min(t1 - t0, y1 - y0) - 2 * E.inset;
    const map = ctex(512, 512, drawPylonEmblem);
    const mat = glowMat(map);
    for (const side of [1, -1]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      plane.name = 'Pylon-Texaco-emblem';
      const dd = side > 0 ? d1 + E.offset : d0 - E.offset, tc = (t0 + t1) / 2, yc = (y0 + y1) / 2;
      plane.position.copy(n).multiplyScalar(dd).addScaledVector(t, tc).setY(yc);
      plane.lookAt(plane.position.clone().addScaledVector(n, side));
      plane.castShadow = false; plane.receiveShadow = false;
      group.add(plane); added.push(plane);
    }
  });
  return added;
}
