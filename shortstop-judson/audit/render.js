// Render stills from the 3D model with the viewer's UI hidden (used for renders/).
// usage (serve the folder on :8080): node render.js <outdir> <width> <height> <scale> '[{"name":"...", "view":"front" | "item":"ovens" | "cam":[[x,y,z],[x,y,z]]}]'
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const [, , OUT, W, H, DSF, SHOTS] = process.argv;
const BASE = process.env.BASE || 'http://127.0.0.1:8080/';
const T = 600000;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +DSF })).newPage();
  page.setDefaultTimeout(T);
  await page.goto(BASE + '?debug&nodyn&capture#3d');
  await page.waitForFunction(() => window.__k3dReady, null, { polling: 500 });
  await page.addStyleTag({ content: '.k3d-stage::after{display:none!important}.k3d-status{display:none!important}' });
  await page.evaluate(() => document.getElementById('k3d').classList.add('capture'));
  const idle = () => page.waitForFunction(() => !window.__k3d.K.tween && !window.__k3d.K.needs, null, { polling: 250 });
  await page.waitForTimeout(800); await idle();
  for (const s of JSON.parse(SHOTS)) {
    const t0 = Date.now();
    await page.evaluate((s) => {
      const k = window.__k3d, K = k.K;
      if (s.view) K.setView(s.view, true);
      else if (s.item) K.select(s.item, true);
      else if (s.cam) { K.tween = null; k.camera.position.set(...s.cam[0]); k.controls.target.set(...s.cam[1]); k.controls.update(); }
      if (s.fov) { k.camera.fov = s.fov; k.camera.updateProjectionMatrix(); }
      K.needs = true;
    }, s);
    await idle();
    // no selection outline in a still
    await page.evaluate(() => { const k = window.__k3d; k.scene.traverse((o) => { if (o.isLineSegments && o.material && o.material.color && o.material.color.getHex() === 0xeebe54) o.visible = false; }); k.K.needs = true; });
    await idle(); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, s.name + '.png') });
    const cam = await page.evaluate(() => [window.__k3d.camera.position.toArray().map((v) => +v.toFixed(2)), window.__k3d.controls.target.toArray().map((v) => +v.toFixed(2)), window.__k3d.camera.fov]);
    console.log(s.name, 'in', Date.now() - t0, 'ms', JSON.stringify(cam));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
