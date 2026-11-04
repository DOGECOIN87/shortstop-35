import * as THREE from '../vendor/three.module.js';

// Split-face concrete block finish from the owner's wall photo: a clean
// 2-block x 2-course tile cut from the photo (assets/block-wall-upper.jpg and
// the darker block-wall-lower.jpg), tiled at true size so each block is
// 0.4 m x 0.2 m. The lower courses are painted darker, as on the store and the
// car wash.
export const BLOCK_TILE = Object.freeze({ w: 0.8, h: 0.4 });
export const BLOCK_BAND = 1.1; // darker band height above the walk / pad

export function blockMaterials(loader = new THREE.TextureLoader(), base = './assets/') {
  const tex = name => {
    const t = loader.load(base + name);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const upper = tex('block-wall-upper.jpg'), lower = tex('block-wall-lower.jpg');
  return {
    upper: new THREE.MeshStandardMaterial({ map: upper, bumpMap: upper, bumpScale: 1.2, roughness: 0.95 }),
    lower: new THREE.MeshStandardMaterial({ map: lower, bumpMap: lower, bumpScale: 1.2, roughness: 0.95 })
  };
}

// One vertical wall face from a to b ([x, z]) between heights y0 and y1, facing
// `normal` ([x, z]); `band` is the height of the darker lower courses.
// UVs are in metres / tile size so the blocks stay true to scale on any wall.
export function blockWall(parent, { a, b, y0, y1, normal, band = y0 + BLOCK_BAND, mats, name = 'Block-wall', offset = 0 }) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const out = [];
  const part = (lo, hi, mat, suffix) => {
    if (hi - lo < 0.01) return;
    const g = new THREE.PlaneGeometry(len, hi - lo);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * len / BLOCK_TILE.w, (lo - y0 + uv.getY(i) * (hi - lo)) / BLOCK_TILE.h);
    }
    const m = new THREE.Mesh(g, mat);
    m.name = name + suffix;
    m.rotation.y = Math.atan2(normal[0], normal[1]);
    m.position.set((a[0] + b[0]) / 2 + normal[0] * offset, (lo + hi) / 2, (a[1] + b[1]) / 2 + normal[1] * offset);
    m.receiveShadow = true;
    parent.add(m); out.push(m);
  };
  part(y0, Math.min(band, y1), mats.lower, '-lower');
  part(Math.max(band, y0), y1, mats.upper, '');
  return out;
}
