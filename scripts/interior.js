import * as THREE from '../vendor/three.module.js';
import { STOREFRONT as S } from './storefront.js';

// Store interior from the owner's five interior photos (Nov 2026), built in the
// storefront frame (+X out of the storefront, +Z south along it, Y up):
//   * glass-door coolers along the back (Modelo banner) and south (Twisted Tea
//     banner) walls, with the hallway, BEATBOX cooler and Michelob Ultra sign
//     at the south-east corner;
//   * snack gondolas either side of the tiled centre aisle, wine rack, jerky rack;
//   * the BEATBOX table and Haagen-Dazs freezer inside the doors;
//   * the L-shaped checkout in the north-east corner with vape back-bars and
//     glass cases, the DISPOSABLE tower and a lit glass tower;
//   * Community Coffee brick alcove and the red wall on the north side;
//   * two skill machines with chairs by the front glass south of the doors;
//   * white tile floor with dark grout, ceiling tiles with LED panels.
// The layout is read from photos: positions and sizes are estimates, and the
// product graphics are drawn stand-ins, not the real packaging.
export const INTERIOR = Object.freeze({
  x: [-6.15, 9.82],   // back wall .. inside of the front glass
  z: [-9.72, 9.96],   // north .. south wall
  ceiling: 3.44,
  // The model's own interior fittings are removed inside this box.  Extend a
  // little behind the visible back wall so the exported dark wall pack cannot
  // occlude the lit cooler face at night.
  cutBoxes: Object.freeze([[-6.5, 0.25, -9.65, 9.55, 3.4, 9.9]]),
  view: Object.freeze({ pos: [7.4, 2.1, 5.6], tgt: [-1.5, 1.5, 0.6] }) // from by the machines, toward the back
});

const I = INTERIOR;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function buildInterior({ ctex }) {
  const g = new THREE.Group();
  g.name = 'Store-interior';
  g.rotation.y = S.heading;
  const F = S.floorY;
  // The store's lights are always on: surfaces carry their own light.
  const lit = (map, k = 0.6) => new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, roughness: 0.85 });
  const flat = (color, k = 0.45) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.85 });
  const add = (m, name) => { m.name = name; g.add(m); return m; };
  // mats: one material, or { px, nx, py, ny, pz, nz, rest }.
  const box = (name, [x0, y0, z0, x1, y1, z1], mats) => {
    const mat = mats.isMaterial ? mats : ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(k => mats[k] || mats.rest);
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, name);
  };
  // A wall panel: `face` is the direction it looks ('px', 'nx', 'pz', 'nz').
  const panel = (name, face, w, h, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.rotation.y = { px: Math.PI / 2, nx: -Math.PI / 2, pz: 0, nz: Math.PI }[face];
    m.position.set(x, y, z);
    return add(m, name);
  };
  const text = (c, t, x, y, size, col, font = 'bold', max) => { c.fillStyle = col; c.font = `${font} ${size}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x, y, max); };

  /* ---------------------------------------------------------- textures */
  // Shelves of packaged goods: many smaller, varied bags, boxes and cans on
  // dark shelf lines.  The previous packs were too tall and read as books.
  const goods = (seed, palette, rows = 8, bg = '#2b2d30', shelf = '#d9dadb') => ctex(512, 256, (c, w, h) => {
    const r = rng(seed); c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const rh = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = 2;
      while (x < w - 6) {
        const pw = 8 + r() * 14, ph = rh * (0.42 + r() * 0.3), y = (i + 1) * rh - ph - 5;
        const col = palette[(r() * palette.length) | 0];
        c.fillStyle = col;
        // Alternate a soft bag, a box and a can silhouette so the shelf does
        // not become a repeated row of identical rectangles.
        if (r() < 0.34) {
          c.beginPath();
          if (c.roundRect) c.roundRect(x, y, pw - 2, ph, Math.min(4, ph * 0.18));
          else c.rect(x, y, pw - 2, ph);
          c.fill();
        } else if (r() < 0.67) {
          c.fillRect(x, y + 1, pw - 2, ph - 2);
        } else {
          c.beginPath(); c.ellipse(x + (pw - 2) / 2, y + ph / 2, Math.max(2, (pw - 2) * 0.42), ph / 2, 0, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x + 2, y + ph * 0.28, Math.max(2, pw - 6), Math.max(1, ph * 0.14));
        x += pw;
      }
      c.fillStyle = shelf; c.fillRect(0, (i + 1) * rh - 5, w, 5);
    }
  });
  const SNACK = ['#e2231a', '#f6c21c', '#1f9d3a', '#2a63c9', '#f47b20', '#7a2e8e', '#111111', '#f2e9d0', '#c81d6b'];
  const CANDY = ['#ff4fa0', '#ffd400', '#28c1f0', '#7bd13b', '#ff7a1a', '#a35bff', '#ffffff', '#e2231a'];
  const VAPE = ['#ff8fc7', '#8fd8ff', '#c9a7ff', '#9ff0c0', '#ffe27a', '#ff9d7a', '#f4f4f4', '#6fe3e0'];
  const DARK = ['#3b2f5c', '#27455e', '#5c2f3b', '#2f5c46', '#77705a', '#444a52', '#8a7bb8'];
  // Glass-door cooler front: maroon frames, lit shelves of cans and bottles.
  const cooler = (seed, doors) => ctex(1024, 256, (c, w, h) => {
    const r = rng(seed), dw = w / doors, cols = ['#f6d21c', '#e2231a', '#1f9d3a', '#2a63c9', '#f47b20', '#ffffff', '#b8e04a', '#ffb000', '#d94f9a', '#19b6c9'];
    c.fillStyle = '#5a1420'; c.fillRect(0, 0, w, h);
    for (let d = 0; d < doors; d++) {
      const x0 = d * dw + 8, gw = dw - 16;
      const lg = c.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, '#fff6d8'); lg.addColorStop(1, '#f0d890');
      c.fillStyle = lg; c.fillRect(x0, 12, gw, h - 30);
      for (let s = 0; s < 5; s++) {
        const y1 = 12 + (s + 1) * (h - 30) / 5;
        const col = cols[(r() * cols.length) | 0], col2 = cols[(r() * cols.length) | 0];
        for (let x = x0 + 3, k = 0; x < x0 + gw - 8; x += 9, k++) { c.fillStyle = k % 5 < 3 ? col : col2; c.fillRect(x, y1 - 34, 7, 30); }
        c.fillStyle = '#8f8f8f'; c.fillRect(x0, y1 - 4, gw, 3);
      }
      c.fillStyle = '#2a0a10'; c.fillRect(x0 + gw - 5, h * 0.4, 3, h * 0.25); // handle
    }
  });
  const banner = (draw, w = 1024, h = 128) => ctex(w, h, draw);
  const modelo = banner((c, w, h) => {
    c.fillStyle = '#12235c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { const x = i * w / 4; text(c, 'Modelo', x + 78, h / 2, 40, '#ffffff'); c.fillStyle = '#e8b93a'; c.fillRect(x + 150, 16, 22, 96); c.fillStyle = '#f4e3a0'; c.beginPath(); c.arc(x + 214, h / 2, 26, 0, 7); c.fill(); }
  });
  const twisted = banner((c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#3f6fb0'); sky.addColorStop(1, '#e8c9a0'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      const x = i * w / 3;
      c.fillStyle = '#c8202c'; c.fillRect(x + 20, 14, 170, 100); c.fillStyle = '#f6c21c'; c.fillRect(x + 20, 82, 170, 32);
      text(c, 'TWISTED TEA', x + 105, 46, 24, '#ffffff'); text(c, 'KEEP IT TWISTED', x + 105, 98, 16, '#1b1b1b');
      c.fillStyle = '#f6c21c'; c.fillRect(x + 214, 10, 40, 108); c.fillStyle = '#c8202c'; c.fillRect(x + 268, 30, 60, 60);
    }
  });
  const ultra = banner((c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d3f8f'; c.fillRect(0, 0, 150, h); c.fillStyle = '#c8202c'; c.fillRect(150, 0, 90, h);
    text(c, 'Michelob ULTRA', 420, 62, 58, '#1d2a55', 'italic bold'); text(c, 'SUPERIOR LIGHT BEER, BREWED HERE', 420, 130, 30, '#1d2a55', 'bold', 360);
  }, 640, 192);
  const beatboxSign = banner((c, w, h) => {
    c.fillStyle = '#4b2a8f'; c.fillRect(0, 0, w, h); text(c, 'BEATBOX', w / 2, 44, 54, '#ffffff', '900');
    ['#ff4fa0', '#ffd400', '#28c1f0', '#7bd13b', '#ff7a1a', '#ffffff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(70 + i * 42, 84, 30, 92); });
  }, 384, 192);
  const beatboxSkirt = banner((c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#6a2bd9'); gr.addColorStop(0.5, '#ff3fa4'); gr.addColorStop(1, '#ff8a3d'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.lineWidth = 8; c.strokeStyle = '#141414'; c.font = '900 92px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.strokeText('BEATBOX', w * 0.42, 86); c.fillStyle = '#ffffff'; c.fillText('BEATBOX', w * 0.42, 86);
    text(c, 'THE ORIGINAL PARTY PUNCH', w * 0.45, 184, 46, '#ffffff', 'italic 900', w * 0.8);
    c.fillStyle = '#ffe600'; c.beginPath(); c.arc(w * 0.86, 70, 46, 0, 7); c.fill(); text(c, '11.1%', w * 0.86, 62, 26, '#141414'); text(c, 'ABV', w * 0.86, 88, 20, '#141414');
  }, 768, 256);
  const tile = ctex(128, 128, (c, w, h) => {
    c.fillStyle = '#23262a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#eeeeea' : '#e7e8e4'; c.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
  });
  const ceilTex = ctex(128, 128, (c, w, h) => { c.fillStyle = '#f1f1ee'; c.fillRect(0, 0, w, h); c.strokeStyle = '#cfd0cc'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); });
  const brick = ctex(256, 128, (c, w, h) => {
    c.fillStyle = '#c9c1b6'; c.fillRect(0, 0, w, h); const r = rng(7);
    for (let row = 0; row < 8; row++) for (let k = -1; k < 8; k++) { c.fillStyle = ['#8f3f2c', '#a04a33', '#7c3526', '#b0563c'][(r() * 4) | 0]; c.fillRect(k * 36 + (row % 2) * 18 + 1, row * 16 + 1, 33, 13); }
  });
  const slat = ctex(64, 64, (c, w, h) => { c.fillStyle = '#e9e6dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#bdb9ad'; for (let y = 6; y < h; y += 8) c.fillRect(0, y, w, 2); });

  /* ------------------------------------------------------------- shell */
  const [x0, x1] = I.x, [z0, z1] = I.z, W = x1 - x0, D = z1 - z0, H = I.ceiling;
  tile.repeat.set(W / 0.62, D / 0.62);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), lit(tile, 0.5));
  floor.rotation.x = -Math.PI / 2; floor.position.set((x0 + x1) / 2, F + 0.012, (z0 + z1) / 2); add(floor, 'Interior-floor');
  ceilTex.repeat.set(W / 0.61, D / 0.61);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), lit(ceilTex, 0.55));
  ceil.rotation.x = Math.PI / 2; ceil.position.set((x0 + x1) / 2, H, (z0 + z1) / 2); add(ceil, 'Interior-ceiling');
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 });
  for (let lx = x0 + 1.6; lx < x1 - 0.8; lx += 2.44) for (let lz = z0 + 1.5; lz < z1 - 0.8; lz += 2.44) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), lightMat);
    p.rotation.x = Math.PI / 2; p.position.set(lx, H - 0.006, lz); add(p, 'Ceiling-LED-panel');
  }
  const cream = flat(0xe6e2d6, 0.5), wallH = H - F, wy = (F + H) / 2;
  panel('Wall-back', 'px', D, wallH, cream, x0 + 0.01, wy, (z0 + z1) / 2);
  panel('Wall-south', 'nz', W, wallH, cream, (x0 + x1) / 2, wy, z1 - 0.01);
  panel('Wall-north-red', 'pz', 6.2, wallH, flat(0xc22a35, 0.5), x0 + 3.1, wy, z0 + 0.01);
  brick.repeat.set(5.4 / 1.4, wallH / 0.62);
  panel('Wall-north-brick', 'pz', 5.4, wallH, lit(brick, 0.5), x0 + 6.2 + 2.7, wy, z0 + 0.01);
  panel('Wall-north-east', 'pz', x1 - (x0 + 11.6), wallH, cream, (x0 + 11.6 + x1) / 2, wy, z0 + 0.01);
  // Solid parts of the front wall either side of the glazing.
  panel('Wall-front-north', 'nx', S.glazingZ[0] - z0, wallH, cream, x1 + 0.1, wy, (z0 + S.glazingZ[0]) / 2);
  panel('Wall-front-south', 'nx', z1 - S.glazingZ[1], wallH, cream, x1 + 0.1, wy, (z1 + S.glazingZ[1]) / 2);

  /* ----------------------------------------------------------- coolers */
  const frame = flat(0x5a1420, 0.35);
  const backDoors = cooler(11, 10);
  box('Cooler-back-wall', [x0 + 0.03, F, -2.6, x0 + 0.85, F + 2.1, 9.1], { px: lit(backDoors, 0.95), rest: frame });
  box('Banner-Modelo', [x0 + 0.03, F + 2.1, -2.6, x0 + 0.8, F + 2.85, 9.1], { px: lit(modelo, 0.7), rest: flat(0x12235c) });
  const southDoors = cooler(23, 8);
  box('Cooler-south-wall', [x0 + 0.9, F, z1 - 0.82, 2.6, F + 2.1, z1 - 0.03], { nz: lit(southDoors, 0.95), rest: frame });
  box('Banner-Twisted-Tea', [x0 + 0.9, F + 2.1, z1 - 0.78, 2.6, F + 2.85, z1 - 0.03], { nz: lit(twisted, 0.7), rest: flat(0x3f6fb0) });
  // South-east corner: BEATBOX reach-in, the hallway with stacked water, signs above.
  box('Cooler-BEATBOX', [2.9, F, z1 - 0.8, 3.9, F + 2.0, z1 - 0.03], { nz: lit(cooler(31, 1), 0.9), rest: flat(0x18181a) });
  panel('Sign-BEATBOX', 'nz', 1.5, 0.7, lit(beatboxSign, 0.7), 3.4, F + 2.5, z1 - 0.05);
  panel('Sign-Michelob-Ultra', 'nz', 3.3, 0.8, lit(ultra, 0.75), 6.3, F + 2.5, z1 - 0.05);
  panel('Hallway-opening', 'nz', 3.3, 2.05, flat(0xf4f4f1, 0.7), 6.3, F + 1.03, z1 - 0.04);
  const water = ctex(128, 128, (c, w, h) => { c.fillStyle = '#35b6e6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8f3ff'; c.lineWidth = 3; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) c.strokeRect(i * 32 + 2, j * 32 + 2, 28, 28); });
  box('Water-cases-hallway', [5.0, F, z1 - 1.35, 6.4, F + 1.25, z1 - 0.1], lit(water, 0.6));
  box('Water-cases-door', [x1 - 0.95, F, -0.25, x1 - 0.2, F + 1.0, 0.8], lit(water, 0.6));

  /* ---------------------------------------------------------- gondolas */
  const shelfTop = flat(0xd9d9d6, 0.4), redEdge = flat(0xc8202c, 0.4);
  const gondola = (name, gx0, gz0, gx1, gz1, h, seedA, palette = SNACK) => {
    const a = lit(goods(seedA, palette), 0.6), b = lit(goods(seedA + 1, palette), 0.6), e = lit(goods(seedA + 2, palette, 4), 0.6);
    box(name, [gx0, F + 0.12, gz0, gx1, F + h, gz1], { pz: a, nz: b, px: e, nx: e, rest: shelfTop });
    box(name + '-base', [gx0 - 0.03, F, gz0 - 0.05, gx1 + 0.03, F + 0.12, gz1 + 0.05], redEdge);
  };
  gondola('Gondola-chips', -3.6, 3.3, 5.6, 4.3, 1.45, 41);
  box('Endcap-chips', [5.6, F, 3.15, 6.35, F + 1.65, 4.45], { px: lit(goods(47, SNACK, 6), 0.6), pz: lit(goods(48, SNACK, 6), 0.6), nz: lit(goods(49, SNACK, 6), 0.6), rest: flat(0x1c1c1e) });
  gondola('Gondola-snacks', -2.4, 6.2, 4.5, 7.2, 1.45, 53);
  box('Rack-jerky', [4.65, F, 6.05, 5.45, F + 1.75, 7.35], { px: lit(goods(59, DARK, 5, '#5a3a22'), 0.55), nz: lit(goods(60, DARK, 5, '#e9e6dc'), 0.55), rest: flat(0x5a3a22) });
  box('Rack-wine', [-4.5, F, 6.2, -2.7, F + 1.05, 7.2], flat(0x3a2418, 0.35));
  const wineTex = goods(61, ['#1b3a1f', '#2a1418', '#101010', '#3a2a12', '#e9d9a0', '#7a1024'], 1, '#3a2418', '#3a2418');
  box('Wine-bottles', [-4.45, F + 1.05, 6.3, -2.75, F + 1.42, 7.1], { nz: lit(wineTex, 0.5), pz: lit(wineTex, 0.5), rest: flat(0x1c2a1c, 0.3) });
  box('Rack-orange', [-4.9, F, 4.6, -4.2, F + 1.5, 5.5], flat(0xe8601c, 0.45));
  gondola('Gondola-candy', -3.6, -1.9, 0.6, -0.9, 1.45, 67, CANDY);
  gondola('Gondola-grocery', -3.6, -4.8, 0.6, -3.8, 1.45, 71, SNACK);
  gondola('Gondola-auto', -3.6, -7.5, 1.0, -6.6, 1.3, 79, DARK);
  const glassCase = new THREE.MeshStandardMaterial({ color: 0xcfe6ee, transparent: true, opacity: 0.35, roughness: 0.1, emissive: 0x9fb8c0, emissiveIntensity: 0.3 });
  box('Case-plush', [1.0, F, 0.25, 1.7, F + 1.7, 1.6], { nz: lit(goods(83, ['#b58bd6', '#f2b6cf', '#f5e2b8', '#9ad0e8', '#ffffff'], 4, '#dfe9ee', '#b9c4c9'), 0.6), pz: lit(goods(84, ['#b58bd6', '#f2b6cf', '#f5e2b8'], 4, '#dfe9ee', '#b9c4c9'), 0.6), rest: glassCase });
  box('Rack-sunglasses', [0.35, F, 1.55, 0.75, F + 1.95, 1.95], lit(goods(89, ['#111111', '#2a63c9', '#e2231a', '#f6c21c'], 9, '#f4f4f2', '#f4f4f2'), 0.6));

  /* ------------------------------------------------ BEATBOX table, freezer */
  box('Table-top', [2.0, F + 0.84, 0.25, 5.1, F + 0.9, 1.75], flat(0xc9a56a, 0.45));
  box('Table-skirt', [2.02, F + 0.18, 0.27, 5.08, F + 0.84, 1.73], { pz: lit(beatboxSkirt, 0.75), rest: flat(0x1d1d20, 0.3) });
  const drinks = [0xf4e9c0, 0xff9aa8, 0xd8202c, 0xf47b20, 0xffd400, 0x7bd13b, 0x28c1f0, 0x2a3fb0, 0x151515];
  drinks.forEach((col, i) => {
    const bx = 4.95 - (i % 5) * 0.58, bz = i < 5 ? 1.05 : 0.38;
    box('Drinks-on-table', [bx - 0.5, F + 0.9, bz, bx, F + (i < 5 ? 1.2 : 1.14), bz + 0.6], flat(col, 0.55));
  });
  box('Boxed-wine', [2.1, F + 0.9, 0.35, 2.7, F + 1.35, 0.95], lit(goods(97, ['#e83f8c', '#7a2e8e', '#111111', '#7bd13b'], 1, '#f2f2f2', '#f2f2f2'), 0.55));
  const hd = ctex(256, 256, (c, w, h) => {
    c.fillStyle = '#f6f3ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#4a1222'; c.fillRect(0, 0, w, 26); c.fillRect(0, h - 22, w, 22);
    c.fillStyle = '#5a2f1c'; c.beginPath(); c.roundRect ? c.roundRect(70, 96, 78, 104, 26) : c.rect(70, 96, 78, 104); c.fill(); c.fillStyle = '#d9c49a'; c.fillRect(104, 196, 10, 40);
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(128, 62, 78, 22, 0, 0, 7); c.fill(); text(c, 'Häagen-Dazs', 128, 63, 22, '#4a1222');
  });
  box('Freezer-ice-cream', [5.25, F, 0.3, 6.1, F + 0.82, 1.7], { px: lit(hd, 0.6), pz: lit(hd, 0.6), rest: flat(0x4a1222, 0.35) });
  box('Freezer-lid', [5.28, F + 0.82, 0.33, 6.07, F + 0.93, 1.67], { py: new THREE.MeshStandardMaterial({ color: 0xeaf6ff, emissive: 0xdff1ff, emissiveIntensity: 0.9, roughness: 0.1 }), rest: flat(0xb9bec2, 0.4) });

  /* ----------------------------------------------------------- checkout */
  slat.repeat.set(4, 2);
  const hot = goods(101, ['#d8202c', '#f47b20', '#1f9d3a', '#f6c21c', '#7bd13b'], 3, '#e9e6dc', '#8a8f93');
  box('Counter-front', [5.6, F, -1.0, x1 - 0.25, F + 1.05, -0.3], { pz: lit(hot, 0.6), py: flat(0xdedcd4, 0.45), rest: lit(slat, 0.5) });
  const cases = goods(103, VAPE, 3, '#dfe9ee', '#b9c4c9');
  box('Counter-glass-cases', [5.6, F, -7.6, 6.3, F + 1.0, -1.0], { nx: lit(cases, 0.7), py: glassCase, rest: flat(0xdedcd4, 0.45) });
  box('Counter-display-stack', [6.7, F + 1.05, -0.95, x1 - 0.5, F + 2.3, -0.62], { pz: lit(goods(107, DARK, 7, '#141416', '#2a2a2e'), 0.6), rest: flat(0x141416, 0.3) });
  box('Register', [6.0, F + 1.05, -0.9, 6.5, F + 1.4, -0.5], flat(0x18181a, 0.3));
  box('Backbar-vape-east', [x1 - 0.62, F, -8.6, x1 - 0.1, F + 2.4, -1.3], { nx: lit(goods(109, VAPE, 8, '#18181c', '#3a3a40'), 0.75), rest: flat(0x202024, 0.3) });
  box('Backbar-vape-north', [6.4, F, z0 + 0.04, x1 - 0.7, F + 2.4, z0 + 0.5], { pz: lit(goods(113, VAPE, 8, '#18181c', '#3a3a40'), 0.75), rest: flat(0x202024, 0.3) });
  // DISPOSABLE vape tower with its hanging sign, and the LED-edged glass tower.
  box('Tower-disposables', [1.6, F, -2.9, 2.4, F + 2.0, -2.1], lit(goods(127, VAPE, 9, '#f4f4f4', '#d0d3d6'), 0.7));
  const dispTex = ctex(256, 64, (c, w, h) => { c.clearRect(0, 0, w, h); text(c, 'DISPOSABLE', w / 2, h / 2, 36, '#ffffff', '900'); });
  for (const face of ['pz', 'px']) panel('Sign-DISPOSABLE', face, 1.2, 0.3, new THREE.MeshStandardMaterial({ map: dispTex, emissive: 0xffffff, emissiveMap: dispTex, emissiveIntensity: 1, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), 2.0, F + 2.45, -2.5);
  box('Tower-glass', [2.95, F, -4.3, 3.55, F + 1.9, -3.7], lit(goods(131, VAPE, 6, '#dfe9ee', '#b9c4c9'), 0.6));
  const ledEdge = new THREE.MeshStandardMaterial({ color: 0x35ff6a, emissive: 0x35ff6a, emissiveIntensity: 1.6 });
  for (const [ex, ez] of [[2.93, -4.32], [3.57, -4.32], [2.93, -3.68], [3.57, -3.68]]) box('Tower-LED-edge', [ex - 0.02, F, ez - 0.02, ex + 0.02, F + 1.9, ez + 0.02], ledEdge);

  /* ------------------------------------------- coffee alcove, red wall */
  const coffee = ctex(256, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#c8202c'; c.beginPath(); c.ellipse(w / 2, h / 2, 118, 54, 0, 0, 7); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.stroke(); text(c, 'Community', w / 2, 56, 40, '#ffffff', 'italic bold'); text(c, 'COFFEE', w / 2, 92, 18, '#ffffff'); });
  panel('Sign-Community-Coffee', 'pz', 1.3, 0.65, new THREE.MeshStandardMaterial({ map: coffee, emissive: 0xffffff, emissiveMap: coffee, emissiveIntensity: 0.9, transparent: true, alphaTest: 0.3 }), 3.0, F + 2.35, z0 + 0.03);
  box('Coffee-counter', [1.2, F, z0 + 0.04, 4.9, F + 0.95, z0 + 0.8], { pz: lit(goods(137, ['#1d2f8c', '#f4f4f1'], 1, '#e9e6dc', '#e9e6dc'), 0.5), rest: flat(0xe9e6dc, 0.45) });
  for (const cx of [1.8, 2.7, 3.9]) box('Coffee-machine', [cx - 0.3, F + 0.95, z0 + 0.1, cx + 0.3, F + 1.6, z0 + 0.65], flat(0x1b1b1d, 0.3));
  panel('TV-screen', 'pz', 1.0, 0.55, new THREE.MeshStandardMaterial({ color: 0x6f5cff, emissive: 0x8f7cff, emissiveIntensity: 1 }), 0.4, F + 2.3, z0 + 0.03);
  box('Cooler-frozen-bait', [-4.6, F, z0 + 0.04, -3.4, F + 0.95, z0 + 0.75], flat(0xf2f2ef, 0.5));
  box('Cooler-red', [-3.0, F, z0 + 0.04, -2.1, F + 0.9, z0 + 0.7], flat(0xc8202c, 0.45));

  /* ------------------------------------------- skill machines and chairs */
  const slotTex = seed => ctex(256, 384, (c, w, h) => {
    const r = rng(seed), gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a0f6e'); gr.addColorStop(0.55, '#7a1fd0'); gr.addColorStop(1, '#0f1a6e'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#38a8ff'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    [['GRAND PRIZE', '#ffb000'], ['MAJOR PRIZE', '#ff3fd0'], ['MINOR PRIZE', '#ff5a2a']].forEach(([t, col], i) => { text(c, t, w / 2, 38 + i * 70, 18, '#ffffff'); c.fillStyle = '#12082e'; c.fillRect(36, 50 + i * 70, w - 72, 34); text(c, String(1000 + ((r() * 300000) | 0)), w / 2, 68 + i * 70, 30, col, '900'); });
    ['#ff5a2a', '#8fd8ff', '#ffb000', '#ff8fc7', '#7bd13b'].forEach((col, i) => { c.fillStyle = col; c.fillRect(14 + i * 46, 262, 40, 96); });
  });
  const black = flat(0x101012, 0.25), glow = new THREE.MeshStandardMaterial({ color: 0x3a6bff, emissive: 0x3a6bff, emissiveIntensity: 1.6 });
  [4.45, 5.75].forEach((mz, i) => {
    box('Skill-machine-base', [x1 - 1.3, F, mz - 0.42, x1 - 0.35, F + 0.95, mz + 0.42], black);
    box('Skill-machine-glow', [x1 - 1.32, F + 0.9, mz - 0.44, x1 - 0.35, F + 0.95, mz + 0.44], glow);
    const screen = box('Skill-machine-screen', [x1 - 0.72, F + 0.95, mz - 0.42, x1 - 0.6, F + 2.45, mz + 0.42], { nx: new THREE.MeshStandardMaterial({ map: slotTex(141 + i), emissive: 0xffffff, emissiveMap: slotTex(141 + i), emissiveIntensity: 1.1 }), rest: black });
    screen.rotation.z = -0.08;
    // Office chair: seat, back and post.
    box('Chair-seat', [x1 - 2.25, F + 0.5, mz - 0.26, x1 - 1.72, F + 0.58, mz + 0.26], black);
    box('Chair-back', [x1 - 2.3, F + 0.62, mz - 0.24, x1 - 2.22, F + 1.12, mz + 0.24], black);
    box('Chair-post', [x1 - 2.02, F + 0.06, mz - 0.03, x1 - 1.96, F + 0.5, mz + 0.03], flat(0x55585c, 0.3));
    box('Chair-base', [x1 - 2.26, F, mz - 0.27, x1 - 1.72, F + 0.06, mz + 0.27], black);
  });
  box('Entry-mat-inside', [x1 - 1.75, F + 0.012, 0.7, x1 - 0.1, F + 0.03, 3.0], flat(0x161718, 0.25));
  // Hat stand by the hallway.
  box('Hat-stand-pole', [8.37, F, 8.57, 8.43, F + 1.8, 8.63], flat(0x202022, 0.3));
  [0.6, 0.95, 1.3, 1.65].forEach((hy, i) => box('Hat-stand-hats', [8.1 + (i % 2) * 0.1, F + hy, 8.3, 8.7 - (i % 2) * 0.1, F + hy + 0.2, 8.9], flat([0x5a5a3c, 0x7a4a2c, 0x3f4a35, 0xb8452c][i], 0.4)));
  return g;
}
