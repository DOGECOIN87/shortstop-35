import * as THREE from '../vendor/three.module.js';
import { BLOCK_TILE, blockWall } from './block-wall.js';

// FoodMart storefront rebuilt from the owner's two night photos (Nov 2026):
// split-face grey block pier with the emergency pump shut-off, vape poster,
// fire-extinguisher cabinet and square trash can beside the Amazon Hub locker;
// clear-anodised storefront with decal kick panels (Reddy Ice, Geek Bar, candy,
// vape art), single entry door, maroon fascia with a white LED strip and
// "FoodMart" lettering, and orange flexible delineators along the curb.
//
// Everything is in the detailed Blender model's store frame: the glTF root
// turned by STOREFRONT.heading, so +X points out of the storefront (toward the
// pumps), +Z runs along it to the south, Y is up. Positions were measured from
// shortstop_detailed.glb; the photo-only dimensions are estimates.
export const STOREFRONT = Object.freeze({
  // The model's store (and its Amazon locker) is turned 2.25 deg in the glTF frame.
  heading: 2 * Math.asin(0.019633694752808857),
  wallX: 10.03,          // face of the block wall (model wall plane ~10.00)
  glassX: 9.9,           // storefront glass plane, recessed like the model's
  floorY: 0.5,           // store floor / sill
  walkY: 0.47,           // sidewalk top at the storefront
  storeZ: [-10.0, 10.2], // north and south corners of the front wall
  pierZ: [-7.4, -5.45],  // block pier between the glazing and the Amazon locker
  glazingZ: [-5.45, 7.42],
  locker: Object.freeze({ x: [10.03, 10.71], y: [0.62, 2.86], z: [-9.72, -7.33] }), // the model's Amazon Hub locker
  doorZ: [0.95, 2.75],  // pair of glass doors (straight-on photo)
  railY: 1.45,           // kick-panel rail (decal panels below, clear glass above)
  ledY: 2.85,            // centre of the LED window signs (straight-on photo)
  headY: 3.5,
  fasciaY: [3.56, 4.98],
  signZ: [-0.95, 4.7],   // red FOODMART sign panel over the doors (straight-on photo)
  // The model's red band on the other three walls (y 4.18-4.98): back wall
  // x -6.39, north wall z -9.90, south wall z 10.14. Sleeved in grey.
  band: Object.freeze({ y: [4.16, 5.0], backX: -6.39, northZ: -9.9, southZ: 10.145 }),
  fasciaDepth: 0.45,     // projects over the walk; LED strip on its front edge (photo 6)
  // Bays from the pier southward. `art` names the kick-panel decal in the photos.
  bays: Object.freeze([
    { z: [-5.45, -3.35], art: 'reddy-ice', upper: 'frosted' },  // milky green film (photos 4, 5)
    { z: [-3.35, -1.7], art: 'geek-bar' },
    { z: [-1.7, -0.15], art: 'candy', upper: 'blinds' },        // horizontal blinds (photos 5, 6)
    { z: [-0.15, 0.95], art: 'vape-art', neon: true },
    // South of the door: LED letter signs across the top of the glass.
    { z: [2.75, 3.92], art: 'tint', led: 'DELTA 8' },
    { z: [3.92, 5.09], art: 'tint', led: '10THC' },
    { z: [5.09, 6.25], art: 'tint', led: 'E-CIGS' },
    { z: [6.25, 7.42], art: 'tint', led: 'CBD' }
  ]),
  // Model parts replaced here: [x0, y0, z0, x1, y1, z1] in this frame.
  cutBoxes: Object.freeze([
    [9.6, 0.49, -7.45, 10.15, 3.6, 7.46],    // black mullions, door and glass
    [10.075, 3.9, -6.5, 10.6, 4.9, 6.5],     // raised "SHORT STOP" letters on the old fascia
    [10.6, 0.49, -0.5, 11.7, 1.6, 1.0],      // red-lid bins (not in the photos)
    [10.6, 0.49, 2.2, 11.7, 1.6, 3.6]
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
// each onto the model's actual walk surface (the walk is not level).
export function settleOnWalk(group, heightAt) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3(), c = new THREE.Vector3();
  group.traverse(o => {
    if (!o.userData.onWalk) return;
    box.setFromObject(o).getCenter(c);
    if (group.parent) group.parent.worldToLocal(c); // heights are asked in the glTF root's frame
    const y = heightAt(c.x, c.z, o);
    if (Number.isFinite(y)) o.position.y += y - S.walkY;
  });
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
  // The band around the store is now solid grey (owner, Nov 2026); red remains
  // only on the FOODMART sign panel over the doors.
  const solid = col => ctex(4, 4, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); });
  const fasciaMat = std(0x9fa3a6, 0.7, 0.1);

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
  blindsTex.repeat.set(1, 6);
  const blindsMat = std(0xffffff, 0.7, 0, { map: blindsTex });
  const tint = std(0x1a2226, 0.35, 0.2);
  for (const bay of S.bays) {
    const [z0, z1] = bay.z, w = z1 - z0 - 0.06, zc = (z0 + z1) / 2;
    box('Kick-rail', [fx0, S.railY - 0.03, z0, fx1, S.railY + 0.03, z1], aluminium, frame);
    const upH = S.headY - 0.09 - S.railY - 0.03, upY = (S.railY + 0.03 + S.headY - 0.09) / 2;
    face('Upper-glass', w, upH, bay.upper === 'frosted' ? frosted : glass, S.glassX + 0.01, upY, zc);
    if (bay.upper === 'blinds') {
      const bh = upH * 0.72; // blinds drawn about three-quarters down
      face('Window-blinds', w - 0.02, bh, blindsMat, S.glassX - 0.03, S.headY - 0.09 - bh / 2, zc);
    }
    const lowH = S.railY - 0.03 - S.floorY - 0.06;
    const lowMat = bay.art === 'tint' ? tint : std(0xffffff, 0.35, 0.05, { map: art[bay.art] });
    face(`Kick-panel-${bay.art}`, w, lowH, lowMat, S.glassX, S.floorY + 0.06 + lowH / 2, zc);
    face('Kick-glass', w, lowH, glass, S.glassX + 0.012, S.floorY + 0.06 + lowH / 2, zc);
  }
  // Alarm-company sticker in the Reddy Ice bay's corner (photo 2).
  const aegis = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), std(0xf08a1c, 0.5));
  aegis.rotation.y = Math.PI / 2; aegis.position.set(S.glassX + 0.02, S.railY + 0.13, S.bays[0].z[0] + 0.12);
  add(aegis, 'Alarm-sticker');

  // "OPEN" neon hung in the glass beside the door.
  const neonBay = S.bays.find(b => b.neon);

  // LED letter signs hung behind the upper glass (CBD, E-CIGS, 10THC, DELTA 8).
  // Only round LED dots of the drawn lettering are kept.
  const ledSign = draw => ctex(512, 192, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.save(); c.translate(w / 2, h / 2); c.scale(1.25, 1.25); c.translate(-w / 2, -64); draw(c, w, 128); c.restore();
    c.globalCompositeOperation = 'destination-in'; c.beginPath();
    for (let y = 3; y < h; y += 6) for (let x = 3; x < w; x += 6) { c.moveTo(x + 2.6, y); c.arc(x, y, 2.6, 0, Math.PI * 2); }
    c.fill(); c.globalCompositeOperation = 'source-over';
  });
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
      ledText(c, "10THC", w * 0.6, h / 2 + 4, "#35e05a", 84);
    },
    'DELTA 8': (c, w, h) => ledText(c, 'DELTA 8', w / 2, h / 2 + 4, '#e8f6ff', 84)
  };
  // Sized and placed from the straight-on photo: letters fill most of each
  // window's width, centred about 0.6 m below the window head (y ~2.9 m), level
  // with the top of the LED screen. LED boards are lit day and night.
  for (const bay of S.bays.filter(b => b.led)) {
    const tex = ledSign(ledArt[bay.led]);
    const m = std(0xffffff, 0.5, 0, { map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.1, transparent: true, alphaTest: 0.2 });
    const zc = (bay.z[0] + bay.z[1]) / 2, w = bay.z[1] - bay.z[0] - 0.1;
    face(`LED-sign-${bay.led}`, w, 0.55, m, S.glassX - 0.04, S.ledY, zc);
    face('LED-sign-backing', w, 0.55, std(0x050506, 0.9), S.glassX - 0.06, S.ledY, zc);
  }

  // Big LED "OPEN" sign high in the glass beside the door (photos 5, 6): blue
  // "OP", red-and-white striped "EN", lit day and night.
  const openTex = ledSign((c, w) => {
    c.font = 'bold 104px Arial'; c.textBaseline = 'middle'; c.textAlign = 'right';
    c.fillStyle = '#3d4dff'; c.fillText('OP', w / 2 + 6, 68);
    c.save(); c.beginPath(); c.rect(w / 2 + 6, 0, w, 128); c.clip();
    c.textAlign = 'left'; c.fillStyle = '#ff2a3a'; c.fillText('EN', w / 2 + 6, 68);
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#ffffff';
    for (let y = 22; y < 120; y += 24) c.fillRect(w / 2, y, w, 10);
    c.restore();
  });
  const openMat = std(0xffffff, 0.5, 0, { map: openTex, emissive: 0xffffff, emissiveMap: openTex, emissiveIntensity: 1.2, transparent: true, alphaTest: 0.2 });
  const openZ = (neonBay.z[0] + neonBay.z[1]) / 2, openW = neonBay.z[1] - neonBay.z[0] - 0.12;
  face('Open-sign', openW, 0.5, openMat, S.glassX - 0.04, S.headY - 0.42, openZ);
  face('Open-sign-backing', openW, 0.5, std(0x050506, 0.9), S.glassX - 0.06, S.headY - 0.42, openZ);

  // LED video screen on the south block wall ("Fifty Bar vapes $19.99").
  const screenTex = ctex(384, 256, (c, w, h) => {
    for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#f2f2f2' : '#c8202c'; c.fillRect(0, i * h / 13, w, h / 13 + 1); }
    c.fillStyle = '#1f3a8a'; c.fillRect(0, 0, w * 0.42, h * 7 / 13);
    c.fillStyle = '#ffffff'; for (let i = 0; i < 20; i++) c.fillRect(10 + (i % 5) * 30, 10 + Math.floor(i / 5) * 30, 5, 5);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, w, h);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#101010';
    for (const [t, y, size, col] of [['FIFTY BAR VAPES', 64, 40, '#ffffff'], ['$19.99', 132, 62, '#ffd21f'], ['NOW AVAILABLE', 200, 40, '#ffffff']]) {
      c.font = `bold ${size}px Arial`; c.strokeText(t, w / 2, y); c.fillStyle = col; c.fillText(t, w / 2, y);
    }
  });
  // Centred on the block wall between the glazing and the south corner.
  const screenZ = (S.glazingZ[1] + S.storeZ[1]) / 2, [sy0, sy1] = [1.98, 2.86];
  box('LED-screen-housing', [S.wallX, sy0, screenZ - 0.66, S.wallX + 0.09, sy1, screenZ + 0.66], std(0x0c0c0e, 0.5, 0.3));
  // Screens are lit day and night, independent of the sign-lighting presets.
  face('LED-screen', 1.2, sy1 - sy0 - 0.1, std(0xffffff, 0.4, 0, { map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.85 }),
    S.wallX + 0.092, (sy0 + sy1) / 2, screenZ);

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
  // Transom with the street number above the door (photo 1).
  box('Door-head', [fx0, doorTop + 0.05, dz0, fx1, doorTop + 0.11, dz1], aluminium, frame);
  face('Transom-glass', dw - 0.06, S.headY - 0.09 - doorTop - 0.11, glass, S.glassX + 0.01, (doorTop + 0.11 + S.headY - 0.09) / 2, (dz0 + dz1) / 2);
  const numTex = ctex(256, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = 'bold 70px Arial';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1185', w / 2, h / 2 + 4);
  });
  face('Street-number', 0.5, 0.18, std(0xffffff, 0.5, 0, { map: numTex, transparent: true, alphaTest: 0.3 }),
    S.glassX + 0.025, doorTop + 0.32, (dz0 + dz1) / 2);
  const mat = box('Entry-mat', [S.wallX + 0.05, S.walkY, dz0 + 0.05, S.wallX + 0.85, S.walkY + 0.015, dz1 - 0.05], std(0x1b1d1f, 0.95));
  mat.castShadow = false; mat.userData.onWalk = true;

  // ---------- fascia, LED strip and lettering ----------
  const [fy0, fy1] = S.fasciaY, fxOut = S.wallX - 0.03 + S.fasciaDepth;
  box('Fascia', [S.wallX - 0.03, fy0, S.storeZ[0] - 0.03, fxOut, fy1, S.storeZ[1] + 0.03], fasciaMat);
  box('Fascia-cap', [S.wallX - 0.03, fy1, S.storeZ[0] - 0.05, fxOut + 0.03, fy1 + 0.04, S.storeZ[1] + 0.05], std(0x2a2c2e, 0.6, 0.3));
  const led = glowMat(solid('#ffffff')); led.color.set(0xeef2f4);
  box('Fascia-soffit', [S.wallX - 0.03, fy0 - 0.02, S.storeZ[0] - 0.03, fxOut, fy0, S.storeZ[1] + 0.03], std(0xd8dadb, 0.6, 0.1));
  box('LED-light-strip', [fxOut - 0.1, fy0 - 0.07, S.storeZ[0], fxOut, fy0 - 0.02, S.storeZ[1]], led);
  box('Head-flashing', [S.glassX - 0.05, S.headY, gz0, S.wallX, fy0 - 0.06, gz1], aluminium);
  // Grey sleeves over the model's red band on the north, south and back walls.
  const B = S.band, sleeve = 0.03;
  box('Band-sleeve-north', [B.backX - sleeve, B.y[0], B.northZ - sleeve - 0.005, S.wallX, B.y[1], B.northZ - 0.005], fasciaMat);
  box('Band-sleeve-south', [B.backX - sleeve, B.y[0], B.southZ + 0.005, S.wallX, B.y[1], B.southZ + sleeve + 0.005], fasciaMat);
  box('Band-sleeve-back', [B.backX - sleeve - 0.005, B.y[0], B.northZ - sleeve - 0.005, B.backX - 0.005, B.y[1], B.southZ + sleeve + 0.005], fasciaMat);
  // Continue the photographed split-face wall finish around the three opaque
  // sides of the building; the front remains the detailed storefront.
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
  // The gray projecting border is continuous around the roofline, with a
  // recessed cool-white LED edge on every side instead of only at the front.
  const borderY = B.y[1] + 0.008, borderH = 0.055, borderDepth = 0.16;
  const borderMat = std(0x777c80, 0.5, 0.35);
  const borderGlow = glowMat(solid('#eef4f7'));
  box('Roofline-border-front', [S.wallX - borderDepth, borderY, S.storeZ[0] - 0.08, S.wallX + 0.03, borderY + borderH, S.storeZ[1] + 0.08], borderMat);
  box('Roofline-border-back', [B.backX - 0.03, borderY, B.northZ - 0.08, B.backX + borderDepth, borderY + borderH, B.southZ + 0.08], borderMat);
  box('Roofline-border-north', [B.backX - 0.03, borderY, B.northZ - borderDepth, S.wallX + 0.03, borderY + borderH, B.northZ + 0.03], borderMat);
  box('Roofline-border-south', [B.backX - 0.03, borderY, B.southZ - 0.03, S.wallX + 0.03, borderY + borderH, B.southZ + borderDepth], borderMat);
  box('Roofline-light-front', [S.wallX - borderDepth - 0.01, borderY - 0.035, S.storeZ[0], S.wallX - borderDepth + 0.02, borderY, S.storeZ[1]], borderGlow);
  box('Roofline-light-back', [B.backX + borderDepth - 0.02, borderY - 0.035, B.northZ, B.backX + borderDepth + 0.01, borderY, B.southZ], borderGlow);
  box('Roofline-light-north', [B.backX, borderY - 0.035, B.northZ - borderDepth - 0.01, S.wallX, borderY, B.northZ - borderDepth + 0.02], borderGlow);
  box('Roofline-light-south', [B.backX, borderY - 0.035, B.southZ + borderDepth - 0.02, S.wallX, borderY, B.southZ + borderDepth + 0.01], borderGlow);
  // Red sign panel: silver italic FOODMART with the big "M", and the Texaco roundel.
  const [sz0, sz1] = S.signZ, sw = sz1 - sz0, py0s = fy0 + 0.08, py1s = fy1 - 0.12;
  box('Sign-panel-red', [fxOut, py0s, sz0, fxOut + 0.05, py1s, sz1], std(0xc41c2a, 0.5, 0.1));
  const signTex = ctex(1536, 256, (c, w, h) => {
    c.fillStyle = '#c41c2a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#9e1420'; c.fillRect(14, 14, w * 0.8, h - 28);            // darker inset behind the name
    const silver = c.createLinearGradient(0, 40, 0, 220);
    silver.addColorStop(0, '#ffffff'); silver.addColorStop(0.5, '#c9cdd1'); silver.addColorStop(1, '#f4f5f6');
    c.save(); c.transform(1, 0, -0.28, 1, 40, 0);                           // italic slant
    c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.strokeStyle = '#4a0a10'; c.lineWidth = 8;
    const word = (t, x, y, size) => { c.font = `900 ${size}px Arial`; c.strokeText(t, x, y); c.fillStyle = silver; c.fillText(t, x, y); return c.measureText(t).width; };
    let x = 120; x += word('FOOD', x, 150, 120) - 6;
    x += word('M', x, 212, 205) - 4; word('ART', x, 212, 120);
    c.restore();
    const cx = w * 0.9, cy = h / 2;                                         // Texaco roundel
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx, cy, 104, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c41c2a'; c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, 92, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#c41c2a'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 30 : 76; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    c.fill();
    c.fillStyle = '#ffffff'; c.font = '900 70px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('T', cx, cy + 6);
  });
  face('FoodMart-lettering', sw - 0.04, py1s - py0s - 0.04, glowMat(signTex), fxOut + 0.052, (py0s + py1s) / 2, (sz0 + sz1) / 2);

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
  // Open-front white cabinet with the extinguisher (photo 2).
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
  // Framed vape poster with the Short Stop roundel.
  const posterTex = ctex(360, 540, posterArt);
  const pz = d(1.1), py0 = 1.83, py1 = 2.95, pw = 0.73;
  box('Poster-frame', [S.wallX, py0, pz - pw / 2, S.wallX + 0.025, py1, pz + pw / 2], std(0xdfe2e3, 0.3, 0.6), pier);
  face('Vape-poster', pw - 0.05, py1 - py0 - 0.05, std(0xffffff, 0.45, 0, { map: posterTex }), S.wallX + 0.027, (py0 + py1) / 2, pz, pier);
  if (logoMap) {
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), std(0xffffff, 0.5, 0, { map: logoMap }));
    logo.rotation.y = Math.PI / 2; logo.position.set(S.wallX + 0.03, py0 + 0.13, pz); add(logo, 'Poster-logo', pier);
  }
  // Square taupe receptacles (photo 4): body flaring slightly to the top, an
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
  const southSidewalkBlock = receptacle(S.wallX + 0.4, S.glazingZ[1] + 0.55, group); // south end, by the block wall (photo 6)
  southSidewalkBlock.visible = false;

  // Two security cameras on the top course of the pier with a cable between (photo 4).
  const camMat = std(0xe8e9e8, 0.5, 0.1);
  for (const dist of [0.15, 1.85]) {
    box('Camera-mount', [S.wallX, 3.38, d(dist) - 0.04, S.wallX + 0.05, 3.46, d(dist) + 0.04], camMat, pier);
    const cam = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), camMat);
    cam.rotation.z = -Math.PI / 2; cam.position.set(S.wallX + 0.05, 3.42, d(dist)); add(cam, 'Security-camera', pier);
  }
  box('Camera-cable', [S.wallX, 3.44, d(1.85), S.wallX + 0.012, 3.452, d(0.15)], std(0xf0f0ee, 0.6), pier);

  // A-frame sidewalk sign by the door (photo 1).
  // A-frame by the door carries the same "Special Vape 50K" poster (photo 6).
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

  // ---------- Amazon Hub locker graphics (photo 4) ----------
  // The model's locker is a plain black box at x 10.03-10.70, z -9.72..-7.33,
  // y 0.62-2.86; dress its front and south side as the real slate-blue locker.
  const L = S.locker, lw = L.z[1] - L.z[0], lh = L.y[1] - L.y[0];
  const lockerTex = ctex(1024, 960, (c, w, h) => {
    c.fillStyle = '#3c4654'; c.fillRect(0, 0, w, h);
    const kioskX = w * 0.78;
    // door grid
    c.strokeStyle = '#262d37'; c.lineWidth = 5;
    const cols = [0, 0.27, 0.53, kioskX / w];
    for (let k = 0; k < cols.length - 1; k++) {
      const x0 = cols[k] * w + 6, x1 = cols[k + 1] * w - 6;
      const rows = k === 0 ? [0, 0.16, 0.38, 0.52, 0.68, 0.84, 1] : [0, 0.12, 0.24, 0.33, 0.42, 0.52, 0.62, 0.74, 0.86, 1];
      for (let r = 0; r < rows.length - 1; r++) c.strokeRect(x0, rows[r] * h + 6, x1 - x0, (rows[r + 1] - rows[r]) * h - 12);
    }
    // kiosk column: screen, card reader and scanner
    c.fillStyle = '#323a46'; c.fillRect(kioskX + 4, 0, w - kioskX - 4, h);
    c.fillStyle = '#1b2028'; c.fillRect(kioskX + 30, h * 0.36, w - kioskX - 60, h * 0.16);
    c.fillStyle = '#d9f1ff'; c.fillRect(kioskX + 44, h * 0.38, w - kioskX - 88, h * 0.12);
    c.fillStyle = '#111'; c.fillRect(kioskX + 60, h * 0.55, w - kioskX - 120, h * 0.07);
    c.fillStyle = '#e83a2a'; c.fillRect(kioskX + 100, h * 0.575, 26, 8);
    // logo and the big white message
    c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.font = 'bold 72px Arial'; c.fillText('amazon', 34, 118);
    c.strokeStyle = '#58a6e8'; c.lineWidth = 7; c.beginPath(); c.moveTo(48, 136); c.quadraticCurveTo(150, 168, 262, 132); c.stroke();
    c.font = '400 108px Arial';
    ['Order at', 'Amazon,', 'pick up', 'here'].forEach((t, i) => c.fillText(t, 30, 380 + i * 132));
  });
  face('Amazon-locker-front', lw, lh, std(0xffffff, 0.55, 0.15, { map: lockerTex }), L.x[1] + 0.012, (L.y[0] + L.y[1]) / 2, (L.z[0] + L.z[1]) / 2);
  const sideTex = ctex(160, 640, (c, w, h) => {
    c.fillStyle = '#3c4654'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2 + 10, h * 0.62); c.rotate(-Math.PI / 2);
    c.fillStyle = '#ffffff'; c.font = 'bold 64px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('amazon hub', 0, 0);
    c.strokeStyle = '#58a6e8'; c.lineWidth = 6; c.beginPath(); c.moveTo(-150, 36); c.quadraticCurveTo(-40, 62, 70, 30); c.stroke();
    c.restore();
  });
  const side = new THREE.Mesh(new THREE.PlaneGeometry(L.x[1] - L.x[0], lh), std(0xffffff, 0.55, 0.15, { map: sideTex }));
  side.position.set((L.x[0] + L.x[1]) / 2, (L.y[0] + L.y[1]) / 2, L.z[1] + 0.012); add(side, 'Amazon-locker-side');
  // Lit hood across the top front.
  box('Amazon-locker-hood', [L.x[0], L.y[1], L.z[0] - 0.02, L.x[1] + 0.08, L.y[1] + 0.08, L.z[1] + 0.02], std(0x2f3742, 0.5, 0.2));
  const hoodLight = std(0xffffff, 0.4, 0, { emissive: 0xffffff, emissiveIntensity: 1.0 });
  box('Amazon-locker-light', [L.x[1] - 0.02, L.y[1] - 0.012, L.z[0] + 0.05, L.x[1] + 0.07, L.y[1], L.z[1] - 0.05], hoodLight);

  // ---------- orange flexible delineators where the model had bollards ----------
  const orange = std(0xff4a12, 0.45, 0, { emissive: 0x3a0a00 }), band = std(0xf5f5f0, 0.25, 0.2), base = std(0x111111, 0.85);
  for (const [px, py, pz2] of posts) {
    const post = new THREE.Group(); post.name = 'Delineator-post'; post.position.set(px, py, pz2); group.add(post);
    // Black dome base, orange tube, two wide white bands in the upper half (photos 5, 6).
    cyl('Delineator-base', 0.1, 0.17, 0.07, base, 0, 0.035, 0, post, 20);
    cyl('Delineator-tube', 0.042, 0.047, 1.05, orange, 0, 0.6, 0, post, 14);
    for (const by of [0.66, 0.92]) cyl('Delineator-band', 0.049, 0.049, 0.1, band, 0, by, 0, post, 14);
    cyl('Delineator-cap', 0.035, 0.042, 0.03, orange, 0, 1.14, 0, post, 14);
  }
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
      c.font = 'bold 46px Arial'; c.textBaseline = 'middle'; c.textAlign = 'right';
      c.fillStyle = '#e2323c'; c.fillText('Reddy', w / 2 + 38, 44); c.textAlign = 'left'; c.fillStyle = '#9fd0ff'; c.fillText('Ice', w / 2 + 40, 44);
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
      ['#f08a4b', '#6fc2b6', '#f2a7b8', '#e8604c'].forEach((col, i) => {
        const x = 90 + i * 95, y = 60 + (i % 2) * 14; c.fillStyle = col; rr(c, x, y, 58, 150, 14); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 10, y + 150, 38, 10);
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
