import * as THREE from '../vendor/three.module.js';
import { BLOCK_TILE, blockWall } from './block-wall.js';

// FoodMart storefront rebuilt from the owner's night photos (Nov 2026):
// split-face grey block pier with the emergency pump shut-off, vape poster,
// fire-extinguisher cabinet and square trash can beside the Amazon Hub locker;
// clear-anodised storefront with decal kick panels (Reddy Ice, Geek Bar, candy,
// vape art), a pair of entry doors, a projecting grey fascia band with a white
// LED strip and the Texaco FoodMart sign, a set-back parapet with three roof
// floodlights aimed at the lot, animated LED window signs and screen, and
// orange flexible delineators along the curb.
//
// Everything is in the detailed Blender model's store frame: the glTF root
// turned by STOREFRONT.heading, so +X points out of the storefront (toward the
// pumps), +Z runs along it to the south, Y is up. Positions were measured from
// shortstop_detailed.glb; the photo-only dimensions are estimates scaled from
// the 1.92 m door pair and the 2.15 m door height in the straight-on photo.
export const STOREFRONT = Object.freeze({
  // The model's store (and its Amazon locker) is turned 2.25 deg in the glTF frame.
  heading: 2 * Math.asin(0.019633694752808857),
  wallX: 10.03,          // face of the block wall (model wall plane ~10.00)
  glassX: 9.9,           // storefront glass plane, recessed like the model's
  floorY: 0.5,           // store floor / sill
  walkY: 0.47,           // sidewalk top at the storefront
  storeZ: [-10.0, 10.2], // north and south corners of the front wall
  pierZ: [-7.4, -5.45],  // block pier between the glazing and the Amazon locker
  // Straight-on photo: four equal bays north of the doors (~5.3 m), the door
  // pair (~1.9 m), four bays south of it (~4.7 m) and ~3.7 m of block wall.
  glazingZ: [-5.45, 6.51],
  // The model's Amazon Hub locker, and the screen on its kiosk unit (which
  // stands proud of the doors, so the lit screen is laid on the model's).
  locker: Object.freeze({ x: [10.03, 10.71], y: [0.62, 2.86], z: [-9.72, -7.33], screen: Object.freeze({ x: 10.774, y: [1.68, 1.91], z: [-8.99, -8.67] }) }),
  doorZ: [-0.13, 1.79],  // pair of glass doors (straight-on photo)
  railY: 1.55,           // kick-panel rail (decal panels below, clear glass above)
  ledY: 2.75,            // centre of the LED window signs and OPEN sign
  headY: 3.22,           // storefront head, 2.75 m above the walk (photos)
  fasciaY: [3.25, 4.16], // projecting fascia band with the LED strip and the sign
  parapetY: [4.16, 5.0], // set-back upper parapet (the model's band height)
  fasciaOverhang: 0.45,  // the band runs past both corners of the building
  // Texaco FoodMart sign: white roundel panel / red "FoodMart" panel, 2.88 x
  // 0.79 m, centred just south of the doors' centre on the fascia band.
  signZ: [-0.48, 2.4],
  signY: [3.31, 4.1],
  // Roof floodlights on the parapet coping (photos): over the LED screen, just
  // north of the doors and at the north corner over the Amazon locker.
  floodZ: Object.freeze([8.36, -0.88, -9.75]),
  // The model's red band on the other three walls (y 4.18-4.98): back wall
  // x -6.39, north wall z -9.90, south wall z 10.14. Sleeved in grey.
  band: Object.freeze({ y: [4.16, 5.0], backX: -6.39, northZ: -9.9, southZ: 10.145 }),
  fasciaDepth: 0.45,     // projects over the walk; LED strip on its front edge
  // Bays from the pier southward. `art` names the kick-panel decal in the photos.
  bays: Object.freeze([
    // North of the doors: four equal bays (straight-on photo).
    { z: [-5.45, -4.12], art: 'reddy-ice', upper: 'frosted' },  // milky green film
    { z: [-4.12, -2.79], art: 'geek-bar' },
    { z: [-2.79, -1.46], art: 'candy', upper: 'blinds' },        // slatted blind over the top third
    { z: [-1.46, -0.13], art: 'vape-art', neon: true },          // OPEN sign
    // South of the doors: LED letter signs across the top of the glass.
    { z: [1.79, 2.97], art: 'tint', led: 'DELTA 8' },
    { z: [2.97, 4.15], art: 'tint', led: '10THC' },
    { z: [4.15, 5.33], art: 'tint', led: 'E-CIGS' },
    { z: [5.33, 6.51], art: 'tint', led: 'CBD' }
  ]),
  // Model parts replaced here: [x0, y0, z0, x1, y1, z1] in this frame.
  cutBoxes: Object.freeze([
    [9.6, 0.46, -7.45, 10.15, 3.6, 7.46],    // black mullions, door and glass (incl. the glass strip in the merged "Car wash" mesh)
    [10.075, 3.9, -6.5, 10.6, 4.9, 6.5],     // raised "SHORT STOP" letters on the old fascia
    [10.6, 0.49, -0.5, 11.7, 1.6, 1.0],      // red-lid bins (not in the photos)
    [10.6, 0.49, 2.2, 11.7, 1.6, 3.6],
    [9.3, 4.975, 9.35, 9.8, 5.6, 9.9]        // the model's single roof spotlight (replaced by the three floods)
  ]),
  hideInstances: Object.freeze([
    { name: /^Storefront_mullion/, box: [9.5, 0, -7.6, 10.2, 4, 7.6] },
    { name: /^Transom_glass/, box: [9.5, 0, -7.6, 10.2, 4, 7.6] },
    { name: /^Wall_pack_0/, box: [9.9, 3, -9.6, 10.4, 4.2, 9.6] },
    // Yellow steel bollards become the photo's orange delineators.
    { name: /^Storefront_bollard/, box: [11, -1, -14, 12.5, 2, 12], post: true }
  ])
});

const S = STOREFRONT;

// Matrix from the glTF root frame into the storefront frame.
export function storefrontFrame() {
  return new THREE.Matrix4().makeRotationY(-S.heading);
}

function scaleUV(geometry, su, sv) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geometry;
}

// Props marked userData.onWalk are built standing at S.walkY; the page drops
// each onto the model's actual walk surface (the walk is not level). Meshes
// marked userData.conformToWalk (the entry mat) follow it vertex by vertex.
export function settleOnWalk(group, heightAt) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3(), c = new THREE.Vector3();
  group.traverse(o => {
    if (o.userData.conformToWalk) { conformToWalk(group, o, heightAt); return; }
    if (!o.userData.onWalk) return;
    box.setFromObject(o).getCenter(c);
    if (group.parent) group.parent.worldToLocal(c); // heights are asked in the glTF root's frame
    const y = heightAt(c.x, c.z, o);
    if (Number.isFinite(y)) o.position.y += y - S.walkY;
  });
}

function conformToWalk(group, mesh, heightAt) {
  const pos = mesh.geometry.attributes.position, profile = mesh.userData.profile, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), 0, pos.getZ(i)).applyMatrix4(mesh.matrixWorld);
    if (group.parent) group.parent.worldToLocal(v);
    const y = heightAt(v.x, v.z, mesh);
    if (!Number.isFinite(y)) continue; // keep the nominal height
    v.y = y;
    if (group.parent) group.parent.localToWorld(v);
    mesh.worldToLocal(v);
    pos.setY(i, v.y + profile[i]);
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
}

// Rubber entry mat: a flat top on a bevelled edge that tapers to the walk, on
// a grid fine enough (~8 cm) to follow the walk's slope. `profile` holds each
// vertex's height above the walk.
export function rubberMatGeometry(width, depth, thick = 0.012, bevel = 0.035) {
  const lines = L => {
    const n = Math.max(2, Math.ceil((L - 2 * bevel) / 0.08)), a = [-L / 2];
    for (let i = 0; i <= n; i++) a.push(-L / 2 + bevel + (L - 2 * bevel) * i / n);
    a.push(L / 2); return a;
  };
  const xs = lines(depth), zs = lines(width), pos = [], uv = [], profile = [], index = [];
  for (const x of xs) for (const z of zs) {
    const edge = Math.min(depth / 2 - Math.abs(x), width / 2 - Math.abs(z));
    const y = 0.002 + thick * Math.min(1, edge / bevel);
    pos.push(x, y, z); profile.push(y); uv.push((z + width / 2) / width, (x + depth / 2) / depth);
  }
  const n = zs.length;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < n - 1; j++) {
    const a = i * n + j, b = a + 1, c = a + n, d = c + 1;
    index.push(a, b, c, b, d, c); // wound to face up
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index); g.computeVertexNormals();
  return { geometry: g, profile: new Float32Array(profile) };
}

// ---------- animated LED artwork ----------
// Each LED board cycles through steady, wipe-on, blink and a shine sweep,
// offset per board so they never run in step. Blinks stay at 1.25 Hz (well
// under three flashes a second). Returns a key that changes only when the
// picture does, so a canvas is redrawn only on a change.
export function letterSignState(t, phase = 0) {
  const u = (((t + phase) % 12) + 12) % 12;
  if (u < 5) return { mode: 'steady', key: 'on' };
  if (u < 6.4) { const step = Math.min(16, Math.round((u - 5) / 1.2 * 16)); return { mode: 'wipe', reveal: step / 16, key: step === 16 ? 'on' : 'w' + step }; }
  if (u < 8) { const on = Math.floor((u - 6.4) / 0.4) % 2 === 1; return { mode: on ? 'steady' : 'off', key: on ? 'on' : 'off' }; }
  if (u < 10.4) { const step = Math.floor((u - 8) / 0.08); return { mode: 'sweep', x: (u - 8) / 2.4, key: 's' + step }; }
  return { mode: 'steady', key: 'on' };
}

// OPEN sign: a chasing dot border all the time; the letters light O-P-E-N one
// at a time, flash twice and hold.
export function openSignState(t) {
  const u = ((t % 10) + 10) % 10, chase = Math.floor(t / 0.15) % 3;
  let letters = 4, key;
  if (u >= 5 && u < 6.6) letters = Math.min(4, Math.floor((u - 5) / 0.4) + 1);
  else if (u >= 6.6 && u < 8.2) letters = Math.floor((u - 6.6) / 0.4) % 2 ? 4 : 0;
  key = `${chase}:${letters}`;
  return { chase, letters, key };
}

// LED screen: two adverts, each eight seconds, fading in from black.
export function screenState(t) {
  const u = ((t % 16) + 16) % 16, slide = u < 8 ? 0 : 1, s = u - slide * 8;
  return { slide, s, key: Math.floor(t * 10) };
}

export function buildStorefront({ ctex, glowMat, logoMap = null, posts = [], wallTexture = null, blockMats = null }) {
  const group = new THREE.Group();
  group.name = 'FoodMart-storefront';
  group.rotation.y = S.heading;
  const add = (mesh, name, parent = group) => {
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const box = (name, [x0, y0, z0, x1, y1, z1], mat, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, name, parent);
  };
  // A vertical panel facing +X (out of the store); texture reads left-to-right
  // for someone standing in the lot.
  const face = (name, w, h, mat, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.rotation.y = Math.PI / 2; m.position.set(x, y, z);
    return add(m, name, parent);
  };
  const cyl = (name, r0, r1, h, mat, x, y, z, parent, seg = 18) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat);
    m.position.set(x, y, z); return add(m, name, parent);
  };
  const std = (color, roughness = 0.6, metalness = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

  // ---------- live (animated) canvases ----------
  // The page's tick calls userData.animate(t); each canvas is repainted only
  // when its frame key changes. Halos are blurred, scaled-down copies drawn
  // additively in front of the glass so the LEDs read as lit.
  const live = [];
  const liveTex = (w, h, frame, paint) => {
    const entry = { w, h, frame, paint, key: frame(0), halos: [] };
    entry.tex = ctex(w, h, c => paint(c, w, h, 0));
    live.push(entry); return entry;
  };
  const haloMats = [];
  const halo = (entry, name, w, h, x, y, z, pad = [0.25, 0.2], strength = 1) => {
    const W = 128, H = Math.max(32, Math.round(128 * (h + 2 * pad[1]) / (w + 2 * pad[0])));
    const fx = w / (w + 2 * pad[0]), fy = h / (h + 2 * pad[1]);
    const draw = c => {
      c.clearRect(0, 0, W, H);
      const src = entry.tex.image;
      if (!src || !src.width) return;
      c.filter = 'blur(6px)';
      c.drawImage(src, W * (1 - fx) / 2, H * (1 - fy) / 2, W * fx, H * fy);
      c.filter = 'blur(2px)'; c.globalCompositeOperation = 'lighter';
      c.drawImage(src, W * (1 - fx) / 2, H * (1 - fy) / 2, W * fx, H * fy);
      c.filter = 'none'; c.globalCompositeOperation = 'source-over';
    };
    const tex = ctex(W, H, draw);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    entry.halos.push({ tex, draw });
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    mat.userData.strength = strength; haloMats.push(mat);
    const m = face(name, w + 2 * pad[0], h + 2 * pad[1], mat, x, y, z);
    m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2;
    return m;
  };
  // Lit display surfaces: unlit, untone-mapped so LEDs stay saturated.
  const ledMats = [];
  const ledMat = (map, extra = {}) => {
    const m = new THREE.MeshBasicMaterial({ map, toneMapped: false, ...extra });
    ledMats.push(m); return m;
  };

  // ---------- materials ----------
  const BLOCK_W = 1.6, BLOCK_H = 0.8; // one texture tile: 4 blocks x 4 courses
  const blockTex = ctex(512, 256, (c, w, h) => {
    c.fillStyle = '#9a9d9f'; c.fillRect(0, 0, w, h);
    const tones = ['#b9bbbb', '#b1b4b5', '#c0c1c0', '#aeb1b3', '#b6b7b5'];
    for (let r = 0; r < 4; r++) for (let k = -1; k < 5; k++) {
      const x = k * 128 + (r % 2) * 64, y = r * 64;
      c.fillStyle = tones[(r * 3 + k + 5) % tones.length]; c.fillRect(x + 3, y + 3, 122, 58);
      // split-face texture: chipped light and dark flecks
      for (let i = 0; i < 70; i++) {
        c.fillStyle = (i * 7 + r + k) % 3 ? 'rgba(255,255,255,0.18)' : 'rgba(60,64,66,0.22)';
        const fx = x + 4 + ((i * 37 + r * 13 + k * 29) % 118), fy = y + 4 + ((i * 23 + k * 11) % 54);
        c.fillRect(fx, fy, 2 + (i % 4), 1 + (i % 3));
      }
    }
  });
  // Photo block tiles (scripts/block-wall.js) when the page supplies them;
  // the drawn texture otherwise (tests, no network).
  const tile = blockMats ? BLOCK_TILE : { w: BLOCK_W, h: BLOCK_H };
  const blockMat = blockMats ? blockMats.upper : std(0xffffff, 0.95, 0, { map: blockTex, bumpMap: blockTex, bumpScale: 0.6 });
  // The lower courses are painted darker than the upper split-face (photos).
  const blockLow = blockMats ? blockMats.lower : std(0xa9adb0, 0.95, 0, { map: blockTex, bumpMap: blockTex, bumpScale: 0.6 });
  const BAND_Y = S.walkY + 1.1;
  const blockFace = (name, [z0, z1], [y0, y1], x = S.wallX) => {
    blockPart(name + '-lower', [z0, z1], [y0, BAND_Y], x, blockLow);
    return blockPart(name, [z0, z1], [BAND_Y, y1], x, blockMat);
  };
  const blockPart = (name, [z0, z1], [y0, y1], x, mat) => {
    const w = z1 - z0, h = y1 - y0;
    const m = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(w, h), w / tile.w, h / tile.h), mat);
    // keep the courses continuous across the colour change
    const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) + (y0 - S.walkY) / tile.h);
    m.rotation.y = Math.PI / 2; m.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, name);
  };
  const aluminium = std(0xc4cacb, 0.38, 0.55);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xc9ddd6, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.24, depthWrite: false
  });
  // The band around the store is solid grey (owner, Nov 2026); red remains
  // only on the FoodMart sign over the doors.
  const solid = col => ctex(4, 4, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); });
  // Grey fascia and parapet; at night the floodlights and canopy wash them a
  // little (photos), approximated by a faint emissive set with the lighting.
  const fasciaMat = std(0x9fa3a6, 0.7, 0.1, { emissive: 0x9fa3a6, emissiveIntensity: 0 });

  // ---------- block wall: pier by the locker and the south end ----------
  const wallTop = S.fasciaY[0];
  blockFace('Block-pier', [S.storeZ[0], S.glazingZ[0]], [S.walkY, wallTop]);
  blockFace('Block-wall-south', [S.glazingZ[1], S.storeZ[1]], [S.walkY, wallTop]);
  // Jamb returns down to the recessed glass line.
  for (const z of S.glazingZ) {
    const m = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(S.wallX - S.glassX + 0.04, wallTop - S.walkY), 0.1, (wallTop - S.walkY) / BLOCK_H), blockMat);
    m.rotation.y = z === S.glazingZ[0] ? Math.PI : 0;
    m.position.set((S.wallX + S.glassX - 0.04) / 2, (S.walkY + wallTop) / 2, z);
    add(m, 'Block-jamb');
  }

  // ---------- storefront framing ----------
  const frame = new THREE.Group(); frame.name = 'Storefront-frame'; group.add(frame);
  const [gz0, gz1] = S.glazingZ, fx0 = S.glassX - 0.05, fx1 = S.glassX + 0.08;
  box('Sill', [fx0, S.floorY, gz0, fx1 + 0.02, S.floorY + 0.06, gz1], aluminium, frame);
  box('Head', [fx0, S.headY - 0.09, gz0, fx1, S.headY, gz1], aluminium, frame);
  const verticals = new Set([gz0, gz1, ...S.bays.flatMap(b => b.z), ...S.doorZ]);
  for (const z of verticals) box('Mullion', [fx0, S.floorY, z - 0.03, fx1, S.headY, z + 0.03], aluminium, frame);

  // ---------- bays: clear upper glass, decal kick panels ----------
  const art = artTextures(ctex);
  const frosted = new THREE.MeshPhysicalMaterial({ color: 0xcfe3d8, roughness: 0.5, metalness: 0, transparent: true, opacity: 0.82, emissive: 0x27352e, emissiveIntensity: 0.4 });
  const blindsTex = ctex(64, 256, (c, w, h) => {
    for (let y = 0; y < h; y += 8) { c.fillStyle = '#e9ebec'; c.fillRect(0, y, w, 6); c.fillStyle = '#9fa5a8'; c.fillRect(0, y + 6, w, 2); }
  });
  blindsTex.repeat.set(1, 3);
  const blindsMat = std(0xffffff, 0.7, 0, { map: blindsTex, emissive: 0xffffff, emissiveMap: blindsTex, emissiveIntensity: 0 }); // lit from inside at night
  const tint = std(0x1a2226, 0.35, 0.2);
  const upH = S.headY - 0.09 - S.railY - 0.03, upY = (S.railY + 0.03 + S.headY - 0.09) / 2;
  for (const bay of S.bays) {
    const [z0, z1] = bay.z, w = z1 - z0 - 0.06, zc = (z0 + z1) / 2;
    box('Kick-rail', [fx0, S.railY - 0.03, z0, fx1, S.railY + 0.03, z1], aluminium, frame);
    face('Upper-glass', w, upH, bay.upper === 'frosted' ? frosted : glass, S.glassX + 0.01, upY, zc);
    if (bay.upper === 'blinds') {
      const bh = upH * 0.37; // slatted blind down over the top third (straight-on photo)
      face('Window-blinds', w - 0.02, bh, blindsMat, S.glassX - 0.03, S.headY - 0.09 - bh / 2, zc);
    }
    const lowH = S.railY - 0.03 - S.floorY - 0.06;
    const lowMat = bay.art === 'tint' ? tint : std(0xffffff, 0.35, 0.05, { map: art[bay.art] });
    face(`Kick-panel-${bay.art}`, w, lowH, lowMat, S.glassX, S.floorY + 0.06 + lowH / 2, zc);
    face('Kick-glass', w, lowH, glass, S.glassX + 0.012, S.floorY + 0.06 + lowH / 2, zc);
  }
  // Alarm-company sticker in the Reddy Ice bay's corner.
  const aegis = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), std(0xf08a1c, 0.5));
  aegis.rotation.y = Math.PI / 2; aegis.position.set(S.glassX + 0.02, S.railY + 0.13, S.bays[0].z[0] + 0.12);
  add(aegis, 'Alarm-sticker');

  // ---------- LED letter signs (CBD, E-CIGS, 10THC, DELTA 8) ----------
  // Round LED dots only: the drawn art is masked by a dot grid.
  const dotMasks = new Map();
  const dotMask = (src, w, h) => {
    const k = `${w}x${h}`;
    if (dotMasks.has(k)) return dotMasks.get(k);
    const m = src.ownerDocument ? src.ownerDocument.createElement('canvas') : new OffscreenCanvas(w, h);
    m.width = w; m.height = h;
    const c = m.getContext('2d'); c.fillStyle = '#fff'; c.beginPath();
    for (let y = 3; y < h; y += 6) for (let x = 3; x < w; x += 6) { c.moveTo(x + 2.6, y); c.arc(x, y, 2.6, 0, Math.PI * 2); }
    c.fill(); dotMasks.set(k, m); return m;
  };
  // Darken the gaps between the LED dots (rather than cutting them out) so the
  // boards keep their brightness at a distance, where the dots blend together.
  const gapMasks = new Map();
  const gapMask = (src, w, h) => {
    const k = `${w}x${h}`;
    if (gapMasks.has(k)) return gapMasks.get(k);
    const m = src.ownerDocument ? src.ownerDocument.createElement('canvas') : new OffscreenCanvas(w, h);
    m.width = w; m.height = h;
    const c = m.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-out'; c.drawImage(dotMask(src, w, h), 0, 0);
    gapMasks.set(k, m); return m;
  };
  const ledFinish = (c, w, h) => {
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.5; c.drawImage(gapMask(c.canvas, w, h), 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  };
  const ledText = (c, text, x, y, col, size = 92) => {
    c.fillStyle = col; c.font = `bold ${size}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y);
  };
  const ledArt = {
    'CBD': (c, w, h) => {
      ledText(c, 'CBD', w * 0.4, h / 2 + 4, '#ffffff', 100);
      c.fillStyle = '#35e05a'; // leaf beside the letters
      for (let k = -3; k <= 3; k++) { c.save(); c.translate(w * 0.8, h * 0.62); c.rotate(k * 0.42); c.beginPath(); c.ellipse(0, -30, 9, 32 - Math.abs(k) * 5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    },
    'E-CIGS': (c, w, h) => ledText(c, 'E-CIGS', w / 2, h / 2 + 4, '#ffffff', 96),
    '10THC': (c, w, h) => {
      c.strokeStyle = '#35e05a'; c.lineWidth = 9; c.beginPath(); c.moveTo(60, 98); c.lineTo(96, 30); c.lineTo(132, 98); c.closePath(); c.stroke();
      ledText(c, '10THC', w * 0.6, h / 2 + 4, '#35e05a', 84);
    },
    'DELTA 8': (c, w, h) => ledText(c, 'DELTA 8', w / 2, h / 2 + 4, '#e8f6ff', 84)
  };
  const ledArtAt = (c, w, h, draw) => { c.save(); c.translate(w / 2, h / 2); c.scale(1.25, 1.25); c.translate(-w / 2, -64); draw(c, w, 128); c.restore(); };
  // Sized and placed from the straight-on photo: letters fill most of each
  // window's width, centred about 0.47 m below the window head. Lit day and night.
  const ledBays = S.bays.filter(b => b.led);
  ledBays.forEach((bay, i) => {
    const phase = i * 2.9;
    const board = liveTex(512, 192, t => letterSignState(t, phase).key, (c, w, h, t) => {
      const s = letterSignState(t, phase);
      c.clearRect(0, 0, w, h);
      if (s.mode === 'off') return;
      c.save();
      if (s.mode === 'wipe') { c.beginPath(); c.rect(0, 0, w * s.reveal, h); c.clip(); }
      ledArtAt(c, w, h, ledArt[bay.led]);
      if (s.mode === 'sweep') { // a white shine passes across the letters
        c.globalCompositeOperation = 'source-atop';
        const x = -90 + (w + 180) * s.x, g = c.createLinearGradient(x - 70, 0, x + 70, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      }
      c.restore();
      ledFinish(c, w, h);
    });
    const zc = (bay.z[0] + bay.z[1]) / 2, w = bay.z[1] - bay.z[0] - 0.1;
    face(`LED-sign-${bay.led}`, w, 0.55, ledMat(board.tex, { alphaTest: 0.2 }), S.glassX - 0.04, S.ledY, zc).castShadow = false;
    face('LED-sign-backing', w, 0.55, std(0x050506, 0.9), S.glassX - 0.06, S.ledY, zc);
    halo(board, `LED-sign-glow-${bay.led}`, w, 0.55, S.glassX + 0.03, S.ledY, zc);
  });

  // ---------- OPEN sign ----------
  // Big LED "OPEN" in the bay beside the doors: blue "OP", red-and-white
  // striped "EN", inside a chasing dot border. Lit day and night.
  const neonBay = S.bays.find(b => b.neon);
  const openBoard = liveTex(512, 192, t => openSignState(t).key, (c, w, h, t) => {
    const s = openSignState(t);
    c.clearRect(0, 0, w, h);
    if (s.letters > 0) {
      // reveal edge after O, P, E and N (letters drawn 1.25x about the centre)
      c.font = 'bold 104px Arial';
      const mid = w / 2 + 6, wP = c.measureText('P').width, wE = c.measureText('E').width;
      const edge = [mid - wP, mid, mid + wE, w * 2][s.letters - 1];
      c.save(); c.beginPath(); c.rect(0, 0, (edge - w / 2) * 1.25 + w / 2 + 3, h); c.clip();
      ledArtAt(c, w, h, (k, W) => {
        k.font = 'bold 104px Arial'; k.textBaseline = 'middle'; k.textAlign = 'right';
        k.fillStyle = '#3d4dff'; k.fillText('OP', W / 2 + 6, 68);
        k.save(); k.beginPath(); k.rect(W / 2 + 6, 0, W, 128); k.clip();
        k.textAlign = 'left'; k.fillStyle = '#ff2a3a'; k.fillText('EN', W / 2 + 6, 68);
        k.globalCompositeOperation = 'source-atop'; k.fillStyle = '#ffffff';
        for (let y = 22; y < 120; y += 24) k.fillRect(W / 2, y, W, 10);
        k.restore();
      });
      c.restore();
    }
    // Chasing border: every third dot of the outer ring lit, magenta and blue.
    const ring = [];
    for (let x = 3; x < w; x += 6) ring.push([x, 3]);
    for (let y = 9; y < h; y += 6) ring.push([w - 3, y]);
    for (let x = w - 9; x > 0; x -= 6) ring.push([x, h - 3]);
    for (let y = h - 9; y > 3; y -= 6) ring.push([3, y]);
    ring.forEach(([x, y], k) => {
      if ((k + s.chase) % 3) return;
      c.fillStyle = (Math.floor(k / 3) % 2) ? '#ff3fd2' : '#4f6bff'; c.fillRect(x - 3, y - 3, 6, 6);
    });
    ledFinish(c, w, h);
  });
  const openZ = (neonBay.z[0] + neonBay.z[1]) / 2, openW = neonBay.z[1] - neonBay.z[0] - 0.12;
  face('Open-sign', openW, 0.44, ledMat(openBoard.tex, { alphaTest: 0.2 }), S.glassX - 0.04, S.ledY, openZ).castShadow = false;
  face('Open-sign-backing', openW, 0.44, std(0x050506, 0.9), S.glassX - 0.06, S.ledY, openZ);
  halo(openBoard, 'Open-sign-glow', openW, 0.44, S.glassX + 0.03, S.ledY, openZ, [0.28, 0.22], 1.2);

  // ---------- LED video screen on the south block wall ----------
  // Straight-on photo: "50K / VAPE SPECIAL / ONLY $9.99" in neon colours with
  // sparkles; it alternates with the earlier "Fifty Bar vapes $19.99" advert.
  const neon = (c, text, x, y, size, col, glow = col, blur = 18) => {
    c.font = `900 ${size}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = glow; c.shadowBlur = blur; c.fillStyle = col; c.fillText(text, x, y);
    c.shadowBlur = blur * 0.4; c.fillText(text, x, y); c.shadowBlur = 0;
  };
  const sparkle = (c, x, y, r, a) => {
    c.globalAlpha = a; c.fillStyle = '#e8fbff';
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.22, y); c.lineTo(x, y + r); c.lineTo(x - r * 0.22, y); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x - r, y); c.lineTo(x, y + r * 0.22); c.lineTo(x + r, y); c.lineTo(x, y - r * 0.22); c.closePath(); c.fill();
    c.globalAlpha = 1;
  };
  const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const screen = liveTex(512, 320, t => screenState(t).key, (c, w, h, t) => {
    const { slide, s } = screenState(t);
    c.fillStyle = '#04060a'; c.fillRect(0, 0, w, h);
    if (slide === 0) {
      // splash strokes fanning out left and right of the text
      for (let i = 0; i < 7; i++) {
        const a = -0.5 + i / 6, len = 40 + 30 * Math.abs(Math.sin(t * 2 + i)), k = ease(s / 0.8);
        c.strokeStyle = i % 2 ? 'rgba(80,240,255,0.75)' : 'rgba(255,255,255,0.7)'; c.lineWidth = 4;
        for (const side of [-1, 1]) {
          const x0 = w / 2 + side * 150, y0 = h * 0.5;
          c.beginPath(); c.moveTo(x0 + side * Math.cos(a) * 10, y0 + Math.sin(a) * 60);
          c.lineTo(x0 + side * Math.cos(a) * (10 + len * k), y0 + Math.sin(a) * (60 + len * 0.6 * k)); c.stroke();
        }
      }
      const pop = s < 0.5 ? 1 + 0.9 * Math.pow(1 - s / 0.5, 2) : 1 + 0.035 * Math.sin(s * 5);
      neon(c, '50K', w / 2, h * 0.33, Math.round(116 * pop), '#36f4ff', '#14c8ff', 26);
      const k1 = ease((s - 0.35) / 0.45), k2 = ease((s - 0.65) / 0.45);
      if (k1 > 0) neon(c, 'VAPE SPECIAL', w / 2 + (1 - k1) * w, h * 0.555, 46, '#ff5bd6', '#ff2fc0', 16);
      if (k2 > 0) neon(c, 'ONLY $9.99', w / 2 - (1 - k2) * w, h * 0.75, 64, '#45ff9e', '#14e07a', 20);
      for (let i = 0; i < 9; i++) {
        const x = [70, 98, 52, 448, 470, 420, 120, 392, 480][i], y = [70, 250, 160, 60, 210, 270, 40, 30, 140][i];
        sparkle(c, x, y, 7 + (i % 3) * 4, 0.35 + 0.65 * Math.abs(Math.sin(t * 2.4 + i * 1.7)));
      }
    } else {
      // Flag stripes drifting, "FIFTY BAR VAPES $19.99 NOW AVAILABLE".
      const sh = h / 13, off = (t * 24) % (2 * sh);
      for (let i = -2; i < 14; i++) { c.fillStyle = i & 1 ? '#f2f2f2' : '#c8202c'; c.fillRect(0, i * sh + off, w, sh + 1); }
      c.fillStyle = '#1f3a8a'; c.fillRect(0, 0, w * 0.42, h * 7 / 13);
      c.fillStyle = '#ffffff'; for (let i = 0; i < 20; i++) c.fillRect(14 + (i % 5) * 40, 12 + Math.floor(i / 5) * 40, 6, 6);
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, w, h);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 7; c.strokeStyle = '#101010';
      const p = 1 + 0.06 * Math.sin(s * 6);
      for (const [txt, y, size, col] of [['FIFTY BAR VAPES', 78, 52, '#ffffff'], ['$19.99', 166, Math.round(82 * p), '#ffd21f']]) {
        c.font = `900 ${size}px Arial`; c.strokeText(txt, w / 2, y); c.fillStyle = col; c.fillText(txt, w / 2, y);
      }
      if (Math.floor(s * 2) % 2 === 0) { c.font = '900 46px Arial'; c.strokeText('NOW AVAILABLE', w / 2, 256); c.fillStyle = '#ffffff'; c.fillText('NOW AVAILABLE', w / 2, 256); }
    }
    if (s < 0.4) { c.fillStyle = `rgba(0,0,0,${1 - s / 0.4})`; c.fillRect(0, 0, w, h); }
  });
  // Centred on the block wall between the glazing and the south corner.
  const screenZ = (S.glazingZ[1] + S.storeZ[1]) / 2, [sy0, sy1] = [1.98, 2.74], scrW = 1.16;
  box('LED-screen-housing', [S.wallX, sy0, screenZ - scrW / 2, S.wallX + 0.09, sy1, screenZ + scrW / 2], std(0x0c0c0e, 0.5, 0.3));
  const scr = face('LED-screen', scrW - 0.1, sy1 - sy0 - 0.1, ledMat(screen.tex), S.wallX + 0.092, (sy0 + sy1) / 2, screenZ);
  scr.castShadow = false; scr.receiveShadow = false;
  halo(screen, 'LED-screen-glow', scrW - 0.1, sy1 - sy0 - 0.1, S.wallX + 0.1, (sy0 + sy1) / 2, screenZ, [0.3, 0.25], 0.9);

  // ---------- entry: pair of glass doors ----------
  // Two aluminium-framed leaves meeting at the centre, each with a vertical
  // pull handle by the meeting stiles, under a transom with the street number.
  const door = new THREE.Group(); door.name = 'Entry-door'; group.add(door);
  const [dz0, dz1] = S.doorZ, doorTop = S.floorY + 2.14, dw = dz1 - dz0, dzc = (dz0 + dz1) / 2;
  const leafW = (dw - 0.06 - 0.01) / 2, dx0 = S.glassX - 0.02, dx1 = S.glassX + 0.05;
  const handleMat = std(0xd9dddf, 0.25, 0.8);
  [[dz0 + 0.03, dz0 + 0.03 + leafW], [dz1 - 0.03 - leafW, dz1 - 0.03]].forEach(([a, b], i) => {
    const leaf = new THREE.Group(); leaf.name = 'Door-leaf'; door.add(leaf);
    box('Door-stile', [dx0, S.floorY, a, dx1, doorTop, a + 0.1], aluminium, leaf);
    box('Door-stile', [dx0, S.floorY, b - 0.1, dx1, doorTop, b], aluminium, leaf);
    box('Door-bottom-rail', [dx0, S.floorY, a, dx1, S.floorY + 0.22, b], aluminium, leaf);
    box('Door-top-rail', [dx0, doorTop - 0.1, a, dx1, doorTop, b], aluminium, leaf);
    face('Door-glass', b - a - 0.2, doorTop - 0.1 - S.floorY - 0.22, glass, S.glassX + 0.015, (doorTop - 0.1 + S.floorY + 0.22) / 2, (a + b) / 2, leaf);
    // Offset vertical pull on the outside, next to the meeting stile.
    const hz = i === 0 ? b - 0.17 : a + 0.17, hx = dx1 + 0.06;
    box('Door-pull', [hx - 0.013, S.floorY + 0.8, hz - 0.013, hx + 0.013, S.floorY + 1.55, hz + 0.013], handleMat, leaf);
    for (const y of [S.floorY + 0.86, S.floorY + 1.49]) box('Door-pull-standoff', [dx1, y - 0.012, hz - 0.01, hx, y + 0.012, hz + 0.01], handleMat, leaf);
    // Lock cylinder on the meeting stile.
    cyl('Door-lock', 0.017, 0.017, 0.02, std(0x8f9396, 0.3, 0.8), dx1 + 0.01, S.floorY + 1.05, i === 0 ? b - 0.05 : a + 0.05, leaf, 10).rotation.z = Math.PI / 2;
  });
  box('Door-astragal', [dx1, S.floorY + 0.02, dzc - 0.02, dx1 + 0.015, doorTop, dzc + 0.02], aluminium, door);
  const redBull = ctex(64, 320, (c, w, h) => {
    c.fillStyle = '#f4f4f2'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2, h / 2); c.rotate(Math.PI / 2);
    c.fillStyle = '#d0202f'; c.font = 'bold 40px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Red Bull', 0, 2); c.restore();
  });
  face('Door-decal', 0.13, 0.66, std(0xffffff, 0.5, 0, { map: redBull }), S.glassX + 0.03, S.floorY + 1.55, dz0 + 0.24, door);
  // Transom with the street number above the doors.
  box('Door-head', [fx0, doorTop + 0.05, dz0, fx1, doorTop + 0.11, dz1], aluminium, frame);
  face('Transom-glass', dw - 0.06, S.headY - 0.09 - doorTop - 0.11, glass, S.glassX + 0.01, (doorTop + 0.11 + S.headY - 0.09) / 2, (dz0 + dz1) / 2);
  const numTex = ctex(256, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = 'bold 70px Arial';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1185', w / 2, h / 2 + 4);
  });
  face('Street-number', 0.5, 0.18, std(0xffffff, 0.5, 0, { map: numTex, transparent: true, alphaTest: 0.3 }),
    S.glassX + 0.025, doorTop + 0.3, (dz0 + dz1) / 2);

  // Black rubber entry mat (3 x 5 ft) centred on the doors, just off the sill:
  // ribbed charcoal top, lighter bevelled border tapering to the walk.
  const MAT_W = 1.52, MAT_D = 0.91;
  const matTex = ctex(512, 307, (c, w, h) => {
    c.fillStyle = '#26292b'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#303436'; // raised cleats
    for (let y = 18; y < h - 14; y += 9) for (let x = 18 + ((y / 9) % 2) * 4; x < w - 14; x += 8) c.fillRect(x, y, 4, 4);
    const g = c.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, w * 0.45); // worn walking path
    g.addColorStop(0, 'rgba(120,118,112,0.16)'); g.addColorStop(1, 'rgba(120,118,112,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#4a4e51'; c.lineWidth = 22; c.strokeRect(0, 0, w, h);      // bevelled rim
    c.strokeStyle = '#1b1d1f'; c.lineWidth = 3; c.strokeRect(12, 12, w - 24, h - 24);
  });
  const { geometry: matGeo, profile } = rubberMatGeometry(MAT_W, MAT_D);
  const entryMat = add(new THREE.Mesh(matGeo, std(0xffffff, 0.95, 0, {
    map: matTex, bumpMap: matTex, bumpScale: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  })), 'Entry-mat');
  entryMat.position.set(S.wallX + 0.06 + MAT_D / 2, S.walkY, dzc);
  entryMat.castShadow = false; entryMat.userData.conformToWalk = true; entryMat.userData.profile = profile;

  // ---------- fascia band, parapet, LED strip and sign ----------
  const [fy0, fy1] = S.fasciaY, [py0, py1] = S.parapetY, fxOut = S.wallX - 0.03 + S.fasciaDepth;
  const [ez0, ez1] = [S.storeZ[0] - S.fasciaOverhang, S.storeZ[1] + S.fasciaOverhang];
  box('Fascia', [S.wallX - 0.03, fy0, ez0, fxOut, fy1, ez1], fasciaMat);
  const flashing = std(0x8d9195, 0.45, 0.45);
  box('Fascia-cap', [S.wallX + 0.09, fy1, ez0 - 0.01, fxOut + 0.02, fy1 + 0.025, ez1 + 0.01], flashing);
  box('Fascia-soffit', [S.wallX - 0.03, fy0 - 0.02, ez0, fxOut, fy0, ez1], std(0xd8dadb, 0.6, 0.1));
  // Panel joints on the band either side of the sign (photos).
  const signC = (S.signZ[0] + S.signZ[1]) / 2, jointMat = std(0x6b6f72, 0.6, 0.2);
  for (let k = -3; k <= 3; k++) {
    if (!k) continue;
    const z = signC + Math.sign(k) * (2.2 + (Math.abs(k) - 1) * 4.4);
    if (z > ez0 + 0.3 && z < ez1 - 0.3) box('Fascia-joint', [fxOut, fy0 + 0.02, z - 0.007, fxOut + 0.005, fy1 - 0.02, z + 0.007], jointMat);
  }
  // White LED strip along the band's bottom front edge.
  const stripMat = ledMat(null, { color: 0xffffff });
  box('LED-light-strip', [fxOut - 0.1, fy0 - 0.07, S.storeZ[0], fxOut, fy0 - 0.02, S.storeZ[1]], stripMat).castShadow = false;
  box('Head-flashing', [S.glassX - 0.05, S.headY, gz0, S.wallX, fy0, gz1], aluminium);
  // Upper parapet, set back at the wall face above the band.
  const B = S.band, sleeve = 0.03;
  box('Parapet', [S.wallX - 0.1, py0, B.northZ - sleeve - 0.005, S.wallX + 0.09, py1 + 0.01, B.southZ + sleeve + 0.005], fasciaMat);
  // Grey sleeves over the model's red band on the north, south and back walls.
  box('Band-sleeve-north', [B.backX - sleeve, B.y[0], B.northZ - sleeve - 0.005, S.wallX, B.y[1], B.northZ - 0.005], fasciaMat);
  box('Band-sleeve-south', [B.backX - sleeve, B.y[0], B.southZ + 0.005, S.wallX, B.y[1], B.southZ + sleeve + 0.005], fasciaMat);
  box('Band-sleeve-back', [B.backX - sleeve - 0.005, B.y[0], B.northZ - sleeve - 0.005, B.backX - 0.005, B.y[1], B.southZ + sleeve + 0.005], fasciaMat);
  // Same split-face block on the back and both ends, light above a darker
  // lower band (photos of the north wall and the car wash).
  const walls = { upper: blockMat, lower: blockLow }, wy0 = S.walkY - 0.6;
  const blockSide = (name, a, b, normal) => {
    const parts = blockWall(group, { a, b, y0: wy0, y1: B.y[0], band: BAND_Y, normal, mats: walls, name, offset: 0.02 });
    // Tests run with the drawn texture: scale its UVs to the same block size.
    if (!blockMats) for (const m of parts) { const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * BLOCK_TILE.w / tile.w, uv.getY(i) * BLOCK_TILE.h / tile.h); }
  };
  blockSide('Perimeter-wall-back', [B.backX, B.southZ], [B.backX, B.northZ], [-1, 0]);
  blockSide('Perimeter-wall-north', [B.backX, B.northZ], [S.wallX, B.northZ], [0, -1]);
  blockSide('Perimeter-wall-south', [S.wallX, B.southZ], [B.backX, B.southZ], [0, 1]);
  // Metal coping around the roofline, with a recessed cool-white LED edge on
  // the back and ends.
  const borderY = B.y[1] + 0.008, borderH = 0.055, borderDepth = 0.16, copingTop = borderY + borderH;
  const borderMat = std(0x8a8f93, 0.45, 0.4);
  const borderGlow = glowMat(solid('#eef4f7'));
  box('Roofline-border-front', [S.wallX - borderDepth, borderY, S.storeZ[0] - 0.08, S.wallX + 0.13, copingTop, S.storeZ[1] + 0.08], borderMat);
  box('Roofline-border-back', [B.backX - 0.03, borderY, B.northZ - 0.08, B.backX + borderDepth, copingTop, B.southZ + 0.08], borderMat);
  box('Roofline-border-north', [B.backX - 0.03, borderY, B.northZ - borderDepth, S.wallX + 0.03, copingTop, B.northZ + 0.03], borderMat);
  box('Roofline-border-south', [B.backX - 0.03, borderY, B.southZ - 0.03, S.wallX + 0.03, copingTop, B.southZ + borderDepth], borderMat);
  box('Roofline-light-back', [B.backX + borderDepth - 0.02, borderY - 0.035, B.northZ, B.backX + borderDepth + 0.01, borderY, B.southZ], borderGlow);
  box('Roofline-light-north', [B.backX, borderY - 0.035, B.northZ - borderDepth - 0.01, S.wallX, borderY, B.northZ - borderDepth + 0.02], borderGlow);
  box('Roofline-light-south', [B.backX, borderY - 0.035, B.southZ + borderDepth - 0.02, S.wallX, borderY, B.southZ + borderDepth + 0.01], borderGlow);

  // Texaco FoodMart sign (photos): white panel with the roundel, cut on a
  // diagonal against the red panel carrying "FoodMart" in white.
  const [sz0, sz1] = S.signZ, [sy0s, sy1s] = S.signY, sw = sz1 - sz0, sh = sy1s - sy0s;
  box('Sign-panel', [fxOut, sy0s, sz0, fxOut + 0.04, sy1s, sz1], std(0xb9bec1, 0.4, 0.5));
  const signTex = ctex(1024, 280, (c, w, h) => {
    const cut = [0.326, 0.257]; // white panel's diagonal edge, top and bottom
    c.fillStyle = '#5d6063'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f2f2f0'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w * cut[0] - 6, 0); c.lineTo(w * cut[1] - 6, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.fillStyle = '#c8102e'; c.beginPath(); c.moveTo(w * cut[0], 0); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(w * cut[1], h); c.closePath(); c.fill();
    // Texaco roundel: red disc, white star, red T with a flared foot.
    const cx = w * 0.125, cy = h / 2, R = h * 0.35;
    c.fillStyle = '#c8102e'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2f2f0'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.4 : R * 0.94; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    c.closePath(); c.fill();
    c.fillStyle = '#c8102e';
    c.fillRect(cx - R * 0.3, cy - R * 0.2, R * 0.6, R * 0.13);
    c.fillRect(cx - R * 0.075, cy - R * 0.2, R * 0.15, R * 0.52);
    c.beginPath(); c.moveTo(cx - R * 0.075, cy + R * 0.26); c.lineTo(cx - R * 0.17, cy + R * 0.34); c.lineTo(cx + R * 0.17, cy + R * 0.34); c.lineTo(cx + R * 0.075, cy + R * 0.26); c.fill();
    // "FoodMart": regular "Food", bold "Mart", fitted to the red panel.
    c.fillStyle = '#f6f6f4'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    let size = h * 0.44;
    const fontA = s => `500 ${s}px "Helvetica Neue", Helvetica, Arial, sans-serif`, fontB = s => `700 ${s}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    const widths = s => { c.font = fontA(s); const a = c.measureText('Food').width; c.font = fontB(s); return [a, c.measureText('Mart').width]; };
    let [wa, wb] = widths(size);
    if (wa + wb > w * 0.5) { size *= w * 0.5 / (wa + wb); [wa, wb] = widths(size); }
    const x0 = w * 0.665 - (wa + wb) / 2, base = h / 2 + size * 0.36;
    c.font = fontA(size); c.fillText('Food', x0, base);
    c.font = fontB(size); c.fillText('Mart', x0 + wa + size * 0.02, base);
  });
  face('FoodMart-lettering', sw - 0.02, sh - 0.02, glowMat(signTex), fxOut + 0.042, (sy0s + sy1s) / 2, (sz0 + sz1) / 2);

  // ---------- roof floodlights ----------
  // Three LED flood heads on the parapet coping, tilted down over the lot.
  // The page sets their intensity with the time of day (applyLighting) and
  // turns on shadows where the device can afford them.
  const floodBody = std(0x2c2f33, 0.45, 0.6);
  const lensTex = ctex(128, 96, (c, w, h) => {
    c.fillStyle = '#d9dee2'; c.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 13) for (let x = 8; x < w; x += 13) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x + 2, y + 2, 4.2, 0, Math.PI * 2); c.fill(); }
  });
  const lensMat = ledMat(lensTex);
  const glareTex = ctex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.07, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.18, 'rgba(236,242,255,0.42)'); g.addColorStop(0.42, 'rgba(205,220,255,0.12)'); g.addColorStop(1, 'rgba(205,220,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'lighter'; // starburst streaks as in the photos
    for (const a of [0.42, -0.42, Math.PI / 2 + 0.15]) {
      c.save(); c.translate(w / 2, h / 2); c.rotate(a);
      const s = c.createLinearGradient(-w / 2, 0, w / 2, 0);
      s.addColorStop(0, 'rgba(220,230,255,0)'); s.addColorStop(0.5, 'rgba(240,245,255,0.55)'); s.addColorStop(1, 'rgba(220,230,255,0)');
      c.fillStyle = s; c.beginPath(); c.ellipse(0, 0, w / 2, 3.2, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
  });
  glareTex.wrapS = glareTex.wrapT = THREE.ClampToEdgeWrapping;
  const TILT = 0.45; // head tilted ~26 deg below level, aimed ~12 m out
  const floods = S.floodZ.map((z, i) => {
    const g = new THREE.Group(); g.name = 'Roof-floodlight'; g.position.set(S.wallX, copingTop, z); group.add(g);
    box('Flood-base-plate', [-0.12, 0, -0.09, 0.1, 0.02, 0.09], floodBody, g);
    cyl('Flood-stanchion', 0.035, 0.04, 0.26, floodBody, 0, 0.15, 0, g, 10);
    for (const s of [-1, 1]) box('Flood-yoke', [-0.02, 0.24, s * 0.255 - 0.012, 0.09, 0.4, s * 0.255 + 0.012], floodBody, g);
    box('Flood-yoke-bar', [-0.02, 0.24, -0.267, 0.02, 0.27, 0.267], floodBody, g);
    const head = new THREE.Group(); head.name = 'Flood-head'; head.position.set(0.06, 0.38, 0); head.rotation.z = -TILT; g.add(head);
    box('Flood-housing', [-0.06, -0.16, -0.24, 0.05, 0.16, 0.24], floodBody, head);
    for (let k = -2; k <= 2; k++) box('Flood-fin', [-0.11, k * 0.06 - 0.008, -0.22, -0.06, k * 0.06 + 0.008, 0.22], floodBody, head);
    const lens = face('Flood-lens', 0.44, 0.28, lensMat, 0.052, 0, 0, head);
    lens.castShadow = false;
    const light = new THREE.SpotLight(0xf3f6ff, 0, 46, 1.0, 0.6, 1.5);
    light.name = 'Roof-floodlight-source'; light.position.set(0.09, 0, 0); head.add(light);
    light.target.position.set(S.wallX + 12, S.walkY - 0.2, z); group.add(light.target);
    // Glare seen when looking into the lamp (photos); fades out from the side and behind.
    const glare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glareTex, color: 0xf4f7ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false }));
    glare.name = 'Roof-floodlight-glare'; glare.scale.setScalar(3.4);
    glare.position.set(0.06 + Math.cos(TILT) * 0.4, 0.38 - Math.sin(TILT) * 0.4, 0); g.add(glare);
    const fwd = new THREE.Vector3(), toCam = new THREE.Vector3(), at = new THREE.Vector3();
    glare.userData.base = 0;
    glare.onBeforeRender = (renderer, scene, camera) => {
      fwd.set(1, 0, 0).transformDirection(head.matrixWorld);
      glare.getWorldPosition(at); toCam.copy(camera.position).sub(at).normalize();
      const k = THREE.MathUtils.smoothstep(fwd.dot(toCam), -0.15, 0.55);
      glare.material.opacity = glare.userData.base * k;
    };
    return { group: g, light, glare, head };
  });

  // ---------- pier: shut-off, switch, extinguisher, poster, trash can ----------
  const pier = new THREE.Group(); pier.name = 'Storefront-pier'; group.add(pier);
  const d = dist => S.pierZ[1] - dist; // distance north from the glazing edge
  const shutTex = ctex(256, 96, (c, w, h) => {
    c.fillStyle = '#9a6858'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d9b3a2'; c.lineWidth = 4; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = '#f1dcd0'; c.textAlign = 'center'; c.font = 'bold 22px Arial';
    c.fillText('Emergency Pump', w / 2, 30); c.fillText('Shut-Off', w / 2, 54);
    c.font = 'bold 26px Arial'; c.fillText('All Pumps', w / 2, 84);
  });
  face('Emergency-shutoff-sign', 0.34, 0.13, std(0xffffff, 0.45, 0.35, { map: shutTex }), S.wallX + 0.012, 1.83, d(0.35), pier);
  box('Shutoff-key-switch', [S.wallX, 2.3, d(0.57), S.wallX + 0.03, 2.38, d(0.51)], std(0x8a8f92, 0.4, 0.6), pier);
  box('Switch-box', [S.wallX, 1.56, d(0.72), S.wallX + 0.06, 1.76, d(0.58)], std(0xd6cfae, 0.6), pier);
  box('Switch-plate', [S.wallX + 0.06, 1.62, d(0.68), S.wallX + 0.07, 1.7, d(0.62)], std(0xb9b29a, 0.5), pier);
  box('Outlet-box', [S.wallX, 1.15, d(0.25), S.wallX + 0.06, 1.26, d(0.13)], std(0xa9adb0, 0.5, 0.4), pier);
  const cord = cyl('Outlet-cord', 0.008, 0.008, 1.15 - S.walkY, std(0xe9e9e6, 0.6), S.wallX + 0.03, (1.15 + S.walkY) / 2, d(0.19), pier, 6);
  cord.castShadow = false;
  // Open-front white cabinet with the extinguisher.
  const cab = new THREE.Group(); cab.name = 'Extinguisher-cabinet'; cab.userData.onWalk = true; pier.add(cab);
  // The two freestanding sidewalk blocks marked in the owner's latest model
  // screenshot are not part of the desired site plan; keep the wall detail
  // code below intact but remove this cabinet from the finished scene.
  cab.visible = false;
  const white = std(0xeeeeeb, 0.5, 0.1), [cz0, cz1] = [d(0.65), d(0.28)], cy0 = S.walkY + 0.02, cy1 = S.walkY + 0.86, cx1 = S.wallX + 0.19;
  box('Cabinet-back', [S.wallX, cy0, cz0, S.wallX + 0.01, cy1, cz1], white, cab);
  box('Cabinet-side', [S.wallX, cy0, cz0, cx1, cy1, cz0 + 0.03], white, cab);
  box('Cabinet-side', [S.wallX, cy0, cz1 - 0.03, cx1, cy1, cz1], white, cab);
  box('Cabinet-top', [S.wallX, cy1 - 0.03, cz0, cx1, cy1, cz1], white, cab);
  box('Cabinet-bottom', [S.wallX, cy0, cz0, cx1, cy0 + 0.03, cz1], white, cab);
  box('Cabinet-lock', [cx1 - 0.01, cy1 - 0.12, cz1 - 0.05, cx1 + 0.01, cy1 - 0.08, cz1 - 0.02], std(0x9a9ea0, 0.4, 0.6), cab);
  const red = std(0xb5161e, 0.35, 0.15), ex = (cz0 + cz1) / 2, exX = S.wallX + 0.1;
  cyl('Extinguisher', 0.075, 0.075, 0.5, red, exX, cy0 + 0.03 + 0.25, ex, cab);
  cyl('Extinguisher-dome', 0.06, 0.075, 0.05, red, exX, cy0 + 0.555, ex, cab);
  cyl('Extinguisher-valve', 0.022, 0.022, 0.08, std(0x2b2b2b, 0.4, 0.6), exX, cy0 + 0.62, ex, cab, 8);
  box('Extinguisher-handle', [exX - 0.02, cy0 + 0.65, ex - 0.07, exX + 0.02, cy0 + 0.67, ex + 0.05], std(0x1d1d1d, 0.5), cab);
  cyl('Extinguisher-hose', 0.012, 0.012, 0.4, std(0x151515, 0.7), exX + 0.06, cy0 + 0.42, ex + 0.07, cab, 6);
  face('Extinguisher-label', 0.07, 0.1, std(0xf3f0e4, 0.6), exX + 0.076, cy0 + 0.3, ex, cab);
  // Framed vape poster with the Short Stop roundel (photos: ~0.7 x 1.0 m).
  const posterTex = ctex(360, 540, posterArt);
  const pz = d(1.1), py0p = 1.78, py1p = 2.8, pw = 0.72;
  box('Poster-frame', [S.wallX, py0p, pz - pw / 2, S.wallX + 0.025, py1p, pz + pw / 2], std(0xdfe2e3, 0.3, 0.6), pier);
  face('Vape-poster', pw - 0.05, py1p - py0p - 0.05, std(0xffffff, 0.45, 0, { map: posterTex }), S.wallX + 0.027, (py0p + py1p) / 2, pz, pier);
  if (logoMap) {
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), std(0xffffff, 0.5, 0, { map: logoMap }));
    logo.rotation.y = Math.PI / 2; logo.position.set(S.wallX + 0.03, py0p + 0.13, pz); add(logo, 'Poster-logo', pier);
  }
  // Square taupe receptacles: body flaring slightly to the top, an
  // overhanging lid band, and a square cap with a round hole on top and a
  // front mouth showing the black liner.
  const taupe = std(0x857c77, 0.85), liner = std(0x0e0e0f, 0.9);
  const receptacle = (tx, tz, parent) => {
    const can = new THREE.Group(); can.name = 'Trash-receptacle'; can.userData.onWalk = true; parent.add(can);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.36, 0.78, 4, 1), taupe);
    body.rotation.y = Math.PI / 4; body.position.set(tx, S.walkY + 0.39, tz); add(body, 'Receptacle-body', can);
    box('Receptacle-lid', [tx - 0.31, S.walkY + 0.78, tz - 0.31, tx + 0.31, S.walkY + 0.86, tz + 0.31], taupe, can);
    box('Receptacle-cap', [tx - 0.24, S.walkY + 0.86, tz - 0.24, tx + 0.24, S.walkY + 1.02, tz + 0.24], taupe, can);
    cyl('Receptacle-hole', 0.1, 0.1, 0.01, liner, tx, S.walkY + 1.026, tz, can, 20);
    face('Receptacle-mouth', 0.32, 0.1, liner, tx + 0.243, S.walkY + 0.94, tz, can);
    return can;
  };
  receptacle(S.wallX + 0.4, d(1.32), pier);
  const southSidewalkBlock = receptacle(S.wallX + 0.4, S.glazingZ[1] + 0.55, group); // south end, by the block wall
  southSidewalkBlock.visible = false;

  // Two security cameras just under the fascia on the pier, with a cable between.
  const camMat = std(0xe8e9e8, 0.5, 0.1), camY = S.fasciaY[0] - 0.12;
  for (const dist of [0.15, 1.85]) {
    box('Camera-mount', [S.wallX, camY - 0.04, d(dist) - 0.04, S.wallX + 0.05, camY + 0.04, d(dist) + 0.04], camMat, pier);
    const cam = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), camMat);
    cam.rotation.z = -Math.PI / 2; cam.position.set(S.wallX + 0.05, camY, d(dist)); add(cam, 'Security-camera', pier);
  }
  box('Camera-cable', [S.wallX, camY + 0.02, d(1.85), S.wallX + 0.012, camY + 0.032, d(0.15)], std(0xf0f0ee, 0.6), pier);

  // A-frame by the door carries the same "Special Vape 50K" poster.
  const sign = new THREE.Group(); sign.name = 'A-frame-sign'; sign.userData.onWalk = true; group.add(sign);
  const signMat = std(0xffffff, 0.5, 0, { map: posterTex }), black = std(0x161616, 0.6);
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group(); leaf.rotation.z = s * 0.17; leaf.position.set(S.wallX + 0.75 + s * 0.16, S.walkY, dz1 + 0.62); sign.add(leaf);
    // Each board leans in from its foot so the two tops meet.
    const board = box('A-frame-board', [-0.02, 0, -0.29, 0.02, 0.9, 0.29], black, leaf);
    board.position.set(s * 0.02, 0.45, 0);
    const art2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.75), signMat);
    art2.rotation.y = s * Math.PI / 2; art2.position.set(s * 0.045, 0.47, 0); add(art2, 'A-frame-poster', leaf);
  }

  // ---------- Amazon Hub locker graphics ----------
  // The model's locker is a plain black box at x 10.03-10.70, z -9.72..-7.33,
  // y 0.62-2.86; dress its front and south side as the real slate-blue locker:
  // four columns of doors, the logo and "Order at" message on the left, the
  // model's kiosk in the third column (its screen lit here) and a name
  // sticker on the fourth.
  const L = S.locker, lw = L.z[1] - L.z[0], lh = L.y[1] - L.y[0];
  const lockerTex = ctex(1024, 960, (c, w, h) => {
    c.fillStyle = '#353e4b'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#222831'; c.lineWidth = 6;
    const rows = [[0, 0.11, 0.21, 0.36, 0.5, 0.64, 0.78, 1], [0, 0.11, 0.21, 0.29, 0.38, 0.47, 0.56, 0.66, 0.78, 0.89, 1],
      [0, 0.11, 0.21, 0.3, 0.42, 0.52, 0.68, 0.84, 1], [0, 0.11, 0.21, 0.32, 0.44, 0.56, 0.68, 0.8, 1]];
    for (let k = 0; k < 4; k++) {
      const x0 = k * w / 4 + 6, x1 = (k + 1) * w / 4 - 6;
      for (let r = 0; r < rows[k].length - 1; r++) c.strokeRect(x0, rows[k][r] * h + 5, x1 - x0, (rows[k][r + 1] - rows[k][r]) * h - 10);
    }
    // top light from the hood washing the upper doors
    const g = c.createLinearGradient(0, 0, 0, h * 0.2); g.addColorStop(0, 'rgba(220,235,255,0.28)'); g.addColorStop(1, 'rgba(220,235,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h * 0.2);
    // logo, message and the name sticker
    c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.font = 'bold 66px Arial'; c.fillText('amazon', 34, 92);
    c.strokeStyle = '#ff9900'; c.lineWidth = 7; c.beginPath(); c.moveTo(44, 108); c.quadraticCurveTo(140, 136, 236, 104); c.stroke();
    c.font = '400 104px Arial';
    ['Order at', 'Amazon,', 'pick up', 'here'].forEach((t, i) => c.fillText(t, 26, 300 + i * 124));
    const tx = 0.76 * w, tw = 0.22 * w;
    c.fillStyle = '#4b5563'; c.fillRect(tx, 26, tw, 46); c.fillStyle = '#f4f4f4'; c.fillRect(tx, 72, tw, 46);
    c.font = 'bold 26px Arial'; c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.fillText('hello, my name is', tx + tw / 2, 58);
    c.font = 'italic 32px Arial'; c.fillStyle = '#4a4a4a'; c.fillText('goodwill', tx + tw / 2, 106);
  });
  const lockerGlow = ctex(4, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(0.1, '#262626'); g.addColorStop(0.24, '#000000'); g.addColorStop(1, '#000000');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const lockerFrontMat = std(0xffffff, 0.55, 0.15, { map: lockerTex, emissive: 0xdde8ff, emissiveMap: lockerGlow, emissiveIntensity: 0 });
  face('Amazon-locker-front', lw, lh, lockerFrontMat, L.x[1] + 0.012, (L.y[0] + L.y[1]) / 2, (L.z[0] + L.z[1]) / 2);
  // Lit kiosk touch screen (lit day and night).
  const kiosk = liveTex(256, 192, t => Math.floor(t * 2) % 2, (c, w, h, t) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d8f6ef'); g.addColorStop(1, '#a9e6da');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#232f3e'; c.fillRect(0, 0, w, 34);
    c.fillStyle = '#ffffff'; c.font = 'bold 20px Arial'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('amazon hub', 12, 18);
    c.strokeStyle = '#ff9900'; c.lineWidth = 3; c.beginPath(); c.moveTo(14, 28); c.quadraticCurveTo(40, 34, 66, 27); c.stroke();
    c.fillStyle = '#16323a'; c.textAlign = 'center'; c.font = 'bold 22px Arial';
    c.fillText('Pick up a package', w / 2, 74); c.font = '17px Arial'; c.fillText('Scan or enter your pickup code', w / 2, 104);
    c.fillStyle = Math.floor(t * 2) % 2 ? '#0f7c8c' : '#14a3b8';
    c.fillRect(w / 2 - 70, 128, 140, 40); c.fillStyle = '#ffffff'; c.font = 'bold 18px Arial'; c.fillText('Touch to start', w / 2, 149);
  });
  const K = L.screen;
  const kioskScreen = face('Amazon-locker-screen', K.z[1] - K.z[0], K.y[1] - K.y[0], ledMat(kiosk.tex), K.x,
    (K.y[0] + K.y[1]) / 2, (K.z[0] + K.z[1]) / 2);
  kioskScreen.castShadow = false; kioskScreen.receiveShadow = false;
  const sideTex = ctex(160, 640, (c, w, h) => {
    c.fillStyle = '#353e4b'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2 + 10, h * 0.62); c.rotate(-Math.PI / 2);
    c.fillStyle = '#ffffff'; c.font = 'bold 64px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('amazon hub', 0, 0);
    c.strokeStyle = '#ff9900'; c.lineWidth = 6; c.beginPath(); c.moveTo(-150, 36); c.quadraticCurveTo(-40, 62, 70, 30); c.stroke();
    c.restore();
  });
  const side = new THREE.Mesh(new THREE.PlaneGeometry(L.x[1] - L.x[0], lh), std(0xffffff, 0.55, 0.15, { map: sideTex }));
  side.position.set((L.x[0] + L.x[1]) / 2, (L.y[0] + L.y[1]) / 2, L.z[1] + 0.012); add(side, 'Amazon-locker-side');
  // Lit hood across the top front.
  box('Amazon-locker-hood', [L.x[0], L.y[1], L.z[0] - 0.02, L.x[1] + 0.08, L.y[1] + 0.08, L.z[1] + 0.02], std(0x2f3742, 0.5, 0.2));
  const hoodLight = ledMat(null, { color: 0xeef4ff });
  box('Amazon-locker-light', [L.x[1] - 0.02, L.y[1] - 0.012, L.z[0] + 0.05, L.x[1] + 0.07, L.y[1], L.z[1] - 0.05], hoodLight).castShadow = false;

  // ---------- orange flexible delineators where the model had bollards ----------
  const orange = std(0xff4a12, 0.45, 0, { emissive: 0x3a0a00 }), band = std(0xf5f5f0, 0.25, 0.2), base = std(0x111111, 0.85);
  for (const [px, py, pz2] of posts) {
    const post = new THREE.Group(); post.name = 'Delineator-post'; post.position.set(px, py, pz2); group.add(post);
    // Black dome base, orange tube, two wide white bands in the upper half.
    cyl('Delineator-base', 0.1, 0.17, 0.07, base, 0, 0.035, 0, post, 20);
    cyl('Delineator-tube', 0.042, 0.047, 1.05, orange, 0, 0.6, 0, post, 14);
    for (const by of [0.66, 0.92]) cyl('Delineator-band', 0.049, 0.049, 0.1, band, 0, by, 0, post, 14);
    cyl('Delineator-cap', 0.035, 0.042, 0.03, orange, 0, 1.14, 0, post, 14);
  }

  // ---------- time of day and animation hooks for the page ----------
  const dayLens = new THREE.Color(0x9ea4a8), nightLens = new THREE.Color(0xffffff);
  const dayStrip = new THREE.Color(0xc9cdd0), nightStrip = new THREE.Color(0xffffff);
  group.userData.floodLights = floods.map(f => f.light);
  group.userData.floodPower = 95;
  // w: preset weights { day, golden, night } (they sum to 1).
  group.userData.applyLighting = w => {
    const dusk = w.golden + w.night, p = group.userData.floodPower;
    floods.forEach(f => { f.light.intensity = p * (0.35 * w.golden + w.night); f.glare.userData.base = 0.3 * w.golden + 0.95 * w.night; });
    lensMat.color.copy(dayLens).lerp(nightLens, Math.min(1, dusk));
    stripMat.color.copy(dayStrip).lerp(nightStrip, Math.min(1, dusk));
    fasciaMat.emissiveIntensity = 0.05 * w.golden + 0.13 * w.night;
    lockerFrontMat.emissiveIntensity = 0.06 * w.golden + 0.22 * w.night;
    blindsMat.emissiveIntensity = 0.05 + 0.12 * w.golden + 0.3 * w.night;
    hoodLight.color.setScalar(0.75 + 0.25 * Math.min(1, dusk));
    // LED boards: a touch softer in daylight; their glow shows most at night.
    ledMats.forEach(m => { if (m !== lensMat && m !== stripMat && m !== hoodLight) m.color.setScalar(0.82 + 0.18 * Math.min(1, dusk)); });
    haloMats.forEach(m => { m.opacity = Math.min(1, m.userData.strength * (0.18 + 0.4 * w.golden + 0.9 * w.night)); });
  };
  // t: seconds. Repaints only the canvases whose picture changed.
  group.userData.animate = t => {
    for (const e of live) {
      const k = e.frame(t);
      if (k === e.key) continue;
      e.key = k;
      const c = e.tex.image && e.tex.image.getContext ? e.tex.image.getContext('2d') : null;
      if (!c) continue;
      e.paint(c, e.w, e.h, t); e.tex.needsUpdate = true;
      for (const hl of e.halos) {
        const hc = hl.tex.image && hl.tex.image.getContext ? hl.tex.image.getContext('2d') : null;
        if (hc) { hl.draw(hc); hl.tex.needsUpdate = true; }
      }
    }
  };
  group.userData.liveCanvases = live.length;
  return group;
}

// Kick-panel decal artwork, drawn after the photos (no source artwork used).
function artTextures(ctex) {
  const W = 512, H = 300;
  const flake = (c, x, y, r, col) => {
    c.strokeStyle = col; c.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3; c.beginPath();
      c.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke();
    }
  };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  return {
    'reddy-ice': ctex(W, H, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1a3c'); g.addColorStop(1, '#1d3566');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) flake(c, (i * 97) % w, 20 + (i * 53) % (h - 40), 10 + (i % 3) * 5, 'rgba(150,200,255,0.7)');
      c.font = 'bold 46px Arial'; c.textBaseline = 'middle'; c.textAlign = 'center';
      c.fillStyle = '#ff8a3c'; c.fillText('Reddy', w / 2, 44);
      for (let i = 0; i < 5; i++) {
        const x = 120 + i * 62, y = 110 + Math.abs(2 - i) * 10;
        c.fillStyle = '#eef3f7'; rr(c, x, y, 64, 150 - Math.abs(2 - i) * 10, 18); c.fill();
        c.fillStyle = '#c62b35'; c.font = 'bold 13px Arial'; c.save(); c.translate(x + 34, y + 80); c.rotate(-Math.PI / 2);
        c.textAlign = 'center'; c.fillText('ReddyIce', 0, 0); c.restore();
      }
      c.fillStyle = 'rgba(210,235,255,0.85)'; for (let i = 0; i < 8; i++) c.fillRect(90 + i * 46, 262 + (i % 2) * 8, 18, 16);
    }),
    'geek-bar': ctex(W, H, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h, 20, w / 2, h / 2, w * 0.7); g.addColorStop(0, '#3a5cc8'); g.addColorStop(0.5, '#151a4a'); g.addColorStop(1, '#05060f');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 60; i++) c.fillRect((i * 151) % w, (i * 67) % h, 2, 2);
      c.fillStyle = '#ffffff'; c.font = 'bold 30px Arial'; c.textAlign = 'left'; c.fillText('GEEK BAR', 26, 46);
      c.font = 'bold 20px Arial'; c.fillText('PULSE X', 26, 74);
      ['#2d7de0', '#d23b2a', '#1f2b33', '#e05a2a', '#2f8f4c', '#7f3fbf'].forEach((col, i) => {
        const x = 70 + i * 66, y = 120 + (i % 2) * 22; c.save(); c.translate(x, y); c.rotate(-0.12 + i * 0.04);
        c.fillStyle = col; rr(c, 0, 0, 48, 130, 12); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)'; rr(c, 8, 16, 32, 40, 6); c.fill(); c.restore();
      });
    }),
    candy: ctex(W, H, (c, w, h) => {
      c.fillStyle = '#1c0f0a'; c.fillRect(0, 0, w, h);
      const wraps = ['#c4161c', '#5a2d14', '#e8731c', '#c4161c', '#3b2416', '#f2c12e', '#8a1218'];
      for (let i = 0; i < 9; i++) {
        c.save(); c.translate(70 + (i % 5) * 92, 70 + Math.floor(i / 5) * 110 + (i % 2) * 18); c.rotate(-0.5 + (i * 0.37) % 1);
        c.fillStyle = wraps[i % wraps.length]; c.fillRect(-60, -18, 120, 36);
        c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(-36, -6, 72, 12); c.restore();
      }
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(150, 268, 210, 6);
    }),
    'vape-art': ctex(W, H, (c, w, h) => {
      c.fillStyle = '#d9e7e2'; c.fillRect(0, 0, w, h * 0.62);
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#a2774f' : '#b48659'; c.fillRect(0, h * 0.62 + i * 20, w, 20); }
      ['#2fa6a0', '#c24b3a', '#7a5a3c', '#2fa6a0'].forEach((col, i) => { // product boxes on the deck
        const x = 70 + i * 100, y = 70 + (i % 2) * 14; c.fillStyle = col; c.fillRect(x, y, 78, 120);
        c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(x + 8, y + 10, 26, 100);
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 6, y + 120, 66, 10);
      });
    })
  };
}

function posterArt(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2fa6e0'); g.addColorStop(0.55, '#f5d65a'); g.addColorStop(1, '#2f9a5a');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#1e7a3a';
  for (const [x, y, s] of [[0, h, 1], [w, h, -1], [0, 40, 1], [w, 60, -1]]) {
    for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + s * (20 + k * 14), y - 30 - k * 18, 60, 12, s * (0.6 - k * 0.25), 0, Math.PI * 2); c.fill(); }
  }
  const outline = (text, x, y, size, fill, stroke = '#1b1b1b', italic = '') => {
    c.font = `${italic}bold ${size}px Arial`; c.lineJoin = 'round'; c.lineWidth = size / 6;
    c.strokeStyle = stroke; c.strokeText(text, x, y); c.fillStyle = fill; c.fillText(text, x, y);
  };
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  outline('SPECIAL', 26, 96, 62, '#e8262f', '#ffe14a', 'italic ');
  outline('VAPE', 26, 176, 84, '#ffffff');
  outline('50K', 26, 262, 92, '#ffd21f');
  // vape device on the right
  const dg = c.createLinearGradient(250, 0, 330, 0); dg.addColorStop(0, '#2fd0e0'); dg.addColorStop(0.5, '#6c3fe0'); dg.addColorStop(1, '#e03fa8');
  c.fillStyle = '#151515'; c.fillRect(256, 110, 72, 40); c.fillStyle = dg; c.fillRect(256, 150, 72, 140);
  c.fillStyle = '#e8262f'; c.beginPath();
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 70 : 92; c.lineTo(w / 2 + Math.cos(a) * r * 1.7, 370 + Math.sin(a) * r * 0.62); }
  c.fill();
  c.textAlign = 'center'; outline('Starting', w / 2, 338, 34, '#ffffff', '#b0141c', 'italic ');
  outline('$9.99+', w / 2, 400, 64, '#ffffff', '#5a0a0e');
  c.fillStyle = '#123'; c.beginPath(); c.arc(w / 2, h - 66, 54, 0, Math.PI * 2); c.fill();
}
