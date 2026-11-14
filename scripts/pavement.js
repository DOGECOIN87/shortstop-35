import * as THREE from '../vendor/three.module.js';
import { STOREFRONT } from './storefront.js';

// Pavement finishes matched to the owner's night photos of the lot, walks and
// islands. The detailed Blender model paints the parking lot and forecourt
// with one flat palette colour and gives the walks, curbs and roads plain
// noise textures. After the model loads this module:
//
//   * moves the lot/forecourt concrete triangles (one palette cell of the
//     merged ground mesh) into their own mesh: smooth, warm beige-grey
//     concrete in ~6 m panels with faint saw-cut joints, soft tonal patches,
//     sparse gum spots, faint oil drips and one spalled crack (photos);
//   * gives the sidewalks tooled 1.5 m squares with a finer broom finish, the
//     curbs weathered concrete with exposed aggregate, and the roads asphalt
//     with aggregate, sealed cracks and patches;
//   * maps all of them in metres in the storefront frame (box projection on
//     the curb and walk edges), so joints line up with the store and the
//     texture scale is the same everywhere; a large, slowly varying tone
//     layer stops the repeat from showing across the lot.
//
// Storefront frame (scripts/storefront.js): +X out of the storefront toward
// the pumps, +Z south along the front wall, Y up.
export const PAVEMENT = Object.freeze({
  // Palette cell of the lot concrete in the merged ground mesh (u = v).
  lotCell: 0.4814, cellTolerance: 0.0015,
  lotMaterial: 'PaletteMaterial001',
  walkMaterial: 'SS Walk concrete', curbMaterial: 'SS Curb concrete', asphaltMaterial: 'SS Asphalt',
  // Texture tile sizes in metres. The lot tile holds 2 x 2 saw-cut panels.
  lotPanel: 6.0, walkPanel: 1.5, curbTile: 1.2, asphaltTile: 4.0,
  // Joint grid origins: walk joints start at the storefront wall and the
  // north wall, so the front and north walks get transverse joints only.
  walkOrigin: Object.freeze([STOREFRONT.wallX, STOREFRONT.band.northZ]),
  lotOrigin: Object.freeze([STOREFRONT.wallX + 1.7, STOREFRONT.band.northZ]),
  macroScale: 0.137 // tone-variation layer repeats ~7x more slowly than the base tile
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
export function splitLotTriangles(mesh, material) {
  const g = mesh.geometry, uv = g?.attributes?.uv, pos = g?.attributes?.position;
  if (!uv || !pos) return null;
  const index = g.index ? g.index.array : null, tris = (index ? index.length : pos.count) / 3;
  const kept = [], moved = [];
  for (let t = 0; t < tris; t++) {
    const a = index ? index[t * 3] : t * 3, b = index ? index[t * 3 + 1] : t * 3 + 1, c = index ? index[t * 3 + 2] : t * 3 + 2;
    (isLotVertex(uv, a) && isLotVertex(uv, b) && isLotVertex(uv, c) ? moved : kept).push(a, b, c);
  }
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

// Saw-cut / tooled joint along the tile edges (drawn on both wrap edges).
function joints(c, w, h, every, colour, width) {
  c.fillStyle = colour;
  for (let x = 0; x <= w; x += every) { c.fillRect(x - width / 2, 0, width, h); }
  for (let y = 0; y <= h; y += every) { c.fillRect(0, y - width / 2, w, width); }
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

function crack(c, x, y, len, rand) {
  c.strokeStyle = 'rgba(60,56,50,0.55)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x, y);
  let a = rand() * Math.PI * 2;
  for (let s = 0; s < 14; s++) { a += (rand() - 0.5) * 0.9; x += Math.cos(a) * len / 14; y += Math.sin(a) * len / 14; c.lineTo(x, y); }
  c.stroke();
}

// Lot: 1024 px = 2 x 2 panels of 6 m (12 mm per pixel). The photos show a
// smooth trowelled slab, not a broom finish: soft lighter/darker patches,
// sparse dark gum spots, faint drips, thin joints and one spalled crack.
export function drawLotConcrete(c, w, h) {
  const rand = rng(46);
  concreteBase(c, w, h, [198, 191, 179], rand, { grain: 4, mottle: 18, cells: 3 });
  // slightly different pour in each panel
  [[0, 0, 0.03], [1, 0, -0.025], [0, 1, -0.012], [1, 1, 0.02]].forEach(([i, j, k]) => {
    c.fillStyle = k > 0 ? `rgba(255,252,244,${k})` : `rgba(60,52,42,${-k})`; c.fillRect(i * w / 2, j * h / 2, w / 2, h / 2);
  });
  // trowel swirls / soft smudges
  for (let k = 0; k < 18; k++) stain(c, rand() * w, rand() * h, 40 + rand() * 90, 20 + rand() * 50, 0.025 + rand() * 0.03, rand, rand() < 0.5 ? '90,82,70' : '250,246,236');
  broom(c, w, h, rand, 300, 0.012);
  speckle(c, w, h, rand, 500, ['rgba(110,102,92,0.16)', 'rgba(240,236,226,0.18)'], 0.5, 1.1);
  // sparse gum spots and small dark drips (hatch-area photo)
  speckle(c, w, h, rand, 46, ['rgba(52,46,40,0.6)', 'rgba(70,62,54,0.5)'], 1.2, 2.6);
  speckle(c, w, h, rand, 8, ['rgba(110,84,60,0.4)'], 2.5, 4);
  for (let k = 0; k < 4; k++) stain(c, rand() * w, rand() * h, 26 + rand() * 30, 16 + rand() * 18, 0.05 + rand() * 0.04, rand);
  // spalled crack wandering across one panel (storefront lot photo)
  c.save(); c.globalAlpha = 0.8; crack(c, w * 0.08, h * 0.62, 300, rand); c.restore();
  // thin saw-cut joints: a faint dark kerf, barely lighter edges
  joints(c, w, h, w / 2, 'rgba(225,220,210,0.25)', 4);
  joints(c, w, h, w / 2, 'rgba(92,86,78,0.5)', 1.6);
}

// Sidewalk: 512 px = one 1.5 m tooled square (3 mm per pixel).
export function drawWalkConcrete(c, w, h) {
  const rand = rng(15);
  concreteBase(c, w, h, [206, 199, 187], rand, { grain: 5, mottle: 12, cells: 3 });
  broom(c, w, h, rand, 500, 0.02);
  speckle(c, w, h, rand, 400, ['rgba(105,98,88,0.2)', 'rgba(240,236,226,0.22)'], 0.5, 1.1);
  speckle(c, w, h, rand, 10, ['rgba(45,42,40,0.5)'], 1.2, 2.6);
  stain(c, w * 0.62, h * 0.4, 70, 50, 0.04, rand);
  // tooled joint: rounded groove with smooth troweled margins either side
  joints(c, w, h, w, 'rgba(232,228,218,0.3)', 18);
  joints(c, w, h, w, 'rgba(120,112,100,0.45)', 5);
  joints(c, w, h, w, 'rgba(84,78,70,0.7)', 2.2);
}

// Curb: weathered concrete with exposed aggregate, 512 px = 1.2 m.
export function drawCurbConcrete(c, w, h) {
  const rand = rng(77);
  concreteBase(c, w, h, [196, 189, 176], rand, { grain: 10, mottle: 14, cells: 4 });
  speckle(c, w, h, rand, 5200, ['rgba(150,138,118,0.55)', 'rgba(110,104,96,0.5)', 'rgba(222,216,204,0.55)', 'rgba(170,160,140,0.5)', 'rgba(80,76,72,0.45)'], 0.8, 2.6);
  for (let k = 0; k < 5; k++) stain(c, rand() * w, rand() * h, 60 + rand() * 60, 30 + rand() * 30, 0.06, rand, '70,64,56');
}

// Road asphalt, 512 px = 4 m: aggregate, a sealed crack and a patch.
export function drawAsphalt(c, w, h) {
  const rand = rng(8);
  concreteBase(c, w, h, [62, 62, 64], rand, { grain: 16, mottle: 10, cells: 5 });
  speckle(c, w, h, rand, 4200, ['rgba(140,138,134,0.45)', 'rgba(30,30,32,0.5)', 'rgba(110,106,100,0.4)'], 0.5, 1.5);
  c.fillStyle = 'rgba(25,25,27,0.35)'; c.fillRect(w * 0.55, h * 0.12, w * 0.3, h * 0.22);       // patch
  c.strokeStyle = 'rgba(18,18,20,0.75)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, h * 0.7);  // sealed crack
  let x = 0, y = h * 0.7; while (x < w) { x += 18 + rand() * 20; y += (rand() - 0.5) * 18; c.lineTo(x, y); } c.stroke();
}

// Slow tone variation (linear data, centred on 0.5).
export function drawMacro(c, w, h) {
  const rand = rng(3), img = c.createImageData(w, h), d = img.data;
  const a = tileNoise(w, h, 4, rand), b = tileNoise(w, h, 11, rand);
  for (let i = 0; i < w * h; i++) {
    const v = 128 + (a[i] - 0.5) * 34 + (b[i] - 0.5) * 16;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}

// Materials. `canvas(w, h)` returns a 2D-capable canvas, or null in tests.
export function pavementMaterials(canvas = null, anisotropy = 8) {
  const tex = (w, h, draw, colour = true) => {
    const cv = canvas ? canvas(w, h) : null;
    if (!cv) return null;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = anisotropy;
    t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  };
  const macro = tex(256, 256, drawMacro, false);
  const make = (name, draw, size, roughness, bumpScale, tint = 0xffffff) => {
    const map = tex(size, size, draw);
    const m = new THREE.MeshStandardMaterial({ name, map, bumpMap: map, bumpScale, roughness, metalness: 0, color: map ? tint : 0xc4c0b7, side: THREE.DoubleSide });
    if (macro) {
      m.onBeforeCompile = sh => {
        sh.uniforms.macroMap = { value: macro };
        sh.fragmentShader = 'uniform sampler2D macroMap;\n' + sh.fragmentShader.replace('#include <map_fragment>',
          `#include <map_fragment>\n\tdiffuseColor.rgb *= texture2D( macroMap, vMapUv * ${P.macroScale.toFixed(3)} ).rgb * 2.0;`);
      };
      m.customProgramCacheKey = () => 'pavement-macro';
    }
    return m;
  };
  return {
    lot: Object.assign(make(P.lotMaterial + ' (lot concrete)', drawLotConcrete, 1024, 0.88, 0.35), {
      // the model's paint (stalls, hatch, accessible space) is coplanar with the
      // slab; push the slab back so the paint always wins the depth test
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 4
    }),
    walk: make(P.walkMaterial, drawWalkConcrete, 512, 0.86, 0.5),
    curb: make(P.curbMaterial, drawCurbConcrete, 512, 0.92, 0.9),
    asphalt: make(P.asphaltMaterial, drawAsphalt, 512, 0.95, 0.7)
  };
}

/* ------------------------------------------------------------------ public */
// Apply the finishes to the loaded glTF root. `toStore` maps world to the
// storefront frame (storefrontFrame() x root.matrixWorld^-1).
export function applyPavement(root, { toStore, canvas = null, skip = [] } = {}) {
  root.updateMatrixWorld(true);
  const frame = toStore || new THREE.Matrix4().makeRotationY(-STOREFRONT.heading).multiply(root.matrixWorld.clone().invert());
  const mats = pavementMaterials(canvas);
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
      const lot = splitLotTriangles(o, mats.lot);
      if (!lot) continue;
      lot.updateMatrixWorld(true);
      mapToStoreFrame(lot, frame, P.lotPanel * 2, P.lotOrigin);
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
