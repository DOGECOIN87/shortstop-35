// Page audit for shortstop-judson/index.html: viewports, listing states, text size, zoom,
// preferences, keyboard; reports sideways overflow, small tap targets, long lines, orphans,
// layout shift, console errors and axe-core violations, and saves screenshots.
// usage (serve the folder on :8080 first): node page.js <chromium|firefox|webkit> <outdir> [caseFilterRegex] [reportName]
const path = require('path'), fs = require('fs');
// Playwright from this folder's node_modules, or a global install
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const [, , BROWSER = 'chromium', OUT = 'out', FILTER = '', RN = 'report'] = process.argv;
const BASE = process.env.BASE || 'http://127.0.0.1:8080/';
const AXE = require.resolve('axe-core/axe.min.js');
fs.mkdirSync(OUT, { recursive: true });

const L = (o = {}) => ({ phone: '', email: '', address: 'Loop 1604 & Judson Rd, San Antonio, TX', ...o, rates: { shift: '', monthly: '', lease: '', summary: '', ...(o.rates || {}) } });
const STATES = {
  empty: L(),
  phone: L({ phone: '(210) 555-0123' }),
  email: L({ email: 'owner@example.com' }),
  both: L({ phone: '(210) 555-0123', email: 'owner@example.com' }),
  rates: L({ phone: '(210) 555-0123', email: 'owner@example.com', rates: { shift: '$35/hour, 4-hour minimum', monthly: '$1,200/month', lease: '$2,500/month', summary: 'Hourly, monthly or lease' } }),
  long: L({ phone: '(210) 555-0123', email: 'shortstopjudson.kitchenrental@example.com', address: '12345 Long Example Frontage Road, Building B, Unit 1000, San Antonio, TX 78247', rates: { shift: '$35/hour, 4-hour minimum', monthly: '$35/hour, 4-hour minimum', lease: '$35/hour, 4-hour minimum', summary: '$35/hour, 4-hour minimum' } }),
  noaddr: L({ address: '' })
};

const phone = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
const desk = (w, h) => ({ viewport: { width: w, height: h } });
const VP = {
  p320: phone(320, 568), p360: phone(360, 740), p375: phone(375, 667), p390: phone(390, 844), p414: phone(414, 896), p430: phone(430, 932),
  l568: phone(568, 320), l667: phone(667, 375), l740: phone(740, 360), l844: phone(844, 390),
  t768: phone(768, 1024), t1024l: phone(1024, 768), t820: phone(820, 1180), t1180l: phone(1180, 820), t834: phone(834, 1194), t1194l: phone(1194, 834), t1024: phone(1024, 1366), t1366l: phone(1366, 1024),
  d1280: desk(1280, 800), d1366: desk(1366, 768), d1440: desk(1440, 900), d1920: desk(1920, 1080), d2560: desk(2560, 1440), d1280s: desk(1280, 600),
  z200: desk(640, 400), z400: desk(320, 256)
};
const CASES = [];
for (const k of Object.keys(VP)) CASES.push({ name: k, vp: k, state: 'empty' });
for (const s of Object.keys(STATES)) if (s !== 'empty') for (const v of ['p390', 'd1280', 'p320']) CASES.push({ name: `${v}-${s}`, vp: v, state: s });
CASES.push({ name: 'p390-text200', vp: 'p390', state: 'empty', text: 2 }, { name: 'd1280-text200', vp: 'd1280', state: 'empty', text: 2 }, { name: 'p390-text200-long', vp: 'p390', state: 'long', text: 2 });
CASES.push({ name: 'd1280-reduced', vp: 'd1280', state: 'empty', media: { reducedMotion: 'reduce' } });
CASES.push({ name: 'd1280-forced', vp: 'd1280', state: 'both', media: { forcedColors: 'active' } }, { name: 'p390-forced', vp: 'p390', state: 'both', media: { forcedColors: 'active' } });
CASES.push({ name: 'p390-nojs', vp: 'p390', state: 'empty', nojs: true }, { name: 'd1280-nojs', vp: 'd1280', state: 'empty', nojs: true });
CASES.push({ name: 'p390-noimg', vp: 'p390', state: 'empty', noimg: true }, { name: 'd1280-noimg', vp: 'd1280', state: 'empty', noimg: true });
CASES.push({ name: 'p390-slow3g', vp: 'p390', state: 'empty', slow: true }, { name: 'd1366-slow3g', vp: 'd1366', state: 'empty', slow: true });
CASES.push({ name: 'print', vp: 'd1280', state: 'both', print: true });
CASES.push({ name: 'd1280-keys', vp: 'd1280', state: 'both', keys: true }, { name: 'p390-keys', vp: 'p390', state: 'empty', keys: true });

const PAGE_CHECKS = () => {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const desc = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList.length) s += '.' + [...el.classList].join('.');
    const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return s + (t ? ` "${t}"` : '');
  };
  const visible = (el) => {
    if (el.closest('.k3d,[hidden]')) return false;
    for (let a = el; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return false; }
    const r = el.getBoundingClientRect(); return r.width > 1 || r.height > 1;
  };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const out = { overflow: [], clipped: [], boxOverflow: [], targets: [], lines: [], orphans: [], headings: [], imgs: [], hero: null, scrollW: document.documentElement.scrollWidth, vw, vh };
  const all = [...document.querySelectorAll('body *')].filter((el) => !el.closest('.k3d,.skip,script,style,title,desc,defs') && !(el instanceof SVGElement && el.tagName !== 'svg'));
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[hidden]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 && r.height <= 1) continue;
    let Lx = r.left, Rx = r.right, clip = null;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX !== 'visible') {
        const ar = a.getBoundingClientRect();
        if ((Rx > ar.right + 0.5 || Lx < ar.left - 0.5) && !/auto|scroll/.test(s.overflowX)) clip = clip || a;
        Lx = Math.max(Lx, ar.left); Rx = Math.min(Rx, ar.right);
      }
    }
    if (getComputedStyle(el).position !== 'fixed' && (Rx > vw + 0.5 || Lx < -0.5)) out.overflow.push({ el: desc(el), left: Math.round(r.left), right: Math.round(r.right) });
    else if (clip && ownText(el)) out.clipped.push({ el: desc(el), by: desc(clip).slice(0, 60), left: Math.round(r.left), right: Math.round(r.right) });
    if (ownText(el) && cs.display !== 'inline' && cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) out.boxOverflow.push({ el: desc(el), sw: el.scrollWidth, cw: el.clientWidth });
  }
  for (const el of document.querySelectorAll('a[href],button,summary,input,select,textarea')) {
    if (!visible(el) || el.classList.contains('skip')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5) {
      const inline = getComputedStyle(el).display === 'inline';
      out.targets.push({ el: desc(el), w: Math.round(r.width), h: Math.round(r.height), inline });
    }
  }
  const lineInfo = (el) => {
    const lines = new Map();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const rg = document.createRange();
    let n;
    while ((n = walker.nextNode())) {
      if (n.parentElement.closest('[hidden],.sr-only') || !visible(n.parentElement)) continue;
      const txt = n.textContent; const re = /\S+/g; let m;
      while ((m = re.exec(txt))) {
        rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const rs = rg.getClientRects(); if (!rs.length) continue;
        const top = Math.round(rs[rs.length - 1].top);
        let key = [...lines.keys()].find((k) => Math.abs(k - top) < 6); if (key === undefined) { key = top; lines.set(key, []); }
        lines.get(key).push(m[0]);
      }
    }
    return [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, w]) => w);
  };
  for (const el of document.querySelectorAll('p,li,summary,figcaption,h1,h2,h3,.strip-item .v')) {
    if (!visible(el) || el.querySelector('p,li')) continue;
    const ls = lineInfo(el); if (!ls.length) continue;
    const chars = ls.map((w) => w.join(' ').length), max = Math.max(...chars);
    if (max > 80) out.lines.push({ el: desc(el).slice(0, 70), max, lines: ls.length });
    if (/^H[1-3]$/.test(el.tagName) || el.tagName === 'SUMMARY') {
      if (ls.length > 1 && ls[ls.length - 1].length === 1) out.orphans.push({ el: desc(el).slice(0, 70), last: ls[ls.length - 1][0] });
    }
  }
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) if (!h.closest('.k3d')) out.headings.push(h.tagName + ' ' + h.textContent.trim().slice(0, 50));
  for (const img of document.querySelectorAll('img')) if (!img.closest('.k3d')) {
    const cs = getComputedStyle(img);
    out.imgs.push({ src: img.getAttribute('src'), alt: img.getAttribute('alt'), wh: !!(img.getAttribute('width') && img.getAttribute('height')), loaded: img.complete && img.naturalWidth > 0, ar: cs.aspectRatio });
  }
  const h1 = document.querySelector('h1'), cta = document.querySelector('.hero-cta .btn-red'), mbar = document.querySelector('.mbar');
  const mb = mbar && getComputedStyle(mbar).display !== 'none' ? mbar.getBoundingClientRect().height : 0;
  const header = document.querySelector('header'), hb = getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
  out.hero = { h1Bottom: Math.round(h1.getBoundingClientRect().bottom + scrollY), ctaBottom: cta ? Math.round(cta.getBoundingClientRect().bottom + scrollY) : null, fold: vh - mb, mbar: Math.round(mb), header: Math.round(hb) };
  out.hero.h1Visible = out.hero.h1Bottom <= out.hero.fold; out.hero.ctaVisible = out.hero.ctaBottom != null && out.hero.ctaBottom <= out.hero.fold;
  return out;
};

const TEXT_ZOOM = (k) => {
  const els = [...document.querySelectorAll('body, body *')];
  const sizes = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
  els.forEach((el, i) => { el.style.setProperty('font-size', sizes[i] * k + 'px', 'important'); });
};

async function keyboardWalk(page, n = 60) {
  const steps = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    await page.evaluate(async () => { let y = -1, n = 0; while (n < 40) { await new Promise((q) => setTimeout(q, 50)); if (scrollY === y) break; y = scrollY; n++; } });
    const s = await page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const header = document.querySelector('header'), hr = header.getBoundingClientRect();
      const mbar = document.querySelector('.mbar'), mbv = mbar && getComputedStyle(mbar).display !== 'none' && !el.closest('.mbar');
      const mr = mbv ? mbar.getBoundingClientRect() : null;
      const sticky = getComputedStyle(header).position === 'sticky' && !el.closest('header');
      const obscured = !el.classList.contains('skip') && ((sticky && r.top < hr.bottom - 2) || (mr && r.bottom > mr.top + 2));
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
      let s = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
      return { el: s + ' "' + (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '"', top: Math.round(r.top), bottom: Math.round(r.bottom), ring, obscured: !!obscured, inViewport: r.bottom > 0 && r.top < innerHeight };
    });
    steps.push(s);
    if (s && /^footer|Back to top/.test(s.el) && i > 10) break;
  }
  return steps;
}

(async () => {
  const bt = pw[BROWSER];
  const launch = BROWSER === 'chromium' ? { args: [] } : {};
  const browser = await bt.launch(launch);
  const report = fs.existsSync(path.join(OUT, RN + '.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, RN + '.json'))) : {};
  const re = FILTER ? new RegExp(FILTER) : null;
  for (const c of CASES) {
    if (re && !re.test(c.name)) continue;
    if (BROWSER !== 'chromium' && (c.slow || c.print)) continue;
    const vp = { ...VP[c.vp] };
    if (BROWSER === 'firefox') delete vp.isMobile;
    const ctx = await browser.newContext({ ...vp, deviceScaleFactor: 1, javaScriptEnabled: !c.nojs, reducedMotion: (c.media && c.media.reducedMotion) || 'no-preference', forcedColors: (c.media && c.media.forcedColors) || 'none' });
    const page = await ctx.newPage();
    const r = { console: [], errors: [], failed: [] };
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') r.console.push(m.type() + ': ' + m.text().slice(0, 200)); });
    page.on('pageerror', (e) => r.errors.push(String(e).slice(0, 200)));
    page.on('requestfailed', (q) => { if (!c.noimg) r.failed.push(q.url() + ' ' + (q.failure() && q.failure().errorText)); });
    const state = STATES[c.state];
    if (!c.slow) await page.route(/127\.0\.0\.1:808[01]\/(index\.html)?(\?.*)?$/, async (route) => {
      const res = await route.fetch(); let body = await res.text();
      body = body.replace(/const LISTING = \{[\s\S]*?\n\};/, 'const LISTING = ' + JSON.stringify(state, null, 2) + ';');
      await route.fulfill({ response: res, body });
    });
    if (c.noimg) await page.route(/\.(png|webp|jpg|svg)(\?.*)?$/, (route) => route.abort());
    await page.addInitScript(() => {
      window.__cls = 0; window.__shifts = [];
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: (e.sources || []).map((s) => s.node ? (s.node.nodeName + '.' + (s.node.className && s.node.className.baseVal === undefined ? s.node.className : '')) : '?') }); } }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { window.__cls = null; }
    });
    const dir = path.join(OUT, c.name); fs.mkdirSync(dir, { recursive: true });
    if (c.slow) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 });
      const t0 = Date.now();
      await page.goto(BASE, { waitUntil: 'commit' });
      await page.waitForSelector('h1', { timeout: 60000 });
      r.h1At = Date.now() - t0;
      await page.screenshot({ path: path.join(dir, 'early.png') });
      await page.waitForLoadState('load', { timeout: 120000 });
      r.loadAt = Date.now() - t0;
      await page.screenshot({ path: path.join(dir, 'loaded.png') });
      r.cls = await page.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts }));
      report[c.name] = r; fs.writeFileSync(path.join(OUT, RN + '.json'), JSON.stringify(report, null, 1)); await ctx.close(); console.log(c.name, 'h1 at', r.h1At, 'load at', r.loadAt, 'cls', r.cls.cls); continue;
    }
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    if (c.text) { await page.evaluate(TEXT_ZOOM, c.text); await page.waitForTimeout(200); }
    if (c.print) {
      await page.emulateMedia({ media: 'print' });
      await page.screenshot({ path: path.join(dir, 'full.png'), fullPage: true });
      await page.pdf({ path: path.join(dir, 'page.pdf'), format: 'Letter', printBackground: true });
      r.checks = await page.evaluate(PAGE_CHECKS);
      report[c.name] = r; fs.writeFileSync(path.join(OUT, RN + '.json'), JSON.stringify(report, null, 1)); await ctx.close(); console.log(c.name, 'done'); continue;
    }
    await page.screenshot({ path: path.join(dir, 'first.png') });
    if (c.keys) {
      r.keys = await keyboardWalk(page);
      // FAQ by keyboard
      await page.focus('#faq summary');
      await page.keyboard.press('Enter'); const open1 = await page.evaluate(() => document.querySelector('#faq details').open);
      await page.keyboard.press('Space'); const open2 = await page.evaluate(() => document.querySelector('#faq details').open);
      r.faq = { enterOpens: open1, spaceCloses: !open2 };
      // skip link
      await page.goto(BASE, { waitUntil: 'load' });
      await page.keyboard.press('Tab');
      r.skip = await page.evaluate(() => { const a = document.activeElement; const rr = a.getBoundingClientRect(); return { el: a.className, text: a.textContent, visible: rr.left >= 0 && rr.top >= 0 && rr.width > 0 }; });
      await page.screenshot({ path: path.join(dir, 'skip-focus.png') });
      await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      r.skipTarget = await page.evaluate(() => ({ hash: location.hash, active: document.activeElement.id || document.activeElement.tagName }));
      await page.keyboard.press('Tab');
      r.afterSkip = await page.evaluate(() => { const a = document.activeElement; return a.tagName + '.' + a.className + ' ' + a.textContent.trim().slice(0, 30); });
      report[c.name] = r; fs.writeFileSync(path.join(OUT, RN + '.json'), JSON.stringify(report, null, 1)); await ctx.close(); console.log(c.name, 'done'); continue;
    }
    // scroll the page to load lazy images, then back
    if (c.nojs) { await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(400); await page.evaluate(() => scrollTo(0, 0)); }
    else await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((q) => setTimeout(q, 60)); } scrollTo(0, 0); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, 'full.png'), fullPage: true });
    r.checks = await page.evaluate(PAGE_CHECKS);
    r.cls = await page.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts }));
    if (!c.nojs) {
      await page.addScriptTag({ path: AXE });
      r.axe = await page.evaluate(async () => {
        const res = await axe.run(document, { exclude: [['.k3d']], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
        return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, nodes: v.nodes.slice(0, 6).map((n) => n.target.join(' ') + ' :: ' + (n.any[0] ? n.any[0].message : n.failureSummary).slice(0, 160)) }));
      });
      r.incomplete = await page.evaluate(async () => {
        const res = await axe.run(document, { exclude: [['.k3d']], runOnly: { type: 'rule', values: ['color-contrast'] } });
        return res.incomplete.map((v) => ({ id: v.id, n: v.nodes.length, nodes: v.nodes.slice(0, 8).map((n) => n.target.join(' ') + ' :: ' + (n.any[0] ? n.any[0].message : '').slice(0, 120)) }));
      });
    }
    if (c.media && c.media.reducedMotion) r.anims = await page.evaluate(() => document.getAnimations().map((a) => (a.animationName || a.constructor.name) + ':' + a.playState));
    report[c.name] = r;
    fs.writeFileSync(path.join(OUT, RN + '.json'), JSON.stringify(report, null, 1));
    const ch = r.checks;
    console.log(c.name, `ovf=${ch.overflow.length} clip=${ch.clipped.length} box=${ch.boxOverflow.length} tgt=${ch.targets.length} lines80=${ch.lines.length} orphan=${ch.orphans.length} cls=${r.cls && r.cls.cls != null ? r.cls.cls.toFixed(3) : 'n/a'} axe=${r.axe ? r.axe.map((v) => v.id + ':' + v.n).join(',') : '-'} err=${r.errors.length + r.console.length} hero=${ch.hero.h1Visible ? 'h1' : '-'}${ch.hero.ctaVisible ? '+cta' : ''}`);
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, RN + '.json'), JSON.stringify(report, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
