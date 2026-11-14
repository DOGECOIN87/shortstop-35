import * as THREE from '../vendor/three.module.js';
import { OSM_ROADS } from './osm-roads.js';
import { STOREFRONT } from './storefront.js';

// Post-processing for the 3D page: everything outside the station property is
// blurred (a soft depth-of-field around the lot), with a gentle bloom on lit
// signs and lamps and a light vignette.
//
// The scene renders once into an off-screen target that keeps the page's own
// tone mapping and sRGB output (flagged like an XR target, which three.js
// renders exactly as it renders to the canvas), plus a depth texture. Each
// pixel's ground position is rebuilt from depth and measured against the
// property outline (storefront frame, metres): inside it stays sharp, outside
// it fades into a blurred copy over `feather` metres. The blur is weighted by
// that mask, so sharp buildings on the lot never smear into the background.
// The freeway stays sharp too (owner): I-35's main lanes and bridges and the
// frontage roads either side, as corridors around their OpenStreetMap lines.
export const PROPERTY = Object.freeze({
  // Station property in the storefront frame (+X toward the pumps, +Z south):
  // the frontage lawn along the front, the cross-street side north of the car
  // wash, the hotel drive to the south and the rear drive behind the store
  // (traced from the owner's aerial screenshot).
  outline: Object.freeze([
    [37, -37], [47, -28], [55.5, -10], [57, 2], [53, 19], [43, 31], [33, 38], [16, 40], [2, 34],
    [-9, 28], [-15, 16], [-17, 0], [-15.5, -14], [-6, -24], [2, -37], [12, -47], [22, -46]
  ].map(p => Object.freeze(p))),
  feather: Object.freeze([1.0, 20.0]), // metres outside the line: blur starts .. full
  skyBlur: 0.7,
  desaturate: 0.12,
  vignette: 0.32
});
const MAX_POINTS = 32, MAX_SEGS = 48;

// OSM line (east, north) -> storefront frame [x, z]. The glTF root's frame is
// the local true-north frame (x east, z south; cf. the lidar pylon positions),
// and the storefront frame is that turned by STOREFRONT.heading.
function osmToStore([e, n]) {
  const c = Math.cos(-STOREFRONT.heading), s = Math.sin(-STOREFRONT.heading), z = -n;
  return [e * c + z * s, -e * s + z * c];
}
// Douglas-Peucker: drop points within `tol` metres of the simplified line.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts.at(-1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
  let worst = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - a[0]) * dz - (pts[i][1] - a[1]) * dx) / L;
    if (d > worst) { worst = d; at = i; }
  }
  return worst <= tol ? [a, b] : [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)];
}
// [ax, az, bx, bz, halfWidth] corridors within `range` metres of the store.
export function freewaySegments({ range = 320, tol = 1.5 } = {}) {
  const lines = [
    ['highway', 21],          // both I-35 carriageways (21.7 m apart, 36 m deck)
    ['bridgeNB', 11], ['bridgeSB', 11],
    ['frontage', 8], ['frontageMainline', 8], ['oppositeFrontage', 8]
  ];
  const out = [];
  for (const [key, w] of lines) {
    const pts = simplify(OSM_ROADS[key].map(osmToStore), tol);
    for (let i = 0; i + 1 < pts.length; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      if (Math.min(Math.hypot(...a), Math.hypot(...b)) > range) continue;
      out.push([a[0], a[1], b[0], b[1], w]);
    }
  }
  return out.slice(0, MAX_SEGS);
}
export const FREEWAY = Object.freeze(freewaySegments().map(s => Object.freeze(s)));

// Signed distance (metres, negative inside) from a point to the sharp area:
// the property outline united with the freeway corridors. The shader
// evaluates the same function. Exported for tests.
export function propertyDistance(p, outline = PROPERTY.outline, segs = FREEWAY) {
  let d = outlineDistance(p, outline);
  for (const [ax, az, bx, bz, w] of segs) {
    const ex = bx - ax, ez = bz - az, t = Math.max(0, Math.min(1, ((p[0] - ax) * ex + (p[1] - az) * ez) / (ex * ex + ez * ez)));
    d = Math.min(d, Math.hypot(p[0] - ax - ex * t, p[1] - az - ez * t) - w);
  }
  return d;
}
function outlineDistance([x, z], outline) {
  let d = Infinity, s = 1;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [vix, viz] = outline[i], [vjx, vjz] = outline[j];
    const ex = vjx - vix, ez = vjz - viz, wx = x - vix, wz = z - viz;
    const t = Math.max(0, Math.min(1, (wx * ex + wz * ez) / (ex * ex + ez * ez)));
    const bx = wx - ex * t, bz = wz - ez * t;
    d = Math.min(d, bx * bx + bz * bz);
    const c1 = z >= viz, c2 = z < vjz, c3 = ex * wz > ez * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}
export function blurAmount(point, outline = PROPERTY.outline, [f0, f1] = PROPERTY.feather, segs = FREEWAY) {
  const t = Math.max(0, Math.min(1, (propertyDistance(point, outline, segs) - f0) / (f1 - f0)));
  return t * t * (3 - 2 * t);
}

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
// Ground position from depth -> blur amount (0 sharp .. 1 fully blurred).
const MASK_GLSL = `
uniform sampler2D tDepth;
uniform mat4 invProj, camWorld, storeFromWorld;
uniform vec2 poly[${MAX_POINTS}];
uniform int polyN;
uniform vec4 segs[${MAX_SEGS}];
uniform float segW[${MAX_SEGS}];
uniform int segN;
uniform vec2 feather;
uniform float skyBlur, maskOn;
float sdPoly(vec2 p) {
  float d = 1e20, s = 1.0;
  for (int i = 0; i < ${MAX_POINTS}; i++) {
    if (i >= polyN) break;
    int j = i == 0 ? polyN - 1 : i - 1;
    vec2 vi = poly[i], vj = poly[j];
    vec2 e = vj - vi, w = p - vi;
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bool c1 = p.y >= vi.y, c2 = p.y < vj.y, c3 = e.x * w.y > e.y * w.x;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  float r = s * sqrt(d);
  for (int i = 0; i < ${MAX_SEGS}; i++) {
    if (i >= segN) break;
    vec2 a = segs[i].xy, e = segs[i].zw - a, w = p - a;
    r = min(r, length(w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0)) - segW[i]);
  }
  return r;
}
float blurMask(vec2 uv) {
  if (maskOn < 0.5) return 0.0;
  float z = texture2D(tDepth, uv).x;
  if (z >= 0.99999) return skyBlur;
  vec4 v = invProj * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  v /= v.w;
  vec3 s = (storeFromWorld * (camWorld * v)).xyz;
  return smoothstep(feather.x, feather.y, sdPoly(s.xz));
}`;

function pass(fragmentShader, uniforms) {
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh);
  return { material, scene, uniforms };
}

export function createPostPipeline(renderer, { samples = 4, bloom = true } = {}) {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2(1, 1);
  const depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { samples, depthTexture, depthBuffer: true });
  // Render exactly as to the canvas: tone mapped and sRGB-encoded (see top).
  sceneRT.isXRRenderTarget = true;
  sceneRT.texture.colorSpace = THREE.SRGBColorSpace;
  // Store the already-encoded values as plain RGBA8, matching the multisample
  // buffer three.js allocates for XR-style targets (the resolve needs equal formats).
  sceneRT.texture.internalFormat = 'RGBA8';
  const lowOpts = { type: THREE.HalfFloatType, depthBuffer: false };
  const blurA = new THREE.WebGLRenderTarget(1, 1, lowOpts), blurB = new THREE.WebGLRenderTarget(1, 1, lowOpts);
  const bloomA = new THREE.WebGLRenderTarget(1, 1, lowOpts), bloomB = new THREE.WebGLRenderTarget(1, 1, lowOpts);
  const poly = Array.from({ length: MAX_POINTS }, () => new THREE.Vector2());
  const segs = Array.from({ length: MAX_SEGS }, (_, i) => new THREE.Vector4(...(FREEWAY[i] || [0, 0, 1, 0]).slice(0, 4)));
  const segW = Array.from({ length: MAX_SEGS }, (_, i) => FREEWAY[i] ? FREEWAY[i][4] : 0);
  const maskUniforms = () => ({
    tDepth: { value: depthTexture }, invProj: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
    storeFromWorld: { value: new THREE.Matrix4() }, poly: { value: poly }, polyN: { value: 0 },
    segs: { value: segs }, segW: { value: segW }, segN: { value: FREEWAY.length },
    feather: { value: new THREE.Vector2(...PROPERTY.feather) }, skyBlur: { value: PROPERTY.skyBlur }, maskOn: { value: 0 }
  });
  // 1) quarter-res copy weighted by the blur mask (rgb * m, m)
  const down = pass(MASK_GLSL + `
    uniform sampler2D tColor; uniform vec2 texel; varying vec2 vUv;
    void main(){
      vec4 acc = vec4(0.0);
      for (int k = 0; k < 4; k++) {
        vec2 o = vec2(k == 1 || k == 3 ? 1.0 : -1.0, k >= 2 ? 1.0 : -1.0) * texel;
        float m = blurMask(vUv + o);
        acc += vec4(texture2D(tColor, vUv + o).rgb * m, m);
      }
      gl_FragColor = acc * 0.25;
    }`, { ...maskUniforms(), tColor: { value: sceneRT.texture }, texel: { value: new THREE.Vector2() } });
  // 2) separable 9-tap gaussian on all four channels
  const blur = pass(`
    uniform sampler2D tInput; uniform vec2 dir; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tInput, vUv) * 0.2270270270;
      c += (texture2D(tInput, vUv + dir * 1.3846153846) + texture2D(tInput, vUv - dir * 1.3846153846)) * 0.3162162162;
      c += (texture2D(tInput, vUv + dir * 3.2307692308) + texture2D(tInput, vUv - dir * 3.2307692308)) * 0.0702702703;
      gl_FragColor = c;
    }`, { tInput: { value: null }, dir: { value: new THREE.Vector2() } });
  // 3) bright pass for bloom (lit signs, lamps, neon)
  const bright = pass(`
    uniform sampler2D tColor; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
    void main(){
      vec3 c = vec3(0.0);
      for (int k = 0; k < 4; k++) c += texture2D(tColor, vUv + vec2(k == 1 || k == 3 ? 1.0 : -1.0, k >= 2 ? 1.0 : -1.0) * texel).rgb;
      c *= 0.25;
      float l = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c * smoothstep(threshold, threshold + 0.25, l), 1.0);
    }`, { tColor: { value: sceneRT.texture }, texel: { value: new THREE.Vector2() }, threshold: { value: 0.78 } });
  // 4) composite to the canvas (values are already display-encoded)
  const comp = pass(MASK_GLSL + `
    uniform sampler2D tColor, tBlur, tBloom; uniform float bloomStrength, desaturate, vignette; varying vec2 vUv;
    void main(){
      vec3 sharp = texture2D(tColor, vUv).rgb;
      float m = blurMask(vUv);
      vec4 b = texture2D(tBlur, vUv);
      vec3 blurred = b.a > 0.02 ? b.rgb / b.a : sharp;
      vec3 c = mix(sharp, blurred, m);
      c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), desaturate * m);
      c += texture2D(tBloom, vUv).rgb * bloomStrength;
      float r = length((vUv - 0.5) * vec2(1.0, 0.85)) * 1.45;
      c *= mix(1.0, smoothstep(1.15, 0.25, r), vignette);
      gl_FragColor = vec4(c, 1.0);
    }`, { ...maskUniforms(), tColor: { value: sceneRT.texture }, tBlur: { value: blurA.texture }, tBloom: { value: bloomA.texture },
    bloomStrength: { value: 0.2 }, desaturate: { value: PROPERTY.desaturate }, vignette: { value: PROPERTY.vignette } });
  const masked = [down.uniforms, comp.uniforms];

  let storeFromWorld = null;
  const api = {
    sceneTarget: sceneRT,
    // world -> storefront frame; null turns the property blur off
    setPropertyFrame(matrix, outline = PROPERTY.outline) {
      storeFromWorld = matrix;
      for (const u of masked) {
        u.maskOn.value = matrix ? 1 : 0;
        if (matrix) u.storeFromWorld.value.copy(matrix);
        u.polyN.value = Math.min(MAX_POINTS, outline.length);
      }
      outline.slice(0, MAX_POINTS).forEach(([x, z], i) => poly[i].set(x, z));
    },
    setBloom(strength) { comp.uniforms.bloomStrength.value = bloom ? strength : 0; },
    setSize(width, height) {
      size.set(Math.max(1, width), Math.max(1, height));
      sceneRT.setSize(size.x, size.y);
      const qw = Math.max(1, Math.round(size.x / 4)), qh = Math.max(1, Math.round(size.y / 4));
      for (const t of [blurA, blurB, bloomA, bloomB]) t.setSize(qw, qh);
      down.uniforms.texel.value.set(1 / size.x, 1 / size.y);
      bright.uniforms.texel.value.set(1 / size.x, 1 / size.y);
    },
    render(scene, camera) {
      for (const u of masked) { u.invProj.value.copy(camera.projectionMatrixInverse); u.camWorld.value.copy(camera.matrixWorld); }
      const prev = renderer.getRenderTarget(), auto = renderer.autoClear;
      renderer.setRenderTarget(sceneRT); renderer.render(scene, camera);
      renderer.autoClear = true;
      const run = (p, target) => { renderer.setRenderTarget(target); renderer.render(p.scene, cam); };
      const gauss = (src, tmp, passes) => {
        const qx = 1 / src.width, qy = 1 / src.height;
        for (let i = 0; i < passes; i++) {
          blur.uniforms.tInput.value = src.texture; blur.uniforms.dir.value.set(qx * (1 + i), 0); run(blur, tmp);
          blur.uniforms.tInput.value = tmp.texture; blur.uniforms.dir.value.set(0, qy * (1 + i)); run(blur, src);
        }
      };
      if (storeFromWorld) { run(down, blurA); gauss(blurA, blurB, 2); }
      if (bloom && comp.uniforms.bloomStrength.value > 0) { run(bright, bloomA); gauss(bloomA, bloomB, 2); }
      run(comp, prev);
      renderer.autoClear = auto;
    },
    dispose() { for (const t of [sceneRT, blurA, blurB, bloomA, bloomB]) t.dispose(); depthTexture.dispose(); }
  };
  api.setPropertyFrame(null);
  return api;
}
