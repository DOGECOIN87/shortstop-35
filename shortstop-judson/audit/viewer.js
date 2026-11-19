// 3D viewer audit: open, keyboard and focus, views, list, hotspots, value tour (STOPS=0,3,8 to
// sample stops), end card, rotation, deep links, no-WebGL. Software rendering is slow: give it time.
// usage: node viewer.js <outdir> <p390|l844|t820|d1366|...> [steps,comma] [browser]
const path = require('path'), fs = require('fs');
// Playwright from this folder's node_modules, or a global install
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const [, , OUT = 'out3d', VPN = 'p390', STEPS = 'open,keys,views,list,spot,tour,end,rotate', BROWSER = 'chromium'] = process.argv;
const BASE = process.env.BASE || 'http://127.0.0.1:8080/';
const VPS = {
  p390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  p360: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
  l844: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
  l667: { viewport: { width: 667, height: 375 }, isMobile: true, hasTouch: true },
  t820: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
  t1180: { viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true },
  d1366: { viewport: { width: 1366, height: 768 } },
  d1920: { viewport: { width: 1920, height: 1080 } }
};
const steps = STEPS.split(',');
const dir = path.join(OUT, VPN); fs.mkdirSync(dir, { recursive: true });
const T = 300000;
const log = (...a) => console.log(`[${VPN}]`, ...a);
const waitIdle = (page, extra = 600) => page.waitForFunction(() => window.__k3d && !window.__k3d.K.tween && !window.__k3d.K.needs, null, { timeout: T, polling: 200 }).then(() => page.waitForTimeout(extra));
const shot = (page, name) => page.screenshot({ path: path.join(dir, name + '.png'), timeout: T });
const spotStats = (page) => page.evaluate(() => {
  const s = [...document.querySelectorAll('.k3d-spot')].filter((b) => !b.classList.contains('off') && getComputedStyle(b).display !== 'none').map((b) => { const r = b.getBoundingClientRect(); return { n: b.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
  let overlaps = 0, close = 0;
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { const d = Math.hypot(s[i].x - s[j].x, s[i].y - s[j].y); if (d < Math.min(s[i].w, 26)) overlaps++; else if (d < 40) close++; }
  const st = document.querySelector('.k3d-stage').getBoundingClientRect();
  return { visible: s.length, overlaps, within40: close, spotSize: s[0] && Math.round(s[0].w), stage: [Math.round(st.width), Math.round(st.height)] };
});
const tourStats = (page) => page.evaluate(() => {
  const R = (sel) => { const e = document.querySelector(sel); if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; };
  const pin = R('.kt-pin'), tot = R('.kt-total'), card = R('.kt-card'), ctrl = R('.kt-ctrl'), top = R('.kt-top'), stage = R('.k3d-stage');
  const ov = (a, b) => !!(a && b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t);
  const it = window.__k3d.K.tour.it;
  return { i: window.__k3d.K.tour.i, phase: window.__k3d.K.tour.phase, item: it && it.id, pin, tot, card, stage, pinOverTotal: ov(pin, tot), pinOverTop: ov(pin, top), pinOverCard: ov(pin, card), pinOverCtrl: ov(pin, ctrl), pinCut: pin && stage ? (pin.t < stage.t || pin.l < stage.l || pin.r > stage.r) : null, cardOverCtrl: ov(card, ctrl), totalOverTop: ov(tot, top), cam: window.__k3d.camera.position.toArray().map((v) => +v.toFixed(2)), tgt: window.__k3d.controls.target.toArray().map((v) => +v.toFixed(2)) };
});
const tourReady = (page) => page.waitForFunction(() => window.__k3d.K.tour.phase === 'show' && window.__k3d.K.tour.counted, null, { timeout: T, polling: 200 });
const pause = (page) => page.evaluate(() => { if (!window.__k3d.K.tour.paused) document.querySelector('[data-kt="play"]').click(); });

(async () => {
  const opts = BROWSER === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};
  const browser = await pw[BROWSER].launch(opts);
  const vp = { ...VPS[VPN] }; if (BROWSER === 'firefox') delete vp.isMobile;
  const ctx = await browser.newContext({ ...vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  const R = { vp: VPN, base: BASE };
  const t0 = Date.now();
  const save = () => fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ ...R, errs }, null, 1));
  let opener = null;
  const ensureOpen = async () => {
    if (await page.evaluate(() => !!window.__k3dReady && !document.getElementById('k3d').hidden)) return;
    if (await page.evaluate(() => !window.__k3dReady)) {
      await page.goto(BASE + '?debug&nodyn'); await page.evaluate(() => scrollTo(0, 300));
    }
    opener = await page.$('.hero-cta [data-open-3d]');
    await opener.click();
    await page.waitForFunction(() => window.__k3dReady, null, { timeout: T, polling: 500 });
    await waitIdle(page, 800);
  };

  const STEP = {
    async nowebgl() {
      await page.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; });
      await page.goto(BASE);
      await page.click('.hero-cta [data-open-3d]');
      await page.waitForFunction(() => /can.t show/.test((document.querySelector('.k3d-status') || {}).textContent || ''), null, { timeout: 30000 });
      await page.waitForTimeout(500);
      await shot(page, 'nowebgl');
      R.nowebgl = await page.evaluate(() => ({ status: document.querySelector('.k3d-status').textContent, active: document.activeElement.className, viewsVisible: [...document.querySelectorAll('[data-view]')].filter((b) => b.getClientRects().length).length }));
      const items = await page.$$('[data-item]');
      if (items[3]) await items[3].click();
      await page.waitForTimeout(400);
      R.nowebglCard = await page.evaluate(() => document.querySelector('.k3d-card').textContent.slice(0, 120));
      await shot(page, 'nowebgl-item');
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      R.nowebglClosed = await page.evaluate(() => document.getElementById('k3d').hidden);
    },
    async deeplink() {
      for (const h of ['#3d-line', '#3d-tour']) {
        await page.goto('about:blank');   // a fresh load each time (a hash change alone doesn't reload)
        await page.goto(BASE + '?debug&nodyn' + h);
        await page.waitForFunction(() => window.__k3dReady, null, { timeout: T, polling: 500 });
        if (h === '#3d-tour') await tourReady(page); else await waitIdle(page, 800);
        await shot(page, 'deeplink-' + h.slice(1));
        R['deeplink' + h] = await page.evaluate(() => ({ view: window.__k3d.K.view, touring: window.__k3d.K.tour.on, active: document.activeElement.className, hash: location.hash }));
        log(h, JSON.stringify(R['deeplink' + h]));
        await page.keyboard.press('Escape'); await page.waitForTimeout(300);
        R['deeplinkEsc' + h] = await page.evaluate(() => ({ touring: window.__k3d.K.tour.on, hidden: document.getElementById('k3d').hidden }));
        await page.keyboard.press('Escape'); await page.waitForTimeout(300);
        R['deeplinkEsc2' + h] = await page.evaluate(() => ({ hidden: document.getElementById('k3d').hidden, active: document.activeElement.id || document.activeElement.className, hash: location.hash }));
      }
      await page.goto('about:blank');
    },
    async open() {
      await page.goto(BASE + '?debug&nodyn');
      await page.evaluate(() => scrollTo(0, 300));
      opener = await page.$('.hero-cta [data-open-3d]');
      await opener.click();
      await page.waitForTimeout(300);
      R.activeWhileLoading = await page.evaluate(() => (document.activeElement.closest('.k3d') ? 'IN ' : 'OUT ') + (document.activeElement.className || document.activeElement.tagName));
      R.inertWhileLoading = await page.evaluate(() => !!document.querySelector('main').inert);
      await page.keyboard.press('Tab');
      R.tabWhileLoading = await page.evaluate(() => (document.activeElement.closest('.k3d') ? 'IN ' : 'OUT ') + (document.activeElement.className || document.activeElement.tagName));
      await page.waitForFunction(() => window.__k3dReady, null, { timeout: T, polling: 500 });
      R.readyMs = Date.now() - t0;
      await waitIdle(page, 800);
      log('ready in', R.readyMs, 'ms; while loading', R.activeWhileLoading, 'inert', R.inertWhileLoading, 'tab', R.tabWhileLoading);
      await shot(page, 'overview'); R.spotsOverview = await spotStats(page); log('overview spots', JSON.stringify(R.spotsOverview));
    },
    async keys() {
      await ensureOpen();
      const seq = [];
      for (let i = 0; i < 45; i++) {
        await page.keyboard.press('Tab');
        seq.push(await page.evaluate(() => { const a = document.activeElement; return (a.closest('.k3d') ? 'IN ' : 'OUT ') + a.tagName.toLowerCase() + '.' + (a.className || '') + ' ' + (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 24); }));
      }
      R.tabSeq = seq; R.tabEscapes = seq.filter((s) => s.startsWith('OUT')).length;
      for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+Tab');
      R.shiftTabEscapes = await page.evaluate(() => !document.activeElement.closest('.k3d'));
      R.scrollLocked = await page.evaluate(() => getComputedStyle(document.documentElement).overflow === 'hidden');
      const y0 = await page.evaluate(() => scrollY);
      await page.mouse.move(100, 300); await page.mouse.wheel(0, 600); await page.waitForTimeout(400);
      R.scrollMovedByWheel = (await page.evaluate(() => scrollY)) !== y0;
      R.pageInert = await page.evaluate(() => ['header', 'main', 'footer', '.mbar'].map((s) => document.querySelector(s)).every((e) => !e || e.inert));
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      R.afterEsc = await page.evaluate(() => ({ hidden: document.getElementById('k3d').hidden, active: (document.activeElement.className || document.activeElement.tagName) + ' ' + document.activeElement.textContent.trim().slice(0, 30), hash: location.hash, overflow: document.documentElement.style.overflow, inert: !!document.querySelector('main').inert }));
      log('tab escapes', R.tabEscapes, 'shiftTabEscapes', R.shiftTabEscapes, 'inert', R.pageInert, 'wheelMoved', R.scrollMovedByWheel, 'afterEsc', JSON.stringify(R.afterEsc));
      if (!R.afterEsc.hidden) { await page.evaluate(() => document.querySelector('.k3d-close').click()); await page.waitForTimeout(300); }
      await ensureOpen();
    },
    async views() {
      await ensureOpen();
      const views = await page.$$eval('[data-view]', (bs) => bs.map((b) => b.dataset.view));
      for (const v of views) {
        await page.evaluate((x) => document.querySelector(`[data-view="${x}"]`).click(), v); await waitIdle(page, 500);
        await shot(page, 'view-' + v); R['spots-' + v] = await spotStats(page); log('view', v, JSON.stringify(R['spots-' + v]));
      }
      await page.evaluate(() => document.querySelector('[data-view="overview"]').click()); await waitIdle(page, 300);
    },
    async list() {
      await ensureOpen();
      const lb = await page.$('.k3d-listbtn');
      if (await lb.isVisible()) { await lb.click(); await page.waitForTimeout(300); }
      await shot(page, 'list-open');
      R.smallTargets = await page.$$eval('.k3d button', (bs) => bs.filter((b) => b.getClientRects().length && !b.classList.contains('k3d-spot') && getComputedStyle(b).visibility !== 'hidden').map((b) => { const r = b.getBoundingClientRect(); return [b.className || b.dataset.item || b.dataset.view || b.dataset.kt, Math.round(r.width), Math.round(r.height)]; }).filter((x) => x[1] < 44 || x[2] < 44));
      log('small targets', JSON.stringify(R.smallTargets).slice(0, 400));
      await page.evaluate(() => document.querySelector('[data-item="fryers"]').click()); await waitIdle(page, 500);
      R.afterItemFocus = await page.evaluate(() => document.activeElement.className || document.activeElement.tagName);
      await shot(page, 'item-fryers');
    },
    async spot() {
      await ensureOpen();
      await page.evaluate(() => document.querySelector('[data-view="overview"]').click()); await waitIdle(page, 300);
      // tap where each visible spot is: is it the topmost element there?
      R.spotHit = await page.evaluate(() => [...document.querySelectorAll('.k3d-spot:not(.off)')].filter((b) => getComputedStyle(b).display !== 'none').map((b) => { const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return top === b || b.contains(top); }));
      R.spotBlocked = R.spotHit.filter((x) => !x).length;
      const sp = await page.$('.k3d-spot:not(.off)');
      if (sp) { await sp.evaluate((b) => b.click()); await waitIdle(page, 500); await shot(page, 'spot-click'); R.spotCard = await page.$eval('.k3d-card', (c) => c.textContent.slice(0, 80)); R.spotsAfter = await spotStats(page); }
      log('spots blocked by another', R.spotBlocked, 'of', R.spotHit.length, 'after tap', JSON.stringify(R.spotsAfter), R.spotCard);
    },
    async tour() {
      await ensureOpen();
      await page.evaluate(() => document.querySelector('[data-tour]').click());
      await tourReady(page); await pause(page); await page.waitForTimeout(800);
      await shot(page, 'tour-00'); R.tourStops = [await tourStats(page)];
      log('tour 0', JSON.stringify(R.tourStops[0]));
      const stops = await page.evaluate(() => document.querySelectorAll('.k3d-receipt li').length);
      const list = process.env.STOPS ? process.env.STOPS.split(',').map(Number).filter((x) => x > 0 && x < stops) : [...Array(stops).keys()].slice(1);
      for (const i of list) {
        await page.evaluate((j) => window.__k3dJump(j), i);
        await tourReady(page); await pause(page); await page.waitForTimeout(500);
        await shot(page, 'tour-' + String(i).padStart(2, '0'));
        const s = await tourStats(page); R.tourStops.push(s);
        log('tour', i, s.item, 'pinOverTotal', s.pinOverTotal, 'pinOverCard', s.pinOverCard, 'pinCut', s.pinCut, 'pin', JSON.stringify(s.pin));
      }
    },
    async end() {
      await ensureOpen();
      if (!(await page.evaluate(() => window.__k3d.K.tour.on))) await page.evaluate(() => document.querySelector('[data-tour]').click());
      await page.evaluate(() => window.__k3dJump(document.querySelectorAll('.k3d-receipt li').length - 1));
      await page.waitForFunction(() => window.__k3d.K.tour.phase === 'show', null, { timeout: T, polling: 200 });
      await page.evaluate(() => document.querySelector('[data-kt="next"]').click());
      await page.waitForFunction(() => window.__k3d.K.tour.phase === 'end', null, { timeout: T, polling: 200 });
      await page.waitForTimeout(4500);
      await shot(page, 'tour-end');
      R.end = await page.evaluate(() => { const c = document.querySelector('.kt-endcard').getBoundingClientRect(), s = document.querySelector('.k3d-stage').getBoundingClientRect(); return { card: [Math.round(c.top), Math.round(c.bottom), Math.round(c.height)], stage: [Math.round(s.top), Math.round(s.bottom)], fits: c.top >= s.top - 1 && c.bottom <= s.bottom + 1, active: document.activeElement.textContent.trim().slice(0, 30), book: document.querySelector('[data-kt="book"]').textContent }; });
      log('end', JSON.stringify(R.end));
      await page.evaluate(() => document.querySelector('[data-kt="explore"]').click()); await waitIdle(page, 300);
    },
    async rotate() {
      await ensureOpen();
      const v = VPS[VPN].viewport;
      await page.setViewportSize({ width: v.height, height: v.width }); await page.waitForTimeout(800); await waitIdle(page, 800);
      await shot(page, 'rotated'); R.rotated = await spotStats(page);
      await page.evaluate(() => document.querySelector('[data-tour]').click());
      await tourReady(page); await pause(page); await page.waitForTimeout(600);
      await shot(page, 'rotated-tour'); R.rotatedTour = await tourStats(page);
      await page.setViewportSize(v); await page.waitForTimeout(800); await waitIdle(page, 800);
      await shot(page, 'rotated-back-tour'); R.rotatedBackTour = await tourStats(page);
      log('rotate', JSON.stringify(R.rotated), JSON.stringify(R.rotatedTour.pin), JSON.stringify(R.rotatedBackTour.pin));
    }
  };
  for (const s of steps) {
    const ts = Date.now();
    try { await STEP[s](); } catch (e) { R['err_' + s] = String(e).split('\n')[0].slice(0, 300); log('STEP FAILED', s, R['err_' + s]); }
    log('step', s, 'took', Date.now() - ts, 'ms');
    save();
  }
  log('done in', Date.now() - t0, 'ms; page errors', errs.length, errs.slice(0, 3).join(' | '));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
