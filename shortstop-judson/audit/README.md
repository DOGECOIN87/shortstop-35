# Audit scripts

Checks for `../index.html` and the 3D viewer. Not part of the site; nothing here is loaded by the page.

```
cd shortstop-judson && python3 -m http.server 8080 --bind 127.0.0.1   # in one terminal
cd shortstop-judson/audit && npm install                              # axe-core; Playwright from npm or a global install
node page.js chromium out                     # every case (about 20 minutes)
node page.js firefox out '^(p390|d1366)$'     # a regex picks cases
node viewer.js out p390                       # 3D viewer on a phone, all steps
STOPS=0,4,9 node viewer.js out d1366 open,keys,tour
```

`page.js` loads the page at each viewport (phones in both orientations, tablets, desktops,
200% and 400% zoom), each `LISTING` state (empty, phone, email, both, rates, very long values,
no address), 200% text, reduced motion, forced colours, JavaScript off, failed images, slow 3G,
print and keyboard only. It writes `first.png` / `full.png` per case and a JSON report with
sideways overflow (element positions, since the body clips), tap targets under 44 px, lines over
80 characters, one-word last lines in headings, layout shift, console errors and axe-core
violations.

`viewer.js` opens the 3D viewer with SwiftShader (several seconds a frame) and checks focus
while loading, the Tab cycle, Escape, the inert page behind, each camera view, hotspot overlap,
the equipment list, the value tour (pin and card placement per stop), the end card, rotating the
device, deep links and the no-WebGL fallback.
