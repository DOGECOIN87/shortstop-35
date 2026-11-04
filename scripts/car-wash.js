import * as THREE from '../vendor/three.module.js';
import { BLOCK_TILE } from './block-wall.js';

// Car wash dressing over the detailed Blender model, from the owner's night
// photos: split-face block walls (light above a darker lower band), a light
// grey fascia with a white LED strip under it, the red "CarWash" sign, the
// "WE APPRECIATE YOUR BUSINESS" banner, two blue posters, a steel service
// door, hose outlets and red stamped pads at the wall base.
//
// Frame: the model's car wash turned by WASH.heading in the glTF root (measured
// from shortstop_detailed.glb). Local +X faces the store (the banner side),
// -Z runs from the ENTER end (z -15.2) to the far end (z -29.0).
export const WASH = Object.freeze({
  heading: -0.677,
  x: [-17.82, -9.88],     // west and east (door side) wall faces
  z: [-29.0, -15.2],      // far end and ENTER end
  wallTop: 4.0,
  fascia: [3.4, 4.8],
  // Model parts replaced here (wash frame): door, window and red stripes on
  // the east wall, which stand proud of the new block face.
  cutBoxes: Object.freeze([
    [-9.93, 0.4, -29.1, -9.5, 3.95, -15.1],   // east wall door, red stripes
    [-9.93, 1.2, -29.1, -9.0, 3.3, -15.1],    // east wall window
    [-9.95, 3.3, -30.0, -8.6, 4.95, -14.2],   // red fascia, east
    [-19.2, 3.3, -30.0, -17.75, 4.95, -14.2], // red fascia, west
    [-19.2, 3.3, -30.2, -8.6, 4.95, -28.9],   // red fascia, far end
    [-19.2, 3.3, -15.3, -8.6, 4.95, -14.0]    // red fascia, ENTER end
  ]),
  door: Object.freeze({ x: -11.0, width: 0.92, height: 2.14 }), // service door on ENTER end
  partialWallWidth: 2.2,  // end wall beside the grass; leave the wash bay open
  // Narrow grass strip alongside the car-wash approach, in the wash frame.
  approachPaving: Object.freeze({ x: [-19.6, -13.9], z: [-15.0, 2.0] }),
  banner: { z: -21.6, y: 2.55, w: 4.7, h: 0.44 },
  posters: [-25.4, -26.7],
  pads: [[-19.7, -16.5], [-25.6, -22.4]], // red stamped pads along the east wall
  hoses: [[-18.6, 0.55], [-19.1, 0.55], [-25.0, 1.0], [-25.4, 1.0]]
});

const W = WASH;

export function buildCarWash({ ctex, glowMat, mats, pavementMaterial, groundAt = () => 0.7 }) {
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
  // A panel on the east face (+X), reading left (ENTER end) to right.
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

  // Partial ENTER-end wall at the owner-marked grass corner. Frame the door
  // with masonry rather than spanning the bay with a new full-width wall.
  const doorBase = ground(W.door.x, zn + 0.5);
  const doorLeft = W.door.x-W.door.width/2, doorRight = W.door.x+W.door.width/2;
  wall('Wash-enter-wall-left', xe-W.partialWallWidth, zn-thickness, doorLeft, zn+0.05);
  wall('Wash-enter-wall-right', doorRight, zn-thickness, xe, zn+0.05);
  wall('Wash-enter-wall-lintel', doorLeft, zn-thickness, doorRight, zn+0.05,
    doorBase+W.door.height+0.06);

  // Replace the marked narrow approach strip with concrete. Sample the
  // existing terrain at both sides, interpolating across it so the new slab
  // follows the grade rather than a single flat elevated rectangle.
  const P = W.approachPaving;
  const pavementMat = pavementMaterial || std(0xaaa9a5, 1, 0, { polygonOffset: true, polygonOffsetFactor: -2 });
  const vertices = [], uvs = [], indices = [], rows = 34, cols = 8;
  for (let j=0; j<=rows; j++) {
    const z=P.z[0]+(P.z[1]-P.z[0])*j/rows;
    const left=ground(P.x[0]-0.4,z), right=ground(P.x[1]+0.4,z);
    for (let i=0; i<=cols; i++) {
      const t=i/cols, x=P.x[0]+(P.x[1]-P.x[0])*t;
      vertices.push(x, left*(1-t)+right*t+0.17, z);
      uvs.push(x/3, z/3);
      if (i<cols && j<rows) {
        const a=j*(cols+1)+i, b=a+cols+1;
        indices.push(a,b,a+1,b,b+1,a+1);
      }
    }
  }
  const pavingGeometry = new THREE.BufferGeometry();
  pavingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  pavingGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  pavingGeometry.setIndex(indices); pavingGeometry.computeVertexNormals();
  add(new THREE.Mesh(pavingGeometry, pavementMat), 'Wash-approach-pavement');

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

  // Steel service door relocated to the ENTER end (+Z), no side-wall door.
  const frameMat = std(0x8e9396, 0.5, 0.4);
  box('Wash-door-frame-left', [doorLeft-0.06,doorBase,zn+0.055,doorLeft,doorBase+W.door.height+0.06,zn+0.10], frameMat);
  box('Wash-door-frame-right', [doorRight,doorBase,zn+0.055,doorRight+0.06,doorBase+W.door.height+0.06,zn+0.10], frameMat);
  box('Wash-door-frame-top', [doorLeft,doorBase+W.door.height,zn+0.055,doorRight,doorBase+W.door.height+0.06,zn+0.10], frameMat);
  box('Wash-door', [doorLeft,doorBase,zn+0.055,doorRight,doorBase+W.door.height,zn+0.11], std(0xa7acae, 0.45, 0.35));
  box('Wash-door-handle', [doorRight-0.18,doorBase+0.98,zn+0.11,doorRight-0.06,doorBase+1.02,zn+0.16], std(0x5d6063, 0.3, 0.8));

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

  // Red stamped-brick pads along the east wall base, laid on the real slope.
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
    const x0 = xe + 0.06, x1 = xe + 1.35;
    const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [x, ground(x, z) + 0.015, z]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1.3 / 0.8, 0, 1.3 / 0.8, (z1 - z0) / 0.8, 0, (z1 - z0) / 0.8], 2));
    geo.setIndex([0, 2, 1, 0, 3, 2]); geo.computeVertexNormals();
    const pad = new THREE.Mesh(geo, padMat); pad.name = 'Wash-red-pad'; pad.receiveShadow = true; g.add(pad);
  }
  return g;
}
