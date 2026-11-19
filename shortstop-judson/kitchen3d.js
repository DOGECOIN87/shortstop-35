// Short Stop Judson: interactive 3D model of the kitchen.
//
// Everything is built here in code, in metres, to standard equipment sizes,
// with procedural materials (brushed stainless, quarry tile, FRP wall panels,
// ceiling tile, walk-in panels). Nothing is downloaded except Three.js itself,
// which lives in ./vendor/. The layout is representative until the kitchen is
// measured from the owner's photos: edit ROOM, the item positions in
// buildKitchen() and the ITEMS text below.
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from './vendor/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from './vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/jsm/postprocessing/RenderPass.js';
import { OutputPass } from './vendor/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from './vendor/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from './vendor/jsm/postprocessing/GTAOPass.js';

const IN = 0.0254, FT = 0.3048;
// The whole store, laid out like a current-generation ~4,650 sq ft convenience
// store prototype (93 x 50 ft): back of house and restrooms at the west end; the
// kitchen with its serving counter facing the sales floor; checkout beside it by
// the front doors; coffee and fountain bar on the back wall; food islands and
// gondolas in the middle; a cold vault of glass cooler doors along the east wall;
// storefront and window seating on the south (front) side.
const BLD = { w: 93 * FT, d: 50 * FT };
const X0 = -BLD.w / 2, X1 = BLD.w / 2, Z0 = -BLD.d / 2, Z1 = BLD.d / 2;
const px = (ft) => X0 + ft * FT, pz = (ft) => Z0 + ft * FT;   // plan feet from the west / north walls
const EW = 0.2, IW = 0.12;                // exterior / interior wall thickness
const H_DECK = 4.6, H_ACT = 3.05;         // open painted deck over the sales floor; lay-in ceilings elsewhere
const ROOM = { h: H_ACT };
// Kitchen, in a local frame along its west wall: x runs south -> north along the
// line (the owner's photo, left to right from the store), z runs from the wall
// out to the store-side face of the serving counter.
const KF = { x0: -3.95, x1: 3.35, z0: 0, z1: 3.2 };
const KW = px(19) + IW / 2;               // world x of the kitchen's west wall face
const KZC = pz(6.5) + IW / 2 + KF.x1;     // world z of kitchen-local x = 0
const kxz = (lx, lz) => [KW + lz, KZC - lx];
const DOORWAY = { a: -3.9, b: -2.99, h: 2.13 };   // kitchen frame, in the west wall
const HOOD = { x0: -1.62, x1: 2.04, depth: 1.37, bottom: 1.98, top: 2.59 };
const LINE_BACK = 0.1;
const BOH = { x0: X0, x1: px(19) - IW / 2, z0: pz(20.5) + IW / 2, z1: Z1 };
const WALKIN = { x0: X0, x1: X0 + 2.83, z0: BOH.z0, z1: BOH.z0 + 3.08, h: 2.4, t: 0.1 };
WALKIN.split = WALKIN.z0 + 1.5;
const VAULT_X = px(72.6);

const ZONES = { kitchen: 'Kitchen', counter: 'Restaurant counter', back: 'Back room', store: 'The store', doors: 'Doors' };
const ITEMS = {
  hood: { zone: 'kitchen', name: 'Exhaust hood', lines: ['CaptiveAire stainless wall-canopy hood over the line', 'Grease baffle filters, vapor-proof lights and a control panel'], size: 'About 12 ft long' },
  suppression: { zone: 'kitchen', name: 'Fire suppression', lines: ['Wet-chemical system with a nozzle over each appliance', 'Agent cabinet and K-class extinguisher at the end of the line'], size: 'Covers the full hood' },
  griddle: { zone: 'kitchen', name: '36 in flattop', lines: ['Thick steel griddle plate in the middle of the line', 'Refrigerated chef base below keeps cold product at hand'], size: '36 in wide' },
  range: { zone: 'kitchen', name: 'Range burners', lines: ['Open burners for stock pots and sauté pans, beside the flattop'], size: '24 in wide' },
  fryers: { zone: 'kitchen', name: 'Fryers (2)', lines: ['Two open fryers with baskets on hangers'], size: '15½ in wide each' },
  dump: { zone: 'kitchen', name: 'Fry holding station', lines: ['Holding well with a perforated pan under a heat lamp'], size: '18 in wide' },
  hotcab: { zone: 'kitchen', name: 'Hot holding cabinet', lines: ['Heated cabinet with a glass door and digital display', 'Just past the end of the hood'], size: '26 in wide' },
  handsink1: { zone: 'kitchen', name: 'Hand sink by the line', lines: ['Wall-hung hand sink with soap and towel dispensers'], size: '17 in wide' },
  counter: { zone: 'counter', name: 'Serving counter', lines: ['Heated display wells under two-tier glass, facing the sales floor', 'Wood-look front, register at the pick-up end'], size: 'About 21 ft long' },
  menu: { zone: 'counter', name: 'Digital menu boards', lines: ['Three screens hung over the line, facing the store'], size: '3 screens' },
  signs: { zone: 'counter', name: 'Order point and sign band', lines: ['ORDER HERE and PICK-UP HERE signs', 'A sign band over the counter for your brand'], size: 'Full width of the kitchen' },
  prep: { zone: 'back', name: 'Refrigerated prep table', lines: ['Cold rail with 16 ingredient pans and a hinged lid', 'Full-length cutting board, three refrigerated doors below'], size: '72 in long' },
  dough: { zone: 'back', name: 'Dough and tortilla station', lines: ['Stainless worktable with a heated tortilla press and a 20 qt mixer'], size: '72 in long' },
  ovens: { zone: 'back', name: 'Rapid-cook ovens (2)', lines: ['High-speed ovens for pizza, sandwiches and wings in minutes', 'Ventless, on a stand'], size: 'About 27 in wide each' },
  sink3: { zone: 'back', name: '3-compartment sink', lines: ['Wash, rinse and sanitize tubs with drainboards both sides', 'Pre-rinse sprayer and a wall shelf for clean pans'], size: '90 in long' },
  mop: { zone: 'back', name: 'Mop sink', lines: ['Floor basin with hose faucet, bucket hook and mop rack'], size: '24 × 24 in' },
  handsink2: { zone: 'back', name: 'Hand sink in the back room', lines: ['By the doorway from the kitchen'], size: '17 in wide' },
  reachin: { zone: 'back', name: 'Reach-in freezer', lines: ['Two-door freezer in the back room'], size: '54 in wide' },
  ice: { zone: 'back', name: 'Ice machine', lines: ['Ice maker on a storage bin, with a water filter'], size: '30 in wide' },
  cooler: { zone: 'back', name: 'Walk-in cooler', lines: ['Shelving on both side walls, strip curtain and thermometer', 'The freezer is entered through the cooler'], size: 'About 9 × 5 ft' },
  freezer: { zone: 'back', name: 'Walk-in freezer', lines: ['Behind the cooler, with shelving on the walls'], size: 'About 9 × 5 ft' },
  dry: { zone: 'back', name: 'Dry storage', lines: ['Wire shelving for flour, canned goods and paper supplies'], size: '7 ft of shelving' },
  office: { zone: 'back', name: 'Office', lines: ['Small office with a desk and safe, off the back room'], size: 'About 9 × 6 ft' },
  checkout: { zone: 'store', name: 'Store checkout', lines: ['Registers, with a tobacco and lottery back bar', 'Beside the restaurant counter, near the front doors'], size: '12 ft counter' },
  bevbar: { zone: 'store', name: 'Coffee and fountain bar', lines: ['Coffee brewers, fountain and frozen drinks along the back wall'], size: 'About 32 ft long' },
  hotfood: { zone: 'store', name: 'Hot food island', lines: ['Self-serve hot case, roller grill and condiments'], size: 'Island' },
  coldvault: { zone: 'store', name: 'Cold vault', lines: ['Glass cooler doors along the east wall', 'Walk-in beer cave in the front corner'], size: '16 doors' },
  seating: { zone: 'store', name: 'Window seating', lines: ['Counter seating with stools along the front windows'], size: '5 seats' },
  restrooms: { zone: 'store', name: 'Restrooms', lines: ["Men's and women's restrooms off the side hallway"], size: '2 rooms' },
  entrance: { zone: 'store', name: 'Front entrance', lines: ['Double glass doors facing the fuel islands'], size: '6 ft' },
  doorway: { zone: 'doors', name: 'Doorway to the back room', lines: ['From the kitchen straight into prep, wash-up and the walk-ins'], size: '36 in' },
  backdoor: { zone: 'doors', name: 'Rear exit', lines: ['Steel exit door off the restroom hallway, for deliveries'], size: '36 in' }
};

const VIEWS = {
  overview: { label: 'Overview', pos: [15.5, 20.5, 23.5], target: [-0.8, 0, 0.6] },
  plan: { label: 'Floor plan', pos: [0, 33.5, 0.9], target: [0, 0, 0.4] },
  front: { label: 'At the counter', pos: [px(44), 1.75, pz(31)], target: [KW + 1.5, 1.95, KZC - 0.5] },
  line: { label: 'In the kitchen', pos: [KW + 2.1, 1.85, KZC - 3.0], target: [KW + 0.5, 1.0, KZC + 1.4] },
  back: { label: 'Back room', pos: [px(17.8), 2.65, pz(43.2)], target: [px(6), 0.8, pz(29)] },
  store: { label: 'Store floor', pos: [px(41), 1.75, pz(47.5)], target: [px(56), 1.3, pz(16)] },
  coolers: { label: 'Cold vault', pos: [px(70.2), 1.75, pz(4.5)], target: [VAULT_X - 0.2, 1.15, pz(40)] }
};

// Quality tier: high (desktop) gets physical materials, rounded edges, full-size
// procedural textures, ambient occlusion and 4x MSAA; low (phones) keeps it light.
let HQ = true;
const METALS = new Set();

/* ------------------------------------------------------------------ utils */

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function normalFromHeight(src, strength) {
  const w = src.width, h = src.height;
  const s = src.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h), og = out.getContext('2d'), img = og.createImageData(w, h), d = img.data;
  const H = (x, y) => s[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  og.putImageData(img, 0, 0); return out;
}


// Seeded, tileable value noise and fractal sums, for procedural PBR textures.
function makeNoise(seed) {
  const r = rng(seed), perm = new Uint16Array(512), val = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; val[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  return (x, y, px, py) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const x0 = ((xi % px) + px) % px, y0 = ((yi % py) + py) % py, x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = val[perm[perm[x0 & 255] + (y0 & 255)]], b = val[perm[perm[x1 & 255] + (y0 & 255)]];
    const c = val[perm[perm[x0 & 255] + (y1 & 255)]], d = val[perm[perm[x1 & 255] + (y1 & 255)]];
    return (a * (1 - u) + b * u) * (1 - w) + (c * (1 - u) + d * u) * w;
  };
}
function fbm(n, x, y, px, py, oct = 4) {
  let a = 0.5, f = 1, s = 0, t = 0;
  for (let o = 0; o < oct; o++) { s += a * n(x * f, y * f, px * f, py * f); t += a; a *= 0.5; f *= 2; }
  return s / t;
}
function hsl(h, s, l, out) {
  h /= 360; s /= 100; l /= 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  out[0] = f(h + 1 / 3) * 255; out[1] = f(h) * 255; out[2] = f(h - 1 / 3) * 255; return out;
}
const hash2 = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
// Three same-size canvases written pixel by pixel: colour, height (grey) and roughness (grey).
function pbrMaps(w, h, fn) {
  const make = () => { const c = canvas(w, h), g = c.getContext('2d'); return { c, g, img: g.createImageData(w, h) }; };
  const C = make(), Hh = make(), R = make(), out = { r: 0, g: 0, b: 0, h: 0, ro: 0 };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    fn(x, y, out);
    const i = (y * w + x) * 4;
    C.img.data[i] = out.r; C.img.data[i + 1] = out.g; C.img.data[i + 2] = out.b; C.img.data[i + 3] = 255;
    const hv = Math.max(0, Math.min(255, out.h * 255)), rv = Math.max(0, Math.min(255, out.ro * 255));
    Hh.img.data[i] = Hh.img.data[i + 1] = Hh.img.data[i + 2] = hv; Hh.img.data[i + 3] = 255;
    R.img.data[i] = R.img.data[i + 1] = R.img.data[i + 2] = rv; R.img.data[i + 3] = 255;
  }
  for (const m of [C, Hh, R]) m.g.putImageData(m.img, 0, 0);
  return { color: C.c, height: Hh.c, rough: R.c };
}

/* --------------------------------------------------------------- textures */

function makeTextures(aniso) {
  const TS = HQ ? 1 : 0.5;
  const T = (c, srgb = true, rep) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  };
  const X = {};

  // Brushed stainless: long grain streaks plus fine per-line scratches (roughness + normal).
  const brushed = (vertical, seed) => {
    const S = 512, n = makeNoise(seed), rr = rng(seed + 1), lines = new Float32Array(S);
    for (let i = 0; i < S; i++) lines[i] = rr();
    const m = pbrMaps(S, S, (x, y, o) => {
      const a = vertical ? y : x, b = vertical ? x : y;
      const streak = fbm(n, a / S * 5, b / S * 320, 5, 320, 3), fine = lines[b];
      o.r = o.g = o.b = 200; o.h = 0.6 * streak + 0.4 * fine * 0.5; o.ro = 0.6 + (streak - 0.5) * 0.28 + (fine - 0.5) * 0.08;
    });
    return { rough: m.rough, normal: normalFromHeight(m.height, 0.9) };
  };
  const bh = brushed(false, 3), bv = brushed(true, 7);
  X.brushH = T(bh.rough, false); X.brushV = T(bv.rough, false); X.brushNH = T(bh.normal, false); X.brushNV = T(bv.normal, false);

  // Red quarry tile, 6 in squares (one texture = 4 x 4 tiles = 24 in): fired-clay mottling,
  // specks, bevelled edges, recessed grout with grime; sealed surface (roughness map).
  {
    const S = Math.round(1024 * TS), n = 4, cell = S / n, gw = Math.max(4, Math.round(10 * TS)), bev = Math.max(3, Math.round(12 * TS));
    const nz = makeNoise(11), r = rng(12), col = [0, 0, 0];
    const tiles = []; for (let i = 0; i < n * n; i++) tiles.push({ h: 8 + r() * 8, s: 46 + r() * 14, l: 30 + r() * 8, o: r() * 50 });
    const m = pbrMaps(S, S, (x, y, o) => {
      const tx = Math.floor(x / cell), ty = Math.floor(y / cell), lx = x - tx * cell, ly = y - ty * cell;
      const e = Math.min(lx, ly, cell - 1 - lx, cell - 1 - ly) - gw / 2, t = tiles[ty * n + tx];
      const f = fbm(nz, x / S * 12 + t.o, y / S * 12, 12, 12, 4), sp = hash2(x, y);
      if (e < 0) {
        const k = 0.8 + 0.35 * f; o.r = 112 * k; o.g = 98 * k; o.b = 86 * k; o.h = 0.12 + 0.08 * f; o.ro = 0.95;
      } else {
        const k = Math.min(1, e / bev), edge = k * k * (3 - 2 * k);
        hsl(t.h + (f - 0.5) * 6, t.s, (t.l + (f - 0.5) * 9) * (0.9 + 0.1 * edge), col);
        if (sp < 0.012) { col[0] *= 0.55; col[1] *= 0.5; col[2] *= 0.5; } else if (sp > 0.992) { col[0] = Math.min(255, col[0] * 1.35); col[1] *= 1.25; col[2] *= 1.2; }
        o.r = col[0]; o.g = col[1]; o.b = col[2];
        o.h = 0.45 + 0.45 * edge + (f - 0.5) * 0.06; o.ro = 0.4 + (f - 0.5) * 0.25 + (1 - edge) * 0.2;
      }
    });
    X.tile = T(m.color, true); X.tileRough = T(m.rough, false); X.tileN = T(normalFromHeight(m.height, 2.6), false);
  }

  // Pebbled FRP wall panel and embossed walk-in skin (normal maps only).
  const bumps = (seed, count, rmax, alpha) => {
    const c = canvas(256, 256), g = c.getContext('2d'), r = rng(seed);
    g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < count; i++) {
      const v = r() < 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${alpha * (0.4 + r() * 0.6)})`;
      const x = r() * 256, y = r() * 256, rad = 0.8 + r() * rmax;
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.arc(x + ox, y + oy, rad, 0, 7); g.fill(); }
    }
    return c;
  };
  X.frpN = T(normalFromHeight(bumps(5, 2600, 2.2, 0.5), 2.2), false);
  X.stuccoN = T(normalFromHeight(bumps(9, 1400, 4.5, 0.35), 1.8), false);

  // Ceiling: 2 x 4 ft lay-in tiles with fissures and pinholes (one texture = 4 x 4 ft).
  {
    const S = Math.round(1024 * TS), c = canvas(S, S), g = c.getContext('2d'), r = rng(21);
    g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 5200 * TS * TS + 900; i++) {
      const x = r() * S, y = r() * S, a = r() * Math.PI, l = (2 + r() * 6) * TS;
      g.strokeStyle = `rgba(120,114,104,${0.25 + r() * 0.35})`; g.lineWidth = 0.8 + r() * 0.9;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l, y + Math.sin(a + 0.6) * l, x + Math.cos(a) * l * 1.6, y + Math.sin(a) * l * 1.6); g.stroke();
    }
    for (let i = 0; i < 2600 * TS * TS + 400; i++) { g.fillStyle = `rgba(105,100,92,${0.3 + r() * 0.4})`; g.fillRect(r() * S, r() * S, 1.4, 1.4); }
    const bar = Math.max(6, Math.round(12 * TS));
    for (const [x, y, w, h] of [[0, 0, S, bar], [0, 0, bar, S], [S / 2 - bar / 2, 0, bar, S]]) {
      g.fillStyle = '#e7e6e0'; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(0,0,0,.12)'; if (w > h) g.fillRect(x, y + h - 2, w, 2); else g.fillRect(x + w - 2, y, 2, h);
    }
    X.ceiling = T(c, true); X.ceilingN = T(normalFromHeight(c, 1.6), false);
  }

  // Wire shelving / basket mesh (alpha), diamond tread plate, mats.
  const grid = (S, step, lw, cross) => {
    const c = canvas(S, S), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S); g.fillStyle = '#fff';
    for (let i = 0; i < S; i += step) g.fillRect(i, 0, lw, S);
    for (let i = 0; i < S; i += cross) g.fillRect(0, i, S, lw);
    return c;
  };
  X.wireA = T(grid(256, 16, 3, 64), false);
  X.basketA = T(grid(128, 8, 2, 8), false);
  {
    const c = canvas(128, 128), g = c.getContext('2d');
    g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#e0e0e0';
    for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) {
      g.save(); g.translate(x + 8, y + 8); g.rotate(0.785); g.fillRect(-9, -2.5, 18, 5); g.restore();
      g.save(); g.translate(x + 24, y + 24); g.rotate(-0.785); g.fillRect(-9, -2.5, 18, 5); g.restore();
    }
    X.treadN = T(normalFromHeight(c, 2.5), false);
  }
  {
    const c = canvas(256, 256), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#000';
    for (let y = 16; y < 256; y += 32) for (let x = 16; x < 256; x += 32) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
    X.matA = T(c, false);
  }

  // Baffle filters, louvres.
  {
    const c = canvas(256, 64), g = c.getContext('2d');
    for (let x = 0; x < 256; x += 16) {
      const gg = g.createLinearGradient(x, 0, x + 16, 0);
      gg.addColorStop(0, '#5f6468'); gg.addColorStop(0.45, '#e6e9ec'); gg.addColorStop(0.55, '#b9bec2'); gg.addColorStop(1, '#4b4f53');
      g.fillStyle = gg; g.fillRect(x, 0, 16, 64);
    }
    X.baffle = T(c, true);
  }
  {
    const c = canvas(64, 128), g = c.getContext('2d');
    g.fillStyle = '#c9cdd0'; g.fillRect(0, 0, 64, 128);
    for (let y = 6; y < 128; y += 16) { g.fillStyle = '#1b1d1f'; g.fillRect(4, y, 56, 7); }
    X.louver = T(c, true);
  }

  // Soft contact shadow (white = dark on the floor).
  {
    const c = canvas(128, 128), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
    g.shadowColor = '#fff'; g.shadowBlur = 22; g.shadowOffsetX = 1000;
    g.fillStyle = '#fff'; g.fillRect(28 - 1000, 28, 72, 72);
    X.shadowA = T(c, false); X.shadowA.wrapS = X.shadowA.wrapT = THREE.ClampToEdgeWrapping;
  }

  // Cardboard cases with generic stencils.
  X.box = {};
  for (const [k, label, tint] of [
    ['flour', 'FLOUR', '#b98e5a'], ['produce', 'PRODUCE', '#b48553'], ['cheese', 'CHEESE', '#c39a62'],
    ['eggs', 'EGGS', '#bd915c'], ['fries', 'FRIES', '#b4895a'], ['chicken', 'CHICKEN', '#b98c57'],
    ['foil', 'FOIL', '#c0965f'], ['cups', 'CUPS', '#b78b5b'], ['napkins', 'NAPKINS', '#bb8f5e'],
    ['beans', 'BEANS', '#b3874f'], ['meat', 'MEAT', '#b88a52'], ['tortilla', 'TORTILLAS', '#bf9560']
  ]) {
    const c = canvas(256, 256), g = c.getContext('2d'), r = rng(label.length * 13);
    g.fillStyle = tint; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(70,40,15,${r() * 0.07})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1); }
    g.fillStyle = 'rgba(80,50,20,.35)'; g.fillRect(0, 122, 256, 6);
    g.fillStyle = '#2a1d12'; g.font = 'bold 40px Arial, Helvetica, sans-serif'; g.textAlign = 'center';
    g.fillText(label, 128, 84); g.font = 'bold 22px Arial, Helvetica, sans-serif'; g.fillText('KEEP DRY · THIS SIDE UP', 128, 190);
    X.box[k] = T(c, true);
  }
  {
    const c = canvas(256, 256), g = c.getContext('2d');
    g.fillStyle = '#efe9db'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#b2402c'; g.fillRect(0, 40, 256, 34);
    g.fillStyle = '#3b2a1c'; g.font = 'bold 54px Arial, Helvetica, sans-serif'; g.textAlign = 'center';
    g.fillText('FLOUR', 128, 150); g.font = 'bold 30px Arial, Helvetica, sans-serif'; g.fillText('50 LB', 128, 196);
    X.sack = T(c, true);
  }
  // Can labels
  X.cans = ['#c2412c', '#3f7a3a', '#d8a531', '#7a3b2a'].map((col, i) => {
    const c = canvas(128, 64), g = c.getContext('2d');
    g.fillStyle = col; g.fillRect(0, 0, 128, 64); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, 22, 128, 20);
    g.fillStyle = '#222'; g.font = 'bold 14px Arial'; g.textAlign = 'center'; g.fillText(['TOMATO', 'JALAPEÑO', 'CORN', 'CHILI'][i], 64, 37);
    return T(c, true);
  });
  // Store floor: light vinyl composition tile, 12 in; one texture = 4 x 4 tiles.
  {
    const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = rng(31);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const l = 86 + r() * 4; g.fillStyle = `hsl(40,8%,${l}%)`; g.fillRect(i * 128, j * 128, 128, 128);
      for (let k = 0; k < 260; k++) { g.fillStyle = r() < 0.5 ? `rgba(90,85,75,${0.08 + r() * 0.12})` : `rgba(255,255,255,${0.2 + r() * 0.3})`; g.fillRect(i * 128 + r() * 128, j * 128 + r() * 128, 1 + r() * 2, 1 + r() * 2); }
      g.fillStyle = 'rgba(120,115,105,.35)'; g.fillRect(i * 128, j * 128, 128, 1.5); g.fillRect(i * 128, j * 128, 1.5, 128);
    }
    X.vct = T(c, true);
  }
  // Sales floor: 12 x 24 in porcelain plank, half offset (one texture = 48 x 24 in):
  // stone-look veining, eased edges, polished (low roughness) with grout.
  {
    const W = Math.round(1024 * TS), Hh = W / 2, pw = W / 2, ph = Hh / 2, gw = Math.max(2, Math.round(3 * TS)), bev = Math.max(2, Math.round(5 * TS));
    const nz = makeNoise(51), r = rng(52), col = [0, 0, 0];
    const planks = []; for (let i = 0; i < 4; i++) planks.push({ l: 70 + r() * 8, o: r() * 40, v: 0.6 + r() * 0.8 });
    const m = pbrMaps(W, Hh, (x, y, o) => {
      const row = y < ph ? 0 : 1, sx = (x + (row ? pw / 2 : 0)) % W, cl = sx < pw ? 0 : 1, lx = sx - cl * pw, ly = y - row * ph;
      const e = Math.min(lx, ly, pw - 1 - lx, ph - 1 - ly) - gw / 2, p = planks[row * 2 + cl];
      if (e < 0) { o.r = 168; o.g = 162; o.b = 152; o.h = 0.2; o.ro = 0.8; return; }
      const f = fbm(nz, x / W * 6 + p.o, y / Hh * 3, 6, 3, 5), vein = Math.abs(Math.sin((x / W * 5 + f * 3.2 * p.v) * Math.PI));
      const k = Math.min(1, e / bev), edge = k * k * (3 - 2 * k);
      hsl(36, 7, p.l + (f - 0.5) * 10 - (1 - vein) * (1 - vein) * 6, col);
      o.r = col[0]; o.g = col[1]; o.b = col[2]; o.h = 0.5 + 0.4 * edge; o.ro = 0.22 + (f - 0.5) * 0.12 + (1 - edge) * 0.25;
    });
    X.plank = T(m.color, true); X.plankR = T(m.rough, false); X.plankN = T(normalFromHeight(m.height, 1.8), false);
  }
  // Soffit: patterned cement-look tile with slight relief.
  {
    const S = Math.round(512 * TS), c = canvas(S, S), g = c.getContext('2d'), k = S / 256;
    g.fillStyle = '#dcdcd7'; g.fillRect(0, 0, S, S);
    const r = rng(81); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,120,115' : '255,255,250'},${0.08 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1.5, 1.5); }
    g.strokeStyle = '#686a69'; g.lineWidth = 3 * k;
    const motif = (cx, cy) => { for (let q = 0; q < 8; q++) { const a = q * Math.PI / 4; g.beginPath(); g.ellipse(cx + Math.cos(a) * 26 * k, cy + Math.sin(a) * 26 * k, 18 * k, 7 * k, a, 0, 6.3); g.stroke(); } g.beginPath(); g.arc(cx, cy, 10 * k, 0, 6.3); g.stroke(); };
    motif(128 * k, 128 * k); for (const [x, y] of [[0, 0], [256, 0], [0, 256], [256, 256]]) motif(x * k, y * k);
    g.lineWidth = 2 * k; for (const [x, y] of [[128, 0], [0, 128], [256, 128], [128, 256]]) { g.beginPath(); g.arc(x * k, y * k, 30 * k, 0, 6.3); g.stroke(); }
    g.fillStyle = 'rgba(60,60,58,.55)'; g.fillRect(0, 0, S, 2 * k); g.fillRect(0, 0, 2 * k, S);
    X.pattern = T(c, true); X.patternN = T(normalFromHeight(c, 1.2), false);
  }
  // Open ceiling: black corrugated metal deck (ribs across v).
  {
    const nz = makeNoise(91);
    const m = pbrMaps(128, 128, (x, y, o) => {
      const t = (y % 64) / 64, rib = t < 0.18 ? 1 : t < 0.32 ? 1 - (t - 0.18) / 0.14 : t < 0.68 ? 0 : t < 0.82 ? (t - 0.68) / 0.14 : 1;
      const f = fbm(nz, x / 128 * 4, y / 128 * 4, 4, 4, 3), v = 30 + rib * 10 + (f - 0.5) * 8;
      o.r = v; o.g = v + 2; o.b = v + 4; o.h = rib; o.ro = 0.7 + (f - 0.5) * 0.2;
    });
    X.deck = T(m.color, true); X.deckN = T(normalFromHeight(m.height, 6), false);
  }
  // Dark wood-look panels (counter fronts): flat-sawn grain, plank grooves, lacquer.
  {
    const W = Math.round(1024 * TS), Hh = W / 2, rows = 8, ph = Hh / rows, nz = makeNoise(61), r = rng(62), col = [0, 0, 0];
    const pl = []; for (let i = 0; i < rows; i++) pl.push({ l: 17 + r() * 9, h: 18 + r() * 8, o: r() * 30 });
    const m = pbrMaps(W, Hh, (x, y, o) => {
      const j = Math.floor(y / ph), ly = y - j * ph, p = pl[j];
      const g1 = fbm(nz, x / W * 3 + p.o, y / Hh * 20, 3, 20, 4), ring = Math.sin((ly / ph * 3 + g1 * 9) * Math.PI);
      const groove = ly < 1.5 * TS + 0.5 ? 1 : 0;
      hsl(p.h, 34, p.l + ring * 2.5 + (g1 - 0.5) * 8 - groove * 8, col);
      o.r = col[0]; o.g = col[1]; o.b = col[2]; o.h = groove ? 0.1 : 0.6 + ring * 0.08; o.ro = 0.5 + (g1 - 0.5) * 0.2;
    });
    X.wood = T(m.color, true); X.woodN = T(normalFromHeight(m.height, 2.2), false);
  }
  // Tobacco cabinet facings.
  {
    const c = canvas(512, 256), g = c.getContext('2d'), r = rng(71);
    g.fillStyle = '#121416'; g.fillRect(0, 0, 512, 256);
    const cols = ['#c8102e', '#f2f2f2', '#1f5ea6', '#d9a531', '#2f8a4a', '#222', '#e86c1a', '#7a3d9e', '#b8b8b8'];
    for (let row = 0; row < 6; row++) { for (let i = 0; i < 26; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(6 + i * 19.4, 8 + row * 41, 15, 28); } g.fillStyle = '#e9e4d6'; g.fillRect(4, 38 + row * 41, 504, 4); }
    X.tobacco = T(c, true);
  }
  // Concrete (back-of-house and the sidewalk) and quartz counter tops.
  {
    const S = Math.round(512 * TS), nz = makeNoise(101);
    const m = pbrMaps(S, S, (x, y, o) => {
      const f = fbm(nz, x / S * 8, y / S * 8, 8, 8, 5), sp = hash2(x, y), v = 182 + (f - 0.5) * 34 + (sp < 0.02 ? -40 : sp > 0.985 ? 25 : 0);
      o.r = v; o.g = v - 3; o.b = v - 8; o.h = f; o.ro = 0.85 + (f - 0.5) * 0.2;
    });
    X.concrete = T(m.color, true); X.concreteR = T(m.rough, false);
    const q = makeNoise(111);
    const mq = pbrMaps(S, S, (x, y, o) => {
      const f = fbm(q, x / S * 4, y / S * 4, 4, 4, 5), vein = Math.max(0, 1 - Math.abs(f - 0.5) * 28), sp = hash2(x, y);
      const v = 238 - vein * 40 - (sp < 0.03 ? 18 : 0);
      o.r = v; o.g = v - 1; o.b = v - 3; o.h = 0.5; o.ro = 0.2;
    });
    X.quartz = T(mq.color, true);
  }
  // Packaging atlases for shelf products (no real brands): snacks and boxes, bottles, cans, cases.
  const WORDS = ['CRUNCH', 'ZESTY', 'SNAX', 'POPS', 'FIZZ', 'CHIPZ', 'NUTTY', 'SWEETS', 'TWIST', 'MUNCH', 'SPARK', 'GOLDEN', 'WAVES', 'BITES', 'TANGY', 'SMOKY', 'BOLD', 'CLASSIC', 'FUEGO', 'LIMON', 'BBQ', 'RANCH', 'SALTY', 'CHEDDAR', 'MINI', 'MEGA', 'JERKY', 'COOKIE', 'GUMMY', 'MINTS', 'PRETZEL', 'POPCORN'];
  const PAL = ['#d8352a', '#f2b31b', '#e86c1a', '#1f63b5', '#3c9b3c', '#7a3d9e', '#16302f', '#2b2b2b', '#e8466e', '#18a3b8', '#8a5a2b', '#f5f0e1', '#c4261c', '#0f4c81'];
  const atlas = (size, n, seed, draw) => {
    const c = canvas(size, size), g = c.getContext('2d'), t = size / n, r = rng(seed);
    for (let i = 0; i < n * n; i++) { const x = (i % n) * t, y = Math.floor(i / n) * t; g.save(); g.beginPath(); g.rect(x, y, t, t); g.clip(); g.translate(x, y); draw(g, t, i, r); g.restore(); }
    const tx = T(c, true); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; return tx;
  };
  const pick = (r) => PAL[Math.floor(r() * PAL.length)];
  X.prodAtlas = atlas(Math.round(2048 * TS), 8, 201, (g, t, i, r) => {
    const c1 = pick(r), c2 = pick(r), word = WORDS[i % WORDS.length];
    const gr = g.createLinearGradient(0, 0, t, t); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, t, t);
    const v = i % 4;
    g.globalAlpha = 0.28; g.fillStyle = '#fff';
    if (v === 0) for (let k = -t; k < t * 2; k += t / 6) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + t / 12, 0); g.lineTo(k - t + t / 12, t); g.lineTo(k - t, t); g.fill(); }
    else if (v === 1) { for (let k = 0; k < 12; k++) { g.beginPath(); g.moveTo(t / 2, t * 0.6); g.arc(t / 2, t * 0.6, t, k * 0.52, k * 0.52 + 0.26); g.fill(); } }
    else if (v === 2) { g.beginPath(); g.moveTo(0, t * 0.55); for (let k = 0; k <= 8; k++) g.quadraticCurveTo(k * t / 8 - t / 16, t * (0.45 + (k % 2) * 0.2), k * t / 8, t * 0.55); g.lineTo(t, t); g.lineTo(0, t); g.fill(); }
    else { g.beginPath(); g.moveTo(0, t); g.lineTo(t, t * 0.35); g.lineTo(t, t); g.fill(); }
    g.globalAlpha = 1;
    for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#f4d27a' : '#e8b04a'; g.beginPath(); g.ellipse(t * (0.25 + r() * 0.5), t * (0.62 + r() * 0.18), t * 0.09, t * 0.06, r() * 3, 0, 6.3); g.fill(); }
    g.fillStyle = '#fff'; rrect(g, t * 0.08, t * 0.14, t * 0.84, t * 0.26, t * 0.08); g.fill();
    g.fillStyle = c1 === '#f5f0e1' ? '#c4261c' : c1; g.font = `900 ${Math.round(t * (word.length > 6 ? 0.13 : 0.17))}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(word, t / 2, t * 0.275);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, t * 0.88, t, t * 0.12);
    g.fillStyle = '#fff'; g.font = `bold ${Math.round(t * 0.06)}px Arial, sans-serif`; g.fillText(`NET WT ${1 + (i % 9)}.${i % 10} OZ`, t / 2, t * 0.94);
    if (i % 5 === 0) { g.fillStyle = '#f2b31b'; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, rr = k % 2 ? t * 0.08 : t * 0.12; g.lineTo(t * 0.82 + Math.cos(a) * rr, t * 0.5 + Math.sin(a) * rr); } g.fill(); g.fillStyle = '#c4261c'; g.font = `900 ${Math.round(t * 0.05)}px Arial`; g.fillText('NEW', t * 0.82, t * 0.5); }
  });
  const LIQ = ['#3b1a0e', '#f28c28', '#e9e27a', '#cfe8f2', '#2e7fd6', '#c8102e', '#7ac143', '#a35f1f', '#f4f1e8', '#6a2c8a', '#1d1d1d', '#ffd23f', '#e8466e', '#5cc2ea', '#3c9b3c', '#b5651d'];
  X.bottleAtlas = atlas(Math.round(1024 * TS), 4, 301, (g, t, i, r) => {
    const liq = LIQ[i], cap = ['#ffffff', '#c4261c', '#1f63b5', '#2b2b2b', '#3c9b3c', '#f2b31b'][i % 6], lab = pick(r), word = WORDS[(i * 3) % WORDS.length];
    g.fillStyle = liq; g.fillRect(0, 0, t, t);
    g.fillStyle = cap; g.fillRect(0, 0, t, t * 0.13);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, t * 0.13, t, t * 0.03);
    const gr = g.createLinearGradient(0, t * 0.42, 0, t * 0.78); gr.addColorStop(0, lab); gr.addColorStop(1, pick(r)); g.fillStyle = gr; g.fillRect(0, t * 0.42, t, t * 0.36);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.font = `900 ${Math.round(t * 0.11)}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const k of [0.25, 0.75]) g.fillText(word, t * k, t * 0.6);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, t * 0.44, t, t * 0.02); g.fillRect(0, t * 0.74, t, t * 0.02);
  });
  X.canAtlas = atlas(Math.round(512 * TS), 4, 401, (g, t, i, r) => {
    const c1 = ['#111111', '#c4261c', '#1f63b5', '#3c9b3c', '#f2b31b', '#7a3d9e', '#e8466e', '#18a3b8', '#2b2b2b', '#e86c1a', '#0f4c81', '#16302f', '#9bd04a', '#d8352a', '#5cc2ea', '#8a5a2b'][i];
    g.fillStyle = '#c7cbcf'; g.fillRect(0, 0, t, t);
    g.fillStyle = c1; g.fillRect(0, t * 0.08, t, t * 0.84);
    g.fillStyle = pick(r); g.globalAlpha = 0.7; g.beginPath(); g.moveTo(0, t * 0.7); g.lineTo(t, t * 0.35); g.lineTo(t, t * 0.5); g.lineTo(0, t * 0.85); g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#fff'; g.font = `900 ${Math.round(t * 0.14)}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(WORDS[(i * 5 + 3) % WORDS.length].slice(0, 6), t * 0.5, t * 0.45);
  });
  X.caseAtlas = atlas(Math.round(512 * TS), 4, 501, (g, t, i, r) => {
    g.fillStyle = ['#c59a63', '#bb8f58', '#c9a26a', '#b48553'][i % 4]; g.fillRect(0, 0, t, t);
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(70,40,15,${r() * 0.08})`; g.fillRect(r() * t, r() * t, 1 + r() * 6, 1); }
    g.fillStyle = pick(r); g.fillRect(0, t * 0.12, t, t * 0.22);
    g.fillStyle = '#fff'; g.font = `900 ${Math.round(t * 0.12)}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(WORDS[(i * 7) % WORDS.length].slice(0, 7), t / 2, t * 0.23);
    g.fillStyle = '#2a1d12'; g.font = `bold ${Math.round(t * 0.1)}px Arial, sans-serif`; g.fillText(['24 CT', '12 PK', '18 PK', '6 PK'][i % 4], t / 2, t * 0.6);
    g.fillStyle = 'rgba(80,50,20,.35)'; g.fillRect(0, t * 0.48, t, 2);
  });
  return X;
}

// Atlas materials: each instance picks its tile (packaging design) from an n x n atlas.
function atlasMat(mat, n) {
  const N = n.toFixed(1), last = (n - 1).toFixed(1);
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTile;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
#ifdef USE_MAP
  { float tx = mod(aTile, ${N}); float ty = floor(aTile / ${N});
    vMapUv = (clamp(vMapUv, 0.006, 0.994) + vec2(tx, ${last} - ty)) / ${N}; }
#endif`);
  };
  mat.customProgramCacheKey = () => 'atlas' + n;
  return mat;
}

function screenTexture(w, h, draw) {
  const c = canvas(w, h), g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function signTexture(lines, { w = 512, h = 256, bg = '#fff', fg = '#1a1a1a', size = 54, bar, print = true } = {}) {
  const t = screenTexture(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (bar) { g.fillStyle = bar; g.fillRect(0, 0, w, h * 0.22); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lh = size * 1.18, top = h / 2 - (lines.length - 1) * lh / 2 + (bar ? h * 0.08 : 0);
    lines.forEach((l, i) => { g.font = `bold ${i === 0 ? size : size * 0.72}px Arial, Helvetica, sans-serif`; g.fillText(l, w / 2, top + i * lh); });
  });
  t.userData.print = print;
  return t;
}

/* -------------------------------------------------------------- materials */

function makeMaterials(X) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phys = (o) => {
    if (HQ) return new THREE.MeshPhysicalMaterial(o);
    const q = { ...o }; for (const k of ['clearcoat', 'clearcoatRoughness', 'anisotropy', 'anisotropyRotation', 'ior', 'specularIntensity']) delete q[k];
    return new THREE.MeshStandardMaterial(q);
  };
  const v2 = (a) => new THREE.Vector2(a, a);
  const M = {};
  M.steel = phys({ color: 0xd6dadd, metalness: 1, roughness: 0.62, roughnessMap: X.brushH, normalMap: X.brushNH, normalScale: v2(0.1), anisotropy: 0.5, anisotropyRotation: 0 });
  M.steelV = phys({ color: 0xd6dadd, metalness: 1, roughness: 0.62, roughnessMap: X.brushV, normalMap: X.brushNV, normalScale: v2(0.1), anisotropy: 0.5, anisotropyRotation: Math.PI / 2 });
  M.steelDark = std({ color: 0x9aa1a7, metalness: 1, roughness: 0.48 });
  M.steelIn = std({ color: 0x8e959a, metalness: 1, roughness: 0.5 });
  M.chrome = std({ color: 0xeef1f3, metalness: 1, roughness: 0.12 });
  M.alum = std({ color: 0xcfd2d4, metalness: 0.9, roughness: 0.38 });
  M.foil = std({ color: 0xe2e4e6, metalness: 1, roughness: 0.3 });
  M.plate = std({ color: 0x2f3032, metalness: 0.85, roughness: 0.3 });
  M.black = std({ color: 0x1a1c1e, roughness: 0.62 });
  M.blackGloss = std({ color: 0x0c0d0e, roughness: 0.16, metalness: 0.4 });
  M.rubber = std({ color: 0x151515, roughness: 0.95 });
  M.paintGrey = std({ color: 0x8b949a, roughness: 0.42, metalness: 0.25 });
  M.paintBlue = std({ color: 0x4b6475, roughness: 0.5, metalness: 0.3 });
  M.doorGrey = std({ color: 0x6f777c, roughness: 0.45, metalness: 0.3 });
  M.hdpe = std({ color: 0xf1f0ea, roughness: 0.5 });
  M.binWhite = std({ color: 0xe8e8e2, roughness: 0.45 });
  M.greyPlastic = std({ color: 0x5b6166, roughness: 0.72 });
  M.bluePlastic = std({ color: 0x1f5ea6, roughness: 0.6 });
  M.yellow = std({ color: 0xf0c018, roughness: 0.5 });
  M.red = std({ color: 0xc4261c, roughness: 0.42, metalness: 0.15 });
  M.green = std({ color: 0x2f8a4a, roughness: 0.5 });
  M.copper = std({ color: 0xc27a4a, metalness: 1, roughness: 0.32 });
  M.iron = std({ color: 0x35383b, metalness: 0.7, roughness: 0.55 });
  M.gasHose = std({ color: 0xd9ad1f, roughness: 0.45 });
  M.composite = std({ color: 0x9a9c98, roughness: 0.8 });
  M.wood = std({ color: 0xb98a55, roughness: 0.6 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xd4e6ec, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.8, depthWrite: false });
  M.darkGlass = std({ color: 0x0b1113, roughness: 0.06, metalness: 0.6 });
  M.curtain = std({ color: 0xd6edf1, roughness: 0.12, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  M.clear = std({ color: 0xeef6f7, roughness: 0.1, transparent: true, opacity: 0.35, depthWrite: false });
  M.water = std({ color: 0x8fbcc5, roughness: 0.02, metalness: 0.2, transparent: true, opacity: 0.55, depthWrite: false });
  M.suds = std({ color: 0xf5f7f7, roughness: 0.9 });
  M.oil = std({ color: 0xb97a1c, roughness: 0.05, emissive: 0x4a2300, emissiveIntensity: 0.7 });
  M.lamp = std({ color: 0xffffff, emissive: 0xfff1d6, emissiveIntensity: 2.4 });
  M.troffer = std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.6 });
  M.heat = std({ color: 0xff6a2a, emissive: 0xff4b12, emissiveIntensity: 2.4 });
  M.pilotRed = std({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 2 });
  M.tile = phys({ map: X.tile, roughnessMap: X.tileRough, roughness: 1, normalMap: X.tileN, normalScale: v2(1.0), clearcoat: 0.3, clearcoatRoughness: 0.35 });
  M.cove = std({ color: 0x8a4430, roughness: 0.55 });
  M.frp = std({ color: 0xf0efe8, roughness: 0.74, normalMap: X.frpN, normalScale: new THREE.Vector2(0.4, 0.4) });
  M.frpTrim = std({ color: 0xe7e5dd, roughness: 0.5 });
  M.cut = std({ color: 0x204649, roughness: 0.8 });
  M.ceiling = std({ map: X.ceiling, normalMap: X.ceilingN, normalScale: v2(0.5), roughness: 0.95 });
  M.walkin = std({ color: 0xf3f3ef, roughness: 0.45, metalness: 0.15, normalMap: X.stuccoN, normalScale: new THREE.Vector2(0.55, 0.55) });
  M.walkinTrim = std({ color: 0xc9ccce, metalness: 0.8, roughness: 0.35 });
  M.tread = std({ color: 0xc3c7ca, metalness: 0.9, roughness: 0.4, normalMap: X.treadN });
  M.wire = std({ color: 0xe8ebed, metalness: 1, roughness: 0.22, alphaMap: X.wireA, alphaTest: 0.5, side: THREE.DoubleSide });
  M.basket = std({ color: 0xdfe3e6, metalness: 1, roughness: 0.3, alphaMap: X.basketA, alphaTest: 0.5, side: THREE.DoubleSide });
  M.baffle = std({ map: X.baffle, metalness: 1, roughness: 0.42 });
  M.louver = std({ map: X.louver, metalness: 0.7, roughness: 0.45 });
  M.mat = std({ color: 0x121212, roughness: 0.95, alphaMap: X.matA, alphaTest: 0.5 });
  M.shadow = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, alphaMap: X.shadowA, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.sack = std({ map: X.sack, roughness: 0.85 });
  M.box = Object.fromEntries(Object.entries(X.box).map(([k, t]) => [k, std({ map: t, roughness: 0.85 })]));
  M.cans = X.cans.map((t) => std({ map: t, roughness: 0.45, metalness: 0.3 }));
  M.vct = std({ map: X.vct, roughness: 0.32 });
  M.drywall = std({ color: 0xf2f1ec, roughness: 0.95, normalMap: X.stuccoN, normalScale: new THREE.Vector2(0.12, 0.12) });
  M.smoke = std({ color: 0x3b3654, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.82 });
  M.plank = phys({ map: X.plank, roughnessMap: X.plankR, roughness: 1, normalMap: X.plankN, normalScale: v2(0.7), clearcoat: 0.5, clearcoatRoughness: 0.14 });
  M.pattern = std({ map: X.pattern, normalMap: X.patternN, normalScale: v2(0.45), roughness: 0.55 });
  M.deck = std({ map: X.deck, normalMap: X.deckN, normalScale: v2(1), roughness: 0.75, metalness: 0.35 });
  M.woodPanel = phys({ map: X.wood, normalMap: X.woodN, normalScale: v2(0.6), roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 });
  M.fascia = phys({ color: 0xc9351d, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  M.frosted = std({ color: 0xe6eff0, roughness: 0.3, transparent: true, opacity: 0.5, depthWrite: false });
  M.mullion = std({ color: 0x2a2c2e, metalness: 0.7, roughness: 0.4 });
  M.storeGlass = new THREE.MeshPhysicalMaterial({ color: 0xc4dade, roughness: 0.05, transparent: true, opacity: 0.2, envMapIntensity: 1.6, depthWrite: false });
  M.coolerFrame = std({ color: 0x0e1012, metalness: 0.1, roughness: 0.55, envMapIntensity: 0.3 });
  M.coolerGlow = std({ color: 0xffffff, emissive: 0xf2f8ff, emissiveIntensity: 1.8 });
  M.coolerBack = std({ color: 0xe8edf0, emissive: 0xdde8ee, emissiveIntensity: 0.4, roughness: 0.6 });
  M.ceramic = std({ color: 0xf7f7f4, roughness: 0.12, metalness: 0.05 });
  M.partition = std({ color: 0x8f989e, roughness: 0.4, metalness: 0.35 });
  M.mirror = std({ color: 0xeef3f5, metalness: 1, roughness: 0.03 });
  M.gondola = std({ color: 0xe6e7e4, roughness: 0.5, metalness: 0.3 });
  M.gondolaBack = std({ color: 0xcdd0cc, roughness: 0.6, metalness: 0.2 });
  M.quartz = phys({ map: X.quartz, roughness: 0.16, clearcoat: 0.7, clearcoatRoughness: 0.06 });
  M.blackPaint = std({ color: 0x1f2123, roughness: 0.7 });
  M.concrete = std({ map: X.concrete, roughnessMap: X.concreteR, roughness: 1 });
  M.duct = std({ color: 0x8f9497, metalness: 0.85, roughness: 0.35 });
  M.tobacco = std({ map: X.tobacco, roughness: 0.45 });
  M.desk = std({ color: 0x8a6a4a, roughness: 0.5 });
  M.inst = atlasMat(std({ map: X.prodAtlas, roughness: 0.42 }), 8);
  M.instBottle = atlasMat(phys({ map: X.bottleAtlas, roughness: 0.12, clearcoat: 0.6, clearcoatRoughness: 0.08 }), 4);
  M.instCan = atlasMat(std({ map: X.canAtlas, roughness: 0.28, metalness: 0.55 }), 4);
  M.instCase = atlasMat(std({ map: X.caseAtlas, roughness: 0.85 }), 4);
  for (const m of [M.steel, M.steelV, M.steelDark, M.steelIn, M.chrome, M.alum]) METALS.add(m);
  for (const m of [M.steel, M.steelV, M.woodPanel, M.quartz]) m.userData.tile = 0.6;
  const food = (c, r = 0.65) => std({ color: c, roughness: r });
  M.food = {
    tomato: food(0xc23a28), lettuce: food(0x63a23c), cheese: food(0xe6b433), onion: food(0xede5d3),
    jalapeno: food(0x3f7b2f), beans: food(0x6a3d28), potato: food(0xe7cc78), chorizo: food(0x9a3923),
    bacon: food(0xa65038), rice: food(0xf0e7cf), salsa: food(0x7c9b3a), pico: food(0xd65244),
    cream: food(0xf6f2e8), guac: food(0x8eaf48), meat: food(0x6b4430), peppers: food(0xc9562e),
    tortilla: food(0xead7a6, 0.8), shell: std({ color: 0xe0c48a, roughness: 0.8, side: THREE.DoubleSide }), tortillaToast: food(0xd8b06c, 0.8), dough: food(0xf2ead9, 0.85),
    fries: food(0xe1ae45, 0.7), lettuceHead: food(0x7cb04a, 0.7), egg: food(0xf3eee2, 0.5)
  };
  return M;
}

/* --------------------------------------------------------- geometry help */

function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
// Box with its bottom at y, centred on x and z.
function boxUV(geo, w, h, d, s) {
  const n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const fu = ay >= ax && ay >= az ? w : ax >= az ? d : w, fv = ay >= ax && ay >= az ? d : h;
    uv.setXY(i, uv.getX(i) * fu / s, uv.getY(i) * fv / s);
  }
  return geo;
}
function B(p, mat, w, h, d, x = 0, y = 0, z = 0) {
  const m0 = Math.min(w, h, d);
  const geo = HQ && METALS.has(mat) && m0 > 0.012 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(0.005, m0 * 0.3)) : new THREE.BoxGeometry(w, h, d);
  if (mat.userData && mat.userData.tile) boxUV(geo, w, h, d, mat.userData.tile);
  return addMesh(p, geo, mat, x, y + h / 2, z);
}
// Vertical cylinder with its bottom at y.
function C(p, mat, rt, rb, h, x = 0, y = 0, z = 0, seg = 16) { return addMesh(p, new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y + h / 2, z); }
// Horizontal bar along x, centred at (x, y, z).
function barX(p, mat, len, r, x, y, z, seg = 10) { return addMesh(p, new THREE.CylinderGeometry(r, r, len, seg), mat, x, y, z, 0, 0, Math.PI / 2); }
function barZ(p, mat, len, r, x, y, z, seg = 10) { return addMesh(p, new THREE.CylinderGeometry(r, r, len, seg), mat, x, y, z, Math.PI / 2, 0, 0); }
function tube(p, mat, pts, r, seg = 24) {
  const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
  return addMesh(p, new THREE.TubeGeometry(curve, seg, r, 8, false), mat);
}
function plane(p, mat, w, h, x, y, z, rx = 0, ry = 0) { const m = addMesh(p, new THREE.PlaneGeometry(w, h), mat, x, y, z, rx, ry); m.castShadow = false; return m; }
function scaleUV(geo, sx, sy) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); return geo; }
// World-space box projection UVs (metres / scale), for tiled wall, floor and panel textures.
function worldUV(geo, scale) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / scale, p.getZ(i) / scale);
    else if (ax >= az) uv.setXY(i, p.getZ(i) / scale, p.getY(i) / scale);
    else uv.setXY(i, p.getX(i) / scale, p.getY(i) / scale);
  }
  return geo;
}
function worldBox(p, mat, x0, x1, y0, y1, z0, z1, scale) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  if (scale) worldUV(g, scale);
  return addMesh(p, g, mat);
}
function legs(p, M, w, d, h, inset = 0.035, r = 0.019) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (w / 2 - inset), z = sz * (d / 2 - inset);
    C(p, M.steelDark, r, r, h - 0.03, x, 0.03, z, 10);
    C(p, M.steelDark, r * 1.6, r * 1.2, 0.03, x, 0, z, 10);
  }
}
function casters(p, M, w, d, inset = 0.06) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (w / 2 - inset), z = sz * (d / 2 - inset);
    B(p, M.steelDark, 0.05, 0.05, 0.05, x, 0.08, z);
    addMesh(p, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), M.rubber, x, 0.045, z, 0, 0, Math.PI / 2);
  }
}
function knob(p, M, x, y, z) {
  addMesh(p, new THREE.CylinderGeometry(0.022, 0.026, 0.03, 16), M.black, x, y, z + 0.015, Math.PI / 2, 0, 0);
  B(p, M.chrome, 0.006, 0.03, 0.004, x, y - 0.015, z + 0.031);
}
function handleBar(p, M, len, x, y, z) {
  barX(p, M.chrome, len, 0.009, x, y, z + 0.035);
  for (const s of [-1, 1]) barZ(p, M.chrome, 0.035, 0.007, x + s * (len / 2 - 0.02), y, z + 0.017);
}
function vHandle(p, M, len, x, y, z) {
  addMesh(p, new THREE.CylinderGeometry(0.01, 0.01, len, 10), M.chrome, x, y, z + 0.04);
  for (const s of [-1, 1]) barZ(p, M.chrome, 0.04, 0.008, x, y + s * (len / 2 - 0.03), z + 0.02);
}
function screen(p, tex, w, h, x, y, z, ry = 0) {
  const mat = tex.userData.print ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }) : new THREE.MeshBasicMaterial({ map: tex });
  const m = addMesh(p, new THREE.PlaneGeometry(w, h), mat, x, y, z, 0, ry);
  m.castShadow = false; return m;
}

/* --------------------------------------------------------------- equipment */
// Each builder returns a group with its origin on the floor at the centre of
// its footprint, front facing +z.

function fryBasket(p, M, x, y, z, tilt = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = tilt; p.add(g);
  const w = 0.15, d = 0.28, h = 0.13;
  plane(g, M.basket, w, d, 0, 0.002, 0, -Math.PI / 2);
  plane(g, M.basket, w, h, 0, h / 2, d / 2, 0); plane(g, M.basket, w, h, 0, h / 2, -d / 2, 0);
  plane(g, M.basket, d, h, w / 2, h / 2, 0, 0, Math.PI / 2); plane(g, M.basket, d, h, -w / 2, h / 2, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) { barX(g, M.chrome, w, 0.004, 0, h, s * d / 2); barZ(g, M.chrome, d, 0.004, s * w / 2, h, 0); }
  tube(g, M.chrome, [[0, h, d / 2], [0, h + 0.04, d / 2 + 0.06], [0, h + 0.07, d / 2 + 0.17]], 0.006, 8);
  addMesh(g, new THREE.CylinderGeometry(0.014, 0.014, 0.12, 10), M.black, 0, h + 0.085, d / 2 + 0.22, Math.PI / 2 - 0.25, 0, 0);
  return g;
}

function fryer(M) {
  const g = new THREE.Group(), W = 15.5 * IN, D = 30.5 * IN;
  legs(g, M, W, D, 0.15);
  B(g, M.steel, W, 0.72, D - 0.03, 0, 0.15, -0.015);
  B(g, M.steelV, W - 0.014, 0.5, 0.012, 0, 0.17, D / 2 - 0.01);
  handleBar(g, M, W - 0.12, 0, 0.6, D / 2 - 0.004);
  B(g, M.blackGloss, W - 0.03, 0.13, 0.012, 0, 0.705, D / 2 - 0.008);
  screen(g, screenTexture(128, 48, (c) => { c.fillStyle = '#060606'; c.fillRect(0, 0, 128, 48); c.fillStyle = '#ff3a1c'; c.font = 'bold 28px monospace'; c.textAlign = 'center'; c.fillText('350°', 64, 34); }), 0.11, 0.04, 0, 0.78, D / 2 + 0.0005);
  for (const s of [-1, 1]) C(g, M.green, 0.008, 0.008, 0.004, s * 0.11, 0.73, D / 2 - 0.0, 8).rotation.x = Math.PI / 2;
  B(g, M.steel, W, 0.025, D, 0, 0.865, 0);
  B(g, M.black, W - 0.06, 0.006, 0.42, 0, 0.887, 0.05);
  B(g, M.oil, W - 0.075, 0.004, 0.39, 0, 0.889, 0.05);
  fryBasket(g, M, -W / 4 + 0.01, 0.84, 0.0);
  fryBasket(g, M, W / 4 - 0.01, 0.98, -0.12, -0.35);
  B(g, M.steel, W, 0.32, 0.13, 0, 0.89, -D / 2 + 0.065);
  B(g, M.louver, W - 0.04, 0.006, 0.1, 0, 1.21, -D / 2 + 0.065);
  barX(g, M.chrome, W - 0.01, 0.006, 0, 1.12, -D / 2 + 0.14);
  return g;
}

function dumpStation(M, r) {
  const g = new THREE.Group(), W = 18 * IN, D = 30.5 * IN;
  legs(g, M, W, D, 0.15);
  B(g, M.steel, W, 0.72, D - 0.03, 0, 0.15, -0.015);
  B(g, M.steelV, W - 0.014, 0.6, 0.012, 0, 0.17, D / 2 - 0.01);
  handleBar(g, M, W - 0.14, 0, 0.72, D / 2 - 0.004);
  B(g, M.steel, W, 0.03, D, 0, 0.865, 0);
  B(g, M.steelIn, W - 0.07, 0.004, 0.5, 0, 0.893, 0.02);
  for (let i = 0; i < 70; i++) {
    const m = B(g, M.food.fries, 0.009, 0.009, 0.07 + r() * 0.03, (r() - 0.5) * (W - 0.12), 0.897 + r() * 0.03, 0.02 + (r() - 0.5) * 0.42);
    m.rotation.set(r() * 0.4, r() * Math.PI, r() * 0.4);
  }
  for (const s of [-1, 1]) C(g, M.chrome, 0.012, 0.012, 0.6, s * (W / 2 - 0.03), 0.895, -D / 2 + 0.05, 10);
  B(g, M.steel, W - 0.02, 0.06, 0.16, 0, 1.47, -D / 2 + 0.11);
  B(g, M.heat, W - 0.07, 0.006, 0.1, 0, 1.465, -D / 2 + 0.12);
  B(g, M.chrome, 0.1, 0.02, 0.16, -0.08, 0.9, 0.3).rotation.y = 0.4;
  B(g, M.steel, W, 0.2, 0.025, 0, 0.895, -D / 2 + 0.012);
  // squeeze bottles
  C(g, M.red, 0.025, 0.025, 0.16, 0.12, 0.895, -0.22); C(g, M.yellow, 0.025, 0.025, 0.16, 0.06, 0.895, -0.22);
  C(g, M.red, 0.004, 0.012, 0.03, 0.12, 1.055, -0.22, 8); C(g, M.yellow, 0.004, 0.012, 0.03, 0.06, 1.055, -0.22, 8);
  return g;
}

function griddleTop(g, M, W, y, r, food) {
  const D = 30 * IN;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) C(g, M.steelDark, 0.016, 0.016, 0.1, sx * (W / 2 - 0.05), y, sz * (D / 2 - 0.08), 10);
  B(g, M.steel, W, 0.22, D - 0.04, 0, y + 0.1, -0.02);
  B(g, M.steelV, W, 0.16, 0.01, 0, y + 0.12, D / 2 - 0.035);
  const n = Math.round(W / 0.23);
  for (let i = 0; i < n; i++) knob(g, M, -W / 2 + (i + 0.5) * W / n, y + 0.2, D / 2 - 0.03);
  B(g, M.plate, W - 0.02, 0.025, D - 0.12, 0, y + 0.32, -0.04);
  B(g, M.steel, W, 0.03, 0.05, 0, y + 0.3, D / 2 - 0.06);
  B(g, M.steelIn, W - 0.04, 0.006, 0.03, 0, y + 0.325, D / 2 - 0.06);
  B(g, M.steel, W, 0.22, 0.012, 0, y + 0.345, -D / 2 + 0.05);
  for (const s of [-1, 1]) {
    const side = new THREE.Shape(); side.moveTo(0, 0); side.lineTo(D - 0.12, 0); side.lineTo(D - 0.12, 0.05); side.lineTo(0, 0.22); side.closePath();
    const geo = new THREE.ExtrudeGeometry(side, { depth: 0.008, bevelEnabled: false });
    addMesh(g, geo, M.steel, s * (W / 2 - 0.004) - 0.004, y + 0.345, -D / 2 + 0.05, 0, -Math.PI / 2, 0);
  }
  if (food) food(g, y + 0.345);
}

function chefBase(g, M, W) {
  const D = 32 * IN;
  casters(g, M, W, D);
  B(g, M.steel, W, 0.53, D, 0, 0.13, 0);
  for (const s of [-1, 1]) {
    B(g, M.steelV, W / 2 - 0.02, 0.23, 0.014, s * W / 4, 0.38, D / 2);
    handleBar(g, M, W / 2 - 0.16, s * W / 4, 0.57, D / 2 + 0.004);
  }
  B(g, M.louver, W - 0.04, 0.09, 0.006, 0, 0.17, D / 2 + 0.004);
  B(g, M.steel, W + 0.02, 0.035, D + 0.02, 0, 0.66, 0);
}

function griddle36(M, r) {
  const g = new THREE.Group(), W = 36 * IN;
  chefBase(g, M, W);
  griddleTop(g, M, W, 0.695, r, (q, y) => {
    for (const [x, z, k] of [[-0.24, 0.04, 'tortillaToast'], [-0.02, 0.0, 'tortilla'], [0.22, 0.06, 'tortillaToast']]) C(q, M.food[k], 0.1, 0.1, 0.004, x, y, z, 24);
    for (let i = 0; i < 26; i++) B(q, M.food.onion, 0.02, 0.008, 0.012, 0.18 + (r() - 0.5) * 0.16, y, -0.18 + (r() - 0.5) * 0.1).rotation.y = r() * 3;
    for (let i = 0; i < 18; i++) B(q, M.food.chorizo, 0.03, 0.012, 0.03, -0.2 + (r() - 0.5) * 0.16, y, -0.2 + (r() - 0.5) * 0.1).rotation.y = r() * 3;
    B(q, M.chrome, 0.1, 0.003, 0.12, 0.02, y + 0.002, 0.2).rotation.y = 0.3;
    addMesh(q, new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), M.black, 0.06, y + 0.012, 0.31, Math.PI / 2, 0.3, 0);
  });
  return g;
}

function rapidOven(g, M, x, y) {
  const W = 26.8 * IN, D = 30.4 * IN, H = 23.2 * IN;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) C(g, M.black, 0.02, 0.02, 0.03, x + sx * (W / 2 - 0.05), y, sz * (D / 2 - 0.06), 10);
  B(g, M.steel, W, H - 0.03, D, x, y + 0.03, 0);
  B(g, M.black, W, 0.08, 0.02, x, y + H - 0.08, D / 2);
  B(g, M.steelV, W - 0.19, H - 0.17, 0.02, x - 0.08, y + 0.06, D / 2 + 0.005);
  handleBar(g, M, W - 0.3, x - 0.08, y + H - 0.17, D / 2 + 0.01);
  B(g, M.blackGloss, 0.15, H - 0.17, 0.016, x + W / 2 - 0.085, y + 0.06, D / 2 + 0.003);
  screen(g, screenTexture(128, 160, (c) => {
    c.fillStyle = '#081013'; c.fillRect(0, 0, 128, 160);
    const cols = ['#e93f24', '#eebe54', '#3bb3a0', '#4b8fd6', '#e9e4d6', '#3bb3a0'];
    for (let i = 0; i < 6; i++) { c.fillStyle = cols[i]; rrect(c, 10 + (i % 2) * 58, 30 + Math.floor(i / 2) * 40, 50, 32, 5); c.fill(); }
    c.fillStyle = '#e9e4d6'; c.font = 'bold 15px Arial'; c.fillText('PIZZA  2:00', 12, 20);
  }), 0.1, 0.13, x + W / 2 - 0.085, y + 0.25, D / 2 + 0.012);
  B(g, M.louver, W - 0.1, 0.006, D - 0.25, x, y + H, -0.05);
}

function ovens(M) {
  const g = new THREE.Group(), W = 60 * IN, D = 30 * IN, H = 24 * IN;
  legs(g, M, W, D, H);
  B(g, M.steel, W, 0.04, D, 0, H - 0.04, 0);
  B(g, M.steel, W - 0.07, 0.02, D - 0.07, 0, 0.18, 0);
  for (let i = 0; i < 6; i++) B(g, M.alum, 0.46, 0.022, 0.33, -0.4 + (i % 2) * 0.1, 0.2 + Math.floor(i / 2) * 0.03, 0.03);
  B(g, M.wood, 0.36, 0.012, 0.36, 0.42, 0.2, 0.02);
  rapidOven(g, M, -W / 4 - 0.01, H);
  rapidOven(g, M, W / 4 + 0.01, H);
  // pizza peel hanging on the stand
  B(g, M.alum, 0.3, 0.3, 0.004, W / 2 + 0.004, 0.18, 0.15).rotation.y = Math.PI / 2;
  addMesh(g, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), M.black, W / 2 + 0.006, 0.5, 0.15);
  return g;
}

function hood(M) {
  const g = new THREE.Group(), L = HOOD.x1 - HOOD.x0, D = HOOD.depth, yb = HOOD.bottom, yt = HOOD.top, H = yt - yb;
  B(g, M.steel, L, 0.02, D, 0, yt - 0.02, D / 2);
  B(g, M.steelV, L, H, 0.025, 0, yb, D - 0.0125);
  B(g, M.steel, L, 0.05, 0.1, 0, yb, D - 0.07);
  for (const x of [-L / 2 + 0.0125, L / 2 - 0.0125]) B(g, M.steel, 0.025, H, D, x, yb, D / 2);
  B(g, M.steelV, L, ROOM.h - yt, 0.02, 0, yt, D - 0.03);
  for (const x of [-L / 2 + 0.01, L / 2 - 0.01]) B(g, M.steelV, 0.02, ROOM.h - yt, D, x, yt, D / 2);
  const bank = addMesh(g, scaleUV(new THREE.PlaneGeometry(L - 0.1, 0.55), (L - 0.1) / 0.5, 1), M.baffle, 0, yt - 0.27, 0.3, Math.PI / 4 + 0.2, 0, 0);
  bank.castShadow = false;
  B(g, M.steelIn, L - 0.06, 0.02, D - 0.5, 0, yt - 0.04, 0.25 + (D - 0.5) / 2);
  B(g, M.steelIn, L - 0.06, 0.05, 0.08, 0, yt - 0.56, 0.5);
  C(g, M.steelIn, 0.04, 0.035, 0.08, L / 2 - 0.12, yt - 0.64, 0.5, 12);
  const n = 3;
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * L / n;
    C(g, M.steelIn, 0.07, 0.07, 0.03, x, yt - 0.07, D - 0.32, 16);
    addMesh(g, new THREE.SphereGeometry(0.06, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.lamp, x, yt - 0.07, D - 0.32).castShadow = false;
  }
  // maker's label on the front (seen in the owner's photo) and the hood control box beside it
  screen(g, signTexture(['CAPTIVEAIRE'], { w: 512, h: 96, bg: '#1a1c1e', fg: '#e8e6dc', size: 54 }), 0.26, 0.05, L / 2 - 0.3, yb + 0.32, D + 0.002);
  B(g, M.paintGrey, 0.22, 0.26, 0.08, L / 2 + 0.22, 2.0, 0.04);
  screen(g, screenTexture(96, 48, (c) => { c.fillStyle = '#0b1416'; c.fillRect(0, 0, 96, 48); c.fillStyle = '#5ac8ff'; c.font = 'bold 20px monospace'; c.fillText('FAN ON', 10, 31); }), 0.12, 0.06, L / 2 + 0.22, 2.17, 0.081);
  return g;
}

function suppression(M, hd, nozzles) {
  // piping inside the hood (hood-local): header along the front, a drop and nozzle over each appliance
  const L = HOOD.x1 - HOOD.x0, cx = (HOOD.x0 + HOOD.x1) / 2, y = HOOD.top - 0.16, z = HOOD.depth - 0.42;
  barX(hd, M.chrome, L - 0.3, 0.011, 0, y, z);
  for (const wx of nozzles) {
    C(hd, M.chrome, 0.008, 0.008, 0.14, wx - cx, y - 0.14, z, 8);
    C(hd, M.chrome, 0.006, 0.014, 0.03, wx - cx, y - 0.17, z, 8);
  }
  barX(hd, M.steelDark, L - 0.3, 0.003, 0, y + 0.07, 0.62);
  // agent cabinet, K-class extinguisher and pull station on the open kitchen's east wall
  const g = new THREE.Group(), xw = KF.x1;
  B(g, M.steel, 0.14, 0.62, 0.32, xw - 0.07, 1.95, KF.z0 + 0.45);
  B(g, M.red, 0.006, 0.07, 0.2, xw - 0.143, 2.45, KF.z0 + 0.45);
  tube(g, M.chrome, [[xw - 0.07, 2.57, KF.z0 + 0.45], [xw - 0.07, 2.7, KF.z0 + 0.45], [xw - 0.3, 2.7, KF.z0 + 0.9], [HOOD.x1, 2.6, KF.z0 + 0.9]], 0.01, 16);
  B(g, M.red, 0.05, 0.14, 0.1, xw - 0.025, 1.12, KF.z0 + 1.75);
  B(g, M.chrome, 0.012, 0.03, 0.05, xw - 0.056, 1.15, KF.z0 + 1.75);
  screen(g, signTexture(['PULL', 'IN CASE OF FIRE'], { w: 256, h: 128, bg: '#c4261c', fg: '#fff', size: 46 }), 0.16, 0.08, xw - 0.004, 1.37, KF.z0 + 1.75, -Math.PI / 2);
  C(g, M.chrome, 0.065, 0.065, 0.42, xw - 0.09, 0.95, KF.z0 + 1.25, 20);
  C(g, M.black, 0.02, 0.03, 0.08, xw - 0.09, 1.37, KF.z0 + 1.25, 10);
  screen(g, signTexture(['K', 'CLASS'], { w: 128, h: 128, bg: '#fff', fg: '#c4261c', size: 60 }), 0.07, 0.07, xw - 0.157, 1.13, KF.z0 + 1.25, -Math.PI / 2);
  return g;
}

function rangeTop(M) {
  const g = new THREE.Group(), W = 24 * IN, D = 30 * IN;
  legs(g, M, W, D, 0.6);
  B(g, M.steel, W, 0.035, D, 0, 0.6, 0);
  B(g, M.steel, W - 0.06, 0.02, D - 0.06, 0, 0.18, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) C(g, M.steelDark, 0.016, 0.016, 0.08, sx * (W / 2 - 0.05), 0.635, sz * (D / 2 - 0.08), 10);
  B(g, M.steel, W, 0.2, D - 0.04, 0, 0.715, -0.02);
  B(g, M.steelV, W, 0.14, 0.01, 0, 0.73, D / 2 - 0.035);
  for (const sx of [-1, 1]) knob(g, M, sx * 0.12, 0.8, D / 2 - 0.03);
  B(g, M.steel, W, 0.2, 0.012, 0, 0.915, -D / 2 + 0.05);
  for (const zc of [0.13, -0.17]) {
    for (let i = 0; i < 4; i++) B(g, M.black, W - 0.06, 0.018, 0.018, 0, 0.915, zc - 0.12 + i * 0.08);
    for (let i = 0; i < 4; i++) B(g, M.black, 0.018, 0.018, 0.26, -W / 2 + 0.06 + i * 0.163, 0.915, zc);
    C(g, M.iron, 0.08, 0.09, 0.02, 0, 0.9, zc, 20);
  }
  // stock pot on the back burner, sauté pan on the front (owner's photo)
  C(g, M.alum, 0.17, 0.17, 0.34, 0, 0.935, -0.17, 28);
  addMesh(g, new THREE.TorusGeometry(0.17, 0.008, 6, 28), M.alum, 0, 1.275, -0.17, Math.PI / 2, 0, 0);
  for (const sx of [-1, 1]) B(g, M.alum, 0.06, 0.025, 0.03, sx * 0.2, 1.2, -0.17);
  C(g, M.food.beans, 0.165, 0.165, 0.01, 0, 1.24, -0.17, 28);
  C(g, M.iron, 0.13, 0.11, 0.05, 0, 0.935, 0.13, 24);
  C(g, M.food.chorizo, 0.12, 0.12, 0.01, 0, 0.962, 0.13, 24);
  addMesh(g, new THREE.CylinderGeometry(0.014, 0.014, 0.25, 8), M.iron, 0, 0.97, 0.38, Math.PI / 2, 0, 0);
  return g;
}

function landing(M) {
  const g = new THREE.Group(), W = 24 * IN, D = 30 * IN, top = 0.9;
  legs(g, M, W, D, top - 0.04);
  B(g, M.steel, W, 0.04, D, 0, top - 0.04, 0);
  B(g, M.steel, W, 0.15, 0.012, 0, top, -D / 2 + 0.006);
  B(g, M.steel, W - 0.06, 0.02, D - 0.06, 0, 0.25, 0);
  for (let i = 0; i < 3; i++) B(g, M.foil, 0.32, 0.05, 0.26, 0.05, top + i * 0.012, 0.08);
  for (let i = 0; i < 2; i++) C(g, M.hdpe, 0.045, 0.04, 0.32, -0.2 + i * 0.1, top, -0.24, 16);
  for (let i = 0; i < 4; i++) B(g, M.alum, 0.46, 0.022, 0.33, 0, 0.27 + i * 0.024, 0);
  return g;
}

function worktable(M, r) {
  const g = new THREE.Group(), W = 72 * IN, D = 30 * IN, top = 0.9;
  legs(g, M, W, D, top - 0.04, 0.04, 0.02);
  B(g, M.steel, W, 0.04, D, 0, top - 0.04, 0);
  B(g, M.steel, W, 0.12, 0.012, 0, top, -D / 2 + 0.006);
  B(g, M.steel, W - 0.08, 0.02, D - 0.08, 0, 0.25, 0);
  // microwave, cutting board, hotel pans
  B(g, M.steel, 0.56, 0.34, 0.46, -0.55, top, -0.08);
  B(g, M.darkGlass, 0.36, 0.22, 0.01, -0.62, top + 0.06, 0.155);
  B(g, M.blackGloss, 0.12, 0.26, 0.012, -0.34, top + 0.04, 0.153);
  B(g, M.hdpe, 0.5, 0.015, 0.35, 0.15, top, 0.05);
  for (let i = 0; i < 3; i++) B(g, M.steel, 0.32, 0.1, 0.26, 0.62, top + i * 0.03, -0.1);
  for (let i = 0; i < 3; i++) B(g, M.box[['foil', 'cups', 'napkins'][i]], 0.4, 0.22, 0.5, -0.55 + i * 0.5, 0.27, 0);
  // wire wall shelf above
  const sy = 1.55;
  for (const sx of [-1, 1]) B(g, M.steelDark, 0.02, 0.22, 0.3, sx * (W / 2 - 0.2), sy - 0.22, -D / 2 + 0.15);
  addMesh(g, scaleUV(new THREE.PlaneGeometry(W - 0.1, 0.36), (W - 0.1) / 0.3, 1.2), M.wire, 0, sy, -D / 2 + 0.2, -Math.PI / 2);
  for (const sz of [-1, 1]) barX(g, M.chrome, W - 0.1, 0.006, 0, sy, -D / 2 + 0.2 + sz * 0.18);
  for (let i = 0; i < 6; i++) { const lid = [M.red, M.bluePlastic, M.green, M.yellow][i % 4]; B(g, M.clear, 0.2, 0.18, 0.2, -0.75 + i * 0.3, sy + 0.005, -D / 2 + 0.2); B(g, M.food[['rice', 'beans', 'pico', 'cheese', 'onion', 'tomato'][i]], 0.19, 0.1, 0.19, -0.75 + i * 0.3, sy + 0.01, -D / 2 + 0.2); B(g, lid, 0.205, 0.015, 0.205, -0.75 + i * 0.3, sy + 0.185, -D / 2 + 0.2); }
  return g;
}

function menuScreen(kind) {
  return screenTexture(620, 350, (c, w, h) => {
    c.fillStyle = '#c9351d'; c.fillRect(0, 0, w, h);
    const r = rng(kind.length * 7 + 3);
    c.strokeStyle = 'rgba(255,196,120,.22)'; c.lineWidth = 3;
    for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(r() * w, r() * h, 6 + r() * 16, 0, 6.3); c.stroke(); }
    c.textAlign = 'center'; c.fillStyle = '#f5f3e6';
    if (kind === 'center') {
      c.font = '900 76px "Arial Black", Arial, sans-serif'; c.fillText('YOUR MENU', w / 2, h / 2 + 4);
      c.fillStyle = '#eebe54'; c.font = '900 40px "Arial Black", Arial, sans-serif'; c.fillText('HERE', w / 2, h / 2 + 58);
      c.fillStyle = 'rgba(245,243,230,.85)'; c.font = 'bold 20px Arial, sans-serif'; c.fillText('Short Stop Judson · kitchen for rent', w / 2, h - 24);
    } else {
      c.font = '900 40px "Arial Black", Arial, sans-serif'; c.fillText(kind === 'left' ? 'BREAKFAST' : 'LUNCH', 150, 70);
      c.fillStyle = 'rgba(0,0,0,.2)'; rrect(c, 40, 100, 220, 200, 14); c.fill();
      c.fillStyle = 'rgba(245,243,230,.8)'; c.font = 'bold 18px Arial, sans-serif'; c.fillText('PHOTO', 150, 205);
      c.fillStyle = '#e4f1f3'; rrect(c, 290, 34, 300, 282, 14); c.fill();
      for (let i = 0; i < 8; i++) { c.fillStyle = '#204649'; c.fillRect(312, 62 + i * 31, 120 + (i * 37 % 60), 12); c.fillStyle = '#c9351d'; c.fillRect(528, 62 + i * 31, 42, 12); }
    }
  });
}

function menuBoards(M) {
  const g = new THREE.Group(), sw = 1.24, sh = 0.7, gap = 0.04, W = sw * 3 + gap * 4, y0 = 2.15;
  B(g, M.blackGloss, W, sh + 0.08, 0.07, 0, y0, 0);
  for (const sx of [-1, 1]) C(g, M.black, 0.035, 0.035, ROOM.h - (y0 + sh + 0.08), sx * 1.2, y0 + sh + 0.08, 0, 12);
  ['left', 'center', 'right'].forEach((k, i) => screen(g, menuScreen(k), sw, sh, (i - 1) * (sw + gap), y0 + 0.04 + sh / 2, 0.036));
  return g;
}

function servingCounter(M) {
  // local frame: runs along x (world x), store side +z, origin on the floor at the middle of the depth
  const g = new THREE.Group(), D = 0.85, H = 0.9;
  const sections = [{ a: -3.0, b: -2.6, hot: false }, { a: -2.6, b: -0.8, hot: true }, { a: -0.8, b: 1.0, hot: true }, { a: 1.0, b: 2.8, hot: true }, { a: 2.8, b: KF.x1, hot: false }];
  const foods = [['beans', 'rice', 'meat', 'peppers'], ['chorizo', 'potato', 'pico', 'guac'], ['tomato', 'cheese', 'bacon', 'salsa']];
  let k = 0;
  for (const s of sections) {
    const w = s.b - s.a, cx = (s.a + s.b) / 2;
    B(g, M.black, w, 0.1, D - 0.06, cx, 0, 0);
    B(g, M.steel, w, H - 0.14, D, cx, 0.1, 0);
    B(g, M.woodPanel, w - 0.01, 0.74, 0.012, cx, 0.12, D / 2 + 0.003);
    B(g, M.steel, w, 0.04, D + 0.02, cx, H - 0.04, 0);
    if (!s.hot) continue;
    for (let i = 0; i < 2; i++) {
      B(g, M.steelV, w / 2 - 0.03, 0.55, 0.012, s.a + w / 4 + i * w / 2, 0.2, -D / 2 - 0.004);
      B(g, M.black, w / 2 - 0.25, 0.02, 0.02, s.a + w / 4 + i * w / 2, 0.71, -D / 2 - 0.012);
    }
    for (let i = 0; i < 4; i++) {
      const x = s.a + (i + 0.5) * w / 4;
      B(g, M.steelIn, w / 4 - 0.05, 0.012, 0.5, x, H - 0.012, -0.02);
      B(g, M.food[foods[k][i]], w / 4 - 0.07, 0.006, 0.46, x, H - 0.006, -0.02);
      B(g, M.blackGloss, 0.13, 0.07, 0.012, x, H - 0.14, -D / 2 - 0.006);
      screen(g, screenTexture(96, 48, (c) => { c.fillStyle = '#050505'; c.fillRect(0, 0, 96, 48); c.fillStyle = '#ff3a1c'; c.font = 'bold 26px monospace'; c.textAlign = 'center'; c.fillText('165', 48, 33); }), 0.07, 0.035, x - 0.02, H - 0.105, -D / 2 - 0.013, Math.PI);
    }
    k++;
    // two-tier glass: front panel, upper shelf, customer tray shelf, posts with knobs
    B(g, M.glass, w - 0.04, 0.36, 0.01, cx, H, D / 2 - 0.04).castShadow = false;
    B(g, M.glass, w - 0.02, 0.012, 0.52, cx, H + 0.42, 0.02).castShadow = false;
    B(g, M.glass, w - 0.02, 0.012, 0.26, cx, H + 0.2, D / 2 + 0.09).castShadow = false;
    for (const qx of [s.a + 0.03, s.b - 0.03]) for (const qz of [-0.22, D / 2 - 0.03]) {
      C(g, M.chrome, 0.014, 0.014, 0.44, qx, H, qz, 12);
      addMesh(g, new THREE.SphereGeometry(0.022, 12, 8), M.chrome, qx, H + 0.45, qz);
    }
  }
  // napkin dispenser on the west end (owner's photo)
  B(g, M.black, 0.24, 0.03, 0.2, -2.8, H, 0.05);
  B(g, M.smoke, 0.2, 0.36, 0.16, -2.8, H + 0.03, 0.05);
  B(g, M.hdpe, 0.12, 0.05, 0.004, -2.8, H + 0.06, 0.132);
  // register at the pick-up end
  B(g, M.blackGloss, 0.05, 0.28, 0.05, 3.08, H, -0.15);
  const scr = B(g, M.blackGloss, 0.36, 0.26, 0.03, 3.08, H + 0.28, -0.15); scr.rotation.x = 0.25;
  B(g, M.blackGloss, 0.12, 0.1, 0.16, 3.08, H, 0.2);
  return g;
}

function prepTable(M, r) {
  const g = new THREE.Group(), W = 72 * IN, D = 34 * IN, top = 0.86;
  casters(g, M, W, D - 0.08);
  B(g, M.steel, W, top - 0.13, D - 0.08, 0, 0.13, -0.04);
  for (let i = 0; i < 3; i++) {
    const x = -W / 2 + (i + 0.5) * W / 3;
    B(g, M.steelV, W / 3 - 0.03, top - 0.25, 0.014, x, 0.21, D / 2 - 0.08);
    B(g, M.black, W / 3 - 0.12, 0.025, 0.02, x, top - 0.075, D / 2 - 0.07);
  }
  B(g, M.louver, W - 0.04, 0.06, 0.006, 0, 0.14, D / 2 - 0.07);
  B(g, M.hdpe, W - 0.02, 0.016, 0.3, 0, top, D / 2 - 0.2);
  B(g, M.steel, W, 0.12, 0.44, 0, top, -D / 2 + 0.22);
  const pans = ['tomato', 'lettuce', 'cheese', 'onion', 'jalapeno', 'beans', 'potato', 'chorizo', 'bacon', 'rice', 'salsa', 'pico', 'cream', 'guac', 'meat', 'peppers'];
  for (let i = 0; i < 16; i++) {
    const col = i % 8, row = Math.floor(i / 8), x = -W / 2 + 0.1 + col * 0.205 + 0.02, z = -D / 2 + 0.11 + row * 0.18;
    B(g, M.steelIn, 0.17, 0.012, 0.165, x, top + 0.115, z);
    B(g, M.food[pans[i]], 0.15, 0.006, 0.145, x, top + 0.118, z);
  }
  const lid = new THREE.Group(); lid.position.set(0, top + 0.13, -D / 2 + 0.01); lid.rotation.x = -1.75; g.add(lid);
  B(lid, M.steel, W - 0.03, 0.035, 0.42, 0, 0, 0.21);
  B(g, M.steel, W, 0.2, 0.012, 0, top + 0.12, -D / 2 + 0.005);
  // tacos and containers on the board
  for (const [x, k] of [[-0.35, 'chorizo'], [-0.18, 'potato'], [0.05, 'meat']]) {
    addMesh(g, new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16, 1, true, Math.PI, Math.PI), M.food.shell, x, top + 0.077, D / 2 - 0.2, 0, 0, Math.PI / 2);
    B(g, M.food[k], 0.12, 0.035, 0.07, x, top + 0.035, D / 2 - 0.2);
  }
  for (const [x, k] of [[0.45, 'salsa'], [0.55, 'pico'], [0.65, 'cream']]) { C(g, M.clear, 0.05, 0.045, 0.07, x, top + 0.016, D / 2 - 0.12, 16); C(g, M.food[k], 0.044, 0.043, 0.045, x, top + 0.02, D / 2 - 0.12, 16); }
  B(g, M.foil, 0.25, 0.002, 0.2, 0.25, top + 0.016, D / 2 - 0.2).rotation.y = 0.15;
  return g;
}

function doughStation(M, r) {
  const g = new THREE.Group(), W = 72 * IN, D = 30 * IN, top = 0.89;
  legs(g, M, W, D, top - 0.04, 0.04, 0.02);
  B(g, M.steel, W, 0.04, D, 0, top - 0.04, 0);
  B(g, M.steel, W - 0.02, 0.03, 0.012, 0, top - 0.06, D / 2 - 0.006);
  B(g, M.steel, W - 0.08, 0.02, D - 0.08, 0, 0.25, 0);
  // ingredient bins on the undershelf
  for (const x of [-0.45, 0.05]) {
    casters(g, M, 0.32, 0.6, 0.04); g.children.slice(-8).forEach((m) => { m.position.x += x; m.position.y += 0.27; });
    B(g, M.binWhite, 0.32, 0.44, 0.6, x, 0.36, 0);
    const lid = B(g, M.binWhite, 0.33, 0.03, 0.42, x, 0.8, 0.06); lid.rotation.x = 0.12;
    screen(g, signTexture(['FLOUR'], { w: 256, h: 96, size: 56, fg: '#204649' }), 0.2, 0.075, x, 0.56, 0.301);
  }
  // heated tortilla press
  const px = -0.5, pz = 0.0;
  B(g, M.steel, 0.5, 0.11, 0.56, px, top, pz);
  B(g, M.plate, 0.42, 0.03, 0.42, px, top + 0.11, pz + 0.03);
  B(g, M.steel, 0.12, 0.5, 0.1, px, top + 0.11, pz - 0.25);
  const arm = new THREE.Group(); arm.position.set(px, top + 0.58, pz - 0.25); arm.rotation.x = -0.62; g.add(arm);
  B(arm, M.steel, 0.46, 0.07, 0.46, 0, -0.07, 0.25);
  B(arm, M.plate, 0.42, 0.02, 0.42, 0, -0.09, 0.25);
  tube(arm, M.chrome, [[0, 0, 0.45], [0, 0.06, 0.6], [0, 0.04, 0.72]], 0.012, 10);
  addMesh(arm, new THREE.SphereGeometry(0.035, 16, 12), M.black, 0, 0.04, 0.74);
  B(g, M.blackGloss, 0.11, 0.07, 0.004, px + 0.17, top + 0.02, pz + 0.282);
  screen(g, screenTexture(96, 48, (c) => { c.fillStyle = '#050505'; c.fillRect(0, 0, 96, 48); c.fillStyle = '#ff3a1c'; c.font = 'bold 24px monospace'; c.textAlign = 'center'; c.fillText('400°', 48, 33); }), 0.08, 0.04, px + 0.17, top + 0.055, pz + 0.285);
  // dough balls and pressed tortillas
  B(g, M.alum, 0.46, 0.02, 0.33, -0.05, top, 0.12);
  for (let i = 0; i < 12; i++) { const m = addMesh(g, new THREE.SphereGeometry(0.034, 14, 10), M.food.dough, -0.05 - 0.17 + (i % 4) * 0.11, top + 0.04, 0.12 - 0.1 + Math.floor(i / 4) * 0.1); m.scale.y = 0.7; }
  for (let i = 0; i < 8; i++) C(g, M.food.dough, 0.1, 0.1, 0.004, -0.05, top + 0.0, -0.22, 24).position.y = top + 0.002 + i * 0.0045;
  // 20 qt planetary mixer
  const mx = 0.55;
  B(g, M.paintGrey, 0.34, 0.08, 0.5, mx, top, -0.02);
  B(g, M.paintGrey, 0.2, 0.62, 0.18, mx, top + 0.08, -0.18);
  B(g, M.paintGrey, 0.26, 0.2, 0.5, mx, top + 0.62, -0.02);
  const bowl = new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.1, 0.01), new THREE.Vector2(0.155, 0.12), new THREE.Vector2(0.165, 0.27), new THREE.Vector2(0.175, 0.28)], 28);
  addMesh(g, bowl, M.steel, mx, top + 0.2, 0.06);
  addMesh(g, new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.food.dough, mx, top + 0.33, 0.06).scale.y = 0.5;
  C(g, M.chrome, 0.012, 0.012, 0.22, mx, top + 0.4, 0.06, 8);
  for (const s of [-1, 1]) B(g, M.paintGrey, 0.03, 0.04, 0.24, mx + s * 0.17, top + 0.38, -0.02);
  B(g, M.blackGloss, 0.12, 0.05, 0.004, mx + 0.0, top + 0.66, 0.232);
  // colour-coded cutting boards in a rack, scale
  const cols = [0xc4261c, 0xf0c018, 0x2f8a4a, 0x1f5ea6, 0xf1f0ea, 0x7b5236];
  B(g, M.steel, 0.32, 0.03, 0.2, 0.18, top, 0.2);
  cols.forEach((c, i) => B(g, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }), 0.012, 0.3, 0.18, 0.06 + i * 0.045, top + 0.02, 0.2));
  B(g, M.steel, 0.24, 0.05, 0.24, 0.25, top, -0.2);
  B(g, M.blackGloss, 0.1, 0.03, 0.004, 0.25, top + 0.012, -0.079);
  return g;
}

function speedRack(M, r) {
  const g = new THREE.Group(), W = 20.5 * IN, D = 26 * IN, H = 1.75;
  casters(g, M, W, D, 0.03);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, M.alum, 0.025, H - 0.12, 0.025, sx * (W / 2 - 0.0125), 0.12, sz * (D / 2 - 0.0125));
  for (const y of [0.12, H - 0.02]) for (const sx of [-1, 1]) B(g, M.alum, 0.025, 0.02, D, sx * (W / 2 - 0.0125), y, 0);
  for (const y of [0.12, H - 0.02]) for (const sz of [-1, 1]) B(g, M.alum, W, 0.02, 0.025, 0, y, sz * (D / 2 - 0.0125));
  for (let i = 0; i < 20; i++) for (const sx of [-1, 1]) B(g, M.alum, 0.012, 0.004, D - 0.05, sx * (W / 2 - 0.02), 0.25 + i * 0.075, 0);
  const levels = [1, 3, 5, 7, 10, 12, 15, 18];
  levels.forEach((lv, k) => {
    const y = 0.255 + lv * 0.075;
    B(g, M.alum, W - 0.05, 0.022, D - 0.04, 0, y, 0);
    if (k % 2 === 0) for (let i = 0; i < 15; i++) { const m = addMesh(g, new THREE.SphereGeometry(0.03, 12, 8), M.food.dough, -0.17 + (i % 3) * 0.17, y + 0.04, -0.27 + Math.floor(i / 3) * 0.135); m.scale.y = 0.7; }
    else for (let i = 0; i < 4; i++) C(g, M.food.tortilla, 0.1, 0.1, 0.01, -0.11 + (i % 2) * 0.22, y + 0.022, -0.15 + Math.floor(i / 2) * 0.3, 20);
  });
  return g;
}

function reachIn(M) {
  const g = new THREE.Group(), W = 54 * IN, D = 31 * IN, H = 2.1;
  casters(g, M, W, D - 0.06, 0.08);
  B(g, M.steel, W, H - 0.13, D - 0.06, 0, 0.13, -0.03);
  for (const s of [-1, 1]) {
    B(g, M.steelV, W / 2 - 0.02, 1.6, 0.03, s * W / 4, 0.17, D / 2 - 0.045);
    vHandle(g, M, 0.4, s * 0.05, 1.15, D / 2 - 0.03);
    B(g, M.rubber, W / 2 - 0.02, 0.006, 0.03, s * W / 4, 1.77, D / 2 - 0.045);
  }
  B(g, M.louver, W - 0.02, 0.2, 0.01, 0, 1.8, D / 2 - 0.055);
  B(g, M.blackGloss, 0.16, 0.06, 0.006, W / 2 - 0.22, 1.87, D / 2 - 0.045);
  screen(g, screenTexture(128, 48, (c) => { c.fillStyle = '#04070a'; c.fillRect(0, 0, 128, 48); c.fillStyle = '#5ac8ff'; c.font = 'bold 30px monospace'; c.textAlign = 'center'; c.fillText('-2°F', 64, 35); }), 0.13, 0.045, W / 2 - 0.22, 1.9, D / 2 - 0.041);
  return g;
}

function handSink(M) {
  const g = new THREE.Group(), W = 17 * IN, D = 15 * IN;
  // origin at the wall line; the sink hangs at 34 in
  B(g, M.steel, 0.3, 0.12, 0.03, 0, 0.62, 0.015);
  B(g, M.steel, W, 0.16, D, 0, 0.72, D / 2);
  B(g, M.steelIn, W - 0.06, 0.004, D - 0.08, 0, 0.8, D / 2 + 0.01);
  B(g, M.steel, W, 0.28, 0.03, 0, 0.88, 0.015);
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(D, 0); sh.lineTo(D, 0.03); sh.lineTo(0.04, 0.3); sh.lineTo(0, 0.3); sh.closePath();
    addMesh(g, new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }), M.steel, s * (W / 2) + (s < 0 ? 0.006 : 0), 0.88, 0, 0, -Math.PI / 2, 0);
  }
  B(g, M.chrome, 0.07, 0.05, 0.05, 0, 0.98, 0.04);
  tube(g, M.chrome, [[0, 1.02, 0.05], [0, 1.2, 0.08], [0, 1.2, 0.2], [0, 1.08, 0.25]], 0.011, 18);
  for (const s of [-1, 1]) B(g, M.chrome, 0.025, 0.06, 0.02, s * 0.08, 1.0, 0.05);
  tube(g, M.chrome, [[0, 0.72, D / 2], [0, 0.6, D / 2], [0, 0.52, D / 2 - 0.06], [0, 0.6, 0.05], [0, 0.6, 0.0]], 0.016, 16);
  B(g, M.hdpe, 0.12, 0.2, 0.1, -0.2, 1.32, 0.05);
  B(g, M.black, 0.06, 0.02, 0.03, -0.2, 1.3, 0.11);
  B(g, M.greyPlastic, 0.3, 0.36, 0.11, 0.18, 1.28, 0.055);
  B(g, M.hdpe, 0.2, 0.003, 0.08, 0.18, 1.275, 0.08);
  screen(g, signTexture(['EMPLOYEES MUST', 'WASH HANDS'], { w: 512, h: 256, bg: '#f7f7f2', fg: '#1f5ea6', size: 64, bar: '#1f5ea6' }), 0.26, 0.13, 0, 1.78, 0.003);
  C(g, M.greyPlastic, 0.14, 0.12, 0.42, 0.42, 0, 0.18, 20);
  return g;
}

function sink3(M) {
  const g = new THREE.Group(), tubW = 18 * IN, tubD = 18 * IN, board = 18 * IN, W = 3 * tubW + 2 * board + 4 * 0.02, D = 24 * IN, rim = 0.91, depth = 12 * IN;
  const x0 = -W / 2;
  for (const sx of [-1, -0.33, 0.33, 1]) for (const sz of [-1, 1]) {
    const x = sx * (W / 2 - 0.05), z = sz * (D / 2 - 0.06);
    C(g, M.steelDark, 0.02, 0.02, rim - depth - 0.08, x, 0.03, z, 10); C(g, M.steelDark, 0.03, 0.024, 0.03, x, 0, z, 10);
  }
  for (const sz of [-1, 1]) barX(g, M.steelDark, W - 0.1, 0.012, 0, 0.18, sz * (D / 2 - 0.06));
  let x = x0;
  // left drainboard (slopes slightly toward the tub)
  B(g, M.steel, board, 0.02, D, x + board / 2, rim - 0.02, 0).rotation.z = -0.02; x += board;
  const tubs = [];
  for (let i = 0; i < 3; i++) {
    B(g, M.steel, 0.02, 0.04, D, x + 0.01, rim - 0.04, 0); x += 0.02;
    const cx = x + tubW / 2; tubs.push(cx);
    B(g, M.steel, tubW, 0.02, D - tubD, cx, rim - 0.02, -D / 2 + (D - tubD) / 2 - 0.0);
    B(g, M.steelIn, tubW, 0.01, tubD, cx, rim - depth, D / 2 - tubD / 2);
    for (const s of [-1, 1]) B(g, M.steelIn, 0.01, depth, tubD, cx + s * (tubW / 2 - 0.005), rim - depth, D / 2 - tubD / 2);
    B(g, M.steelIn, tubW, depth, 0.01, cx, rim - depth, -D / 2 + (D - tubD));
    B(g, M.steelV, tubW + 0.02, depth + 0.02, 0.012, cx, rim - depth - 0.01, D / 2 - 0.006);
    B(g, M.steel, tubW + 0.02, 0.03, 0.03, cx, rim - 0.03, D / 2 - 0.015);
    C(g, M.steelDark, 0.03, 0.03, 0.1, cx, rim - depth - 0.12, D / 2 - tubD / 2, 12);
    x += tubW;
  }
  B(g, M.steel, 0.02, 0.04, D, x + 0.01, rim - 0.04, 0); x += 0.02;
  B(g, M.steel, board, 0.02, D, x + board / 2, rim - 0.02, 0).rotation.z = 0.02;
  B(g, M.water, tubW - 0.02, 0.004, tubD - 0.02, tubs[1], rim - 0.12, D / 2 - tubD / 2);
  B(g, M.water, tubW - 0.02, 0.004, tubD - 0.02, tubs[2], rim - 0.12, D / 2 - tubD / 2);
  B(g, M.suds, tubW - 0.02, 0.012, tubD - 0.02, tubs[0], rim - 0.12, D / 2 - tubD / 2);
  for (let i = 0; i < 9; i++) addMesh(g, new THREE.SphereGeometry(0.03 + (i % 3) * 0.01, 10, 8), M.suds, tubs[0] + ((i * 37) % 9 - 4) * 0.035, rim - 0.105, D / 2 - tubD / 2 + ((i * 53) % 7 - 3) * 0.04).scale.y = 0.5;
  // backsplash, faucets, labels
  B(g, M.steelV, W, 0.25, 0.02, 0, rim, -D / 2 + 0.01);
  B(g, M.steel, W, 0.02, 0.05, 0, rim + 0.25, -D / 2 + 0.035).rotation.x = 0.4;
  const labels = [['WASH', '#1f5ea6'], ['RINSE', '#2f8a4a'], ['SANITIZE', '#c4261c']];
  tubs.forEach((cx, i) => screen(g, signTexture([labels[i][0]], { w: 256, h: 96, bg: labels[i][1], fg: '#fff', size: 52 }), 0.18, 0.065, cx, rim + 0.06, -D / 2 + 0.021));
  for (const fx of [(tubs[0] + tubs[1]) / 2, (tubs[1] + tubs[2]) / 2]) {
    B(g, M.chrome, 0.2, 0.05, 0.05, fx, rim + 0.15, -D / 2 + 0.045);
    for (const s of [-1, 1]) B(g, M.chrome, 0.03, 0.06, 0.03, fx + s * 0.11, rim + 0.2, -D / 2 + 0.05);
    tube(g, M.chrome, [[fx, rim + 0.17, -D / 2 + 0.07], [fx, rim + 0.17, -D / 2 + 0.2], [fx, rim + 0.15, -D / 2 + 0.33]], 0.012, 10);
  }
  // pre-rinse unit over the left drainboard
  const prx = x0 + board / 2;
  C(g, M.chrome, 0.016, 0.016, 1.0, prx, rim + 0.18, -D / 2 + 0.06, 12);
  B(g, M.chrome, 0.07, 0.04, 0.06, prx, rim + 0.2, -D / 2 + 0.05);
  barZ(g, M.chrome, 0.12, 0.012, prx, rim + 1.16, -D / 2 + 0.11);
  const coil = []; for (let i = 0; i <= 80; i++) { const a = i * 0.5; coil.push([prx + Math.cos(a) * 0.035, rim + 1.15 - i * 0.006, -D / 2 + 0.17 + Math.sin(a) * 0.035]); }
  tube(g, M.chrome, coil, 0.005, 240);
  C(g, M.chrome, 0.02, 0.028, 0.1, prx, rim + 0.53, -D / 2 + 0.17, 12);
  // wall shelf above with clean pans
  const sy = rim + 0.72;
  for (const s of [-1, 1]) B(g, M.steelDark, 0.02, 0.25, 0.3, s * (W / 2 - 0.2), sy - 0.25, -D / 2 + 0.15);
  plane(g, M.wire, W - 0.2, 0.36, 0, sy, -D / 2 + 0.18, -Math.PI / 2).geometry = scaleUV(new THREE.PlaneGeometry(W - 0.2, 0.36), (W - 0.2) / 0.3, 0.36 / 0.3);
  for (const s of [-1, 1]) barX(g, M.chrome, W - 0.2, 0.006, 0, sy, -D / 2 + 0.18 + s * 0.18);
  for (let i = 0; i < 5; i++) B(g, M.steel, 0.32, 0.1, 0.27, -0.85 + i * 0.36, sy + 0.005, -D / 2 + 0.18);
  for (let i = 0; i < 4; i++) B(g, M.alum, 0.46, 0.022, 0.33, 0.95, sy + 0.005 + i * 0.024, -D / 2 + 0.18);
  return g;
}

function mopSink(M) {
  const g = new THREE.Group(), S = 24 * IN;
  // origin at the wall line, basin out in front
  B(g, M.composite, S, 0.04, S, 0, 0, S / 2);
  for (const [w, d, x, z] of [[S, 0.05, 0, 0.025], [S, 0.05, 0, S - 0.025], [0.05, S, -S / 2 + 0.025, S / 2], [0.05, S, S / 2 - 0.025, S / 2]]) B(g, M.composite, w, 0.25, d, x, 0, z);
  C(g, M.steelDark, 0.04, 0.04, 0.006, 0, 0.04, S / 2, 16);
  B(g, M.steelV, 0.9, 0.75, 0.01, 0, 0.25, 0.005);
  B(g, M.chrome, 0.24, 0.05, 0.05, 0, 0.92, 0.04);
  for (const s of [-1, 1]) B(g, M.chrome, 0.04, 0.05, 0.04, s * 0.13, 0.96, 0.04);
  tube(g, M.chrome, [[0, 0.92, 0.06], [0, 0.85, 0.12], [0, 0.82, 0.14]], 0.012, 8);
  tube(g, M.black, [[0, 0.82, 0.14], [0.05, 0.6, 0.18], [0.14, 0.3, 0.25], [0.1, 0.06, 0.32]], 0.012, 20);
  barX(g, M.chrome, 0.12, 0.006, 0, 0.78, 0.13);
  // mop rack, mop, broom
  barX(g, M.steelDark, 0.6, 0.012, 0, 1.55, 0.03);
  for (const [x, len, head] of [[-0.18, 1.35, 'mop'], [0.12, 1.3, 'broom']]) {
    C(g, head === 'mop' ? M.bluePlastic : M.yellow, 0.013, 0.013, len, x, 1.55 - len + 0.12, 0.04, 8);
    if (head === 'mop') C(g, M.hdpe, 0.07, 0.11, 0.3, x, 0.02, 0.06, 12);
    else B(g, M.black, 0.3, 0.09, 0.06, x, 0.3, 0.06);
  }
  // bucket + wringer, wet floor sign
  const bx = S / 2 + 0.32, bz = 0.42;
  B(g, M.yellow, 0.4, 0.36, 0.32, bx, 0.1, bz);
  casters(g, M, 0.4, 0.32, 0.04); g.children.slice(-8).forEach((m) => { m.position.x += bx; m.position.z += bz; });
  B(g, M.yellow, 0.18, 0.22, 0.26, bx - 0.08, 0.46, bz);
  C(g, M.yellow, 0.012, 0.012, 0.6, bx - 0.14, 0.66, bz, 8);
  return g;
}

function iceMachine(M) {
  const g = new THREE.Group(), W = 30 * IN, D = 34 * IN;
  legs(g, M, W, D, 0.15, 0.05, 0.022);
  B(g, M.steel, W, 0.95, D, 0, 0.15, 0);
  const door = B(g, M.black, W - 0.08, 0.22, 0.03, 0, 0.82, D / 2 - 0.02); door.rotation.x = -0.18;
  B(g, M.chrome, 0.3, 0.02, 0.02, 0, 0.98, D / 2 + 0.02);
  B(g, M.steel, W, 0.53, 0.61, 0, 1.1, -D / 2 + 0.305);
  B(g, M.steelV, W - 0.01, 0.4, 0.01, 0, 1.12, -D / 2 + 0.61);
  B(g, M.louver, W - 0.01, 0.1, 0.01, 0, 1.52, -D / 2 + 0.612);
  B(g, M.black, W - 0.01, 0.03, 0.01, 0, 1.5, -D / 2 + 0.613);
  // filter on the wall behind
  B(g, M.steelDark, 0.36, 0.06, 0.06, 0, 1.78, -D / 2 - 0.03);
  for (const s of [-1, 1]) C(g, M.bluePlastic, 0.055, 0.055, 0.32, s * 0.09, 1.44, -D / 2 - 0.07, 16);
  tube(g, M.copper, [[0, 1.78, -D / 2 - 0.05], [0.25, 1.78, -D / 2 - 0.05], [0.25, 1.64, -D / 2 - 0.05]], 0.006, 8);
  return g;
}

function hotCabinet(M, r) {
  const g = new THREE.Group(), W = 26 * IN, D = 31 * IN, H = 1.78;
  casters(g, M, W, D, 0.07);
  B(g, M.steel, W, H - 0.13, D, 0, 0.13, 0);
  B(g, M.steelIn, W - 0.06, H - 0.4, 0.02, 0, 0.2, D / 2 - 0.03);
  for (let i = 0; i < 5; i++) {
    const y = 0.28 + i * 0.25;
    B(g, M.chrome, W - 0.1, 0.008, D - 0.12, 0, y, 0);
    for (let k = 0; k < 2; k++) {
      B(g, M.foil, 0.3, 0.06, 0.25, -0.13 + k * 0.27, y + 0.01, 0.0);
      if (i % 2 === 0) for (let j = 0; j < 3; j++) addMesh(g, new THREE.CylinderGeometry(0.03, 0.03, 0.2, 12), M.foil, -0.13 + k * 0.27, y + 0.1, -0.08 + j * 0.08, 0, 0, Math.PI / 2);
    }
  }
  B(g, M.steelDark, W, 0.03, 0.03, 0, 0.18, D / 2 + 0.015); B(g, M.steelDark, W, 0.03, 0.03, 0, H - 0.25, D / 2 + 0.015);
  for (const s of [-1, 1]) B(g, M.steelDark, 0.03, H - 0.46, 0.03, s * (W / 2 - 0.015), 0.2, D / 2 + 0.015);
  B(g, M.glass, W - 0.05, H - 0.46, 0.01, 0, 0.2, D / 2 + 0.02).castShadow = false;
  vHandle(g, M, 0.5, W / 2 - 0.06, 0.95, D / 2 + 0.02);
  B(g, M.blackGloss, W - 0.04, 0.16, 0.01, 0, H - 0.2, D / 2 + 0.003);
  screen(g, screenTexture(128, 48, (c) => { c.fillStyle = '#060606'; c.fillRect(0, 0, 128, 48); c.fillStyle = '#ff3a1c'; c.font = 'bold 28px monospace'; c.textAlign = 'center'; c.fillText('165°F', 64, 34); }), 0.14, 0.05, -0.12, H - 0.12, D / 2 + 0.009);
  return g;
}

function shelving(M, W, D, H, levels, fill) {
  const g = new THREE.Group();
  H = levels[levels.length - 1] + 0.04;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    C(g, M.chrome, 0.0125, 0.0125, H, sx * (W / 2 - 0.0125), 0.02, sz * (D / 2 - 0.0125), 10);
    C(g, M.chrome, 0.02, 0.016, 0.025, sx * (W / 2 - 0.0125), 0, sz * (D / 2 - 0.0125), 10);
  }
  levels.forEach((y, i) => {
    const m = addMesh(g, scaleUV(new THREE.PlaneGeometry(W - 0.02, D - 0.02), (W - 0.02) / 0.3, (D - 0.02) / 0.3), M.wire, 0, y, 0, -Math.PI / 2);
    m.castShadow = true;
    for (const s of [-1, 1]) { barX(g, M.chrome, W - 0.02, 0.006, 0, y, s * (D / 2 - 0.01)); barZ(g, M.chrome, D - 0.02, 0.006, s * (W / 2 - 0.01), y, 0); }
    if (fill) fill(g, i, y);
  });
  return g;
}

function stockShelf(M, r, W, D, kinds) {
  return (g, i, y) => {
    if (i >= 4) return;
    let x = -W / 2 + 0.03;
    while (x < W / 2 - 0.12) {
      const k = kinds[Math.floor(r() * kinds.length)];
      let w = 0;
      if (k === 'cans') {
        w = 0.17; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const m = C(g, M.cans[Math.floor(r() * 4)], 0.078, 0.078, 0.178, x + 0.04 + a * 0.08, y + 0.005, -D / 4 + b * D / 2 - 0.0, 18); m.rotation.y = r() * 6; }
      } else if (k === 'container') {
        w = 0.22; const lidc = [M.red, M.bluePlastic, M.green, M.yellow][Math.floor(r() * 4)];
        for (let b = 0; b < 2; b++) { B(g, M.clear, 0.2, 0.18, 0.2, x + 0.1, y + 0.005, -D / 4 + b * D / 2); B(g, M.food[['beans', 'rice', 'pico', 'cheese', 'tomato'][Math.floor(r() * 5)]], 0.19, 0.1, 0.19, x + 0.1, y + 0.01, -D / 4 + b * D / 2); B(g, lidc, 0.205, 0.015, 0.205, x + 0.1, y + 0.185, -D / 4 + b * D / 2); }
      } else if (k === 'crate') {
        w = 0.36; B(g, M.greyPlastic, 0.34, 0.2, D - 0.06, x + 0.17, y + 0.005, 0);
        const prod = r() < 0.5 ? M.food.lettuceHead : M.food.tomato;
        for (let a = 0; a < 6; a++) addMesh(g, new THREE.SphereGeometry(prod === M.food.tomato ? 0.04 : 0.065, 12, 8), prod, x + 0.08 + (a % 3) * 0.1, y + 0.2, -0.12 + Math.floor(a / 3) * 0.24);
      } else if (k === 'cups') {
        w = 0.2; for (let a = 0; a < 3; a++) C(g, M.hdpe, 0.045, 0.035, 0.3 + r() * 0.1, x + 0.04 + a * 0.06, y + 0.005, 0, 14);
      } else if (k === 'foil') {
        w = 0.32; for (let a = 0; a < 2; a++) addMesh(g, new THREE.CylinderGeometry(0.035, 0.035, 0.3, 14), M.foil, x + 0.16, y + 0.04 + a * 0.07, 0, 0, 0, Math.PI / 2);
      } else {
        const bw = 0.24 + r() * 0.2, bh = 0.14 + r() * 0.2, bd = D * (0.7 + r() * 0.25); w = bw + 0.02;
        const m = B(g, M.box[k] || M.box.produce, bw, Math.min(bh, 0.38), bd, x + bw / 2, y + 0.005, 0); m.rotation.y = (r() - 0.5) * 0.06;
        if (r() < 0.35 && i < 3) B(g, M.box[k] || M.box.produce, bw * 0.9, bh * 0.6, bd * 0.9, x + bw / 2, y + 0.005 + bh, 0).rotation.y = (r() - 0.5) * 0.1;
      }
      x += w + 0.03 + r() * 0.04;
    }
  };
}

function dryStorage(M, r) {
  const g = new THREE.Group();
  const kinds = ['cans', 'beans', 'foil', 'cups', 'napkins', 'container', 'cans', 'tortilla'];
  const a = shelving(M, 1.22, 0.61, 1.88, [0.16, 0.6, 1.04, 1.48, 1.84], (q, i, y) => {
    if (i === 0) { for (let k = 0; k < 3; k++) B(q, M.sack, 0.42, 0.13, 0.55, 0, y + 0.005 + k * 0.13, 0).rotation.y = (k - 1) * 0.06; return; }
    stockShelf(M, r, 1.22, 0.61, kinds)(q, i, y);
  });
  a.position.set(-0.55, 0, 0); g.add(a);
  const b = shelving(M, 0.91, 0.61, 1.88, [0.16, 0.6, 1.04, 1.48, 1.84], (q, i, y) => {
    if (i === 0) { for (let k = 0; k < 2; k++) B(q, M.sack, 0.42, 0.13, 0.55, 0, y + 0.005 + k * 0.13, 0); return; }
    stockShelf(M, r, 0.91, 0.61, kinds)(q, i, y);
  });
  b.position.set(0.53, 0, 0); g.add(b);
  return g;
}

function trashCan(M, x, z, mat, p) {
  C(p, mat, 0.29, 0.25, 0.8, x, 0.07, z, 24);
  addMesh(p, new THREE.TorusGeometry(0.29, 0.02, 8, 28), mat, x, 0.87, z, Math.PI / 2, 0, 0);
  addMesh(p, new THREE.TorusGeometry(0.285, 0.012, 6, 28), M.black, x, 0.885, z, Math.PI / 2, 0, 0);
  C(p, M.greyPlastic, 0.3, 0.3, 0.06, x, 0.01, z, 24);
}

/* ------------------------------------------------------------ the kitchen */

/* ------------------------------------------------------------ store fixtures */

// Products on shelves are drawn as instances (one draw call for thousands).
class Instancer {
  constructor() { this.list = { box: [], bag: [], bottle: [], can: [], case: [] }; }
  add(kind, parent, x, y, z, sx, sy, sz, tile, ry = 0) { this.list[kind].push({ parent, x, y: y + sy / 2, z, sx, sy, sz, tile, ry }); }
  box(parent, x, y, z, w, h, d, tile, ry = 0) { this.add('box', parent, x, y, z, w, h, d, typeof tile === 'number' && tile < 64 ? tile : 0, ry); }
  build(M) {
    const out = [], o = new THREE.Object3D();
    const geos = { box: new THREE.BoxGeometry(1, 1, 1), case: new THREE.BoxGeometry(1, 1, 1), bag: bagGeometry(), bottle: latheUnit(BOTTLE), can: latheUnit(CAN) };
    const mats = { box: M.inst, bag: M.inst, case: M.instCase, bottle: M.instBottle, can: M.instCan };
    for (const [kind, list] of Object.entries(this.list)) {
      if (!list.length) continue;
      const geo = geos[kind], m = new THREE.InstancedMesh(geo, mats[kind], list.length), tiles = new Float32Array(list.length);
      list.forEach((e, i) => {
        o.position.set(e.x, e.y, e.z); o.rotation.set(0, e.ry, 0); o.scale.set(e.sx, e.sy, e.sz); o.updateMatrix();
        o.matrix.premultiply(e.parent.matrixWorld); m.setMatrixAt(i, o.matrix); tiles[i] = e.tile;
      });
      geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tiles, 1));
      m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false;
      out.push(m);
    }
    return out;
  }
}
// Chip bag: a box puffed out in the middle, crimped at the seals.
function bagGeometry() {
  const g = new THREE.BoxGeometry(1, 1, 1, 8, 10, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const fx = 1 - Math.pow(Math.abs(x) * 2, 4), fy = 1 - Math.pow(Math.abs(y) * 2, 3);
    p.setZ(i, z * (0.1 + 0.9 * Math.max(0, fx * fy)));
    if (Math.abs(y) > 0.45) p.setX(i, x * 1.04);
  }
  g.computeVertexNormals(); return g;
}
const BOTTLE = [[0, 0], [0.44, 0], [0.5, 0.03], [0.5, 0.5], [0.47, 0.6], [0.3, 0.74], [0.2, 0.82], [0.19, 0.86], [0.22, 0.87], [0.22, 0.98], [0.18, 1], [0, 1]];
const CAN = [[0, 0], [0.4, 0], [0.47, 0.02], [0.5, 0.07], [0.5, 0.9], [0.44, 0.97], [0.42, 1], [0, 1]];
function latheUnit(pts) {
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 16);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i));
  g.translate(0, -0.5, 0); return g;
}
const SNACKS = [0xd8352a, 0xf2b31b, 0xe86c1a, 0x1f63b5, 0x3c9b3c, 0x7a3d9e, 0xf1e6c8, 0x2b2b2b, 0xe8466e, 0x18a3b8, 0xc9c9c4, 0x8a5a2b];
const DRINKS = [0x7a1810, 0xd8352a, 0x1f63b5, 0x5cc2ea, 0x3c9b3c, 0xf2b31b, 0xe86c1a, 0x161616, 0xc4c8cc, 0x7a3d9e, 0xf4f4f0, 0x9bd04a];
const CASES = [0xc9a26a, 0xb5332a, 0x1f4f8f, 0xe8e2d0, 0x2f6b3a, 0x1a1a1a, 0xd7b24a];

// A run of product facings along x (axis 'x') or z (axis 'z'), standing on y.
function fillRun(P, parent, r, axis, a0, a1, y, fixed, depth, hMax) {
  const ry = axis === 'x' ? (fixed < 0 ? Math.PI : 0) : (fixed > 0 ? Math.PI / 2 : -Math.PI / 2);
  let a = a0;
  while (a < a1 - 0.07) {
    const bag = r() < 0.4 && hMax > 0.18, tile = Math.floor(r() * 64);
    const w = bag ? 0.14 + r() * 0.06 : 0.06 + r() * 0.08, h = Math.min(hMax, bag ? 0.2 + r() * 0.08 : 0.12 + r() * 0.2), n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n && a + w < a1; k++) {
      const c = a + w / 2;
      if (bag) for (let q = 0; q < 3; q++) {
        const off = (q - 1) * depth / 3, t = Math.min(0.09, depth / 3);
        if (axis === 'x') P.add('bag', parent, c, y, fixed + off, w - 0.01, h, t, tile, ry); else P.add('bag', parent, fixed + off, y, c, w - 0.01, h, t, tile, ry);
      }
      else if (axis === 'x') P.add('box', parent, c, y, fixed, w - 0.006, h, depth, tile, ry);
      else P.add('box', parent, fixed, y, c, w - 0.006, h, depth, tile, ry);
      a += w;
    }
  }
}

function gondola(M, P, r, L) {
  const g = new THREE.Group(), D = 0.9, H = 1.37;
  B(g, M.blackPaint, L, 0.1, D - 0.04, 0, 0, 0);
  B(g, M.gondolaBack, L, H - 0.1, 0.04, 0, 0.1, 0);
  for (const x of [-L / 2 + 0.025, L / 2 - 0.025]) B(g, M.gondola, 0.05, H, 0.07, x, 0, 0);
  const levels = [0.1, 0.45, 0.78, 1.1];
  for (const s of [-1, 1]) levels.forEach((y, i) => {
    B(g, M.gondola, L - 0.06, 0.022, D / 2 - 0.05, 0, y, s * (D / 4 + 0.01));
    B(g, M.blackGloss, L - 0.06, 0.035, 0.012, 0, y - 0.01, s * (D / 2 - 0.025));
    fillRun(P, g, r, 'x', -L / 2 + 0.05, L / 2 - 0.05, y + 0.022, s * (D / 4 + 0.02), D / 2 - 0.12, i === 3 ? 0.24 : 0.3, SNACKS);
  });
  for (const sx of [-1, 1]) {
    const ex = sx * (L / 2 + 0.29);
    B(g, M.blackPaint, 0.54, 0.1, D - 0.04, ex, 0, 0);
    B(g, M.gondolaBack, 0.04, H - 0.1, D - 0.04, sx * (L / 2 + 0.03), 0.1, 0);
    for (const y of [0.1, 0.52, 0.94]) {
      B(g, M.gondola, 0.52, 0.022, D - 0.06, ex, y, 0);
      fillRun(P, g, r, 'z', -D / 2 + 0.05, D / 2 - 0.05, y + 0.022, ex + sx * 0.02, 0.4, 0.3, SNACKS);
    }
    B(g, M.fascia, 0.5, 0.18, 0.02, ex, H + 0.1, 0).rotation.y = Math.PI / 2;
  }
  return g;
}

// Glass-door reach-in run: doors side by side along x, glass at z = 0 facing +z, shelves behind.
function coolerRun(M, P, r, n) {
  const g = new THREE.Group(), DW = 0.76, L = n * DW, top = 2.12;
  B(g, M.coolerFrame, L + 0.06, 0.12, 0.1, 0, 0, -0.03);
  B(g, M.coolerFrame, L + 0.06, 0.24, 0.12, 0, top, -0.04);
  B(g, M.coolerGlow, L - 0.06, 0.012, 0.02, 0, top - 0.004, -0.06).castShadow = false;
  for (let i = 0; i <= n; i++) B(g, M.coolerFrame, 0.05, top - 0.12, 0.1, -L / 2 + i * DW, 0.12, -0.03);
  for (let i = 0; i < n; i++) {
    const cx = -L / 2 + (i + 0.5) * DW, hs = i % 2 ? -1 : 1;
    B(g, M.glass, DW - 0.05, top - 0.14, 0.012, cx, 0.13, 0.02).castShadow = false;
    B(g, M.chrome, 0.022, 0.6, 0.03, cx + hs * (DW / 2 - 0.07), 0.8, 0.05);
    B(g, M.coolerGlow, 0.012, top - 0.2, 0.012, -L / 2 + i * DW + 0.035, 0.15, -0.085).castShadow = false;
    for (let k = 0; k < 5; k++) {
      const y = 0.34 + k * 0.33;
      B(g, M.coolerFrame, DW - 0.08, 0.014, 0.6, cx, y, -0.37);
      let x = cx - DW / 2 + 0.08;
      while (x < cx + DW / 2 - 0.08) {
        const can = r() < 0.3, tile = Math.floor(r() * 16), h = can ? 0.13 + r() * 0.04 : 0.2 + r() * 0.09, rad = can ? 0.033 : 0.03 + r() * 0.01;
        for (const z of [-0.12, -0.24, -0.36]) P.add(can ? 'can' : 'bottle', g, x, y + 0.014, z, rad * 2, h, rad * 2, tile, r() * 6);
        x += rad * 2 + 0.01;
      }
    }
    for (const z of [-0.2, -0.5]) P.add('case', g, cx, 0.13, z, DW - 0.12, 0.17, 0.26, Math.floor(r() * 16));
  }
  B(g, M.coolerBack, L, top - 0.12, 0.02, 0, 0.12, -0.72).castShadow = false;
  return g;
}

function bevBar(M, P, r, L) {
  // back against the wall at z = 0, customers at +z
  const g = new THREE.Group(), D = 0.76, top = 0.91;
  B(g, M.woodPanel, L, top - 0.1, D - 0.04, 0, 0.1, D / 2);
  B(g, M.blackPaint, L - 0.02, 0.1, D - 0.1, 0, 0, D / 2 - 0.03);
  B(g, M.quartz, L + 0.02, 0.04, D + 0.03, 0, top - 0.04, D / 2);
  B(g, M.pattern, L, 0.7, 0.012, 0, top, 0.006);
  B(g, M.blackPaint, L, 0.5, 0.06, 0, 2.15, 0.03);
  const menus = [['COFFEE', '#204649'], ['FOUNTAIN', '#c9351d'], ['FROZEN', '#1f5ea6'], ['HOT DRINKS', '#204649']];
  menus.forEach(([t, bg], i) => screen(g, signTexture([t, '— your prices here —'], { w: 512, h: 192, bg, fg: '#f5f3e6', size: 56, print: false }), L / 4 - 0.1, 0.42, -L / 2 + (i + 0.5) * L / 4, 2.4, 0.062));
  let x = -L / 2 + 0.3;
  const at = (w) => { const c = x + w / 2; x += w + 0.12; return c; };
  // cup and lid dispensers
  let cx = at(0.7);
  for (let i = 0; i < 4; i++) C(g, M.hdpe, 0.05, 0.045, 0.32, cx - 0.24 + i * 0.16, top, 0.32, 16);
  B(g, M.steel, 0.7, 0.36, 0.2, cx, top, 0.12);
  // bean-to-cup coffee machines
  for (let k = 0; k < 2; k++) {
    cx = at(0.42);
    B(g, M.blackGloss, 0.4, 0.74, 0.55, cx, top, 0.3);
    screen(g, screenTexture(96, 128, (c) => { c.fillStyle = '#0c1416'; c.fillRect(0, 0, 96, 128); ['#c9351d', '#eebe54', '#3bb3a0', '#f5f3e6'].forEach((col, i) => { c.fillStyle = col; rrect(c, 10, 12 + i * 28, 76, 20, 4); c.fill(); }); }), 0.16, 0.2, cx, top + 0.5, 0.576);
    B(g, M.steelIn, 0.2, 0.02, 0.12, cx, top + 0.06, 0.52);
  }
  // airpot brewers
  cx = at(1.0);
  B(g, M.steel, 1.0, 0.62, 0.45, cx, top, 0.24);
  for (let i = 0; i < 3; i++) { C(g, M.blackGloss, 0.075, 0.075, 0.36, cx - 0.32 + i * 0.32, top + 0.02, 0.5, 16); B(g, M.blackPaint, 0.1, 0.06, 0.06, cx - 0.32 + i * 0.32, top + 0.33, 0.58); }
  // condiment caddy
  cx = at(0.7);
  B(g, M.steel, 0.7, 0.16, 0.4, cx, top, 0.4);
  for (let i = 0; i < 5; i++) B(g, M.food[['cream', 'tortilla', 'cheese', 'cream', 'egg'][i]], 0.11, 0.02, 0.32, cx - 0.28 + i * 0.14, top + 0.15, 0.4);
  // fountain dispenser with lit merchandiser
  cx = at(1.3);
  B(g, M.steel, 1.3, 0.18, 0.7, cx, top, 0.38);
  B(g, M.blackGloss, 1.3, 0.62, 0.62, cx, top + 0.18, 0.33);
  screen(g, screenTexture(512, 160, (c) => { c.fillStyle = '#0b0d0e'; c.fillRect(0, 0, 512, 160); for (let i = 0; i < 10; i++) { c.fillStyle = '#' + DRINKS[i].toString(16).padStart(6, '0'); rrect(c, 8 + i * 50, 18, 44, 124, 8); c.fill(); } }), 1.24, 0.38, cx, top + 0.53, 0.642);
  for (let i = 0; i < 10; i++) { B(g, M.chrome, 0.04, 0.08, 0.05, cx - 0.56 + i * 0.125, top + 0.2, 0.66); }
  B(g, M.louver, 1.2, 0.006, 0.4, cx, top + 0.18, 0.4);
  // ice dispenser
  cx = at(0.55);
  B(g, M.steel, 0.55, 0.85, 0.6, cx, top, 0.32);
  B(g, M.blackGloss, 0.3, 0.2, 0.01, cx, top + 0.5, 0.625);
  // frozen drink machine: three clear barrels
  cx = at(1.2);
  B(g, M.steel, 1.2, 0.32, 0.62, cx, top, 0.33);
  ['#c4261c', '#1f5ea6', '#7ac143'].forEach((col, i) => {
    const bx = cx - 0.38 + i * 0.38;
    addMesh(g, new THREE.CylinderGeometry(0.15, 0.15, 0.5, 20), M.clear, bx, top + 0.5, 0.33, Math.PI / 2, 0, 0);
    addMesh(g, new THREE.CylinderGeometry(0.135, 0.135, 0.46, 20), new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 }), bx, top + 0.49, 0.33, Math.PI / 2, 0, 0);
    B(g, M.blackGloss, 0.1, 0.12, 0.08, bx, top + 0.33, 0.6);
  });
  // lids and straws
  cx = at(0.6);
  B(g, M.steel, 0.6, 0.3, 0.35, cx, top, 0.3);
  for (let i = 0; i < 3; i++) C(g, M.hdpe, 0.045, 0.045, 0.2, cx - 0.18 + i * 0.18, top + 0.3, 0.3, 14);
  return g;
}

function hotIsland(M, P, r) {
  // long axis x (3.1 m), customers on both sides; +z side: hot case and roller grill, -z side: condiments
  const g = new THREE.Group(), L = 3.1, D = 1.2, top = 0.91;
  B(g, M.blackPaint, L - 0.04, 0.1, D - 0.08, 0, 0, 0);
  B(g, M.woodPanel, L, top - 0.1, D, 0, 0.1, 0);
  B(g, M.quartz, L + 0.04, 0.04, D + 0.04, 0, top - 0.04, 0);
  // heated self-serve case
  const hx = -0.75;
  B(g, M.steel, 1.4, 0.08, 0.6, hx, top, 0.25);
  B(g, M.glass, 1.4, 0.55, 0.01, hx, top + 0.08, 0.55).castShadow = false;
  B(g, M.glass, 1.4, 0.01, 0.58, hx, top + 0.63, 0.25).castShadow = false;
  for (const s of [-1, 1]) B(g, M.steel, 0.02, 0.55, 0.6, hx + s * 0.7, top + 0.08, 0.25);
  B(g, M.lamp, 1.3, 0.01, 0.06, hx, top + 0.62, 0.25).castShadow = false;
  for (let i = 0; i < 2; i++) {
    const y = top + 0.1 + i * 0.26;
    B(g, M.chrome, 1.36, 0.01, 0.5, hx, y, 0.25);
    for (let k = 0; k < 6; k++) {
      const px2 = hx - 0.55 + k * 0.22;
      if (i === 0) { const t = addMesh(g, new THREE.CylinderGeometry(0.09, 0.09, 0.012, 3), M.food.cheese, px2, y + 0.02, 0.25, 0, r() * 6, 0); t.scale.set(1, 1, 1.4); }
      else for (let j = 0; j < 3; j++) addMesh(g, new THREE.SphereGeometry(0.03, 8, 6), M.food.chorizo, px2 + (j - 1) * 0.05, y + 0.03, 0.22 + (j % 2) * 0.06);
    }
  }
  // roller grill
  const rx = 0.55;
  B(g, M.steel, 0.9, 0.12, 0.55, rx, top, 0.25);
  for (let i = 0; i < 9; i++) {
    addMesh(g, new THREE.CylinderGeometry(0.014, 0.014, 0.8, 10), M.chrome, rx, top + 0.135, 0.07 + i * 0.045, 0, 0, Math.PI / 2);
    if (i % 2 === 0) addMesh(g, new THREE.CylinderGeometry(0.013, 0.013, 0.16, 10), M.food.meat, rx - 0.2 + (i % 4) * 0.12, top + 0.155, 0.07 + i * 0.045, 0, 0, Math.PI / 2);
  }
  B(g, M.glass, 0.9, 0.3, 0.01, rx, top + 0.12, 0.54).castShadow = false;
  B(g, M.steel, 0.4, 0.28, 0.45, 1.25, top, 0.25);
  // condiment side
  B(g, M.steel, 1.6, 0.14, 0.4, 0.2, top, -0.3);
  for (let i = 0; i < 6; i++) { C(g, M.blackGloss, 0.04, 0.04, 0.18, -0.4 + i * 0.22, top + 0.14, -0.3, 12); C(g, M.chrome, 0.01, 0.01, 0.08, -0.4 + i * 0.22, top + 0.32, -0.3, 8); }
  B(g, M.smoke, 0.22, 0.32, 0.16, -1.2, top, -0.3);
  return g;
}

function openCase(M, P, r) {
  // open-air grab-and-go merchandiser, front at +z
  const g = new THREE.Group(), W = 1.83, D = 0.85, H = 2.0;
  B(g, M.blackPaint, W, H, 0.08, 0, 0, -D / 2 + 0.04);
  for (const s of [-1, 1]) B(g, M.coolerFrame, 0.05, H, D, s * (W / 2 - 0.025), 0, 0);
  B(g, M.coolerFrame, W, 0.18, D, 0, H - 0.18, 0);
  B(g, M.coolerFrame, W, 0.45, D, 0, 0, 0);
  B(g, M.coolerGlow, W - 0.12, 0.01, 0.03, 0, H - 0.19, D / 2 - 0.06).castShadow = false;
  for (let k = 0; k < 4; k++) {
    const y = 0.45 + k * 0.33;
    B(g, M.coolerFrame, W - 0.1, 0.015, D - 0.18, 0, y, -0.04);
    B(g, M.coolerGlow, W - 0.12, 0.008, 0.02, 0, y + 0.3, -0.38).castShadow = false;
    for (let i = 0; i < 9; i++) {
      const x = -W / 2 + 0.14 + i * 0.19, c = [0xe9e4d6, 0x9bd04a, 0xf2b31b, 0xd8352a, 0xf4f4f0][Math.floor(r() * 5)];
      for (const z of [0.12, -0.08, -0.28]) P.box(g, x, y + 0.015, z, 0.15, k === 3 ? 0.18 : 0.1, 0.14, Math.floor(r() * 64));
    }
  }
  return g;
}

function bakeryIsland(M, P, r) {
  const g = new THREE.Group(), L = 1.7, D = 1.0, top = 0.91;
  B(g, M.woodPanel, L, top - 0.1, D, 0, 0.1, 0);
  B(g, M.blackPaint, L - 0.04, 0.1, D - 0.08, 0, 0, 0);
  B(g, M.quartz, L + 0.04, 0.04, D + 0.04, 0, top - 0.04, 0);
  for (const s of [-1, 1]) {
    B(g, M.steel, L - 0.1, 0.04, 0.42, 0, top, s * 0.24);
    B(g, M.glass, L - 0.1, 0.4, 0.01, 0, top + 0.04, s * 0.45).castShadow = false;
    B(g, M.glass, L - 0.1, 0.01, 0.42, 0, top + 0.44, s * 0.24).castShadow = false;
    for (let t = 0; t < 2; t++) {
      const y = top + 0.06 + t * 0.2;
      B(g, M.hdpe, L - 0.16, 0.01, 0.36, 0, y, s * 0.24);
      for (let i = 0; i < 10; i++) {
        const glaze = [0xf3e3c3, 0x6b3a22, 0xf28db2, 0xe8c27a][Math.floor(r() * 4)];
        addMesh(g, new THREE.TorusGeometry(0.035, 0.018, 8, 16), new THREE.MeshStandardMaterial({ color: glaze, roughness: 0.5 }), -L / 2 + 0.16 + i * 0.15, y + 0.03, s * 0.24 + (i % 2 ? 0.07 : -0.07), Math.PI / 2, 0, 0);
      }
    }
  }
  return g;
}

function checkoutCounter(M, P, r, L) {
  // along x; customers at +z, staff at -z
  const g = new THREE.Group(), D = 0.8, top = 0.97;
  B(g, M.blackPaint, L - 0.04, 0.1, D - 0.08, 0, 0, 0);
  B(g, M.woodPanel, L, top - 0.1, D, 0, 0.1, 0);
  B(g, M.quartz, L + 0.04, 0.04, D + 0.06, 0, top - 0.04, 0);
  // impulse shelves on the customer face
  for (let k = 0; k < 2; k++) {
    const y = 0.3 + k * 0.28;
    B(g, M.gondola, L - 0.4, 0.02, 0.16, 0, y, D / 2 + 0.08);
    fillRun(P, g, r, 'x', -L / 2 + 0.25, L / 2 - 0.25, y + 0.02, D / 2 + 0.08, 0.12, 0.16, SNACKS);
  }
  for (const x of [-L / 4, L / 4]) {
    B(g, M.blackGloss, 0.05, 0.3, 0.05, x, top, -0.15);
    const scr = B(g, M.blackGloss, 0.38, 0.28, 0.03, x, top + 0.3, -0.15); scr.rotation.x = -0.25;
    screen(g, screenTexture(160, 112, (c) => { c.fillStyle = '#0e1a1c'; c.fillRect(0, 0, 160, 112); c.fillStyle = '#204649'; c.fillRect(0, 0, 160, 22); c.fillStyle = '#f5f3e6'; for (let i = 0; i < 5; i++) c.fillRect(10, 32 + i * 14, 90, 6); c.fillStyle = '#eebe54'; c.fillRect(110, 32, 40, 60); }), 0.35, 0.24, x, top + 0.44, -0.13);
    B(g, M.blackGloss, 0.12, 0.1, 0.16, x + 0.3, top, 0.2);
    B(g, M.darkGlass, 0.3, 0.012, 0.3, x - 0.45, top, 0.0);
  }
  // lottery ticket dispenser
  B(g, M.clear, 0.5, 0.3, 0.12, 0, top, 0.25);
  for (let i = 0; i < 6; i++) B(g, new THREE.MeshStandardMaterial({ color: [0xd8352a, 0xf2b31b, 0x1f63b5, 0x3c9b3c, 0x7a3d9e, 0xe86c1a][i], roughness: 0.4 }), 0.07, 0.24, 0.08, -0.2 + i * 0.08, top + 0.02, 0.25);
  return g;
}

function backBar(M, L) {
  // back against the wall at z = 0, facing +z
  const g = new THREE.Group(), D = 0.6;
  B(g, M.woodPanel, L, 0.86, D, 0, 0.1, D / 2);
  B(g, M.blackPaint, L - 0.02, 0.1, D - 0.06, 0, 0, D / 2 - 0.03);
  B(g, M.quartz, L + 0.02, 0.04, D + 0.02, 0, 0.96, D / 2);
  B(g, M.blackPaint, L, 1.15, 0.3, 0, 1.2, 0.15);
  const tb = addMesh(g, scaleUV(new THREE.PlaneGeometry(L - 0.1, 1.05), (L - 0.1) / 1.8, 1), M.tobacco, 0, 1.75, 0.302); tb.castShadow = false;
  for (let i = 0; i < 3; i++) {
    B(g, M.blackGloss, L / 3 - 0.12, 0.52, 0.06, -L / 3 + i * L / 3, 2.42, 0.06);
    screen(g, screenTexture(320, 180, (c) => { c.fillStyle = ['#204649', '#c9351d', '#1f5ea6'][i]; c.fillRect(0, 0, 320, 180); c.fillStyle = '#f5f3e6'; c.font = 'bold 30px Arial'; c.textAlign = 'center'; c.fillText(['DEALS', 'LOTTERY', 'ASK US'][i], 160, 100); }), L / 3 - 0.18, 0.46, -L / 3 + i * L / 3, 2.68, 0.092);
  }
  B(g, M.greyPlastic, 0.4, 0.34, 0.35, L / 2 - 0.4, 0.96, 0.3);
  return g;
}

function kiosk(M) {
  const g = new THREE.Group();
  B(g, M.blackPaint, 0.5, 0.9, 0.45, 0, 0, 0);
  const s = B(g, M.blackGloss, 0.42, 0.32, 0.04, 0, 1.0, -0.05); s.rotation.x = -0.35;
  screen(g, screenTexture(128, 96, (c) => { c.fillStyle = '#0e1a1c'; c.fillRect(0, 0, 128, 96); c.fillStyle = '#eebe54'; c.font = 'bold 15px Arial'; c.fillText('SCAN ITEMS', 14, 30); c.fillStyle = '#3bb3a0'; rrect(c, 14, 54, 100, 26, 6); c.fill(); }), 0.38, 0.27, 0, 1.15, 0.0);
  B(g, M.darkGlass, 0.4, 0.02, 0.35, 0, 0.9, 0.0);
  B(g, M.steel, 0.4, 0.02, 0.35, 0.48, 0.8, 0.0);
  C(g, M.chrome, 0.012, 0.012, 0.8, 0.48, 0, 0, 8);
  return g;
}

function seatingCounter(M, L, n) {
  // along x, against the windows at z = 0, people sit at +z
  const g = new THREE.Group(), top = 1.05;
  B(g, M.woodPanel, L, 0.05, 0.45, 0, top - 0.05, 0.25);
  for (const x of [-L / 2 + 0.2, 0, L / 2 - 0.2]) B(g, M.blackPaint, 0.06, top - 0.05, 0.06, x, 0, 0.1);
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * L / n;
    C(g, M.blackPaint, 0.22, 0.24, 0.03, x, 0, 0.72, 20);
    C(g, M.chrome, 0.025, 0.025, 0.7, x, 0.03, 0.72, 10);
    addMesh(g, new THREE.TorusGeometry(0.17, 0.012, 6, 20), M.chrome, x, 0.3, 0.72, Math.PI / 2, 0, 0);
    C(g, M.blackPaint, 0.19, 0.19, 0.06, x, 0.73, 0.72, 20);
  }
  return g;
}

function toilet(M) {
  // against a wall at z = 0, facing +z
  const g = new THREE.Group();
  B(g, M.ceramic, 0.42, 0.36, 0.18, 0, 0.42, 0.11);
  const bowl = new THREE.LatheGeometry([new THREE.Vector2(0.1, 0), new THREE.Vector2(0.14, 0.12), new THREE.Vector2(0.2, 0.35), new THREE.Vector2(0.19, 0.4), new THREE.Vector2(0.001, 0.4)], 20);
  const b = addMesh(g, bowl, M.ceramic, 0, 0, 0.42); b.scale.z = 1.3;
  addMesh(g, new THREE.TorusGeometry(0.16, 0.025, 8, 20), M.ceramic, 0, 0.42, 0.42, Math.PI / 2, 0, 0).scale.y = 1.3;
  barX(g, M.chrome, 0.9, 0.018, 0.0, 0.85, 0.06);
  return g;
}
function urinal(M) {
  const g = new THREE.Group();
  B(g, M.ceramic, 0.38, 0.65, 0.3, 0, 0.45, 0.15);
  B(g, M.steelIn, 0.28, 0.4, 0.02, 0, 0.55, 0.31);
  C(g, M.chrome, 0.015, 0.015, 0.3, 0, 1.1, 0.04, 8);
  return g;
}
function vanity(M) {
  // wall-hung sink with mirror and dryer, wall at z = 0
  const g = new THREE.Group();
  B(g, M.ceramic, 0.55, 0.16, 0.45, 0, 0.72, 0.23);
  B(g, M.steelIn, 0.4, 0.004, 0.3, 0, 0.88, 0.25);
  B(g, M.chrome, 0.05, 0.14, 0.05, 0, 0.88, 0.06);
  tube(g, M.chrome, [[0, 1.0, 0.06], [0, 1.02, 0.16], [0, 0.96, 0.2]], 0.012, 8);
  B(g, M.mirror, 0.6, 0.9, 0.012, 0, 1.15, 0.006);
  B(g, M.hdpe, 0.12, 0.2, 0.1, 0.42, 1.0, 0.05);
  B(g, M.greyPlastic, 0.26, 0.32, 0.16, 0.52, 1.25, 0.08);
  return g;
}

function officeSet(M) {
  // desk against the wall at z = 0
  const g = new THREE.Group();
  B(g, M.desk, 1.5, 0.04, 0.7, 0, 0.72, 0.35);
  for (const sx of [-1, 1]) B(g, M.steelDark, 0.04, 0.72, 0.6, sx * 0.7, 0, 0.35);
  B(g, M.blackGloss, 0.55, 0.34, 0.03, 0.1, 0.9, 0.12);
  B(g, M.blackGloss, 0.08, 0.14, 0.08, 0.1, 0.76, 0.12);
  screen(g, screenTexture(128, 80, (c) => { c.fillStyle = '#16302f'; c.fillRect(0, 0, 128, 80); c.fillStyle = '#eebe54'; c.fillRect(10, 10, 60, 8); c.fillStyle = '#f5f3e6'; for (let i = 0; i < 4; i++) c.fillRect(10, 26 + i * 12, 100, 5); }), 0.5, 0.3, 0.1, 1.07, 0.137);
  C(g, M.black, 0.25, 0.28, 0.05, 0.1, 0, 0.95, 16);
  C(g, M.chrome, 0.025, 0.025, 0.4, 0.1, 0.05, 0.95, 8);
  B(g, M.black, 0.48, 0.08, 0.46, 0.1, 0.45, 0.95);
  B(g, M.black, 0.46, 0.5, 0.06, 0.1, 0.53, 1.18);
  B(g, M.paintGrey, 0.5, 0.75, 0.55, -1.15, 0, 0.3);
  B(g, M.iron, 0.55, 0.65, 0.55, 1.15, 0, 0.3);
  C(g, M.chrome, 0.05, 0.05, 0.02, 1.15, 0.38, 0.58, 16).rotation.x = Math.PI / 2;
  return g;
}

// Back-room walk-in: freezer behind (north), cooler in front (south), entered from the south face.
function walkInBack(M, r, roof) {
  const { x0, x1, z0, z1, h, t, split } = WALKIN;
  const shell = new THREE.Group(), cooler = new THREE.Group(), freezer = new THREE.Group();
  const P = (g, a, b, c, d, e, f) => worldBox(g, M.walkin, a, b, c, d, e, f, 0.6);
  const door = { a: x0 + 0.9, b: x0 + 1.76 }, dh = 1.98;
  P(shell, x0, x1, 0, h, z0, z0 + t);
  P(shell, x1 - t, x1, 0, h, z0, z1);
  P(shell, x0, x0 + t, 0, h, z0, z1);
  P(shell, x0, door.a, 0, h, z1 - t, z1); P(shell, door.b, x1, 0, h, z1 - t, z1); P(shell, door.a, door.b, dh, h, z1 - t, z1);
  P(shell, x0 + t, x0 + 0.95, 0, h, split - t / 2, split + t / 2); P(shell, x0 + 1.81, x1 - t, 0, h, split - t / 2, split + t / 2); P(shell, x0 + 0.95, x0 + 1.81, dh, h, split - t / 2, split + t / 2);
  worldBox(shell, M.walkinTrim, x1, x1 + 0.04, 0, h, z1 - 0.04, z1 + 0.04);
  worldBox(shell, M.cove, x1, x1 + 0.012, 0, 0.12, z0, z1);
  for (const [a, b] of [[x0, door.a], [door.b, x1]]) worldBox(shell, M.cove, a, b, 0, 0.12, z1, z1 + 0.012);
  // roof with condensing unit
  P(roof, x0, x1, h, h + t, z0, z1);
  B(roof, M.paintBlue, 0.9, 0.48, 0.5, (x0 + x1) / 2, h + t, z0 + 0.5);
  addMesh(roof, new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), M.black, (x0 + x1) / 2, h + t + 0.24, z0 + 0.76, Math.PI / 2, 0, 0);
  // open cooler door (swung out into the back room) and strip curtain
  const pivot = new THREE.Group(); pivot.position.set(door.a, 0, z1); pivot.rotation.y = -1.25; cooler.add(pivot);
  const w = door.b - door.a;
  B(pivot, M.walkin, w, dh - 0.02, 0.1, w / 2, 0.01, -0.04);
  B(pivot, M.tread, w - 0.04, 0.32, 0.004, w / 2, 0.02, 0.012);
  B(pivot, M.chrome, 0.12, 0.05, 0.05, w - 0.12, 1.02, 0.035);
  for (let i = 0; i < 5; i++) { const m = B(cooler, M.curtain, 0.2, dh - 0.06, 0.003, door.a + 0.09 + i * 0.17, 0.02, z1 - t - 0.02 - (i % 2) * 0.004); m.castShadow = false; }
  screen(shell, signTexture(['COOLER'], { w: 512, h: 128, bg: '#204649', fg: '#f5f3e6', size: 70 }), 0.5, 0.125, (door.a + door.b) / 2 - 0.15, dh + 0.2, z1 + 0.004);
  B(shell, M.blackGloss, 0.16, 0.08, 0.03, (door.a + door.b) / 2 + 0.35, dh + 0.16, z1 + 0.015);
  screen(shell, screenTexture(128, 64, (c) => { c.fillStyle = '#030607'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ff3a1c'; c.font = 'bold 34px monospace'; c.textAlign = 'center'; c.fillText('36°F', 64, 44); }), 0.13, 0.06, (door.a + door.b) / 2 + 0.35, dh + 0.2, z1 + 0.031);
  // closed freezer door in the divider
  B(freezer, M.walkin, 0.84, dh - 0.02, 0.1, x0 + 1.38, 0.01, split);
  B(freezer, M.chrome, 0.05, 0.05, 0.12, x0 + 1.7, 1.02, split + 0.08);
  // shelving and evaporators
  const lv = [0.18, 0.62, 1.06, 1.5, 1.86];
  const cK = ['produce', 'cheese', 'eggs', 'meat', 'container', 'crate', 'tortilla'], fK = ['fries', 'chicken', 'meat', 'tortilla'];
  const s1 = shelving(M, 1.22, 0.46, 0, lv, stockShelf(M, r, 1.22, 0.46, cK)); s1.position.set(x0 + t + 0.25, 0, (split + z1) / 2 - 0.05); s1.rotation.y = Math.PI / 2; cooler.add(s1);
  const s2 = shelving(M, 1.22, 0.46, 0, lv, stockShelf(M, r, 1.22, 0.46, cK)); s2.position.set(x1 - t - 0.25, 0, (split + z1) / 2 - 0.05); s2.rotation.y = -Math.PI / 2; cooler.add(s2);
  const s3 = shelving(M, 1.83, 0.46, 0, lv, stockShelf(M, r, 1.83, 0.46, fK)); s3.position.set((x0 + x1) / 2, 0, z0 + t + 0.25); freezer.add(s3);
  for (const [g, zc] of [[cooler, (split + z1) / 2], [freezer, (z0 + split) / 2]]) {
    B(g, M.hdpe, 0.3, 0.28, 0.8, x1 - t - 0.16, 2.0, zc);
    C(roof, M.lamp, 0.05, 0.05, 0.08, (x0 + x1) / 2, h - 0.1, zc, 16);
  }
  return { shell, cooler, freezer };
}

function storefront(M, g, a, b, doors) {
  // glazed storefront in the south wall between x = a and x = b; doors: [{ a, b }]
  const z0 = Z1, z1 = Z1 + EW, zc = Z1 + EW / 2, top = 2.9;
  const solid = (x0, x1, y0, y1) => { const m = worldBox(g, M.frp, x0, x1, y0, y1, z0, z1, 0.6); m.castShadow = false; };
  solid(a, b, top, H_DECK);
  const cuts = [...doors].sort((p, q) => p.a - q.a);
  let s = a;
  const pane = (x0, x1) => {
    if (x1 - x0 < 0.05) return;
    worldBox(g, M.mullion, x0, x1, 0, 0.25, z0, z1).castShadow = false;
    const n = Math.max(1, Math.round((x1 - x0) / 1.5)), w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const gx = x0 + i * w;
      const gl = worldBox(g, M.storeGlass, gx + 0.03, gx + w - 0.03, 0.25, top - 0.05, zc - 0.006, zc + 0.006); gl.castShadow = false;
    }
    for (let i = 0; i <= n; i++) worldBox(g, M.mullion, x0 + i * w - 0.03, x0 + i * w + 0.03, 0.25, top, zc - 0.06, zc + 0.06).castShadow = false;
    for (const y of [2.3, top - 0.05]) worldBox(g, M.mullion, x0, x1, y - 0.03, y + 0.03, zc - 0.06, zc + 0.06).castShadow = false;
  };
  for (const d of cuts) {
    pane(s, d.a);
    // door pair (or single) with transom
    const n = d.b - d.a > 1.2 ? 2 : 1, w = (d.b - d.a) / n;
    for (let i = 0; i < n; i++) {
      const x0 = d.a + i * w;
      worldBox(g, M.mullion, x0, x0 + w, 0, 2.2, zc - 0.03, zc + 0.03).castShadow = false;
      const gl = worldBox(g, M.storeGlass, x0 + 0.08, x0 + w - 0.08, 0.2, 2.1, zc - 0.035, zc + 0.035); gl.castShadow = false;
      barX(g, M.chrome, w - 0.2, 0.016, x0 + w / 2, 1.05, zc - 0.08);
    }
    worldBox(g, M.mullion, d.a, d.b, 2.2, 2.28, zc - 0.06, zc + 0.06).castShadow = false;
    worldBox(g, M.storeGlass, d.a + 0.04, d.b - 0.04, 2.28, top - 0.05, zc - 0.006, zc + 0.006).castShadow = false;
    worldBox(g, M.mullion, d.a - 0.04, d.a, 0, top, zc - 0.06, zc + 0.06).castShadow = false;
    worldBox(g, M.mullion, d.b, d.b + 0.04, 0, top, zc - 0.06, zc + 0.06).castShadow = false;
    s = d.b;
  }
  pane(s, b);
}

function buildKitchen(M, X) {
  const r = rng(42), P = new Instancer();
  const groups = {};
  for (const k of ['main', 'N', 'S', 'E', 'W', 'stubN', 'stubS', 'stubE', 'stubW', 'ceiling', 'deck', 'roof']) groups[k] = new THREE.Group();
  const items = [], occ = [], shadowsFor = [];
  const reg = (id, obj, { face = [0, 0, 1], anchor, box, cut } = {}) => items.push({ id, ...ITEMS[id], obj, face: new THREE.Vector3(...face), anchor, box, cut });
  const put = (parent, obj, x, z, ry = 0, y = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; parent.add(obj); return obj; };
  const addOcc = (x0, x1, z0, z1, h, key = null) => occ.push({ x0, x1, z0, z1, h, key });
  const main = groups.main;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------------- floors ---------------- */
  const floor = new THREE.Group();
  const fl = (mat, x0, x1, z0, z1, rx, rz, y = 0) => {
    const m = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(x1 - x0, z1 - z0), (x1 - x0) / rx, (z1 - z0) / rz), mat);
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; floor.add(m);
  };
  fl(M.plank, X0, X1, Z0, Z1, 1.2192, 0.6096);
  fl(M.tile, BOH.x0, BOH.x1, BOH.z0, BOH.z1, 0.6096, 0.6096, 0.002);
  fl(M.tile, KW - 0.06, KW + KF.z1, KZC - KF.x1, KZC - KF.x0, 0.6096, 0.6096, 0.002);
  fl(M.vct, X0, px(19), pz(5.5), pz(20.5), 1.2192, 1.2192, 0.002);
  fl(M.concrete, VAULT_X + 0.05, X1, Z0, Z1, 2, 2, 0.002);
  fl(M.concrete, X0 - EW, X1 + EW, Z1 + EW, Z1 + 2.6, 1.5, 1.5, 0.0);

  /* ---------------- exterior walls ---------------- */
  const H = H_DECK, T = EW;
  const walls = [
    { k: 'N', axis: 'x', at: Z0, dir: -1, from: X0 - T, to: X1 + T, lo: X0, hi: X1, openings: [{ a: px(22), b: px(25), y0: 0, y1: 2.13 }] },
    { k: 'W', axis: 'z', at: X0, dir: -1, from: Z0, to: Z1, lo: Z0, hi: Z1, openings: [] },
    { k: 'E', axis: 'z', at: X1, dir: 1, from: Z0, to: Z1, lo: Z0, hi: Z1, openings: [{ a: pz(20), b: pz(23), y0: 0, y1: 2.13 }] }
  ];
  for (const w of walls) {
    const g = groups[w.k], stub = groups['stub' + w.k];
    const t0 = w.dir > 0 ? w.at : w.at - T, t1 = w.dir > 0 ? w.at + T : w.at;
    const piece = (a, b, y0, y1, target, mat = M.frp) => {
      if (b - a < 0.001) return null;
      const m = w.axis === 'x' ? worldBox(target, mat, a, b, y0, y1, t0, t1, 0.6) : worldBox(target, mat, t0, t1, y0, y1, a, b, 0.6);
      m.castShadow = false; return m;
    };
    const cuts = [...w.openings].sort((p, q) => p.a - q.a);
    let s = w.from;
    for (const o of cuts) {
      piece(s, o.a, 0, H, g); piece(s, o.a, 0, 0.18, stub); piece(s, o.a, 0.18, 0.186, stub, M.cut);
      piece(o.a, o.b, o.y1, H, g); s = o.b;
    }
    piece(s, w.to, 0, H, g); piece(s, w.to, 0, 0.18, stub); piece(s, w.to, 0.18, 0.186, stub, M.cut);
    const c0 = w.dir > 0 ? w.at - 0.012 : w.at, c1 = w.dir > 0 ? w.at : w.at + 0.012;
    let cs = w.lo;
    const base = (a, b) => { const m = w.axis === 'x' ? worldBox(g, M.blackPaint, a, b, 0, 0.1, c0, c1) : worldBox(g, M.blackPaint, c0, c1, 0, 0.1, a, b); m.castShadow = false; };
    for (const o of cuts) { base(cs, o.a); cs = o.b; }
    base(cs, w.hi);
    if (w.axis === 'x') addOcc(w.from, w.to, t0, t1, H, w.k); else addOcc(t0, t1, w.from, w.to, H, w.k);
  }
  // south: solid at the back-room and utility ends, glazed storefront between, two entries
  {
    const g = groups.S, stub = groups.stubS;
    for (const [a, b] of [[X0 - T, px(19)], [VAULT_X, X1 + T]]) worldBox(g, M.frp, a, b, 0, H, Z1, Z1 + T, 0.6).castShadow = false;
    const doors = [{ a: px(37.5), b: px(43.5) }];
    storefront(M, g, px(19), VAULT_X, doors);
    worldBox(stub, M.frp, X0 - T, X1 + T, 0, 0.18, Z1, Z1 + T).castShadow = false;
    worldBox(stub, M.cut, X0 - T, X1 + T, 0.18, 0.186, Z1, Z1 + T).castShadow = false;
    addOcc(X0 - T, px(19), Z1, Z1 + T, H, 'S'); addOcc(VAULT_X, X1 + T, Z1, Z1 + T, H, 'S');
    const ent = new THREE.Group(); main.add(ent);
    reg('entrance', ent, { face: [0, 0, -1], anchor: [px(40.5), 2.65, Z1 - 0.25], box: new THREE.Box3(V(px(37.5), 0, Z1 - 0.1), V(px(43.5), 2.3, Z1 + T)), cut: 'S' });
    B(main, M.rubber, 1.8, 0.01, 1.2, px(40.5), 0, Z1 - 0.65).castShadow = false;
    for (let x = px(20); x < VAULT_X - 0.3; x += 1.8) {
      if (doors.some((d) => x > d.a - 0.3 && x < d.b + 0.3)) continue;
      C(main, M.yellow, 0.085, 0.085, 0.9, x, 0, Z1 + T + 0.55, 16);
    }
  }

  /* ---------------- interior walls ---------------- */
  const iwall = (axis, at, from, to, openings = [], h = H_ACT, mat = M.frp, coveMat = M.cove) => {
    const t0 = at - IW / 2, t1 = at + IW / 2;
    const piece = (a, b, y0, y1) => {
      if (b - a < 0.001 || y1 - y0 < 0.001) return;
      const m = axis === 'x' ? worldBox(main, mat, a, b, y0, y1, t0, t1, 0.6) : worldBox(main, mat, t0, t1, y0, y1, a, b, 0.6);
      m.castShadow = false;
    };
    const cuts = [...openings].sort((p, q) => p.a - q.a);
    let s = from;
    for (const o of cuts) { piece(s, o.a, 0, h); if (o.y0 > 0) piece(o.a, o.b, 0, o.y0); piece(o.a, o.b, o.y1, h); s = o.b; }
    piece(s, to, 0, h);
    s = from;
    for (const o of cuts) { if (axis === 'x') addOcc(s, o.a, t0, t1, h); else addOcc(t0, t1, s, o.a, h); s = o.b; }
    if (axis === 'x') addOcc(s, to, t0, t1, h); else addOcc(t0, t1, s, to, h);
    if (coveMat) for (const [q0, q1] of [[t0 - 0.01, t0], [t1, t1 + 0.01]]) {
      let c = from;
      const cv = (a, b) => { if (b - a < 0.001) return; const m = axis === 'x' ? worldBox(main, coveMat, a, b, 0, 0.12, q0, q1) : worldBox(main, coveMat, q0, q1, 0, 0.12, a, b); m.castShadow = false; };
      for (const o of cuts.filter((o) => o.y0 === 0)) { cv(c, o.a); c = o.b; }
      cv(c, to);
    }
  };
  const kSouth = KZC - KF.x0 + IW / 2, kStore = KW + KF.z1;
  iwall('x', pz(5.5), X0, px(19), [{ a: px(5.5), b: px(8.5), y0: 0, y1: 2.13 }, { a: px(11), b: px(14), y0: 0, y1: 2.13 }]);
  iwall('z', px(9.5), pz(5.5), pz(20.5));
  iwall('x', pz(20.5), X0, px(19));
  iwall('z', px(19), pz(5.5), Z1, [{ a: KZC - DOORWAY.b, b: KZC - DOORWAY.a, y0: 0, y1: DOORWAY.h }], H_DECK);
  iwall('x', pz(6.5), px(19), kStore + 0.06);
  iwall('x', kSouth, px(19), KW + 2.3, [], H_DECK);
  worldBox(main, M.frp, KW + 2.3, kStore + 0.06, 2.85, H_DECK, kSouth - IW / 2, kSouth + IW / 2).castShadow = false;
  worldBox(main, M.frosted, KW + 2.3, kStore + 0.04, 0, 2.85, kSouth - 0.012, kSouth + 0.012).castShadow = false;
  worldBox(main, M.mullion, kStore, kStore + 0.06, 0, 2.85, kSouth - 0.03, kSouth + 0.03).castShadow = false;
  iwall('x', pz(44), px(9.8), BOH.x1, [{ a: px(14), b: px(17), y0: 0, y1: 2.13 }]);
  iwall('z', px(9.8), pz(44), Z1);
  // east side: cooler vault behind the main run of doors, utility room behind it, beer cave in the front corner
  iwall('x', pz(35), VAULT_X, X1, [], 2.75, M.walkin, null);
  iwall('z', px(80), Z0, pz(35), [{ a: pz(30), b: pz(33), y0: 0, y1: 2.13 }], H_DECK);
  worldBox(main, M.blackPaint, VAULT_X - 0.02, VAULT_X + 0.12, 2.36, 2.75, Z0, Z1).castShadow = false;
  addOcc(VAULT_X, px(80), Z0, pz(35), 2.75); addOcc(VAULT_X, X1, pz(35), Z1, 2.75);
  // sign band and patterned soffit over the kitchen opening (store side)
  worldBox(main, M.pattern, kStore, kStore + 0.12, 3.05, H_DECK, Z0, kSouth + IW / 2, 0.3).castShadow = false;
  worldBox(main, M.fascia, kStore, kStore + 0.5, 2.85, 3.1, KZC - KF.x1 - 0.06, kSouth + IW / 2);
  for (let i = 0; i < 5; i++) addMesh(main, new THREE.CircleGeometry(0.05, 16), M.troffer, kStore + 0.25, 2.848, KZC - KF.x1 + 0.6 + i * 1.5, Math.PI / 2, 0, 0).castShadow = false;
  addOcc(kStore, kStore + 0.5, KZC - KF.x1, kSouth, 0.25);

  /* ---------------- ceilings, deck and lights ---------------- */
  {
    const g = groups.ceiling;
    const act = (x0, x1, z0, z1) => { const c = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(x1 - x0, z1 - z0), (x1 - x0) / 1.2192, (z1 - z0) / 1.2192), M.ceiling); c.rotation.x = Math.PI / 2; c.position.set((x0 + x1) / 2, H_ACT, (z0 + z1) / 2); g.add(c); };
    act(X0, kStore, Z0, pz(6.5)); act(X0, px(19), pz(6.5), pz(20.5)); act(BOH.x0, BOH.x1, BOH.z0, BOH.z1); act(KW, kStore, KZC - KF.x1, KZC - KF.x0);
    for (const [x, z] of [[px(5), pz(36)], [px(13), pz(36)], [px(5), pz(46)], [px(14.5), pz(47)], [px(14), pz(28)], [px(4.7), pz(13)], [px(14.2), pz(13)], [px(9), pz(2.7)], [px(23), pz(3)]]) {
      B(g, M.steel, 1.22, 0.04, 0.61, x, H_ACT - 0.04, z).castShadow = false;
      B(g, M.troffer, 1.16, 0.004, 0.55, x, H_ACT - 0.044, z).castShadow = false;
    }
    for (const lx of [-2.5, 0, 2.5]) {
      const [x, z] = kxz(lx, 2.25);
      addMesh(g, new THREE.TorusGeometry(0.085, 0.012, 8, 24), M.frpTrim, x, H_ACT - 0.01, z, Math.PI / 2, 0, 0).castShadow = false;
      addMesh(g, new THREE.CircleGeometry(0.075, 24), M.troffer, x, H_ACT - 0.012, z, Math.PI / 2, 0, 0).castShadow = false;
    }
    const d = groups.deck;
    const deck = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(BLD.w, BLD.d), 1, BLD.d / 0.3), M.deck); deck.rotation.x = Math.PI / 2; deck.position.y = H_DECK; d.add(deck);
    for (const z of [pz(9), pz(17), pz(25), pz(33), pz(41)]) for (let x = px(33); x < px(70); x += 3.3) {
      B(d, M.blackPaint, 2.4, 0.06, 0.1, x, 3.52, z).castShadow = false;
      B(d, M.troffer, 2.36, 0.006, 0.07, x, 3.514, z).castShadow = false;
      for (const s of [-1, 1]) C(d, M.steelDark, 0.003, 0.003, H_DECK - 3.58, x + s * 1.0, 3.58, z, 4).castShadow = false;
    }
    for (const z of [pz(14), pz(36)]) {
      addMesh(d, new THREE.CylinderGeometry(0.3, 0.3, px(71) - px(31), 20), M.duct, (px(31) + px(71)) / 2, 4.05, z, 0, 0, Math.PI / 2).castShadow = false;
      for (const x of [px(38), px(52), px(66)]) { C(d, M.duct, 0.12, 0.12, 0.3, x, 3.5, z, 16).castShadow = false; C(d, M.duct, 0.24, 0.24, 0.05, x, 3.48, z, 20).castShadow = false; }
    }
  }

  /* ---------------- kitchen (local frame along its west wall) ---------------- */
  const KG = new THREE.Group(); KG.position.set(KW, 0, KZC); KG.rotation.y = Math.PI / 2; main.add(KG);
  const Lw = (x, y, z) => [KW + z, y, KZC - x];
  let lx = HOOD.x0 + 0.05, x, z;
  const nozzles = [];
  const slot = (w, d) => { const cx = lx + w / 2; lx += w; return [cx, LINE_BACK + d / 2]; };
  const ld = landing(M); [x, z] = slot(24 * IN, 30 * IN); put(KG, ld, x, z); shadowsFor.push([ld, 0.04]);
  const g36 = griddle36(M, r); [x, z] = slot(36 * IN, 32 * IN); put(KG, g36, x, z); reg('griddle', g36, { face: [1, 0, 0] }); shadowsFor.push([g36, 0.04]); nozzles.push(x - 0.22, x + 0.22);
  const rg = rangeTop(M); [x, z] = slot(24 * IN, 30 * IN); put(KG, rg, x, z); reg('range', rg, { face: [1, 0, 0] }); shadowsFor.push([rg, 0.04]); nozzles.push(x);
  const fry = new THREE.Group();
  for (let i = 0; i < 2; i++) { const f = fryer(M); [x, z] = slot(15.5 * IN, 30.5 * IN); put(fry, f, x, z); nozzles.push(x); }
  KG.add(fry); reg('fryers', fry, { face: [1, 0, 0] }); shadowsFor.push([fry, 0.04]);
  const dmp = dumpStation(M, r); [x, z] = slot(18 * IN, 30.5 * IN); put(KG, dmp, x, z); reg('dump', dmp, { face: [1, 0, 0] }); shadowsFor.push([dmp, 0.04]); nozzles.push(x);
  barX(KG, M.iron, 3.1, 0.022, 0.15, 0.42, 0.05);
  for (const gx of [g36.position.x, rg.position.x, fry.children[0].position.x, fry.children[1].position.x]) {
    C(KG, M.iron, 0.016, 0.016, 0.12, gx, 0.42, 0.05, 8);
    B(KG, M.yellow, 0.06, 0.012, 0.012, gx + 0.03, 0.5, 0.05);
    tube(KG, M.gasHose, [[gx, 0.42, 0.06], [gx + 0.03, 0.3, 0.14], [gx + 0.06, 0.32, 0.2]], 0.014, 12);
  }
  // full-height stainless on the line wall
  for (const [a, b] of [[KF.x0, DOORWAY.a], [DOORWAY.b, KF.x1]]) {
    B(KG, M.steelV, b - a, H_ACT, 0.004, (a + b) / 2, 0, 0.002).castShadow = false;
    for (let p = a + 1.22; p < b - 0.1; p += 1.22) B(KG, M.steelDark, 0.008, H_ACT, 0.002, p, 0, 0.005).castShadow = false;
  }
  const hd = hood(M); put(KG, hd, (HOOD.x0 + HOOD.x1) / 2, 0);
  const sup = suppression(M, hd, nozzles); KG.add(sup);
  reg('hood', hd, { face: [1, 0, 0], anchor: Lw((HOOD.x0 + HOOD.x1) / 2 - 0.9, HOOD.bottom + 0.35, HOOD.depth + 0.05), box: new THREE.Box3(V(KW, HOOD.bottom, KZC - HOOD.x1), V(KW + HOOD.depth, H_ACT, KZC - HOOD.x0)) });
  reg('suppression', sup, { face: [0, 0, 1], anchor: Lw(KF.x1 - 0.2, 2.72, 0.45) });
  const hc = hotCabinet(M, r); put(KG, hc, HOOD.x1 + 0.45, LINE_BACK + 31 * IN / 2 - 0.05); reg('hotcab', hc, { face: [1, 0, 0] }); shadowsFor.push([hc, 0.04]);
  const ws = shelving(M, 1.22, 0.46, 0, [0.15, 0.6, 1.05, 1.5], stockShelf(M, r, 1.22, 0.46, ['napkins', 'foil', 'cups', 'tortilla', 'container']));
  put(KG, ws, -2.3, 0.26); shadowsFor.push([ws, 0.03]);
  addMesh(KG, new THREE.TorusGeometry(0.11, 0.01, 6, 24), M.black, -1.98, 1.22, 0.3, 0, 0.3, 0);
  C(KG, M.black, 0.09, 0.09, 0.06, -1.98, 1.06, 0.28, 16);
  const mb = menuBoards(M); put(KG, mb, 0.2, 1.48); reg('menu', mb, { face: [1, 0, 0], anchor: Lw(0.2, 2.03, 1.6) });
  const sc = servingCounter(M); put(KG, sc, 0, KF.z1 - 0.425); reg('counter', sc, { face: [1, 0, 0], anchor: Lw(0.1, 1.55, KF.z1 - 0.3) }); shadowsFor.push([sc, 0.03]);
  for (const mx of [-0.85, 0.67]) { const m = addMesh(KG, scaleUV(new THREE.PlaneGeometry(1.52, 0.91), 1.52 / 0.25, 0.91 / 0.25), M.mat, mx, 0.008, LINE_BACK + 1.3, -Math.PI / 2); m.castShadow = false; }
  const hs1 = handSink(M); put(KG, hs1, KF.x0, 1.45, Math.PI / 2); reg('handsink1', hs1, { face: [0, 0, -1] });
  trashCan(M, -3.4, 2.0, M.greyPlastic, KG);
  // order point and pick-up signs hung from the sign band, and a band for the renter's brand
  const sg = new THREE.Group(); KG.add(sg);
  for (const [sx, t] of [[-2.4, 'ORDER HERE'], [2.85, 'PICK-UP HERE']]) {
    B(sg, M.blackPaint, 1.0, 0.3, 0.04, sx, 2.42, 3.45);
    screen(sg, signTexture([t], { w: 512, h: 160, bg: '#eebe54', fg: '#16302f', size: 70 }), 0.96, 0.27, sx, 2.57, 3.472);
    for (const s of [-1, 1]) C(sg, M.chrome, 0.004, 0.004, 0.13, sx + s * 0.4, 2.72, 3.45, 4);
  }
  screen(sg, signTexture(['YOUR BRAND HERE'], { w: 1024, h: 160, bg: '#e9e7df', fg: '#204649', size: 96 }), 3.4, 0.53, -0.2, 3.85, KF.z1 + 0.125);
  reg('signs', sg, { face: [1, 0, 0], anchor: Lw(-2.4, 3.0, 3.6), box: new THREE.Box3(V(kStore, 2.3, KZC - KF.x1), V(kStore + 0.5, 4.2, kSouth)) });
  reg('doorway', main, { face: [1, 0, 0], anchor: [KW + 0.15, 2.35, KZC - (DOORWAY.a + DOORWAY.b) / 2], box: new THREE.Box3(V(px(19) - 0.1, 0, KZC - DOORWAY.b), V(px(19) + 0.1, DOORWAY.h, KZC - DOORWAY.a)) });
  for (const [q0, q1] of [[px(19) - IW / 2 - 0.012, px(19) - IW / 2], [KW, KW + 0.012]]) {
    worldBox(main, M.steel, q0, q1, 0, DOORWAY.h + 0.06, KZC - DOORWAY.b - 0.06, KZC - DOORWAY.b);
    worldBox(main, M.steel, q0, q1, 0, DOORWAY.h + 0.06, KZC - DOORWAY.a, KZC - DOORWAY.a + 0.06);
    worldBox(main, M.steel, q0, q1, DOORWAY.h, DOORWAY.h + 0.06, KZC - DOORWAY.b - 0.06, KZC - DOORWAY.a + 0.06);
  }

  /* ---------------- back room ---------------- */
  const wi = walkInBack(M, r, groups.roof);
  main.add(wi.shell, wi.cooler, wi.freezer);
  reg('cooler', wi.cooler, { face: [0, 0, 1], anchor: [WALKIN.x0 + 1.33, 2.3, WALKIN.z1 + 0.12], box: new THREE.Box3(V(WALKIN.x0, 0, WALKIN.split), V(WALKIN.x1, WALKIN.h, WALKIN.z1)) });
  reg('freezer', wi.freezer, { face: [0, 0, 1], anchor: [WALKIN.x0 + 1.9, WALKIN.h + 0.3, (WALKIN.z0 + WALKIN.split) / 2], box: new THREE.Box3(V(WALKIN.x0, 0, WALKIN.z0), V(WALKIN.x1, WALKIN.h, WALKIN.split)) });
  addOcc(WALKIN.x0, WALKIN.x1, WALKIN.z0, WALKIN.z1, WALKIN.h);
  const s3 = sink3(M); put(main, s3, WALKIN.x1 + 24 * IN / 2 + 0.01, (WALKIN.z0 + WALKIN.z1) / 2, Math.PI / 2); reg('sink3', s3, { face: [1, 0, 0] }); shadowsFor.push([s3, 0.03]);
  const ice = iceMachine(M); put(main, ice, -10.27, BOH.z0 + 34 * IN / 2 + 0.06); reg('ice', ice); shadowsFor.push([ice, 0.04]);
  const mop = mopSink(M); put(main, mop, -9.6, BOH.z0); reg('mop', mop);
  const hs2 = handSink(M); put(main, hs2, BOH.x1, -0.3, -Math.PI / 2); reg('handsink2', hs2, { face: [-1, 0, 0] });
  const ov = ovens(M); put(main, ov, BOH.x1 - 30 * IN / 2 - 0.02, 2.95, -Math.PI / 2); reg('ovens', ov, { face: [-1, 0, 0] }); shadowsFor.push([ov, 0.04]);
  const wt = worktable(M, r); put(main, wt, BOH.x1 - 30 * IN / 2 - 0.02, 4.75, -Math.PI / 2); shadowsFor.push([wt, 0.04]);
  const pt = prepTable(M, r); put(main, pt, -12.4, 3.3, Math.PI); reg('prep', pt, { face: [0, 0, -1] }); shadowsFor.push([pt, 0.04]);
  const ds = doughStation(M, r); put(main, ds, -12.4, 4.18, 0); reg('dough', ds, { face: [0, 0, 1] }); shadowsFor.push([ds, 0.04]);
  const sr = speedRack(M, r); put(main, sr, -10.6, 4.95, 0); shadowsFor.push([sr, 0.03]);
  const dry = dryStorage(M, r); put(main, dry, X0 + 0.33, 6.1, Math.PI / 2); reg('dry', dry, { face: [1, 0, 0] }); shadowsFor.push([dry, 0.03]);
  const ri = reachIn(M); put(main, ri, px(9.8) - IW / 2 - 31 * IN / 2 - 0.02, 6.6, -Math.PI / 2); reg('reachin', ri, { face: [-1, 0, 0] }); shadowsFor.push([ri, 0.04]);
  const ofc = officeSet(M); put(main, ofc, px(14.5), Z1, Math.PI); reg('office', ofc, { face: [0, 0, -1] });
  trashCan(M, -10.4, 2.4, M.greyPlastic, main);
  for (const [fx, fz, s] of [[WALKIN.x1 + 0.35, (WALKIN.z0 + WALKIN.z1) / 2, 0.3], [-10.27, BOH.z0 + 0.1, 0.25], [-10.6, 1.6, 0.2]]) {
    B(main, M.steelDark, s, 0.004, s, fx, 0.001, fz).castShadow = false;
    B(main, M.louver, s - 0.04, 0.002, s - 0.04, fx, 0.005, fz).castShadow = false;
  }
  addMesh(main, scaleUV(new THREE.PlaneGeometry(0.91, 1.52), 0.91 / 0.25, 1.52 / 0.25), M.mat, WALKIN.x1 + 0.95, 0.008, (WALKIN.z0 + WALKIN.z1) / 2, -Math.PI / 2).castShadow = false;

  /* ---------------- restrooms, hallway, rear exit ---------------- */
  {
    const zt = pz(5.5) + IW / 2, zb = pz(20.5) - IW / 2;
    put(main, vanity(M), X0, zt + 0.8, Math.PI / 2);
    put(main, urinal(M), X0, zt + 1.9, Math.PI / 2);
    put(main, toilet(M), X0 + 0.65, zb, Math.PI);
    worldBox(main, M.partition, X0, X0 + 1.55, 0.3, 1.85, zb - 1.55, zb - 1.52);
    worldBox(main, M.partition, X0 + 1.52, X0 + 1.55, 0.3, 1.85, zb - 1.52, zb);
    put(main, vanity(M), px(19) - IW / 2, zt + 0.8, -Math.PI / 2);
    for (const tx of [px(9.5) + IW / 2 + 0.75, px(9.5) + IW / 2 + 2.15]) put(main, toilet(M), tx, zb, Math.PI);
    worldBox(main, M.partition, px(9.5) + IW / 2, px(19) - IW / 2, 0.3, 1.85, zb - 1.55, zb - 1.52);
    worldBox(main, M.partition, px(9.5) + IW / 2 + 1.45, px(9.5) + IW / 2 + 1.48, 0.3, 1.85, zb - 1.52, zb);
    for (const [a, b, t] of [[px(5.5), px(8.5), 'MEN'], [px(11), px(14), 'WOMEN']]) {
      worldBox(main, M.desk, a, b, 0, 2.1, pz(5.5) - 0.02, pz(5.5) + 0.02);
      B(main, M.chrome, 0.03, 0.03, 0.16, b - 0.12, 1.02, pz(5.5) - 0.04);
      screen(main, signTexture([t], { w: 256, h: 128, bg: '#204649', fg: '#f5f3e6', size: 62 }), 0.3, 0.15, b + 0.3, 1.55, pz(5.5) - IW / 2 - 0.004, Math.PI);
    }
    screen(main, signTexture(['RESTROOMS', '← THIS WAY'], { w: 512, h: 192, bg: '#204649', fg: '#f5f3e6', size: 60 }), 0.8, 0.3, kStore + 0.13, 2.75, pz(3.2), Math.PI / 2);
    for (const s2 of [-1, 1]) C(main, M.chrome, 0.004, 0.004, 0.15, kStore + 0.13, 2.9, pz(3.2) + s2 * 0.3, 4);
    const rr = new THREE.Group(); main.add(rr);
    reg('restrooms', rr, { face: [0, 0, 1], anchor: [px(9.5), 2.45, pz(5.5) - 0.35], box: new THREE.Box3(V(X0, 0, pz(5.5)), V(px(19), H_ACT, pz(20.5))) });
    // rear exit door in the north wall
    const dg = new THREE.Group(); dg.position.set((px(22) + px(25)) / 2, 0, Z0 - EW / 2); groups.N.add(dg);
    B(dg, M.doorGrey, px(25) - px(22) - 0.02, 2.11, 0.045, 0, 0.01, 0);
    barX(dg, M.chrome, px(25) - px(22) - 0.2, 0.018, 0, 1.0, 0.07);
    B(dg, M.hdpe, 0.36, 0.2, 0.08, 0, 2.25, 0.06);
    screen(dg, signTexture(['EXIT'], { w: 256, h: 128, bg: '#fdf8f2', fg: '#d01e14', size: 92, print: false }), 0.32, 0.16, 0, 2.35, 0.101);
    reg('backdoor', dg, { face: [0, 0, 1], anchor: [(px(22) + px(25)) / 2, 2.6, Z0 + 0.2], cut: 'N' });
  }

  /* ---------------- sales floor ---------------- */
  const bb = bevBar(M, P, r, px(63) - px(31)); put(main, bb, (px(31) + px(63)) / 2, Z0); reg('bevbar', bb, { anchor: [(px(31) + px(63)) / 2, 2.95, Z0 + 0.5] }); shadowsFor.push([bb, 0.03]);
  const oc = openCase(M, P, r); put(main, oc, px(42), pz(10.3)); shadowsFor.push([oc, 0.03]);
  const hi = hotIsland(M, P, r); put(main, hi, px(42), pz(21.9), Math.PI / 2); reg('hotfood', hi, { face: [1, 0, 0] }); shadowsFor.push([hi, 0.04]);
  const bk = bakeryIsland(M, P, r); put(main, bk, px(41.8), pz(35.7), Math.PI / 2); shadowsFor.push([bk, 0.04]);
  for (const [gz, L, gx] of [[pz(12.5), 2.4, px(56)], [pz(19), 4.57, px(58.5)], [pz(25.5), 4.57, px(58.5)], [pz(32), 4.57, px(58.5)]]) {
    const gd = gondola(M, P, r, L); put(main, gd, gx, gz); shadowsFor.push([gd, 0.03]);
  }
  for (const kx2 of [px(52), px(55)]) { const k = kiosk(M); put(main, k, kx2, pz(39.5)); shadowsFor.push([k, 0.03]); }
  {
    const tx = px(62), tz = pz(39.5);
    B(main, M.woodPanel, 1.8, 0.86, 0.8, tx, 0, tz); B(main, M.quartz, 1.84, 0.04, 0.84, tx, 0.86, tz);
    fillRun(P, main, r, 'x', tx - 0.85, tx + 0.85, 0.9, tz, 0.6, 0.25, SNACKS);
  }
  const se = seatingCounter(M, 3.6, 5); put(main, se, px(66), Z1 - 0.05, Math.PI); reg('seating', se, { face: [0, 0, -1] });
  const co = checkoutCounter(M, P, r, 3.6); put(main, co, -5.85, 4.2, Math.PI / 2); reg('checkout', co, { face: [1, 0, 0] }); shadowsFor.push([co, 0.03]);
  const bbk = backBar(M, 3.8); put(main, bbk, px(19) + IW / 2, 4.2, Math.PI / 2); shadowsFor.push([bbk, 0.02]);
  B(main, M.paintGrey, 0.6, 1.55, 0.5, px(34.5), 0, Z1 - 0.4);
  screen(main, screenTexture(96, 64, (c) => { c.fillStyle = '#0e1a1c'; c.fillRect(0, 0, 96, 64); c.fillStyle = '#3bb3a0'; c.font = 'bold 18px Arial'; c.fillText('ATM', 30, 38); }), 0.3, 0.2, px(34.5), 1.2, Z1 - 0.651, Math.PI);
  trashCan(M, px(36.5), Z1 - 0.55, M.greyPlastic, main); trashCan(M, px(58.5), Z1 - 0.6, M.greyPlastic, main);

  // cold vault: main run of doors along the east wall
  const nMain = 13, runA = pz(1.5);
  const cv2 = coolerRun(M, P, r, nMain); put(main, cv2, VAULT_X, runA + nMain * 0.76 / 2, -Math.PI / 2);
  reg('coldvault', cv2, { face: [-1, 0, 0], anchor: [VAULT_X - 0.25, 2.62, runA + nMain * 0.76 / 2] });
  // beer cave in the front corner: glass entry door, then its own reach-in doors
  const entryA = pz(36.5), entryB = entryA + 0.92;
  worldBox(main, M.coolerFrame, VAULT_X - 0.04, VAULT_X + 0.08, 0, 2.36, entryA - 0.06, entryA);
  worldBox(main, M.coolerFrame, VAULT_X - 0.04, VAULT_X + 0.08, 0, 2.36, entryB, entryB + 0.06);
  worldBox(main, M.coolerFrame, VAULT_X - 0.04, VAULT_X + 0.08, 2.12, 2.36, entryA, entryB);
  worldBox(main, M.glass, VAULT_X, VAULT_X + 0.02, 0.05, 2.1, entryA + 0.03, entryB - 0.03).castShadow = false;
  B(main, M.chrome, 0.03, 0.6, 0.03, VAULT_X - 0.03, 0.8, entryA + 0.12);
  screen(main, signTexture(['BEER CAVE'], { w: 512, h: 128, bg: '#16302f', fg: '#eebe54', size: 70 }), 1.2, 0.3, VAULT_X - 0.05, 2.56, entryB + 0.6, -Math.PI / 2);
  const cv1 = coolerRun(M, P, r, 3); put(main, cv1, VAULT_X, entryB + 0.12 + 1.5 * 0.76, -Math.PI / 2);
  // behind the doors: cases in the vault, pallets in the beer cave
  for (let zc = pz(2.5); zc < pz(33); zc += 0.6) for (let k = 0; k < 3; k++) P.add('case', main, VAULT_X + 1.3 + (k % 2) * 0.5, k * 0.3, zc, 0.42, 0.28, 0.5, Math.floor(r() * 16));
  for (let xi = 0; xi < 5; xi++) for (let zi = 0; zi < 3; zi++) {
    const bx = VAULT_X + 1.4 + xi * 1.05, bz = pz(37.5) + zi * 1.25;
    B(main, M.wood, 1.0, 0.13, 1.2, bx, 0, bz);
    const c = Math.floor(r() * 16);
    for (let h2 = 0; h2 < 4; h2++) for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) P.add('case', main, bx - 0.24 + i * 0.48, 0.13 + h2 * 0.26, bz - 0.4 + j * 0.4, 0.46, 0.25, 0.38, c, (j % 2) * Math.PI);
  }
  worldBox(groups.roof, M.walkin, VAULT_X, px(80), 2.75, 2.85, Z0, pz(35));
  worldBox(groups.roof, M.walkin, VAULT_X, X1, 2.75, 2.85, pz(35), Z1);
  // utility room at the back corner
  C(main, M.hdpe, 0.3, 0.3, 1.6, X1 - 0.5, 0, pz(4), 24);
  for (const zz of [pz(10), pz(16)]) { const u = shelving(M, 1.22, 0.46, 0, [0.15, 0.6, 1.05, 1.5, 1.85], stockShelf(M, r, 1.22, 0.46, ['cups', 'napkins', 'foil', 'produce'])); put(main, u, X1 - 0.3, zz, -Math.PI / 2); }
  for (const zz of [pz(26), pz(28)]) B(main, M.paintGrey, 0.1, 0.9, 0.36, X1 - 0.05, 1.05, zz);

  return { groups, floor, items, shadowsFor, occ, P };
}

/* ------------------------------------------------------------ baking */

const KEEP_ATTR = ['position', 'normal', 'uv'];
function bake(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}`;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (!KEEP_ATTR.includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld); g.clearGroups();
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, geos: [] });
    buckets.get(key).geos.push(g);
  });
  const out = new THREE.Group();
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; out.add(m);
  }
  return out;
}

function environmentMap(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 4, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.6, 0.56), side: THREE.BackSide })));
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.08, 0.05) })); fl.rotation.x = -Math.PI / 2; fl.position.y = -1.95; s.add(fl);
  const panel = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 7, 6.6) });
  for (const [x, z] of [[-3, -1.5], [0, -1.5], [3, -1.5], [-3, 1.5], [0, 1.5], [3, 1.5]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), panel); p.rotation.x = Math.PI / 2; p.position.set(x, 1.95, z); s.add(p); }
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 2) });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), warm); w.position.set(0, 0.6, -3.95); s.add(w);
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(s, 0.035); pm.dispose();
  return rt.texture;
}

/* ------------------------------------------------------------------- UI */

const CSS = `
.k3d{position:fixed;inset:0;z-index:200;background:#0d2326;color:#f5f3e6;display:flex;flex-direction:column;font-family:inherit}
.k3d[hidden]{display:none}
.k3d-top{display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.1);background:#143236}
.k3d-title{display:flex;flex-direction:column;min-width:0}
.k3d-title b{font-size:16px;line-height:1.2}
.k3d-title span{font-size:12px;color:#a9c1c0}
.k3d-views{display:flex;gap:6px;margin-left:auto;overflow-x:auto;scrollbar-width:none;padding:2px}
.k3d-views::-webkit-scrollbar{display:none}
.k3d-views button,.k3d-listbtn{font:inherit;font-size:13px;font-weight:700;color:#f5f3e6;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:7px 12px;cursor:pointer;white-space:nowrap}
.k3d-views button[aria-pressed="true"]{background:#eebe54;border-color:#eebe54;color:#143236}
.k3d-close{font:inherit;font-size:20px;line-height:1;width:38px;height:38px;flex:0 0 38px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:transparent;color:#f5f3e6;cursor:pointer}
.k3d button:focus-visible{outline:3px solid #eebe54;outline-offset:2px}
.k3d-main{flex:1;display:grid;grid-template-columns:1fr 330px;min-height:0}
.k3d-stage{position:relative;min-height:0;overflow:hidden;background:radial-gradient(120% 90% at 50% 40%,#1d4346,#0d2326)}
.k3d-stage canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}
.k3d-stage::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(130% 100% at 50% 45%,transparent 60%,rgba(5,18,20,.45))}
.k3d-spots,.k3d-dims{position:absolute;inset:0;pointer-events:none;z-index:2}
.k3d-spot{position:absolute;left:0;top:0;pointer-events:auto;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;border:2px solid #f5f3e6;background:#e93f24;color:#fff;font:700 12px/22px ui-monospace,Menlo,Consolas,monospace;text-align:center;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,.4);transition:background .2s;padding:0}
.k3d-spot.on{background:#eebe54;color:#143236}
.k3d-spot.off{opacity:0;pointer-events:none}
.k3d-dim{position:absolute;left:0;top:0;transform:translate(-50%,-50%);font:700 12px ui-monospace,Menlo,Consolas,monospace;letter-spacing:1px;background:rgba(20,50,54,.85);border:1px solid rgba(245,243,230,.35);border-radius:6px;padding:3px 8px;white-space:nowrap}
.k3d-status{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;background:rgba(20,50,54,.92);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:12px 16px;font-size:14px;text-align:center;max-width:80%}
.k3d-status[hidden]{display:none}
.k3d-side{background:#143236;border-left:1px solid rgba(255,255,255,.1);overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px}
.k3d-card{background:#1c4044;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px}
.k3d-card h3{font-size:17px;margin:0 0 6px;display:flex;gap:8px;align-items:center}
.k3d-card h3 i{font-style:normal;display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#eebe54;color:#143236;font:700 12px ui-monospace,Menlo,Consolas,monospace}
.k3d-card p{font-size:14px;color:#cfdcdb;margin:0}
.k3d-card ul{margin:6px 0 0;padding-left:18px;font-size:14px;color:#cfdcdb}
.k3d-card .sz{margin-top:8px;font:700 11px ui-monospace,Menlo,Consolas,monospace;letter-spacing:1.4px;text-transform:uppercase;color:#eebe54}
.k3d-list h4{font:700 11px ui-monospace,Menlo,Consolas,monospace;letter-spacing:1.8px;text-transform:uppercase;color:#a9c1c0;margin:10px 0 4px}
.k3d-list ol{list-style:none;margin:0;padding:0}
.k3d-list button{display:flex;gap:10px;align-items:center;width:100%;text-align:left;font:inherit;font-size:14px;color:#f5f3e6;background:transparent;border:0;border-radius:8px;padding:6px;cursor:pointer}
.k3d-list button:hover,.k3d-list button[aria-current="true"]{background:rgba(255,255,255,.08)}
.k3d-list b{display:inline-grid;place-items:center;width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:#e93f24;color:#fff;font:700 11px ui-monospace,Menlo,Consolas,monospace}
.k3d-note{font-size:12px;color:#a9c1c0;margin:0;line-height:1.5}
.k3d-listbtn{display:none}
@media (max-width:820px){
  .k3d-top{flex-wrap:wrap;padding:8px 12px;gap:8px}
  .k3d-title{flex:1}
  .k3d-views{order:3;width:100%;margin-left:0}
  .k3d-main{grid-template-columns:1fr;grid-template-rows:1fr auto}
  .k3d-side{border-left:0;border-top:1px solid rgba(255,255,255,.1);max-height:40vh;padding:12px;gap:10px}
  .k3d-listbtn{display:block;align-self:flex-start}
  .k3d-list{display:none}
  .k3d-list.open{display:block}
  .k3d-spot{width:24px;height:24px;line-height:20px}
}
.k3d.capture .k3d-top,.k3d.capture .k3d-side,.k3d.capture .k3d-spots{display:none}
.k3d.capture .k3d-main{grid-template-columns:1fr}
`;

let K = null;   // the one viewer instance

export async function open(host, { view = 'overview', opener } = {}) {
  host.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  if (!K) K = await create(host);
  K.opener = opener || null;
  K.open = true;
  K.setView(view in VIEWS ? view : 'overview', !K.started);
  K.started = true;
  K.loop();
  host.querySelector('.k3d-close').focus();
  return K;
}

function close() {
  if (!K) return;
  K.open = false; K.host.hidden = true;
  document.documentElement.style.overflow = '';
  if (K.opener) K.opener.focus();
  if (location.hash.startsWith('#3d')) history.replaceState(null, '', location.pathname + location.search);
}

async function create(host) {
  if (!document.getElementById('k3d-css')) { const st = document.createElement('style'); st.id = 'k3d-css'; st.textContent = CSS; document.head.appendChild(st); }
  const order = Object.keys(ITEMS);
  host.innerHTML = `
    <div class="k3d-top">
      <div class="k3d-title"><b id="k3d-title">The store and kitchen in 3D</b><span>Drag to look around · scroll or pinch to zoom</span></div>
      <div class="k3d-views" role="toolbar" aria-label="Camera views">${Object.entries(VIEWS).map(([k, v]) => `<button type="button" data-view="${k}" aria-pressed="false">${v.label}</button>`).join('')}</div>
      <button type="button" class="k3d-close" aria-label="Close the 3D kitchen">✕</button>
    </div>
    <div class="k3d-main">
      <div class="k3d-stage"><div class="k3d-spots"></div><div class="k3d-dims" aria-hidden="true"></div><p class="k3d-status" role="status">Building the kitchen…</p></div>
      <aside class="k3d-side" aria-label="Kitchen equipment">
        <div class="k3d-card" aria-live="polite"></div>
        <button type="button" class="k3d-listbtn" aria-expanded="false">Equipment list</button>
        <div class="k3d-list">${Object.entries(ZONES).map(([z, zn]) => `<h4>${zn}</h4><ol>${order.filter((id) => ITEMS[id].zone === z).map((id) => `<li><button type="button" data-item="${id}"><b>${order.indexOf(id) + 1}</b>${ITEMS[id].name}</button></li>`).join('')}</ol>`).join('')}</div>
        <p class="k3d-note">The store follows the standard layout of the modern convenience-store format this building uses (about 93 × 50 ft). The kitchen line follows the owner’s photo. Other equipment and sizes are typical; the real layout is confirmed at your walkthrough.</p>
      </aside>
    </div>`;
  host.setAttribute('role', 'dialog'); host.setAttribute('aria-modal', 'true'); host.setAttribute('aria-labelledby', 'k3d-title');
  const stage = host.querySelector('.k3d-stage'), status = host.querySelector('.k3d-status'), card = host.querySelector('.k3d-card');
  const defaultCard = '<h3>Explore the kitchen</h3><p>Tap a number on the model, or pick from the list, to see each piece of equipment. Use the view buttons to jump around the room.</p>';
  card.innerHTML = defaultCard;
  host.querySelector('.k3d-close').addEventListener('click', close);
  host.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  const listBtn = host.querySelector('.k3d-listbtn'), list = host.querySelector('.k3d-list');
  listBtn.addEventListener('click', () => { const o = list.classList.toggle('open'); listBtn.setAttribute('aria-expanded', o); });
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: /[?&]capture/.test(location.search) });
  } catch (e) {
    status.textContent = 'This device can’t show 3D. The equipment list on the side has everything in the kitchen.';
    return { host, setView() {}, loop() {}, started: true };
  }
  const mobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  HQ = !mobile;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.93;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.domElement.setAttribute('aria-label', '3D model of the kitchen. Drag to orbit, scroll to zoom.');
  renderer.domElement.tabIndex = 0;
  stage.prepend(renderer.domElement);

  const X = makeTextures(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  const M = makeMaterials(X);
  const scene = new THREE.Scene();
  {
    const bc = canvas(512, 512), bg = bc.getContext('2d'), gr = bg.createRadialGradient(256, 210, 20, 256, 256, 430);
    gr.addColorStop(0, '#21494c'); gr.addColorStop(1, '#0a1c1f'); bg.fillStyle = gr; bg.fillRect(0, 0, 512, 512);
    const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; scene.background = bt;
  }
  scene.environment = environmentMap(renderer);

  const built = buildKitchen(M, X);
  const { groups, items } = built;
  scene.add(built.floor);

  // boxes for picking, hotspots and focusing (before baking flattens the groups)
  for (const g of Object.values(groups)) scene.add(g);
  groups.roof.updateMatrixWorld(true);
  for (const g of Object.values(groups)) g.updateMatrixWorld(true);
  for (const m of built.P.build(M)) scene.add(m);
  const pickScene = new THREE.Scene(), pickMat = new THREE.MeshBasicMaterial();
  items.forEach((it, i) => {
    it.n = Object.keys(ITEMS).indexOf(it.id) + 1;
    it.box = it.box || new THREE.Box3().setFromObject(it.obj);
    const c = it.box.getCenter(new THREE.Vector3()), s = it.box.getSize(new THREE.Vector3());
    it.center = c;
    it.anchorV = it.anchor ? new THREE.Vector3(...it.anchor) : new THREE.Vector3(c.x, it.box.max.y + 0.14, c.z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(s.x, 0.05), Math.max(s.y, 0.05), Math.max(s.z, 0.05)), pickMat);
    m.position.copy(c); m.userData.id = it.id; pickScene.add(m); it.pick = m;
  });
  // contact shadows under free-standing equipment
  const shadowGeos = [];
  for (const [obj, pad] of built.shadowsFor) {
    const b = new THREE.Box3().setFromObject(obj), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const g = new THREE.PlaneGeometry(s.x + pad * 6, s.z + pad * 6); g.rotateX(-Math.PI / 2); g.translate(c.x, 0.004, c.z); shadowGeos.push(g);
  }
  const contact = new THREE.Mesh(mergeGeometries(shadowGeos, false), M.shadow); contact.renderOrder = 1; scene.add(contact);

  // flatten each group into a few merged meshes
  const baked = {};
  for (const [k, g] of Object.entries(groups)) { scene.remove(g); baked[k] = bake(g); scene.add(baked[k]); }
  // stubs start hidden
  for (const k of ['N', 'S', 'E', 'W']) baked['stub' + k].visible = false;

  // lights
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x7a5444, 1.1));
  const sun = new THREE.DirectionalLight(0xfff8ef, 2.1);
  sun.position.set(3, 18, 8); sun.target.position.set(0, 0, 0.3);
  sun.castShadow = true;
  const sm = mobile ? 1024 : (renderer.capabilities.maxTextureSize >= 8192 ? 4096 : 2048); sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 11, bottom: -11, near: 4, far: 34 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.015; sun.shadow.radius = mobile ? 2 : 4;
  scene.add(sun, sun.target);
  const hoodLights = mobile ? 1 : 3;
  for (let i = 0; i < hoodLights; i++) {
    const pl = new THREE.PointLight(0xffe4b8, 2.2, 3.2, 1.6);
    const [hx, hz] = kxz(HOOD.x0 + (i + 0.5) * (HOOD.x1 - HOOD.x0) / hoodLights, HOOD.depth - 0.35);
    pl.position.set(hx, HOOD.top - 0.15, hz);
    scene.add(pl);
  }
  const pt = (c, i, d, x, y, z) => { const pl = new THREE.PointLight(c, i, d, 1.5); pl.position.set(x, y, z); scene.add(pl); };
  { const [x, z] = kxz(0, 2.25); pt(0xfff1dc, 3.2, 5.5, x, H_ACT - 0.15, z); }
  pt(0xf6f7ff, 4, 7, px(9), H_ACT - 0.2, pz(36));
  pt(0xf2f6ff, 2.5, 3.4, (WALKIN.x0 + WALKIN.x1) / 2, WALKIN.h - 0.3, (WALKIN.split + WALKIN.z1) / 2);
  if (!mobile) { pt(0xfff6ea, 9, 14, px(45), 3.3, pz(24)); pt(0xfff6ea, 9, 14, px(62), 3.3, pz(24)); pt(0xf6f7ff, 4, 7, px(9.5), H_ACT - 0.2, pz(13)); }

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.085; controls.screenSpacePanning = true;
  controls.minDistance = 0.4; controls.maxDistance = 48; controls.maxPolarAngle = Math.PI * 0.86;
  controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.9;

  // post-processing: MSAA scene render, ground-truth ambient occlusion (desktop), bloom on bright emissives, tone mapping
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 ? (HQ ? 4 : 2) : 0 }));
  composer.addPass(new RenderPass(scene, camera));
  if (HQ) {
    const gtao = new GTAOPass(scene, camera, 4, 4);
    gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.5, thickness: 1.0, scale: 1.15, samples: 16, distanceFallOff: 1.0 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1.5, rings: 2, samples: 16 });
    gtao.blendIntensity = 1.0;
    gtao.overrideVisibility = function () {
      const cache = this._visibilityCache;
      this.scene.traverse((o) => { cache.set(o, o.visible); if (o.isPoints || o.isLine || (o.material && (o.material.transparent || o.material.alphaTest > 0))) o.visible = false; });
    };
    composer.addPass(gtao);
  }
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(4, 4), HQ ? 0.38 : 0.28, 0.55, 1.4));
  composer.addPass(new OutputPass());

  // selection outline
  const sel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xeebe54 }));
  sel.visible = false; scene.add(sel);

  // hotspots and plan dimensions
  const spots = host.querySelector('.k3d-spots'), dims = host.querySelector('.k3d-dims');
  items.forEach((it) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'k3d-spot'; b.textContent = it.n; b.tabIndex = -1;
    b.setAttribute('aria-label', it.name); b.addEventListener('click', (e) => { e.stopPropagation(); select(it.id, true); });
    spots.appendChild(b); it.el = b;
  });
  const dimLabels = [
    { t: 'STORE ≈ 93 × 50 ft', p: new THREE.Vector3(0, 0.05, Z0 - 1.0) },
    { t: 'KITCHEN', p: new THREE.Vector3(KW + 1.6, 0.05, KZC + 1.1) },
    { t: 'BACK ROOM', p: new THREE.Vector3(px(9.5), 0.05, pz(40)) },
    { t: 'RESTROOMS', p: new THREE.Vector3(px(9.5), 0.05, pz(15)) },
    { t: 'SALES FLOOR', p: new THREE.Vector3(px(50), 0.05, pz(44)) },
    { t: 'COLD VAULT', p: new THREE.Vector3(px(76.5), 0.05, pz(9)) },
    { t: 'BEER CAVE', p: new THREE.Vector3(px(83), 0.05, pz(45)) },
    { t: 'UTILITY', p: new THREE.Vector3(px(86.5), 0.05, pz(22)) }
  ].map((d) => { const el = document.createElement('span'); el.className = 'k3d-dim'; el.textContent = d.t; dims.appendChild(el); return { ...d, el }; });

  const occluders = [];
  for (const o of built.occ) {
    if (o.x1 - o.x0 < 0.001 || o.z1 - o.z0 < 0.001) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(o.x1 - o.x0, o.h, o.z1 - o.z0), pickMat);
    m.position.set((o.x0 + o.x1) / 2, o.h / 2, (o.z0 + o.z1) / 2); m.userData.wall = o.key; occluders.push(m);
  }
  occluders.forEach((o) => o.updateMatrixWorld(true));
  items.forEach((it) => it.pick.updateMatrixWorld(true));

  const K = { host, open: true, started: false, needs: true, tween: null, current: null, view: null };
  const ray = new THREE.Raycaster(), v = new THREE.Vector3(), ndc = new THREE.Vector2();

  function resize() {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix(); K.needs = true;
  }
  new ResizeObserver(resize).observe(stage); resize();

  let shadowState = '';
  function applyCut() {
    const p = camera.position, vis = {
      N: p.z > Z0 - 0.02, S: p.z < Z1 + 0.02, W: p.x > X0 - 0.02, E: p.x < X1 + 0.02
    };
    for (const k of ['N', 'S', 'E', 'W']) { baked[k].visible = vis[k]; baked['stub' + k].visible = !vis[k]; }
    baked.ceiling.visible = p.y < H_ACT - 0.02;
    baked.deck.visible = p.y < H_DECK - 0.02;
    baked.roof.visible = p.y < 2.8;
    const key = `${baked.roof.visible}${vis.N}${vis.S}${vis.E}${vis.W}`;
    if (key !== shadowState) { shadowState = key; renderer.shadowMap.needsUpdate = true; }
    return vis;
  }

  function updateSpots(vis) {
    const w = stage.clientWidth, h = stage.clientHeight;
    const active = occluders.filter((o) => !o.userData.wall || vis[o.userData.wall]);
    const top = camera.position.y > 7;
    for (const it of items) {
      v.copy(it.anchorV).project(camera);
      let hide = v.z > 1 || v.x < -1.05 || v.x > 1.05 || v.y < -1.05 || v.y > 1.05 || !!(it.cut && !vis[it.cut]);
      if (!hide) {
        const dir = it.anchorV.clone().sub(camera.position), dist = dir.length(); dir.normalize();
        ray.set(camera.position, dir); ray.far = dist - 0.05;
        const hit = ray.intersectObjects([...active, ...items.filter((o) => o !== it && !(o.cut && !vis[o.cut]) && o.id !== 'hood').map((o) => o.pick)], false)[0];
        if (hit && !(top && hit.object.userData.id)) hide = true;
      }
      it.el.classList.toggle('off', hide);
      if (!hide) it.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`;
    }
    for (const d of dimLabels) {
      const show = K.view === 'plan' && camera.position.y > 20;
      d.el.style.display = show ? '' : 'none';
      if (show) { v.copy(d.p).project(camera); d.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`; }
    }
  }

  // keep a close-up camera inside the space its target is in (open kitchen + store strip, or back room)
  function keepInside(pos) {
    const cl = THREE.MathUtils.clamp;
    pos.x = cl(pos.x, X0 + 0.3, X1 - 0.3); pos.z = cl(pos.z, Z0 + 0.3, Z1 + 2.2); pos.y = cl(pos.y, 0.9, 2.9);
  }
  // Reflections from the store itself: render a cube map from the middle of the sales floor once.
  function captureEnv() {
    for (const k of ['N', 'S', 'E', 'W']) { baked[k].visible = true; baked['stub' + k].visible = false; }
    baked.ceiling.visible = baked.deck.visible = baked.roof.visible = true;
    renderer.shadowMap.needsUpdate = true;
    const crt = new THREE.WebGLCubeRenderTarget(HQ ? 256 : 128, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.1, 60, crt); cc.position.set(px(46), 1.8, pz(24)); scene.add(cc);
    const bg = scene.background; scene.background = null;
    cc.update(renderer, scene);
    const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromCubemap(crt.texture); pm.dispose(); crt.dispose(); scene.remove(cc);
    const old = scene.environment; scene.environment = rt.texture; scene.background = bg; if (old) old.dispose();
    shadowState = ''; applyCut();
  }
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function flyTo(pos, target, instant) {
    if (instant) { camera.position.copy(pos); controls.target.copy(target); controls.update(); K.needs = true; return; }
    K.tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), start: performance.now(), dur: 1100 };
  }
  K.setView = (name, instant) => {
    const vw = VIEWS[name]; K.view = name;
    host.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === name));
    if (instant && name === 'overview') { camera.position.set(22, 28, 34); controls.target.set(...vw.target); controls.update(); }
    // narrow screens: step back along the view so the same things fit
    const tgt = new THREE.Vector3(...vw.target), pos = new THREE.Vector3(...vw.pos);
    const k = THREE.MathUtils.clamp(1.35 / camera.aspect, 1, 2.0);
    if (k > 1) {
      const inside = pos.y < H_DECK && pos.x > X0 && pos.x < X1 && pos.z > Z0 && pos.z < Z1 + 2.5;
      pos.sub(tgt).multiplyScalar(k).add(tgt);
      if (inside) keepInside(pos, tgt);
    }
    flyTo(pos, tgt, instant && name !== 'overview');
  };
  host.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => K.setView(b.dataset.view)));

  function select(id, fly) {
    const it = items.find((q) => q.id === id);
    items.forEach((q) => q.el.classList.toggle('on', q === it));
    host.querySelectorAll('[data-item]').forEach((b) => b.setAttribute('aria-current', b.dataset.item === id));
    if (!it) { sel.visible = false; card.innerHTML = defaultCard; K.needs = true; return; }
    const s = it.box.getSize(new THREE.Vector3());
    sel.scale.set(s.x + 0.04, s.y + 0.04, s.z + 0.04); sel.position.copy(it.center); sel.visible = true;
    card.innerHTML = `<h3><i>${it.n}</i>${it.name}</h3><ul>${it.lines.map((l) => `<li>${l}</li>`).join('')}</ul><p class="sz">Typical size · ${it.size}</p>`;
    if (fly) {
      const r = Math.max(s.x, s.y * 0.8, s.z);
      const dist = THREE.MathUtils.clamp(r * 1.15 + 1.0, 1.6, 5.2);
      const tgt = it.center.clone(); if (it.id === 'cooler' || it.id === 'freezer') tgt.z = WALKIN.z1 - 0.4;
      const pos = tgt.clone().addScaledVector(it.face, dist); pos.y = tgt.y + Math.min(dist * 0.42, 1.0) + 0.3;
      keepInside(pos, tgt);
      flyTo(pos, tgt);
      host.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', 'false')); K.view = null;
    }
    K.needs = true;
  }
  host.querySelectorAll('[data-item]').forEach((b) => b.addEventListener('click', () => { select(b.dataset.item, true); list.classList.remove('open'); listBtn.setAttribute('aria-expanded', 'false'); }));

  // tap to pick
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; K.tween = null; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(ndc, camera); ray.far = Infinity;
    const vis = applyCut();
    const cands = items.filter((o) => !(o.cut && !vis[o.cut])).map((o) => o.pick);
    const hit = ray.intersectObjects(cands, false)[0];
    select(hit ? hit.object.userData.id : null, false);
  });
  controls.addEventListener('change', () => { K.needs = true; });

  K.loop = () => {
    if (K.running) return; K.running = true;
    const frame = (now) => {
      if (!K.open) { K.running = false; return; }
      requestAnimationFrame(frame);
      if (K.tween) {
        const tw = K.tween, t = Math.min(1, (now - tw.start) / tw.dur), e = ease(t);
        camera.position.lerpVectors(tw.p0, tw.p1, e); controls.target.lerpVectors(tw.t0, tw.t1, e);
        if (t >= 1) K.tween = null; K.needs = true;
      }
      const moved = controls.update();
      if (camera.position.y < 0.3) { camera.position.y = 0.3; }
      if (moved || K.needs) {
        const vis = applyCut();
        if (!K.envReady) { captureEnv(); K.envReady = true; }
        composer.render();
        updateSpots(vis);
        K.needs = false;
        if (!K.ready) { K.ready = true; status.hidden = true; window.__k3dReady = true; }
      }
    };
    requestAnimationFrame(frame);
  };
  K.select = select;
  K.renderer = renderer;
  return K;
}
