# Handover Prompt: FoodMart 3D Storefront & Interior Scene

## Overview

Build an interactive Three.js 3D scene of a **FoodMart convenience store** with matching exterior storefront and interior fit-out, based on the owner's reference photos and floor plan sketch. The scene runs in `index.html` (no build step, self-hosted Three.js in `vendor/`).

## Repository Structure

```
/home/user/shortstop-35/
├── index.html                 # Main Three.js app (single HTML file, all code inline)
├── scripts/reference-design.js # Texaco pump + canopy construction
├── scripts/station-geometry.js # Measured geometry constants
├── scripts/reference-plan.js   # Aerial/ground plan calibration
├── scripts/site-circulation.js # Roads, sidewalks, parking
├── scripts/store-side-landscape.js # Store-side walks/grass
├── scripts/surface-plan.js     # Polygon clipping for ground surfaces
├── scripts/sun-position.js     # Time-of-day sun calculations
├── scripts/traffic-engine.js   # Moving traffic simulation
├── scripts/traffic-lanes.js    # Road lane definitions
├── scripts/station-details.js  # Fine forecourt details
├── scripts/road-clearance.js   # Clearance checks
├── vendor/three.module.js      # Three.js (self-hosted, no CDN)
├── vendor/jsm/                 # Three.js addons (OrbitControls, GLTFLoader, etc.)
├── assets/web-station/station.glb  # Store building shell (loaded & reskinned)
├── assets/cars/                # Car GLTF models
├── assets/fonts/helvetiker_bold.typeface.json
└── preview-server.py           # Local dev server (python3 scripts/preview-server.py --port 8081)
```

## Reference Images (Owner-Provided)

### Storefront (exterior)
- **FOODMART sign**: Red fascia band, white "FOODMART" lettering, Texaco-style star logo with "T" in center
- **"WE APPRECIATE YOUR BUSINESS" band**: White band with red text below the windows on the front wall
- **Neon window signs**: CBD, E-CIGS, 10 THC, DELTA 8 (across the front glazing)
- **Front entrance**: Double glass doors at center of front facade
- **"OPEN" neon sign**: Yellow, in the front window
- **Gray CMU/concrete block wall texture**: The building facade is gray concrete block (not limestone)
- **Fully transparent front glazing**: Interior visible through windows

### Interior (matching photos 8-12)
- **Back-wall beverage coolers**: Row of glass-door refrigerators with stocked drinks
- **Left & right snack aisles**: Shelving stocked with chips/candy products (3 levels each)
- **Centre island**: Grab-and-go drinks display
- **Checkout counter**: With register/screen
- **Slot machines**: Inside the store near checkout (NOT outside on sidewalk)
- **ATM + Bitcoin ATM**: Near entrance inside
- **Tiled sales floor**: Gray/white tile

### Pumps & Canopy (Texaco reference)
- **Pump headers**: ends flare outward toward the top; face split on a diagonal into a white wedge (red star roundel) and red ("with TECHRON" + pump number)
- **Dispensers**: arched electronics head with red TEXACO badge, sale display + speaker grilles, blue payment screen with soft keys, PIN pad, red card reader, contactless reader, receipt printer, 4 grade buttons (88/87/89/93), instruction tiles, dark media panel; nozzles in boots with chrome swivels; hoses from top outlets with breakaway couplings, looping near the island; red lower door with white roundel (flared-foot T)
- **Canopy** (measured from the photos in perspective): level roof line, deep fascia (~1.45 m) rising above the lidar roof deck as a parapet; each long side red below / white above, split on a diagonal lowest at its TEXACO corner, white covering the half nearest that corner, far half all red; white panel's corner end cut on a diagonal with black trim (red triangle at the corner); thick black coping on the TEXACO faces, overhanging the corners with diagonal ends; TEXACO letters ~60% of the red face height, offset toward the roundel corner; roundel (red disc, white star, red T) at each long side's TEXACO corner, ~45% above the roof line. Facing a TEXACO corner from outside, the long side is on the left (both photos), so the corners are rotationally placed: +x side at -Z, -x side at +Z (road end)
- **Night lighting**: red neon along the bottom of each white panel, up its corner diagonal and across the top of the TEXACO face, with a short return down the opposite corner; TEXACO letters, roundels, pump headers and screens glow; pump island base lights

## Current State of `index.html` (What's Been Built)

The scene is already implemented. Key sections to understand:

### Time-of-Day and Live conditions (`renderLighting()` in index.html, `scripts/live-conditions.js`)
- **Live** (default): blends the `day`/`golden`/`night` presets by the real sun elevation at the store, lights from the real sun position (moonlight from the real moon at night), draws the moon with its real phase, refreshes every minute; clock shown in Central Time
- Real weather from the National Weather Service (api.weather.gov, free, no key): station KBAZ latest observation every 10 minutes drives cloud cover (greyer sky, dimmer sun, more clouds), rain streaks, fog distance, lightning flashes and flag speed; active alerts for the store's point show as a banner. Fails quietly back to clear weather
- Presets: `day`, `golden`, `night` (exactly the original looks); `?time=live|day|golden|night`
- Testing/demo params: `?at=2026-11-02T20:30-06:00` (start the live clock at another time), `?wx=clear|cloudy|overcast|rain|storm|fog` (force weather)

### Store Building (station.glb, lines ~1460-1510)
- Loaded from `assets/web-station/station.glb`, reskinned:
  - IDs 62,63,64 = front glazing → transparent glass material
  - IDs 42,76,77,78 = red bands → M.red
  - Other walls → gray CMU block texture, semi-transparent (opacity 0.5)

### FOODMART Storefront (lines ~1475-1520)
- Red fascia with "FOODMART" + Texaco star (canvas texture, glow material)
- "WE APPRECIATE YOUR BUSINESS" band
- Neon window signs: CBD, E-CIGS, 10 THC, DELTA 8
- Front double doors, OPEN neon sign

### Canopy and pumps on the live page
- The Blender export (`shortstop_detailed.glb`) hides the procedural scene, except `replaceModelFuelArea()` (index.html) which shows the procedural fuel group (new canopy + detailed dispensers), fitted onto the model's pump islands (`MODEL_ISLANDS`), hides the model's dispensers/island fittings/canopy parts and cuts its merged canopy/pump triangles

### Interior Fit-Out (lines ~1580-1695)
- Tiled floor, back-wall coolers, left/right snack aisles, centre island
- Checkout counter with register
- Slot machines (inside, near checkout)
- ATM + Bitcoin ATM

### Pumps & Canopy (`scripts/reference-design.js`)
- `pump()`: slanted header, detailed electronics face (canvas) plus raised PIN pad, card/tap readers, grade buttons, nozzles, hoses and breakaways
- `canopy()`: level parapet fascia; per long side a full-length red plate (`Long-red-ribbon`) under a white diagonal panel (`Canopy-white-slant`), corner diagonal trim, neon + additive halo glow (`GlowMaterial`, hidden by day), roundels; TEXACO faces with coping and offset lettering; soffit TECHRON graphics; columns with number flags

### Sidewalks (lines ~820-845)
- Front walk along store facade, canopy apron walks, connector walks, side property walk, driveway aprons

## Key Technical Details

- **Module type**: `<script type="module">` with importmap pointing to `./vendor/three.module.js`
- **Top-level await**: Used for FontLoader and GLTFLoader (async at module top level)
- **Error handling**: `__station3dFail()` / `__station3dComplete()` manage the loading UI
- **Camera views**: overview, pumps, store, grounds, road, site, reference (toggle via `[data-view]` buttons)
- **Coordinate system**: Site-local frame; `stationLayout` rotated by `BUILDING_ANGLE`, `world` rotated by `SITE_HEADING`
- **Canvas textures**: All signs made with HTML5 Canvas API (`ctex()` helper) → Three.js textures
- **No external assets needed for signage**: All text generated procedurally

## Common Pitfalls to Avoid

0. **Restamp modules after editing any `scripts/*.js`** — run `node tools/version-modules.mjs`. index.html loads local modules through content-versioned URLs (import map) so a new deploy never runs against modules cached from the previous one; without it, returning visitors see "couldn't start 3D" for up to 10 minutes. `tests/module-version.mjs` fails if you forget.

1. **Duplicate `let` declarations** — `canopyGlowMaterials` was declared twice; caused a SyntaxError that prevented the entire module from running
2. **Variable ordering** — `canopyGlowMaterials` must be declared before the pump-island code pushes to it
3. **Top-level await** — FontLoader must complete before `createReferenceDesign()` is called
4. **GLB node names** — station.glb nodes are named like `40_obj(4002336)`; access via `gltf.scene.getObjectByName('40_obj(4002336)')`
5. **Transparent materials** — Need `transparent: true` and proper opacity for glazing/walls

## Testing

- Start server: `python3 scripts/preview-server.py --port 8081`
- Open: `http://localhost:8081/index.html`
- Hard refresh (Ctrl+Shift+R) after changes
- Toggle time-of-day with Day/Golden/Night buttons to verify night lighting

## Branch

All work is on `arena/96e6d5cb-shortstop-35`. Commit changes to this branch only.