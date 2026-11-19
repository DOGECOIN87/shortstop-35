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

const IN = 0.0254;
const ROOM = { w: 9.75, d: 6.1, h: 3.05 };            // back room: 32 x 20 ft, 10 ft ceiling
const X0 = -ROOM.w / 2, X1 = ROOM.w / 2, Z0 = -ROOM.d / 2, Z1 = ROOM.d / 2;
const WALL = 0.15;
// Open kitchen on the store side of the back room's south wall (owner's photo):
// the cook line under the hood against a stainless wall, a glass-front serving
// counter facing the store, and three menu screens hung between them. A
// doorway at the west end of that wall leads to the back room.
const FK = { x0: X0, x1: 3.35, z0: Z1 + WALL, z1: Z1 + WALL + 3.2 };
const STORE_D = 2.6;                                     // strip of store floor in front of the counter
const DOORWAY = { a: -3.9, b: -2.99, h: 2.13 };
const DOWNLIGHTS = [[-2.6, FK.z0 + 2.2], [0.0, FK.z0 + 2.25], [2.5, FK.z0 + 2.2], [-1.5, FK.z1 + 1.3], [1.5, FK.z1 + 1.3]];
const WALKIN = { x0: 2.43, x1: X1, z0: -1.22, z1: Z1, h: 2.36, split: 1.0, t: 0.1, dh: 1.98 };
const HOOD = { x0: -1.62, x1: 2.04, depth: 1.37, bottom: 1.98, top: 2.59 };
const LINE_BACK = FK.z0 + 0.1;                           // equipment backs, clear of the gas manifold

const ZONES = { front: 'Open kitchen', prep: 'Back room · prep', wash: 'Back room · wash-up', storage: 'Back room · storage', doors: 'Doors' };
const ITEMS = {
  hood: { zone: 'front', name: 'Exhaust hood', lines: ['CaptiveAire stainless wall-canopy hood over the line', 'Grease baffle filters, vapor-proof lights and a control panel'], size: 'About 12 ft long' },
  suppression: { zone: 'front', name: 'Fire suppression', lines: ['Wet-chemical system with a nozzle over each appliance', 'Agent cabinet and pull station on the side wall'], size: 'Covers the full hood' },
  griddle: { zone: 'front', name: '36 in flattop', lines: ['Thick steel griddle plate in the middle of the line', 'Refrigerated chef base below keeps cold product at hand'], size: '36 in wide' },
  range: { zone: 'front', name: 'Range burners', lines: ['Open burners for stock pots and sauté pans, beside the flattop'], size: '24 in wide' },
  fryers: { zone: 'front', name: 'Fryers (2)', lines: ['Two open fryers with baskets on hangers', 'At the right end of the line'], size: '15½ in wide each' },
  dump: { zone: 'front', name: 'Fry holding station', lines: ['Holding well with a perforated pan under a heat lamp'], size: '18 in wide' },
  hotcab: { zone: 'front', name: 'Hot holding cabinet', lines: ['Heated cabinet with a glass door and digital display', 'Just past the end of the hood'], size: '26 in wide' },
  counter: { zone: 'front', name: 'Serving counter', lines: ['Heated display wells under two-tier glass, facing the store', 'Customers see the food and order right at the counter'], size: 'Runs the width of the kitchen' },
  menu: { zone: 'front', name: 'Digital menu boards', lines: ['Three screens hung from the ceiling over the counter'], size: '3 screens' },
  handsink1: { zone: 'front', name: 'Hand sink by the line', lines: ['Wall-hung hand sink with soap and towel dispensers'], size: '17 in wide' },
  ovens: { zone: 'prep', name: 'Rapid-cook ovens (2)', lines: ['High-speed ovens for pizza, sandwiches and wings in minutes', 'Ventless, on a stand in the back room'], size: 'About 27 in wide each' },
  prep: { zone: 'prep', name: 'Refrigerated prep table', lines: ['Cold rail with 16 ingredient pans and a hinged lid', 'Full-length cutting board, three refrigerated doors below'], size: '72 in long' },
  dough: { zone: 'prep', name: 'Dough and tortilla station', lines: ['Stainless worktable with a heated tortilla press and a 20 qt mixer', 'Ingredient bins and a pan shelf underneath'], size: '72 in long' },
  rack: { zone: 'prep', name: 'Sheet pan rack', lines: ['Holds 20 full sheet pans for dough and prepped food', 'On casters'], size: '20 × 26 in' },
  handsink2: { zone: 'wash', name: 'Hand sink in the back room', lines: ['Second hand sink by the prep area'], size: '17 in wide' },
  sink3: { zone: 'wash', name: '3-compartment sink', lines: ['Wash, rinse and sanitize tubs with drainboards both sides', 'Pre-rinse sprayer and a wall shelf for clean pans'], size: '90 in long' },
  mop: { zone: 'wash', name: 'Mop sink', lines: ['Floor basin with hose faucet, bucket hook and mop rack'], size: '24 × 24 in' },
  reachin: { zone: 'storage', name: 'Reach-in freezer', lines: ['Two-door freezer in the back room'], size: '54 in wide' },
  ice: { zone: 'storage', name: 'Ice machine', lines: ['Ice maker on a storage bin, with a water filter'], size: '30 in wide' },
  cooler: { zone: 'storage', name: 'Walk-in cooler', lines: ['Shelving on two walls, strip curtain and digital thermometer', 'Room for cases, produce and prepped food'], size: 'About 7 × 7 ft inside' },
  freezer: { zone: 'storage', name: 'Walk-in freezer', lines: ['Shelving on two walls, insulated floor and a heated door frame'], size: 'About 7 × 6 ft inside' },
  dry: { zone: 'storage', name: 'Dry storage', lines: ['Wire shelving for flour, canned goods and paper supplies'], size: '7 ft of shelving' },
  doorway: { zone: 'doors', name: 'Doorway to the back room', lines: ['Leads from the open kitchen to prep, wash-up and the walk-ins'], size: '36 in' },
  backdoor: { zone: 'doors', name: 'Back door', lines: ['Steel exit door for deliveries, with a panic bar'], size: '36 in' }
};

const VIEWS = {
  overview: { label: 'Overview', pos: [8.6, 10.2, 14.0], target: [-0.5, 0.2, 1.4] },
  plan: { label: 'Floor plan', pos: [-0.05, 20.5, 2.3], target: [-0.05, 0, 1.75] },
  front: { label: 'From the store', pos: [0.2, 1.72, FK.z1 + 1.9], target: [0.1, 1.55, FK.z0 + 0.4] },
  line: { label: 'Behind the counter', pos: [3.0, 1.85, FK.z0 + 1.75], target: [-1.6, 1.0, FK.z0 + 0.4] },
  prep: { label: 'Prep', pos: [0.05, 1.95, -1.85], target: [-1.9, 0.85, -0.65] },
  wash: { label: 'Wash-up', pos: [1.3, 1.8, -0.1], target: [1.3, 1.05, -2.9] },
  walkin: { label: 'Walk-ins', pos: [-1.25, 1.95, 1.05], target: [2.45, 1.05, 0.85] }
};

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

/* --------------------------------------------------------------- textures */

function makeTextures(aniso) {
  const T = (c, srgb = true, rep) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  };
  const X = {};

  const brushed = (vertical, seed) => {
    const c = canvas(256, 256), g = c.getContext('2d'), r = rng(seed);
    g.fillStyle = '#a0a0a0'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1100; i++) {
      const v = 130 + r() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v},${0.04 + r() * 0.09})`;
      const p = r() * 256, s = r() * 256, len = 30 + r() * 220;
      if (vertical) { g.fillRect(p, s, 1, len); g.fillRect(p, s - 256, 1, len); }
      else { g.fillRect(s, p, len, 1); g.fillRect(s - 256, p, len, 1); }
    }
    return c;
  };
  X.brushH = T(brushed(false, 3), false); X.brushV = T(brushed(true, 7), false);

  // Red quarry tile, 6 in squares: one texture = 4 x 4 tiles = 24 in.
  {
    const S = 512, n = 4, cell = S / n, gw = 8, r = rng(11);
    const col = canvas(S, S), hgt = canvas(S, S), rough = canvas(S, S);
    const gc = col.getContext('2d'), gh = hgt.getContext('2d'), gr = rough.getContext('2d');
    gc.fillStyle = '#6d5e55'; gc.fillRect(0, 0, S, S);
    gh.fillStyle = '#303030'; gh.fillRect(0, 0, S, S);
    gr.fillStyle = '#f0f0f0'; gr.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * cell + gw / 2, y = j * cell + gw / 2, s = cell - gw;
      const hue = 9 + r() * 7, sat = 48 + r() * 12, lit = 31 + r() * 7;
      gc.fillStyle = `hsl(${hue},${sat}%,${lit}%)`; rrect(gc, x, y, s, s, 5); gc.fill();
      const gg = gc.createRadialGradient(x + r() * s, y + r() * s, 4, x + s / 2, y + s / 2, s);
      gg.addColorStop(0, `hsla(${hue + 4},${sat}%,${lit + 6}%,0.35)`); gg.addColorStop(1, 'hsla(0,0%,0%,0)');
      gc.fillStyle = gg; rrect(gc, x, y, s, s, 5); gc.fill();
      for (let k = 0; k < 220; k++) {
        gc.fillStyle = r() < 0.5 ? `rgba(40,12,4,${0.05 + r() * 0.1})` : `rgba(230,150,110,${0.04 + r() * 0.08})`;
        gc.fillRect(x + r() * s, y + r() * s, 1 + r() * 2, 1 + r() * 2);
      }
      gh.fillStyle = '#d8d8d8'; rrect(gh, x, y, s, s, 7); gh.fill();
      const rv = 120 + r() * 40 | 0; gr.fillStyle = `rgb(${rv},${rv},${rv})`; rrect(gr, x, y, s, s, 5); gr.fill();
    }
    X.tile = T(col, true); X.tileRough = T(rough, false); X.tileN = T(normalFromHeight(hgt, 3.2), false);
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

  // Ceiling: 2 x 4 ft lay-in tiles; one texture = 4 x 4 ft.
  {
    const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = rng(21);
    g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,115,105,${0.05 + r() * 0.12})`; g.fillRect(r() * S, r() * S, 1 + r() * 2.5, 1); }
    g.fillStyle = '#d9d8d2'; g.fillRect(0, 0, S, 7); g.fillRect(0, 0, 7, S); g.fillRect(S / 2 - 3, 0, 7, S);
    X.ceiling = T(c, true);
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
  return X;
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
  const M = {};
  M.steel = std({ color: 0xd3d7da, metalness: 1, roughness: 0.6, roughnessMap: X.brushH });
  M.steelV = std({ color: 0xd3d7da, metalness: 1, roughness: 0.6, roughnessMap: X.brushV });
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
  M.tile = std({ map: X.tile, roughnessMap: X.tileRough, roughness: 1, normalMap: X.tileN, normalScale: new THREE.Vector2(0.9, 0.9) });
  M.cove = std({ color: 0x8a4430, roughness: 0.55 });
  M.frp = std({ color: 0xf0efe8, roughness: 0.74, normalMap: X.frpN, normalScale: new THREE.Vector2(0.4, 0.4) });
  M.frpTrim = std({ color: 0xe7e5dd, roughness: 0.5 });
  M.cut = std({ color: 0x204649, roughness: 0.8 });
  M.ceiling = std({ map: X.ceiling, roughness: 0.92 });
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
function B(p, mat, w, h, d, x = 0, y = 0, z = 0) { return addMesh(p, new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z); }
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
  const g = new THREE.Group(), xw = FK.x1;
  B(g, M.steel, 0.14, 0.62, 0.32, xw - 0.07, 1.95, FK.z0 + 0.45);
  B(g, M.red, 0.006, 0.07, 0.2, xw - 0.143, 2.45, FK.z0 + 0.45);
  tube(g, M.chrome, [[xw - 0.07, 2.57, FK.z0 + 0.45], [xw - 0.07, 2.7, FK.z0 + 0.45], [xw - 0.3, 2.7, FK.z0 + 0.9], [HOOD.x1, 2.6, FK.z0 + 0.9]], 0.01, 16);
  B(g, M.red, 0.05, 0.14, 0.1, xw - 0.025, 1.12, FK.z0 + 1.75);
  B(g, M.chrome, 0.012, 0.03, 0.05, xw - 0.056, 1.15, FK.z0 + 1.75);
  screen(g, signTexture(['PULL', 'IN CASE OF FIRE'], { w: 256, h: 128, bg: '#c4261c', fg: '#fff', size: 46 }), 0.16, 0.08, xw - 0.004, 1.37, FK.z0 + 1.75, -Math.PI / 2);
  C(g, M.chrome, 0.065, 0.065, 0.42, xw - 0.09, 0.95, FK.z0 + 1.25, 20);
  C(g, M.black, 0.02, 0.03, 0.08, xw - 0.09, 1.37, FK.z0 + 1.25, 10);
  screen(g, signTexture(['K', 'CLASS'], { w: 128, h: 128, bg: '#fff', fg: '#c4261c', size: 60 }), 0.07, 0.07, xw - 0.157, 1.13, FK.z0 + 1.25, -Math.PI / 2);
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
  const sections = [{ a: -3.75, b: -2.6, hot: false }, { a: -2.6, b: -0.8, hot: true }, { a: -0.8, b: 1.0, hot: true }, { a: 1.0, b: 2.8, hot: true }, { a: 2.8, b: FK.x1, hot: false }];
  const foods = [['beans', 'rice', 'meat', 'peppers'], ['chorizo', 'potato', 'pico', 'guac'], ['tomato', 'cheese', 'bacon', 'salsa']];
  let k = 0;
  for (const s of sections) {
    const w = s.b - s.a, cx = (s.a + s.b) / 2;
    B(g, M.black, w, 0.1, D - 0.06, cx, 0, 0);
    B(g, M.steel, w, H - 0.14, D, cx, 0.1, 0);
    B(g, M.steelV, w - 0.01, 0.6, 0.01, cx, 0.16, D / 2 + 0.002);
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
    for (const px of [s.a + 0.03, s.b - 0.03]) for (const pz of [-0.22, D / 2 - 0.03]) {
      C(g, M.chrome, 0.014, 0.014, 0.44, px, H, pz, 12);
      addMesh(g, new THREE.SphereGeometry(0.022, 12, 8), M.chrome, px, H + 0.45, pz);
    }
  }
  // napkin dispenser on the west end (owner's photo)
  B(g, M.black, 0.24, 0.03, 0.2, -3.2, H, 0.05);
  B(g, M.smoke, 0.2, 0.36, 0.16, -3.2, H + 0.03, 0.05);
  B(g, M.hdpe, 0.12, 0.05, 0.004, -3.2, H + 0.06, 0.132);
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
  const sign = new THREE.Group(); sign.position.set(-S / 2 - 0.12, 0, 0.05); sign.rotation.set(-0.12, 0.25, 0); g.add(sign);
  B(sign, M.yellow, 0.3, 0.62, 0.035, 0, 0, 0.06);
  screen(sign, signTexture(['CAUTION', 'WET FLOOR'], { w: 256, h: 256, bg: '#f0c018', fg: '#111', size: 48 }), 0.22, 0.22, 0, 0.42, 0.079);
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

function walkIn(M, r, roof, cutE, cutS, stubE, stubS) {
  const { x0, x1, z0, z1, h, split, t, dh } = WALKIN;
  const shell = new THREE.Group(), cooler = new THREE.Group(), freezer = new THREE.Group();
  const P = (g, a, b, c, d, e, f) => worldBox(g, M.walkin, a, b, c, d, e, f, 0.6);
  const doors = [{ a: -0.75, b: 0.11, open: true, g: cooler }, { a: 1.62, b: 2.48, open: false, g: freezer }];
  // west face with two openings
  P(shell, x0, x0 + t, 0, h, z0, doors[0].a);
  P(shell, x0, x0 + t, 0, h, doors[0].b, doors[1].a);
  P(shell, x0, x0 + t, 0, h, doors[1].b, z1);
  for (const d of doors) P(shell, x0, x0 + t, dh, h, d.a, d.b);
  P(shell, x0, x1, 0, h, z0, z0 + t);
  P(cutE, x1 - t, x1, 0, h, z0, z1); P(stubE, x1 - t, x1, 0, 0.18, z0, z1).castShadow = false;
  P(cutS, x0, x1, 0, h, z1 - t, z1); P(stubS, x0, x1, 0, 0.18, z1 - t, z1).castShadow = false;
  worldBox(stubE, M.cut, x1 - t, x1, 0.18, 0.186, z0, z1); worldBox(stubS, M.cut, x0, x1, 0.18, 0.186, z1 - t, z1);
  P(shell, x0 + t, x1 - t, 0, h, split - t / 2, split + t / 2);
  // panel seams and corner trim on the outside faces
  for (let z = z0 + 1.17; z < z1 - 0.2; z += 1.17) if (!doors.some((d) => z > d.a - 0.05 && z < d.b + 0.05)) worldBox(shell, M.walkinTrim, x0 - 0.003, x0, 0.12, h, z - 0.004, z + 0.004);
  for (let x = x0 + 1.17; x < x1 - 0.2; x += 1.17) worldBox(shell, M.walkinTrim, x - 0.004, x + 0.004, 0.12, h, z0 - 0.003, z0);
  worldBox(shell, M.walkinTrim, x0 - 0.04, x0 + 0.005, 0, h, z0 - 0.04, z0 + 0.005);
  worldBox(shell, M.cove, x0 - 0.012, x0, 0, 0.12, z0, z1 - 0.01);
  worldBox(shell, M.cove, x0, x1 - 0.01, 0, 0.12, z0 - 0.012, z0);
  // roof (cut away from above) with condensing units and line sets
  P(roof, x0, x1, h, h + t, z0, z1);
  for (const [cx, cz] of [[3.45, -0.35], [3.75, 2.0]]) {
    B(roof, M.paintBlue, 0.95, 0.5, 0.48, cx, h + t, cz);
    addMesh(roof, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 24), M.black, cx - 0.48, h + t + 0.25, cz, 0, 0, Math.PI / 2);
    addMesh(roof, new THREE.TorusGeometry(0.17, 0.008, 6, 24), M.chrome, cx - 0.49, h + t + 0.25, cz, 0, Math.PI / 2, 0);
    tube(roof, M.copper, [[cx + 0.3, h + t + 0.2, cz + 0.24], [cx + 0.3, h + t + 0.05, cz + 0.4], [cx + 0.3, h + t + 0.02, cz + 0.6]], 0.01, 8);
  }
  // doors
  for (const d of doors) {
    const w = d.b - d.a, g = d.g;
    worldBox(g, M.walkinTrim, x0 - 0.02, x0, 0, dh + 0.05, d.a - 0.05, d.a);
    worldBox(g, M.walkinTrim, x0 - 0.02, x0, 0, dh + 0.05, d.b, d.b + 0.05);
    worldBox(g, M.walkinTrim, x0 - 0.02, x0, dh, dh + 0.05, d.a - 0.05, d.b + 0.05);
    const pivot = new THREE.Group(); pivot.position.set(x0 - 0.01, 0, d.a); pivot.rotation.y = d.open ? -1.25 : 0; g.add(pivot);
    B(pivot, M.walkin, 0.1, dh - 0.02, w, 0.04, 0.01, w / 2);
    B(pivot, M.tread, 0.004, 0.32, w - 0.04, -0.012, 0.02, w / 2);
    B(pivot, M.chrome, 0.05, 0.05, 0.12, -0.035, 1.02, w - 0.12);
    B(pivot, M.chrome, 0.03, 0.03, 0.18, -0.03, 1.0, w - 0.2);
    for (const y of [0.3, dh - 0.35]) B(pivot, M.chrome, 0.03, 0.14, 0.05, -0.025, y, 0.02);
    // label and digital thermometer above the door
    screen(g, signTexture([d.open ? 'COOLER' : 'FREEZER'], { w: 512, h: 128, bg: '#204649', fg: '#f5f3e6', size: 70 }), 0.5, 0.125, x0 - 0.004, dh + 0.2, (d.a + d.b) / 2 - 0.15, -Math.PI / 2);
    B(g, M.blackGloss, 0.03, 0.08, 0.16, x0 - 0.015, dh + 0.16, (d.a + d.b) / 2 + 0.3);
    screen(g, screenTexture(128, 64, (c) => { c.fillStyle = '#030607'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ff3a1c'; c.font = 'bold 34px monospace'; c.textAlign = 'center'; c.fillText(d.open ? '36°F' : '-4°F', 64, 44); }), 0.13, 0.06, x0 - 0.031, dh + 0.2, (d.a + d.b) / 2 + 0.3, -Math.PI / 2);
    B(g, M.hdpe, 0.02, 0.1, 0.06, x0 - 0.01, 1.2, d.b + 0.12);
    B(g, M.pilotRed, 0.006, 0.012, 0.012, x0 - 0.021, 1.27, d.b + 0.12);
  }
  // strip curtain in the open cooler door
  for (let i = 0; i < 5; i++) { const m = B(cooler, M.curtain, 0.003, dh - 0.06, 0.2, x0 + t + 0.02 + (i % 2) * 0.004, 0.02, doors[0].a + 0.09 + i * 0.17); m.castShadow = false; }
  B(cooler, M.alum, 0.03, 0.03, doors[0].b - doors[0].a, x0 + t + 0.02, dh - 0.04, (doors[0].a + doors[0].b) / 2);
  // freezer: insulated floor and ramp, heater frame
  worldBox(freezer, M.tread, x0 + t, x1 - t, 0, 0.1, split + t / 2, z1 - t);
  const ramp = B(freezer, M.tread, 0.42, 0.02, doors[1].b - doors[1].a, x0 - 0.2, 0.03, (doors[1].a + doors[1].b) / 2); ramp.rotation.z = 0.24;
  // evaporators and vapor-proof lights inside
  for (const [g, zc] of [[cooler, (z0 + split) / 2], [freezer, (split + z1) / 2]]) {
    B(g, M.hdpe, 0.32, 0.3, 0.95, x1 - t - 0.17, 2.0, zc);
    for (const s of [-1, 1]) {
      addMesh(g, new THREE.CylinderGeometry(0.11, 0.11, 0.01, 20), M.black, x1 - t - 0.335, 2.15, zc + s * 0.22, 0, 0, Math.PI / 2);
      addMesh(g, new THREE.TorusGeometry(0.11, 0.006, 6, 20), M.chrome, x1 - t - 0.34, 2.15, zc + s * 0.22, 0, Math.PI / 2, 0);
    }
    C(roof, M.lamp, 0.06, 0.06, 0.1, (x0 + x1) / 2, h - 0.12, zc, 16);
  }
  // shelving: cooler on the north and east walls, freezer on the south and east walls
  const cK = ['produce', 'cheese', 'eggs', 'meat', 'container', 'crate', 'tortilla'];
  const fK = ['fries', 'chicken', 'meat', 'tortilla', 'fries'];
  const lv = [0.18, 0.62, 1.06, 1.5, 1.86];
  const s1 = shelving(M, 1.83, 0.46, 1.9, lv, stockShelf(M, r, 1.83, 0.46, cK)); s1.position.set((x0 + t + x1 - t) / 2 - 0.05, 0, z0 + t + 0.25); cooler.add(s1);
  const s2 = shelving(M, 1.22, 0.46, 1.9, lv, stockShelf(M, r, 1.22, 0.46, cK)); s2.position.set(x1 - t - 0.25, 0, 0.02); s2.rotation.y = Math.PI / 2; cooler.add(s2);
  const s3 = shelving(M, 1.83, 0.46, 1.9, lv.map((y) => y + 0.1), stockShelf(M, r, 1.83, 0.46, fK)); s3.position.set((x0 + t + x1 - t) / 2 - 0.05, 0, z1 - t - 0.25); freezer.add(s3);
  const s4 = shelving(M, 0.91, 0.46, 1.9, lv.map((y) => y + 0.1), stockShelf(M, r, 0.91, 0.46, fK)); s4.position.set(x1 - t - 0.25, 0, 1.75); s4.rotation.y = Math.PI / 2; freezer.add(s4);
  return { shell, cooler, freezer };
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

function buildKitchen(M, X) {
  const r = rng(42);
  const groups = {};
  for (const k of ['main', 'N', 'S', 'E', 'W', 'FE', 'stubN', 'stubE', 'stubW', 'stubFE', 'ceiling', 'roof']) groups[k] = new THREE.Group();
  const items = [];
  const reg = (id, obj, { face = [0, 0, 1], anchor, box, cut } = {}) => items.push({ id, ...ITEMS[id], obj, face: new THREE.Vector3(...face), anchor, box, cut });
  const put = (parent, obj, x, z, ry = 0, y = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; parent.add(obj); return obj; };
  const shadowsFor = [];
  const main = groups.main, H = ROOM.h, T = WALL;

  // floors: quarry tile in both kitchens, vinyl tile on the store side of the counter
  const floor = new THREE.Group();
  const fl = (mat, x0, x1, z0, z1, rep) => {
    const m = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(x1 - x0, z1 - z0), (x1 - x0) / rep, (z1 - z0) / rep), mat);
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); m.receiveShadow = true; floor.add(m);
  };
  fl(M.tile, X0, X1, Z0, Z1, 0.6096); fl(M.tile, FK.x0, FK.x1, Z1, FK.z1, 0.6096); fl(M.vct, FK.x0, FK.x1, FK.z1, FK.z1 + STORE_D, 1.2192);

  // walls, with low section caps shown when a wall is cut away for the camera
  const walls = [
    { k: 'N', axis: 'x', at: Z0, dir: -1, from: X0 - T, to: X1 + T, lo: X0, hi: X1, openings: [] },
    { k: 'S', axis: 'x', at: Z1, dir: 1, from: X0 - T, to: X1 + T, lo: X0, hi: X1, openings: [{ a: DOORWAY.a, b: DOORWAY.b, y0: 0, y1: DOORWAY.h }], noStub: true },
    { k: 'W', axis: 'z', at: X0, dir: -1, from: Z0, to: Z1, lo: Z0, hi: Z1, openings: [] },
    { k: 'W', axis: 'z', at: X0, dir: -1, from: Z1, to: FK.z1, lo: FK.z0, hi: FK.z1, openings: [] },
    { k: 'E', axis: 'z', at: X1, dir: 1, from: Z0, to: Z1, lo: Z0, hi: Z1, openings: [{ a: -2.2, b: -1.29, y0: 0, y1: 2.13 }] },
    { k: 'FE', axis: 'z', at: FK.x1, dir: 1, from: Z1, to: FK.z1, lo: FK.z0, hi: FK.z1, openings: [] }
  ];
  for (const w of walls) {
    const g = groups[w.k], stub = w.noStub ? null : groups['stub' + w.k];
    const t0 = w.dir > 0 ? w.at : w.at - T, t1 = w.dir > 0 ? w.at + T : w.at;
    const piece = (a, b, y0, y1, target, mat = M.frp) => {
      if (!target || b - a < 0.001) return null;
      const m = w.axis === 'x' ? worldBox(target, mat, a, b, y0, y1, t0, t1, 0.6) : worldBox(target, mat, t0, t1, y0, y1, a, b, 0.6);
      m.castShadow = false; return m;
    };
    const cuts = [...w.openings].sort((p, q) => p.a - q.a);
    let s = w.from;
    for (const o of cuts) {
      piece(s, o.a, 0, H, g); piece(s, o.a, 0, 0.18, stub); piece(s, o.a, 0.18, 0.186, stub, M.cut);
      if (o.y0 > 0) { piece(o.a, o.b, 0, o.y0, g); piece(o.a, o.b, 0, 0.18, stub); piece(o.a, o.b, 0.18, 0.186, stub, M.cut); }
      piece(o.a, o.b, o.y1, H, g); s = o.b;
    }
    piece(s, w.to, 0, H, g); piece(s, w.to, 0, 0.18, stub); piece(s, w.to, 0.18, 0.186, stub, M.cut);
    // FRP seam strips and quarry cove base on the inside face
    const i0 = w.dir > 0 ? w.at - 0.004 : w.at, i1 = w.dir > 0 ? w.at : w.at + 0.004;
    const c0 = w.dir > 0 ? w.at - 0.012 : w.at, c1 = w.dir > 0 ? w.at : w.at + 0.012;
    const strip = (a, b, y0, y1, mat, q0, q1) => { const m = w.axis === 'x' ? worldBox(g, mat, a, b, y0, y1, q0, q1) : worldBox(g, mat, q0, q1, y0, y1, a, b); m.castShadow = false; };
    for (let p = w.lo + 1.22; p < w.hi - 0.1; p += 1.22) if (!w.openings.some((o) => p > o.a - 0.03 && p < o.b + 0.03)) strip(p - 0.016, p + 0.016, 0.15, H, M.frpTrim, i0, i1);
    let cs = w.lo;
    for (const o of cuts.filter((o) => o.y0 === 0)) { strip(cs, o.a, 0, 0.15, M.cove, c0, c1); cs = o.b; }
    strip(cs, w.hi, 0, 0.15, M.cove, c0, c1);
  }

  // full-height stainless on the open kitchen side of the shared wall, and the cased doorway
  {
    const g = groups.S, z = FK.z0;
    for (const [a, b] of [[FK.x0, DOORWAY.a], [DOORWAY.b, FK.x1]]) {
      worldBox(g, M.steelV, a, b, 0, H, z, z + 0.004).castShadow = false;
      for (let p = a + 1.22; p < b - 0.1; p += 1.22) worldBox(g, M.steelDark, p - 0.004, p + 0.004, 0, H, z + 0.004, z + 0.006).castShadow = false;
    }
    for (const [q0, q1] of [[Z1 - 0.012, Z1], [FK.z0, FK.z0 + 0.012]]) {
      worldBox(g, M.steel, DOORWAY.a - 0.06, DOORWAY.a, 0, DOORWAY.h + 0.06, q0, q1);
      worldBox(g, M.steel, DOORWAY.b, DOORWAY.b + 0.06, 0, DOORWAY.h + 0.06, q0, q1);
      worldBox(g, M.steel, DOORWAY.a - 0.06, DOORWAY.b + 0.06, DOORWAY.h, DOORWAY.h + 0.06, q0, q1);
    }
    worldBox(g, M.steel, DOORWAY.a, DOORWAY.a + 0.012, 0, DOORWAY.h, Z1, FK.z0); worldBox(g, M.steel, DOORWAY.b - 0.012, DOORWAY.b, 0, DOORWAY.h, Z1, FK.z0);
    worldBox(g, M.tread, DOORWAY.a, DOORWAY.b, 0, 0.006, Z1 - 0.05, FK.z0 + 0.05).castShadow = false;
    reg('doorway', g, { face: [0, 0, 1], anchor: [(DOORWAY.a + DOORWAY.b) / 2, 2.35, FK.z0 + 0.15], box: new THREE.Box3(new THREE.Vector3(DOORWAY.a, 0, Z1 - 0.05), new THREE.Vector3(DOORWAY.b, DOORWAY.h, FK.z0 + 0.05)) });
  }

  // ceilings: lay-in tile and LED troffers in the back room; smooth ceiling with
  // recessed downlights and a square supply diffuser over the open kitchen (photo)
  {
    const g = groups.ceiling;
    const c = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(ROOM.w, ROOM.d), ROOM.w / 1.2192, ROOM.d / 1.2192), M.ceiling);
    c.rotation.x = Math.PI / 2; c.position.y = H; g.add(c);
    for (const [x, z] of [[-3.3, -0.6], [-1.0, -0.6], [1.25, -0.6], [-3.3, -2.35], [-1.0, -2.35], [1.25, -2.35], [3.6, -2.15], [-3.3, 1.65], [-1.0, 1.65], [1.25, 1.65]]) {
      B(g, M.steel, 1.22, 0.04, 0.61, x, H - 0.04, z).castShadow = false;
      B(g, M.troffer, 1.16, 0.004, 0.55, x, H - 0.044, z).castShadow = false;
    }
    for (const [x, z] of [[-2.2, 0.5], [0.2, -1.6], [0.2, 2.2], [-3.9, 2.4], [-2.2, -2.4], [1.8, 0.4]]) {
      C(g, M.chrome, 0.012, 0.012, 0.05, x, H - 0.05, z, 8); addMesh(g, new THREE.CylinderGeometry(0.03, 0.005, 0.01, 12), M.chrome, x, H - 0.055, z);
    }
    for (const [x, z] of [[-2.2, 1.1], [0.6, 0.4]]) {
      B(g, M.frpTrim, 0.6, 0.02, 0.6, x, H - 0.02, z).castShadow = false;
      B(g, M.louver, 0.5, 0.004, 0.5, x, H - 0.024, z).castShadow = false;
    }
    const fw = FK.x1 - FK.x0, fd = FK.z1 + STORE_D - FK.z0;
    const fc = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(fw, fd), fw / 0.6, fd / 0.6), M.drywall);
    fc.rotation.x = Math.PI / 2; fc.position.set((FK.x0 + FK.x1) / 2, H, FK.z0 + fd / 2); g.add(fc);
    for (const [x, z] of DOWNLIGHTS) {
      addMesh(g, new THREE.TorusGeometry(0.085, 0.012, 8, 24), M.frpTrim, x, H - 0.01, z, Math.PI / 2, 0, 0).castShadow = false;
      addMesh(g, new THREE.CircleGeometry(0.075, 24), M.troffer, x, H - 0.012, z, Math.PI / 2, 0, 0).castShadow = false;
    }
    const dx = 1.5, dz = FK.z0 + 2.3;
    for (let i = 0; i < 4; i++) {
      const s = 0.6 - i * 0.12;
      for (const [w, d, ox, oz] of [[s, 0.02, 0, s / 2], [s, 0.02, 0, -s / 2], [0.02, s, s / 2, 0], [0.02, s, -s / 2, 0]]) B(g, M.frpTrim, w, 0.02 + i * 0.012, d, dx + ox, H - 0.02 - i * 0.012, dz + oz).castShadow = false;
    }
    B(g, M.black, 0.22, 0.004, 0.22, dx, H - 0.066, dz).castShadow = false;
  }

  /* ---------------- open kitchen ---------------- */
  // cook line, west to east under the hood (owner's photo: flattop in the middle, burners with a stock pot, fryers on the right)
  let lx = HOOD.x0 + 0.05, x, z;
  const nozzles = [];
  const slot = (w, d) => { const cx = lx + w / 2; lx += w; return [cx, LINE_BACK + d / 2]; };
  const ld = landing(M); [x, z] = slot(24 * IN, 30 * IN); put(main, ld, x, z); shadowsFor.push([ld, 0.04]);
  const g36 = griddle36(M, r); [x, z] = slot(36 * IN, 32 * IN); put(main, g36, x, z); reg('griddle', g36); shadowsFor.push([g36, 0.04]); nozzles.push(x - 0.22, x + 0.22);
  const rg = rangeTop(M); [x, z] = slot(24 * IN, 30 * IN); put(main, rg, x, z); reg('range', rg); shadowsFor.push([rg, 0.04]); nozzles.push(x);
  const fry = new THREE.Group();
  for (let i = 0; i < 2; i++) { const f = fryer(M); [x, z] = slot(15.5 * IN, 30.5 * IN); put(fry, f, x, z); nozzles.push(x); }
  main.add(fry); reg('fryers', fry); shadowsFor.push([fry, 0.04]);
  const dmp = dumpStation(M, r); [x, z] = slot(18 * IN, 30.5 * IN); put(main, dmp, x, z); reg('dump', dmp); shadowsFor.push([dmp, 0.04]); nozzles.push(x);

  // gas manifold on the wall behind the line, with flex connectors
  barX(main, M.iron, 3.1, 0.022, 0.15, 0.42, FK.z0 + 0.05);
  for (const gx of [g36.position.x, rg.position.x, fry.children[0].position.x, fry.children[1].position.x]) {
    C(main, M.iron, 0.016, 0.016, 0.12, gx, 0.42, FK.z0 + 0.05, 8);
    B(main, M.yellow, 0.06, 0.012, 0.012, gx + 0.03, 0.5, FK.z0 + 0.05);
    tube(main, M.gasHose, [[gx, 0.42, FK.z0 + 0.06], [gx + 0.03, 0.3, FK.z0 + 0.14], [gx + 0.06, 0.32, FK.z0 + 0.2]], 0.014, 12);
  }

  const hd = hood(M); put(main, hd, (HOOD.x0 + HOOD.x1) / 2, FK.z0);
  const sup = suppression(M, hd, nozzles); groups.FE.add(sup);
  reg('hood', hd, { anchor: [(HOOD.x0 + HOOD.x1) / 2 - 0.9, HOOD.bottom + 0.35, FK.z0 + HOOD.depth + 0.05], box: new THREE.Box3(new THREE.Vector3(HOOD.x0, HOOD.bottom, FK.z0), new THREE.Vector3(HOOD.x1, H, FK.z0 + HOOD.depth)) });
  reg('suppression', sup, { face: [-1, 0, 0], anchor: [FK.x1 - 0.2, 2.72, FK.z0 + 0.45], cut: 'FE' });

  const hc = hotCabinet(M, r); put(main, hc, HOOD.x1 + 0.45, LINE_BACK + 31 * IN / 2 - 0.05); reg('hotcab', hc); shadowsFor.push([hc, 0.04]);

  // wire shelving with supplies left of the hood (photo), next to the doorway
  const ws = shelving(M, 1.22, 0.46, 0, [0.15, 0.6, 1.05, 1.5], stockShelf(M, r, 1.22, 0.46, ['napkins', 'foil', 'cups', 'tortilla', 'container']));
  put(main, ws, -2.3, FK.z0 + 0.26); shadowsFor.push([ws, 0.03]);
  addMesh(main, new THREE.TorusGeometry(0.11, 0.01, 6, 24), M.black, -1.98, 1.22, FK.z0 + 0.3, 0, 0.3, 0);
  C(main, M.black, 0.09, 0.09, 0.06, -1.98, 1.06, FK.z0 + 0.28, 16);

  // menu screens hung in front of the hood, serving counter facing the store
  const mb = menuBoards(M); put(main, mb, 0.2, FK.z0 + 1.48); reg('menu', mb, { anchor: [0.2, 2.03, FK.z0 + 1.6] });
  const sc = servingCounter(M); put(main, sc, 0, FK.z1 - 0.425); reg('counter', sc, { anchor: [0.1, 1.55, FK.z1 - 0.3] }); shadowsFor.push([sc, 0.03]);

  // anti-fatigue mats along the line
  for (const mx of [-0.85, 0.67]) { const m = addMesh(main, scaleUV(new THREE.PlaneGeometry(1.52, 0.91), 1.52 / 0.25, 0.91 / 0.25), M.mat, mx, 0.008, LINE_BACK + 1.3, -Math.PI / 2); m.castShadow = false; }

  const hs1 = handSink(M); put(groups.W, hs1, FK.x0, FK.z0 + 1.45, Math.PI / 2); reg('handsink1', hs1, { face: [1, 0, 0], cut: 'W' });
  trashCan(M, -3.35, FK.z1 - 1.35, M.greyPlastic, main);
  for (const [fx, fz] of [[-1.9, FK.z0 + 1.25]]) { B(main, M.steelDark, 0.2, 0.004, 0.2, fx, 0.001, fz).castShadow = false; B(main, M.louver, 0.16, 0.002, 0.16, fx, 0.005, fz).castShadow = false; }

  /* ---------------- back room ---------------- */
  const ov = ovens(M); put(main, ov, -3.8, Z0 + 0.1 + 30 * IN / 2); reg('ovens', ov); shadowsFor.push([ov, 0.04]);
  const wt = worktable(M, r); put(main, wt, -1.95, Z0 + 0.1 + 30 * IN / 2); shadowsFor.push([wt, 0.04]);

  const pz = -1.07 + 34 * IN / 2;
  const pt = prepTable(M, r); put(main, pt, -2.385, pz, Math.PI); reg('prep', pt, { face: [0, 0, -1] }); shadowsFor.push([pt, 0.04]);
  const ds = doughStation(M, r); put(main, ds, -0.49, -1.07 + 30 * IN / 2 + 0.03, Math.PI); reg('dough', ds, { face: [0, 0, -1] }); shadowsFor.push([ds, 0.04]);
  const sr = speedRack(M, r); put(main, sr, -2.75, 0.75, 0); reg('rack', sr, { face: [0, 0, 1] }); shadowsFor.push([sr, 0.03]);

  const hs2 = handSink(M); put(groups.W, hs2, X0, -1.55, Math.PI / 2); reg('handsink2', hs2, { face: [1, 0, 0], cut: 'W' });
  const ri = reachIn(M); put(main, ri, X0 + 31 * IN / 2 + 0.02, 0.065, Math.PI / 2); reg('reachin', ri, { face: [1, 0, 0] }); shadowsFor.push([ri, 0.04]);
  const dry = dryStorage(M, r); put(main, dry, X0 + 0.33, 1.8, Math.PI / 2); reg('dry', dry, { face: [1, 0, 0] }); shadowsFor.push([dry, 0.03]);

  const s3 = sink3(M); put(main, s3, 1.32, Z0 + 24 * IN / 2 + 0.01); reg('sink3', s3); shadowsFor.push([s3, 0.03]);
  const ice = iceMachine(M); put(main, ice, 3.0, Z0 + 34 * IN / 2 + 0.06); reg('ice', ice); shadowsFor.push([ice, 0.04]);
  const mop = mopSink(M); put(main, mop, 3.98, Z0); reg('mop', mop);
  for (const [fx, fz, s] of [[1.32, Z0 + 0.35, 0.3], [3.0, Z0 + 0.1, 0.25], [-1.0, -1.15, 0.2], [0.4, 0.6, 0.2]]) {
    B(main, M.steelDark, s, 0.004, s, fx, 0.001, fz).castShadow = false;
    B(main, M.louver, s - 0.04, 0.002, s - 0.04, fx, 0.005, fz).castShadow = false;
  }
  const mat3 = addMesh(main, scaleUV(new THREE.PlaneGeometry(1.52, 0.91), 1.52 / 0.25, 0.91 / 0.25), M.mat, 1.0, 0.008, -2.05, -Math.PI / 2); mat3.castShadow = false;

  const wi = walkIn(M, r, groups.roof, groups.E, groups.S, groups.stubE, new THREE.Group());
  main.add(wi.shell); main.add(wi.cooler); main.add(wi.freezer);
  reg('cooler', wi.cooler, { face: [-1, 0, 0], anchor: [WALKIN.x0 - 0.1, 2.3, -0.32], box: new THREE.Box3(new THREE.Vector3(WALKIN.x0, 0, WALKIN.z0), new THREE.Vector3(WALKIN.x1, WALKIN.h, WALKIN.split)) });
  reg('freezer', wi.freezer, { face: [-1, 0, 0], anchor: [WALKIN.x0 - 0.1, 2.3, 2.05], box: new THREE.Box3(new THREE.Vector3(WALKIN.x0, 0, WALKIN.split), new THREE.Vector3(WALKIN.x1, WALKIN.h, WALKIN.z1)) });

  // back-room side of the shared wall: clock over the doorway, ABC extinguisher
  {
    const g = groups.S, zf = Z1, mx = (DOORWAY.a + DOORWAY.b) / 2;
    C(g, M.black, 0.15, 0.15, 0.04, mx, 2.4, zf - 0.04, 32).rotation.x = Math.PI / 2;
    screen(g, screenTexture(128, 128, (c) => { c.fillStyle = '#f5f3e6'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; c.beginPath(); c.moveTo(64 + Math.cos(an) * 50, 64 + Math.sin(an) * 50); c.lineTo(64 + Math.cos(an) * 58, 64 + Math.sin(an) * 58); c.stroke(); } c.lineWidth = 5; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 26); c.stroke(); c.beginPath(); c.moveTo(64, 64); c.lineTo(94, 76); c.stroke(); }), 0.26, 0.26, mx, 2.4, zf - 0.061, Math.PI);
    const ex = DOORWAY.b + 0.4;
    C(g, M.red, 0.07, 0.07, 0.45, ex, 1.0, zf - 0.09, 20);
    C(g, M.black, 0.02, 0.03, 0.08, ex, 1.45, zf - 0.09, 10);
    screen(g, signTexture(['FIRE', 'EXTINGUISHER'], { w: 256, h: 192, bg: '#c4261c', fg: '#fff', size: 44 }), 0.2, 0.15, ex, 1.72, zf - 0.003, Math.PI);
  }
  trashCan(M, -0.15, 0.55, M.greyPlastic, main); trashCan(M, 0.0, -1.8, M.greyPlastic, main); trashCan(M, 1.25, 2.55, M.bluePlastic, main);

  // east wall: back door, exit sign, electrical panels
  {
    const g = groups.E, a = -2.2, b = -1.29, dh = 2.13, xf = X1;
    worldBox(g, M.steelDark, xf - 0.01, xf + 0.15, 0, dh + 0.05, a - 0.05, a); worldBox(g, M.steelDark, xf - 0.01, xf + 0.15, 0, dh + 0.05, b, b + 0.05);
    worldBox(g, M.steelDark, xf - 0.01, xf + 0.15, dh, dh + 0.05, a - 0.05, b + 0.05);
    const door = new THREE.Group(); door.position.set(xf + 0.05, 0, (a + b) / 2); g.add(door);
    B(door, M.doorGrey, 0.045, dh - 0.02, b - a - 0.01, 0, 0.01, 0);
    barZ(door, M.chrome, b - a - 0.2, 0.018, -0.07, 1.0, 0.0);
    for (const s of [-1, 1]) B(door, M.chrome, 0.06, 0.08, 0.05, -0.045, 0.97, s * (b - a - 0.16) / 2);
    B(door, M.black, 0.04, 0.05, 0.35, -0.05, dh - 0.12, -0.15);
    B(door, M.tread, 0.004, 0.3, b - a - 0.06, -0.025, 0.03, 0);
    reg('backdoor', door, { face: [-1, 0, 0], anchor: [xf - 0.1, 2.3, (a + b) / 2], cut: 'E' });
    B(g, M.hdpe, 0.08, 0.2, 0.36, xf - 0.04, dh + 0.12, (a + b) / 2);
    screen(g, signTexture(['EXIT'], { w: 256, h: 128, bg: '#fdf8f2', fg: '#d01e14', size: 92, print: false }), 0.32, 0.16, xf - 0.081, dh + 0.22, (a + b) / 2, -Math.PI / 2);
    for (const [pzz, ph] of [[-2.85, 0.9], [-2.5, 0.75]]) {
      B(g, M.paintGrey, 0.1, ph, 0.32, xf - 0.05, 1.05, pzz);
      B(g, M.steelDark, 0.006, ph - 0.04, 0.005, xf - 0.103, 1.07, pzz + 0.12);
      C(g, M.paintGrey, 0.014, 0.014, ROOM.h - 1.05 - ph, xf - 0.06, 1.05 + ph, pzz - 0.08, 8);
      C(g, M.paintGrey, 0.014, 0.014, ROOM.h - 1.05 - ph, xf - 0.06, 1.05 + ph, pzz + 0.08, 8);
    }
  }
  for (const [ox, oy, oz, ry] of [[-0.5, 1.15, Z0, 0], [2.0, 1.4, Z0, 0], [X0, 1.15, -1.0, Math.PI / 2]]) B(main, M.hdpe, 0.07, 0.12, 0.012, ox + (ry ? 0.006 : 0), oy, oz + (ry ? 0 : 0.006)).rotation.y = ry;

  return { groups, floor, items, shadowsFor };
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
      <div class="k3d-title"><b id="k3d-title">The kitchen in 3D</b><span>Drag to look around · scroll or pinch to zoom</span></div>
      <div class="k3d-views" role="toolbar" aria-label="Camera views">${Object.entries(VIEWS).map(([k, v]) => `<button type="button" data-view="${k}" aria-pressed="false">${v.label}</button>`).join('')}</div>
      <button type="button" class="k3d-close" aria-label="Close the 3D kitchen">✕</button>
    </div>
    <div class="k3d-main">
      <div class="k3d-stage"><div class="k3d-spots"></div><div class="k3d-dims" aria-hidden="true"></div><p class="k3d-status" role="status">Building the kitchen…</p></div>
      <aside class="k3d-side" aria-label="Kitchen equipment">
        <div class="k3d-card" aria-live="polite"></div>
        <button type="button" class="k3d-listbtn" aria-expanded="false">Equipment list</button>
        <div class="k3d-list">${Object.entries(ZONES).map(([z, zn]) => `<h4>${zn}</h4><ol>${order.filter((id) => ITEMS[id].zone === z).map((id) => `<li><button type="button" data-item="${id}"><b>${order.indexOf(id) + 1}</b>${ITEMS[id].name}</button></li>`).join('')}</ol>`).join('')}</div>
        <p class="k3d-note">The open kitchen is modelled from the owner’s photo. The back room is a typical layout drawn to standard equipment sizes. The real layout, equipment and sizes are confirmed at your walkthrough.</p>
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.domElement.setAttribute('aria-label', '3D model of the kitchen. Drag to orbit, scroll to zoom.');
  renderer.domElement.tabIndex = 0;
  stage.prepend(renderer.domElement);

  const X = makeTextures(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  const M = makeMaterials(X);
  const scene = new THREE.Scene();
  scene.background = null;
  scene.environment = environmentMap(renderer);

  const built = buildKitchen(M, X);
  const { groups, items } = built;
  scene.add(built.floor);

  // boxes for picking, hotspots and focusing (before baking flattens the groups)
  scene.add(groups.main, groups.N, groups.S, groups.E, groups.W, groups.FE, groups.ceiling, groups.roof);
  groups.roof.updateMatrixWorld(true);
  for (const g of Object.values(groups)) g.updateMatrixWorld(true);
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
  for (const k of ['N', 'E', 'W', 'FE']) baked['stub' + k].visible = false;

  // lights
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x7a5444, 1.25));
  const sun = new THREE.DirectionalLight(0xfff8ef, 2.1);
  sun.position.set(1.2, 11, 5.4); sun.target.position.set(-0.4, 0, 2.6);
  sun.castShadow = true;
  const sm = mobile ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -6.6, right: 6.6, top: 7.0, bottom: -7.0, near: 2, far: 20 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.015; sun.shadow.radius = mobile ? 2 : 4;
  scene.add(sun, sun.target);
  const hoodLights = mobile ? 1 : 3;
  for (let i = 0; i < hoodLights; i++) {
    const pl = new THREE.PointLight(0xffe4b8, 2.2, 3.2, 1.6);
    pl.position.set(HOOD.x0 + (i + 0.5) * (HOOD.x1 - HOOD.x0) / hoodLights, HOOD.top - 0.15, FK.z0 + HOOD.depth - 0.35);
    scene.add(pl);
  }
  for (const [x, z] of DOWNLIGHTS.slice(0, mobile ? 1 : 3)) { const pl = new THREE.PointLight(0xfff1dc, 3.2, 5.5, 1.5); pl.position.set(x, ROOM.h - 0.15, z); scene.add(pl); }
  for (const zc of [(WALKIN.z0 + WALKIN.split) / 2, (WALKIN.split + WALKIN.z1) / 2]) {
    const pl = new THREE.PointLight(0xf2f6ff, 3, 3.4, 1.5); pl.position.set((WALKIN.x0 + WALKIN.x1) / 2, WALKIN.h - 0.3, zc); scene.add(pl);
  }

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.085; controls.screenSpacePanning = true;
  controls.minDistance = 0.4; controls.maxDistance = 24; controls.maxPolarAngle = Math.PI * 0.86;
  controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.9;

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
    { t: 'BACK ROOM ≈ 32 × 20 ft', p: new THREE.Vector3(0, 0.05, Z0 - 0.6) },
    { t: 'OPEN KITCHEN ≈ 27 × 10 ft', p: new THREE.Vector3(FK.x0 - 2.2, 0.05, (FK.z0 + FK.z1) / 2) },
    { t: 'STORE', p: new THREE.Vector3((FK.x0 + FK.x1) / 2, 0.05, FK.z1 + STORE_D * 0.6) },
    { t: 'WALK-IN ≈ 8 × 14 ft', p: new THREE.Vector3(X1 + 1.9, 0.05, (WALKIN.z0 + WALKIN.z1) / 2) }
  ].map((d) => { const el = document.createElement('span'); el.className = 'k3d-dim'; el.textContent = d.t; dims.appendChild(el); return { ...d, el }; });

  const occluders = [];
  const ob = (x0, x1, z0, z1, k, h = ROOM.h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), pickMat); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); m.userData.wall = k; occluders.push(m); };
  ob(X0 - WALL, X1 + WALL, Z0 - WALL, Z0, 'N'); ob(X0 - WALL, DOORWAY.a, Z1, FK.z0, null); ob(DOORWAY.b, X1 + WALL, Z1, FK.z0, null);
  ob(X0 - WALL, X0, Z0, FK.z1, 'W'); ob(X1, X1 + WALL, Z0, Z1, 'E'); ob(FK.x1, FK.x1 + WALL, Z1, FK.z1, 'FE');
  ob(WALKIN.x0, WALKIN.x0 + 0.1, WALKIN.z0, WALKIN.z1, null, WALKIN.h); ob(WALKIN.x0, WALKIN.x1, WALKIN.z0, WALKIN.z0 + 0.1, null, WALKIN.h); ob(WALKIN.x0, WALKIN.x1, WALKIN.split - 0.05, WALKIN.split + 0.05, null, WALKIN.h);
  occluders.forEach((o) => o.updateMatrixWorld(true));
  items.forEach((it) => it.pick.updateMatrixWorld(true));

  const K = { host, open: true, started: false, needs: true, tween: null, current: null, view: null };
  const ray = new THREE.Raycaster(), v = new THREE.Vector3(), ndc = new THREE.Vector2();

  function resize() {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); K.needs = true;
  }
  new ResizeObserver(resize).observe(stage); resize();

  let shadowState = '';
  function applyCut() {
    const p = camera.position, vis = {
      N: p.z > Z0 - 0.02, W: p.x > X0 - 0.02, E: p.x < X1 + 0.02, FE: p.x < FK.x1 + 0.02 || p.z < Z1, S: true
    };
    for (const k of ['N', 'E', 'W', 'FE']) { baked[k].visible = vis[k]; baked['stub' + k].visible = !vis[k]; }
    baked.ceiling.visible = p.y < ROOM.h - 0.02;
    baked.roof.visible = p.y < WALKIN.h + 0.1;
    const key = `${baked.roof.visible}${vis.N}${vis.E}${vis.W}${vis.FE}`;
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
      const show = camera.position.y > 14;
      d.el.style.display = show ? '' : 'none';
      if (show) { v.copy(d.p).project(camera); d.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`; }
    }
  }

  // keep a close-up camera inside the space its target is in (open kitchen + store strip, or back room)
  function keepInside(pos, ref) {
    const cl = THREE.MathUtils.clamp;
    if (ref.z > Z1) { pos.x = cl(pos.x, FK.x0 + 0.3, FK.x1 - 0.3); pos.z = cl(pos.z, FK.z0 + 0.3, FK.z1 + STORE_D - 0.2); }
    else {
      pos.x = cl(pos.x, X0 + 0.3, X1 - 0.3); pos.z = cl(pos.z, Z0 + 0.3, Z1 - 0.3);
      if (pos.x > WALKIN.x0 - 0.2 && pos.z > WALKIN.z0 - 0.2) pos.x = WALKIN.x0 - 0.5;
    }
    pos.y = cl(pos.y, 0.9, ROOM.h - 0.2);
  }
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function flyTo(pos, target, instant) {
    if (instant) { camera.position.copy(pos); controls.target.copy(target); controls.update(); K.needs = true; return; }
    K.tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), start: performance.now(), dur: 1100 };
  }
  K.setView = (name, instant) => {
    const vw = VIEWS[name]; K.view = name;
    host.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === name));
    if (instant && name === 'overview') { camera.position.set(14, 14, 20); controls.target.set(...vw.target); controls.update(); }
    // narrow screens: step back along the view so the same things fit
    const tgt = new THREE.Vector3(...vw.target), pos = new THREE.Vector3(...vw.pos);
    const k = THREE.MathUtils.clamp(1.35 / camera.aspect, 1, 2.0);
    if (k > 1) {
      const inside = pos.y < ROOM.h && pos.x > X0 && pos.x < X1 && pos.z > Z0 && pos.z < FK.z1 + STORE_D;
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
      const tgt = it.center.clone(); if (it.id === 'cooler' || it.id === 'freezer') tgt.x = WALKIN.x0 + 0.4;
      const pos = tgt.clone().addScaledVector(it.face, dist); pos.y = tgt.y + Math.min(dist * 0.42, 1.0) + 0.3;
      keepInside(pos, tgt);
      flyTo(pos, tgt);
      host.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
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
        renderer.render(scene, camera);
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
