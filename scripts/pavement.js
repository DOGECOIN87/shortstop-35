import * as THREE from '../vendor/three.module.js';
import { STOREFRONT } from './storefront.js';

// Pavement finishes matched to the owner's night photos of the lot, walks and
// islands. The detailed Blender model paints the parking lot and forecourt
// with one flat palette colour and gives the walks, curbs and roads plain
// noise textures. After the model loads this module:
//
//   * moves the lot/forecourt concrete triangles (one palette cell of the
//     merged ground mesh) into their own mesh: smooth, warm beige-grey
//     concrete in 6 m panels with thin saw-cut joints, soft tonal patches,
//     sparse gum spots and faint oil drips (photos);
//   * gives the sidewalks tooled 1.5 m squares with a finer broom finish, the
//     curbs weathered concrete with exposed aggregate, and the roads asphalt
//     with aggregate and oil drips;
//   * maps all of them in metres in the storefront frame (box projection on
//     the curb and walk edges), so joints line up with the store.
//
// No visible repeat (owner, Nov 2026): the base textures hold only fine,
// featureless grain; the shader samples them twice at offsets chosen by a
// noise field and blends the two (texture-repetition breaking), draws the
// joints from the metre coordinates, shifts each slab's tone by a hash of
// its index, and lays stains and broad tone changes from a separate layer
// at a much larger scale (also de-tiled) and from procedural noise.
//
// Storefront frame (scripts/storefront.js): +X out of the storefront toward
// the pumps, +Z south along the front wall, Y up.
export const PAVEMENT = Object.freeze({
  // Palette cell of the lot concrete in the merged ground mesh (u = v).
  lotCell: 0.4814, cellTolerance: 0.0015,
  lotMaterial: 'PaletteMaterial001',
  walkMaterial: 'SS Walk concrete', curbMaterial: 'SS Curb concrete', asphaltMaterial: 'SS Asphalt',
  // Texture tile sizes and joint spacings in metres.
  lotTile: 5.0, lotPanel: 6.0, walkPanel: 1.5, curbTile: 1.2, asphaltTile: 4.0,
  // Joint grid origins: walk joints start at the storefront wall and the
  // north wall, so the front and north walks get transverse joints only.
  walkOrigin: Object.freeze([STOREFRONT.wallX, STOREFRONT.band.northZ]),
  lotOrigin: Object.freeze([STOREFRONT.wallX + 1.7, STOREFRONT.band.northZ]),
  // Model paint corrected from the owner's photos, by palette cell inside a
  // store-frame box [x0, z0, x1, z1]: the van-accessible stall is bare
  // concrete (its blue square is drawn by scripts/north-yard.js), and the
  // model's thin aisle stripes give way to the photo's outlined hatch.
  repaint: Object.freeze([
    Object.freeze({ cell: 0.012, box: [11.9, -17.6, 18.6, -11.0], to: 'lot' }),
    Object.freeze({ cell: 0.004, box: [11.9, -17.2, 18.6, -13.9], to: 'drop' })
  ])
});

const P = PAVEMENT;

// UV in tile units for a store-frame point and normal: top faces use plan
// coordinates (u along the store front, v out from it); edges use the long
// horizontal axis and height so curb faces are not smeared.
export function pavementUV(p, n, tile, [ox, oz] = [0, 0]) {
  if (Math.abs(n.y) >= 0.6) return [(p.z - oz) / tile, (p.x - ox) / tile];
  if (Math.abs(n.x) > Math.abs(n.z)) return [(p.z - oz) / tile, p.y / tile];
  return [(p.x - ox) / tile, p.y / tile];
}

const isLotVertex = (uv, i) => Math.abs(uv.getX(i) - P.lotCell) < P.cellTolerance && Math.abs(uv.getY(i) - P.lotCell) < P.cellTolerance;

// Move the triangles whose three corners use the lot palette cell into a new
// child mesh. Returns the new mesh (or null when the mesh has none).
// `repaint` rules (see PAVEMENT.repaint) also move ('lot') or remove ('drop')
// triangles of another cell whose centre lies in a store-frame box; they need
// `toStore` (world -> storefront frame).
export function splitLotTriangles(mesh, material, { repaint = [], toStore = null } = {}) {
  const g = mesh.geometry, uv = g?.attributes?.uv, pos = g?.attributes?.position;
  if (!uv || !pos) return null;
  const index = g.index ? g.index.array : null, tris = (index ? index.length : pos.count) / 3;
  const kept = [], moved = [];
  const m = toStore && repaint.length ? new THREE.Matrix4().multiplyMatrices(toStore, mesh.matrixWorld) : null;
  const ctr = new THREE.Vector3(), tmp = new THREE.Vector3();
  const cellOf = i => uv.getX(i);
  const rule = (a, b, c) => {
    if (!m) return null;
    const u = cellOf(a);
    const r = repaint.find(r => Math.abs(u - r.cell) < P.cellTolerance && Math.abs(cellOf(b) - r.cell) < P.cellTolerance && Math.abs(cellOf(c) - r.cell) < P.cellTolerance);
    if (!r) return null;
    ctr.set(0, 0, 0); for (const i of [a, b, c]) ctr.add(tmp.fromBufferAttribute(pos, i).applyMatrix4(m));
    ctr.divideScalar(3);
    return ctr.x >= r.box[0] && ctr.x <= r.box[2] && ctr.z >= r.box[1] && ctr.z <= r.box[3] ? r.to : null;
  };
  let dropped = 0;
  for (let t = 0; t < tris; t++) {
    const a = index ? index[t * 3] : t * 3, b = index ? index[t * 3 + 1] : t * 3 + 1, c = index ? index[t * 3 + 2] : t * 3 + 2;
    if (isLotVertex(uv, a) && isLotVertex(uv, b) && isLotVertex(uv, c)) { moved.push(a, b, c); continue; }
    const to = rule(a, b, c);
    if (to === 'lot') moved.push(a, b, c);
    else if (to === 'drop') dropped++;
    else kept.push(a, b, c);
  }
  if (dropped && !moved.length) { const rest = new THREE.BufferGeometry(); for (const [n, at] of Object.entries(g.attributes)) rest.setAttribute(n, at); rest.setIndex(kept); mesh.geometry = rest; }
  if (!moved.length) return null;
  // Compact the moved vertices into their own buffers.
  const remap = new Map(), src = [];
  const newIndex = moved.map(i => { if (!remap.has(i)) { remap.set(i, src.length); src.push(i); } return remap.get(i); });
  const out = new THREE.BufferGeometry(), v = new THREE.Vector3();
  const position = new Float32Array(src.length * 3);
  src.forEach((i, k) => { v.fromBufferAttribute(pos, i); position.set([v.x, v.y, v.z], k * 3); });
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setIndex(newIndex);
  if (g.attributes.normal) {
    const normal = new Float32Array(src.length * 3);
    src.forEach((i, k) => { v.fromBufferAttribute(g.attributes.normal, i); normal.set([v.x, v.y, v.z], k * 3); });
    out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  } else out.computeVertexNormals();
  out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(src.length * 2), 2));
  // The original keeps everything else (shared attributes, new index).
  const rest = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(g.attributes)) rest.setAttribute(name, attr);
  rest.setIndex(kept); rest.boundingBox = g.boundingBox; rest.boundingSphere = g.boundingSphere;
  mesh.geometry = rest;
  const lot = new THREE.Mesh(out, material);
  lot.name = 'Lot-concrete-paving';
  lot.receiveShadow = true; lot.castShadow = false;
  mesh.add(lot);
  return lot;
}

// Rewrite a mesh's UVs in metres/tile in the storefront frame.
export function mapToStoreFrame(mesh, toStore, tile, origin) {
  const g = mesh.geometry, pos = g.attributes.position;
  if (!g.attributes.normal) g.computeVertexNormals();
  const m = new THREE.Matrix4().multiplyMatrices(toStore, mesh.matrixWorld), nm = new THREE.Matrix3().getNormalMatrix(m);
  const uv = new Float32Array(pos.count * 2), p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(m);
    n.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(nm).normalize();
    const [u, w] = pavementUV(p, n, tile, origin);
    uv[i * 2] = u; uv[i * 2 + 1] = w;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/* ---------------------------------------------------------------- textures */
// Small seeded generator so every load draws the same pavement.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Tileable value noise in [0, 1] on a w x h grid with `cells` lattice cells.
function tileNoise(w, h, cells, rand) {
  const lat = Array.from({ length: cells * cells }, rand), out = new Float32Array(w * h);
  const at = (i, j) => lat[((j % cells) + cells) % cells * cells + ((i % cells) + cells) % cells];
  const s = t => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / w * cells, fy = y / h * cells, i = Math.floor(fx), j = Math.floor(fy), tx = s(fx - i), ty = s(fy - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * tx, b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
    out[y * w + x] = a + (b - a) * ty;
  }
  return out;
}

// Base colour plus per-pixel grain and soft mottling, written as ImageData.
function concreteBase(c, w, h, rgb, rand, { grain = 9, mottle = 10, cells = 8 } = {}) {
  const img = c.createImageData(w, h), d = img.data;
  const n1 = tileNoise(w, h, cells, rand), n2 = tileNoise(w, h, cells * 4, rand);
  for (let i = 0; i < w * h; i++) {
    const k = (n1[i] - 0.5) * mottle + (n2[i] - 0.5) * mottle * 0.5 + (rand() - 0.5) * grain;
    d[i * 4] = rgb[0] + k; d[i * 4 + 1] = rgb[1] + k; d[i * 4 + 2] = rgb[2] + k * 0.9; d[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}

// Broom finish: many faint streaks running along u (across the panel).
function broom(c, w, h, rand, count, alpha) {
  for (let i = 0; i < count; i++) {
    const y = rand() * h, x = rand() * w, len = w * (0.15 + rand() * 0.6);
    c.strokeStyle = rand() < 0.5 ? `rgba(70,66,60,${alpha * (0.5 + rand())})` : `rgba(255,255,250,${alpha * (0.4 + rand() * 0.8)})`;
    c.lineWidth = 0.6 + rand() * 0.8;
    c.beginPath(); c.moveTo(x, y);
    for (let s = 1; s <= 4; s++) c.lineTo(x + len * s / 4, y + (rand() - 0.5) * 1.2);
    c.stroke();
    if (x + len > w) { c.beginPath(); c.moveTo(x - w, y); c.lineTo(x - w + len, y); c.stroke(); } // wrap
  }
}

// Speckle of aggregate / dirt dots.
function speckle(c, w, h, rand, count, cols, rMin, rMax) {
  for (let i = 0; i < count; i++) {
    c.fillStyle = cols[Math.floor(rand() * cols.length)];
    const r = rMin + rand() * (rMax - rMin);
    c.beginPath(); c.arc(rand() * w, rand() * h, r, 0, Math.PI * 2); c.fill();
  }
}

// Soft irregular blotch: a few overlapping elliptical radial fades.
function stain(c, x, y, rx, ry, a, rand, col = '30,26,22') {
  for (let k = 0; k < 3; k++) {
    const r = rx * (0.6 + rand() * 0.5);
    c.save(); c.translate(x + (rand() - 0.5) * rx * 0.6, y + (rand() - 0.5) * ry * 0.6); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.6, `rgba(${col},${a * 0.5})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.restore();
  }
}

// Lot: 1024 px = 5 m (5 mm per pixel). Featureless trowelled slab: fine
// grain, faint smudges, sparse gum spots; joints, slab tones and stains are
// added in the shader so nothing repeats.
export function drawLotConcrete(c, w, h) {
  const rand = rng(46);
  concreteBase(c, w, h, [198, 191, 179], rand, { grain: 5, mottle: 8, cells: 4 });
  for (let k = 0; k < 14; k++) stain(c, rand() * w, rand() * h, 60 + rand() * 120, 30 + rand() * 60, 0.012 + rand() * 0.014, rand, rand() < 0.5 ? '90,82,70' : '250,246,236');
  broom(c, w, h, rand, 260, 0.01);
  speckle(c, w, h, rand, 900, ['rgba(110,102,92,0.16)', 'rgba(240,236,226,0.18)'], 0.5, 1.1);
  speckle(c, w, h, rand, 22, ['rgba(52,46,40,0.55)', 'rgba(70,62,54,0.45)'], 1.2, 2.4);
}

// Sidewalk: 512 px = 1.5 m (3 mm per pixel), finer broom finish; the tooled
// joints are drawn by the shader.
export function drawWalkConcrete(c, w, h) {
  const rand = rng(15);
  concreteBase(c, w, h, [206, 199, 187], rand, { grain: 5, mottle: 8, cells: 3 });
  broom(c, w, h, rand, 500, 0.02);
  speckle(c, w, h, rand, 400, ['rgba(105,98,88,0.2)', 'rgba(240,236,226,0.22)'], 0.5, 1.1);
  speckle(c, w, h, rand, 6, ['rgba(45,42,40,0.45)'], 1.2, 2.2);
}

// Curb: weathered concrete with exposed aggregate, 512 px = 1.2 m.
export function drawCurbConcrete(c, w, h) {
  const rand = rng(77);
  concreteBase(c, w, h, [196, 189, 176], rand, { grain: 10, mottle: 14, cells: 4 });
  speckle(c, w, h, rand, 5200, ['rgba(150,138,118,0.55)', 'rgba(110,104,96,0.5)', 'rgba(222,216,204,0.55)', 'rgba(170,160,140,0.5)', 'rgba(80,76,72,0.45)'], 0.8, 2.6);
  for (let k = 0; k < 5; k++) stain(c, rand() * w, rand() * h, 60 + rand() * 60, 30 + rand() * 30, 0.03, rand, '70,64,56');
}

// Road asphalt, 512 px = 4 m: worn aggregate, no one-off features.
export function drawAsphalt(c, w, h) {
  const rand = rng(8);
  concreteBase(c, w, h, [62, 62, 64], rand, { grain: 16, mottle: 6, cells: 5 });
  speckle(c, w, h, rand, 4200, ['rgba(140,138,134,0.45)', 'rgba(30,30,32,0.5)', 'rgba(110,106,100,0.4)'], 0.5, 1.5);
}

// Stain layer (linear multiplier, white = none), sampled at 9-17 m per tile:
// oil drips, gum clusters and soft wear patches.
export function drawStains(c, w, h) {
  const rand = rng(31);
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  for (let k = 0; k < 10; k++) stain(c, rand() * w, rand() * h, 90 + rand() * 160, 50 + rand() * 90, 0.05 + rand() * 0.05, rand, '120,112,100');
  for (let k = 0; k < 16; k++) stain(c, rand() * w, rand() * h, 22 + rand() * 50, 14 + rand() * 30, 0.12 + rand() * 0.16, rand, '60,50,40');
  for (let k = 0; k < 7; k++) { const x = rand() * w, y = rand() * h; for (let i = 0; i < 6; i++) stain(c, x + (rand() - 0.5) * 50, y + (rand() - 0.5) * 30, 6 + rand() * 10, 5 + rand() * 8, 0.3, rand, '40,34,28'); }
}

// Shader pieces shared by every pavement material (see the header).
const PV_GLSL = `
uniform float pvTile, pvJoint, pvJointW, pvJointDark, pvPanelTone, pvToneAmt, pvStain, pvStainScale;
uniform sampler2D pvStainMap;
float pvHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pvNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(pvHash(i), pvHash(i + vec2(1.0, 0.0)), f.x), mix(pvHash(i + vec2(0.0, 1.0)), pvHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Two samples at offsets picked by a noise field (m: metres), blended.
vec4 pvSample(sampler2D t, vec2 uv, vec2 m) {
#ifdef PV_GRAD
  float k = pvNoise(m * 0.23) * 7.0, ia = floor(k), f = fract(k);
  vec2 offa = sin(vec2(3.0, 7.0) * ia), offb = sin(vec2(3.0, 7.0) * (ia + 1.0));
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  vec4 a = textureGrad(t, uv + offa, dx, dy), b = textureGrad(t, uv + offb, dx, dy);
  return mix(a, b, smoothstep(0.2, 0.8, f - 0.1 * dot(a.rgb - b.rgb, vec3(1.0))));
#else
  return texture2D(t, uv);
#endif
}
// Coverage of grid lines 'spacing' apart and 'w' wide, anti-aliased and
// fading out (not shimmering) once thinner than a pixel.
float pvLine(vec2 m, float spacing, float w) {
  vec2 d = abs(fract(m / spacing + 0.5) - 0.5) * spacing;
  vec2 fw = max(fwidth(m), vec2(1e-4));
  vec2 c = clamp((0.5 * (w + fw) - d) / fw, 0.0, 1.0) * min(vec2(1.0), w / fw);
  return max(c.x, c.y);
}
`;
const PV_MAP = `
#ifdef USE_MAP
  vec2 pvM = vMapUv * pvTile;
  vec4 sampledDiffuseColor = pvSample(map, vMapUv, pvM);
  diffuseColor *= sampledDiffuseColor;
  float pvTone = 1.0 + (pvNoise(pvM / 9.0) - 0.5) * pvToneAmt + (pvNoise(pvM / 31.0 + 17.0) - 0.5) * pvToneAmt * 0.8;
  if (pvJoint > 0.0) pvTone *= 1.0 + (pvHash(floor(pvM / pvJoint) + 3.7) - 0.5) * pvPanelTone;
  diffuseColor.rgb *= pvTone;
  diffuseColor.rgb *= mix(vec3(1.0), pvSample(pvStainMap, pvM / pvStainScale, pvM * 0.55 + 40.0).rgb, pvStain);
  if (pvJoint > 0.0) diffuseColor.rgb *= 1.0 - pvJointDark * pvLine(pvM, pvJoint, pvJointW);
#endif
`;

// Materials. `canvas(w, h)` returns a 2D-capable canvas, or null in tests.
// `webgl2` enables the de-tiling (it needs textureGrad); WebGL1 samples once.
export function pavementMaterials(canvas = null, anisotropy = 8, { webgl2 = true } = {}) {
  const tex = (w, h, draw, colour = true) => {
    const cv = canvas ? canvas(w, h) : null;
    if (!cv) return null;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = anisotropy;
    t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  };
  const stains = tex(1024, 1024, drawStains, false);
  // o: { tile, joint, jointW, jointDark, panelTone, tone, stain, stainScale }
  const make = (name, draw, size, roughness, o) => {
    const map = tex(size, size, draw);
    const m = new THREE.MeshStandardMaterial({ name, map, roughness, metalness: 0, color: map ? 0xffffff : 0xc4c0b7, side: THREE.DoubleSide });
    m.userData.pavement = o;
    if (map) {
      m.extensions = { derivatives: true };
      if (webgl2) m.defines = { PV_GRAD: '' };
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, {
          pvTile: { value: o.tile }, pvJoint: { value: o.joint || 0 }, pvJointW: { value: o.jointW || 0.01 },
          pvJointDark: { value: o.jointDark || 0 }, pvPanelTone: { value: o.panelTone || 0 }, pvToneAmt: { value: o.tone },
          pvStain: { value: stains ? o.stain : 0 }, pvStainScale: { value: o.stainScale }, pvStainMap: { value: stains || map }
        });
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + PV_GLSL).replace('#include <map_fragment>', PV_MAP);
      };
      m.customProgramCacheKey = () => 'pavement-detiled-' + (webgl2 ? 2 : 1);
    }
    return m;
  };
  return {
    lot: Object.assign(make(P.lotMaterial + ' (lot concrete)', drawLotConcrete, 1024, 0.88,
      { tile: P.lotTile, joint: P.lotPanel, jointW: 0.012, jointDark: 0.42, panelTone: 0.07, tone: 0.1, stain: 0.85, stainScale: 17 }), {
      // the model's paint (stalls, hatch, accessible space) is coplanar with the
      // slab; push the slab back so the paint always wins the depth test
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 4
    }),
    walk: make(P.walkMaterial, drawWalkConcrete, 512, 0.86,
      { tile: P.walkPanel, joint: P.walkPanel, jointW: 0.014, jointDark: 0.4, panelTone: 0.05, tone: 0.07, stain: 0.35, stainScale: 9 }),
    curb: make(P.curbMaterial, drawCurbConcrete, 512, 0.92, { tile: P.curbTile, tone: 0.08, stain: 0.3, stainScale: 7 }),
    asphalt: make(P.asphaltMaterial, drawAsphalt, 512, 0.95, { tile: P.asphaltTile, tone: 0.12, stain: 0.55, stainScale: 13 })
  };
}

/* ------------------------------------------------------------------ public */
// Apply the finishes to the loaded glTF root. `toStore` maps world to the
// storefront frame (storefrontFrame() x root.matrixWorld^-1).
export function applyPavement(root, { toStore, canvas = null, skip = [], webgl2 = true } = {}) {
  root.updateMatrixWorld(true);
  const frame = toStore || new THREE.Matrix4().makeRotationY(-STOREFRONT.heading).multiply(root.matrixWorld.clone().invert());
  const mats = pavementMaterials(canvas, 8, { webgl2 });
  const stats = { lotMeshes: 0, lotTriangles: 0, walks: 0, curbs: 0, roads: 0 };
  const targets = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    for (let p = o; p; p = p.parent) if (skip.includes(p.name)) return;
    if (/car/i.test(o.name || '') && !/^car_wash/i.test(o.name || '')) return;
    targets.push(o);
  });
  for (const o of targets) {
    const name = o.material?.name || '';
    if (name === P.lotMaterial) {
      const lot = splitLotTriangles(o, mats.lot, { repaint: P.repaint, toStore: frame });
      if (!lot) continue;
      lot.updateMatrixWorld(true);
      mapToStoreFrame(lot, frame, P.lotTile, P.lotOrigin);
      stats.lotMeshes++; stats.lotTriangles += lot.geometry.index.count / 3;
    } else if (name === P.walkMaterial) {
      o.material = mats.walk; mapToStoreFrame(o, frame, P.walkPanel, P.walkOrigin); stats.walks++;
    } else if (name === P.curbMaterial) {
      o.material = mats.curb; mapToStoreFrame(o, frame, P.curbTile, [0, 0]); stats.curbs++;
    } else if (name === P.asphaltMaterial) {
      o.material = mats.asphalt; mapToStoreFrame(o, frame, P.asphaltTile, [0, 0]); stats.roads++;
    }
  }
  return stats;
}
