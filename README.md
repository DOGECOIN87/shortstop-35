# Texaco ShortStop — shortstop35.store

Official website for Texaco ShortStop, 1185 Interstate 35 N, New Braunfels, TX 78130 · (830) 606-1892

- `index.html` — interactive 3D site (Three.js, self-hosted in `vendor/` — no CDN dependency)
- `classic.html` — lightweight non-3D version
- Hosted on GitHub Pages. Custom domain: shortstop35.store (see CNAME).
- 3D deep links: `?view=overview|pumps|store|grounds|road|site|reference`, `?time=day|golden|night` and optional `?date=YYYY-MM-DD` (sun position)
- To update the site, edit the HTML and commit — GitHub Pages redeploys automatically.

## 3D model credits

- "BMW E46 MSport" by Ricy (https://sketchfab.com/ngon_3d), licensed CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/bmw-e46-msport-614c2f1660474178a1d4717b7492d1c7. Modified: geometry compressed, textures resized to WebP, car paint recoloured in the page.
- "Low Poly Tesla Cybertruck" by kulonee (https://sketchfab.com/ynesolefru), Sketchfab Standard license. Source: https://sketchfab.com/3d-models/low-poly-tesla-cybertruck-64b4af3ab92543d297992ac4c2f8ed96. Modified: geometry compressed, materials adjusted in the page.

## Data credits

- Building sizes and heights: USGS 3D Elevation Program lidar, TX Central B1 2017 (StratMap 50 cm), via the public EPT mirror on AWS — public domain (U.S. Government work).
- Map data © OpenStreetMap contributors, available under the Open Database License (ODbL): https://www.openstreetmap.org/copyright. Used to cross-check building outlines and road bearings.
- Raw datasets are not stored in this repository.

## Measured geometry (lidar/OSM) — 2026-10-29

`scripts/station-geometry.js` holds the measured numbers that size the 3D model.
Measurements were made in a local true-north frame around the store coordinate
from 2017 lidar (2.09 M points) and OSM, then compared with the screenshot-built
layout. Heights are above the forecourt slab.

| Element | Before (estimated) | Now | Basis |
|---|---|---|---|
| Canopy | 35.2 × 13.6 m, top 6.87 m | 32.4 × 12.8 m, top 5.40 m | Lidar roof returns 32.4 × 12.8 m, roof ~5.34 m; OSM 32.0 × 12.8 m |
| Canopy underside | 5.45 m | ~4.2 m (13 ft 9 in) | **Assumed** (lidar cannot see it); derived from a 0.85 m fascia — confirm with the posted clearance sign |
| Store | 21.4 × 16 m, top 5.36 m | 21.4 × 16 m, top 4.65 m | Footprint already matched (OSM wall 19.8 × 15.8 m, roof 21.2 × 17.3 m); lidar parapet ~4.65 m, roof deck ~4.09 m |
| Car wash | 7.7 × 10.9 m, 4.31 m | 8.6 × 11.3 m, 3.86 m | Lidar roof returns; OSM outline 8.1 × 11.5 m |
| Edelweiss Inn roof | ridge 8.0 m | ridge 9.2 m (steep roof, single storey kept) | Lidar roof p95 9.18 m |
| Site heading | −35° (visual estimate) | −40.81° | Rigid fit of store/canopy/car-wash centres to lidar footprints (residuals 0.4–1.3 m); world −Z = true north |
| Flagpole | 14.4 m | 20.3 m to the finial | Lidar slender object reaching ~20.3 m at the modelled flag position |
| Price pylons | ~15 m each, traced positions | SE: 19.6 m at its lidar position; NE: 12.2 m (traced position kept until roads are rebuilt) | Lidar tall objects at the SE/NE corners, matching earlier research notes |
| Sun (Day/Golden) | fixed artistic positions | real solar position at the store coordinate for the visitor's date (`?date=YYYY-MM-DD` to pin) | NOAA solar position; Day = solar noon + 1 h, Golden = sunset − 40 min; Night unchanged |

**Still estimated:** storefront openings and signage (a straight-on storefront
photo is still needed), canopy underside, pump-island spacing, the traced ground
layout (forecourt, lawns, walks, parking), the inn's position and footprint,
road geometry, the NE pylon's position, neighbouring buildings and terrain (the site is still
modelled flat; lidar shows the lot ~2 m above the frontage road). The lidar is
from 2017; changes since then are not reflected in these measurements.

Regression: `node --experimental-default-type=module --loader ./tests/three-loader.mjs tests/measured-geometry.mjs`

## Reference-based site update

The scene uses the owner's October 2026 aerial/Street View screenshots for relative
placement, with the newer supplied Texaco references guiding dispenser styling.
The store coordinate in structured data is the screenshot's starred location:
29°42′1.8432″ N, 98°5′42.252″ W. Scene axes are a simplified site-local frame,
not a georeferenced map overlay. Dimensions and road geometry remain estimates.

- Widened the source store depth to approximately 14 m, retaining its 24 m frontage.
- Added the detached car-wash bay north of the store.
- Opened the frontage verge/sidewalk at both driveways and extended the cross street west.
- Added solid double-sided Techron pump headers, silver supports, dark column
  bases, waste stations, and short-end canopy branding.
- Added a **Site plan** camera (`?view=site`) for comparing relative placement.

No Google API key is included or required. No Google tiles are fetched. Never put
private API credentials in this public static site or commit them to the repository.

### Site orientation

The completed site group is rotated about world Y so the highway runs NE/SW.
The original visual estimate was -35°; it is now -40.81°, from a rigid fit of the
store, canopy and car-wash centres to 2017 lidar footprints (see "Measured
geometry" above). The ground layout itself is still traced, not surveyed. `?view=site` is north-up (world -Z); close-up
camera presets and HTML hotspot projections use the same local-to-world transform.
Rotation is applied after glTF fitting so world-space bounding boxes do not alter
the store dimensions during loading.

### Relative layout correction from the wider aerial

The wider owner screenshot makes the road/building relationship clearer: the
canopy and store sit diagonally (estimated 45°) to the frontage/cross-street grid.
`stationLayout` now groups those buildings, parking markings, lot lamps, detached
bay, and parked cars. Road traffic and roadside signs remain on the road grid.
The inn is perpendicular to the highway behind the store, not parallel to the
canopy. The outer lot has been reshaped around these footprints. The -35° global
heading is independent of this relative angle; neither angle is surveyed.

### Pump-bank correction from the close forecourt photo

Each of the four transverse islands now has a central column and a dispenser at
local x=-4 m and +4 m. Both banks face along the canopy length; each dispenser has
opposed numbered faces (1–16 overall). The earlier centre-line/tandem arrangement
is superseded. Islands, end bollards, waste cabinets and fuelling cars have been
adjusted to this paired layout. Spacing remains image-estimated.

### Fine-detail pass

`scripts/station-details.js` adds photo-estimated roof/soffit seams, fascia drip
edges, open-centre LED trim, column anchor hardware, safety boxes, all 16 round
position signs, windshield-wash equipment, bollard collars, slab joints,
underground fill covers, scored storefront pavement, entry mats, accessibility
markings and back-corner downpipes. Repeated detail meshes use instancing.
`assets/pumptex/body_texaco_albedo.png` is a derived paint/decal texture; the
original blue source texture is retained unchanged. Silver material metalness
is reduced for readable daylight rendering without an environment map.

Validation:
- `node --experimental-default-type=module tests/station-details.mjs`
- Inline JavaScript syntax and `git diff --check`.
- Headless Chromium: scene readiness, no JS/console errors, desktop Pumps view,
  Night control and mobile Site plan control. Browser tooling stays outside Git.

Small hardware and accessibility markings are visual modelling details, not an
as-built inventory or a claim of accessibility-code compliance.

### Forecourt accuracy follow-up

Fuelling cars now park parallel to the dispenser faces (across the canopy),
rather than pointing nose-first at the pumps. The generic high-contrast pavement
photograph is no longer used: the lot and aprons share a deterministic, subtle
broom-finished concrete texture, with separate slab-joint geometry. Source white
siding is replaced with an estimated limestone-course material, window frames
use a lower-metalness aluminum finish, and the red store fascia carries the name.
These are reference-led improvements, not an exact reconstruction of the shop's
openings or signage. A straight-on storefront photograph with doors and windows
unobstructed is still needed for those dimensions and placements.

Regression: `node --experimental-default-type=module tests/forecourt-alignment.mjs`

### Supplied pump and canopy design (reference-specific replacement)

`scripts/reference-design.js` replaces the generic OBJ pump and source canopy.
The eight reference-specific dispensers have silver frames, swept red/white
Techron graphics, red star cabinets, black terminals, LCD/payment/grade controls,
nozzle holsters, and hanging hose geometry. The canopy now uses white long-side
fascia, a low red ribbon, a black top cap, red end faces, raised TEXACO letters,
upright star roundels and tan masonry columns. The freestanding advertising
panels and three forecourt light poles were removed per the owner's markup.
The existing site footprint, paired pump positions, and local/geographic
orientation are retained. This is a reference-led design, not fabrication CAD.

Validation:
`node --experimental-default-type=module --loader ./tests/three-loader.mjs tests/reference-design.mjs`
plus the existing detail/alignment tests and a Chromium load/render check.

The newly vendored FontLoader/TextGeometry are Three.js r160 (MIT; see
`vendor/LICENSE-three.txt`). Helvetiker Bold is sourced from the same release;
its embedded Magenta/MgOpen font license is also in `assets/fonts/LICENSE.txt`.
All new assets are self-hosted. No Google API key is required or included.

### Owner-marked side landscaping

`scripts/store-side-landscape.js` adds connected raised sidewalks, a curbed grass
strip, a screened dumpster pad with gates and a lidded dumpster, and a 14 m pole
with an approximately 5.4 × 3.6 m Texas flag. The flag uses a locally drawn
blue/white/red single-star texture and animated cloth geometry anchored at its
hoist edge. A night uplight is attached to the pole; reduced-motion preferences
hold the flag still. The side parking markings are removed from the new grass
and the nearby pickup is moved clear of the outer walkway. Placement follows the
owner's annotated screenshot; measurements remain approximate.

Select **Flag & grounds** or use `?view=grounds` to inspect the new area.
Test: `node --experimental-default-type=module tests/store-side-landscape.mjs`.

### Flat-aerial recalibration (supersedes the earlier estimated road layout)

`scripts/reference-plan.js` contains the shared image coordinates and conversion
used by the store, canopy, wash, dumpster, signs, pavement and surrounding roads.
The basis is the supplied flat `Screenshot_20261028-111913_Chrome.jpg`, normalised
to 1256 × 1568 pixels. Four canopy corners anchor the image-to-building transform;
the tilted Maps images are not mixed into this ground-plane calibration.

- Approximate canopy footprint: 13.6 × 35.2 m; store: 16 × 21.4 m.
- Separate traced concrete forecourt, short dumpster approach, curved pedestrian
  sidewalk and grass islands replace the incorrect vehicle loop behind the store.
- The car wash has its own aerial-derived rotation rather than inheriting the
  storefront's heading. The screened dumpster is behind the store; the requested
  silver flagpole and animated Texas flag remain beside it.
- The frontage road curves independently of the station. I-35 is substantially
  farther east, with the cross street passing beneath its raised deck. Traffic
  follows the actual generated road curves rather than straight offset lanes.
- The hotel has a rear parking row and drive aisle, wheel stops and a frontage
  entrance. Nearby coffee/shop/McDonald's buildings remain approximate massing.
- **Aerial plan** (`?view=site`) aligns the display to the supplied close Maps comparison (hotel left, I-35 below). This is
  not a surveyed north-bearing claim. Clouds are suppressed in overhead views.

Road/pavement boundaries are visually traced estimates. The scale, hotel shell,
lane markings, neighbouring buildings and storefront openings are not surveyed,
Google-tile-georeferenced or an exact architectural reconstruction. No visitor
API key or remote map service is required.

Regression checks:

```sh
node --experimental-default-type=module tests/site-circulation.mjs
node --experimental-default-type=module tests/store-side-landscape.mjs
node --experimental-default-type=module tests/station-details.mjs
node --experimental-default-type=module tests/forecourt-alignment.mjs
node --experimental-default-type=module --loader ./tests/three-loader.mjs tests/reference-design.mjs
```

The checks include the four calibration anchors, road separation, clear hotel
parking/aisle spacing, concrete rear access, pump details and finite flag geometry.
A headless Chromium Aerial plan render is also checked for browser errors; these
checks do not establish photographic or survey accuracy.

### Startup and mobile rendering

Slow startup no longer triggers a permanent failure overlay. The loading screen
shows retry/simple-site options after 30 seconds; actual import/WebGL failures
show the fallback immediately. Successful first-frame rendering clears both
loading and stale fallback overlays. Mobile rendering caps pixel ratio at 1.25
and uses 1024-pixel sun shadows (desktop: 1.5 and 2048 respectively).

Regression: `node tests/startup.mjs`. Chromium checks also exercised a 390 × 844
high-DPI touch viewport, view buttons, and a deliberately blocked module request.

### Close aerial comparison corrections

The grass beside the canopy now has an uninterrupted curb; the main forecourt
opening is at the end of that island, not through the fuel-fill apron. Hotel
parking uses the image polygon and angled car row, with matching wheel stops and
walk, rather than an oversized rectangular pad. Motel massing includes recessed
room frontage and projecting cross gables, with doors/windows and timber details.
These roof/room details are still visual approximations, not measured elevations.
The cross-street median is continuous, the lane markings remain above pavement
in the depth buffer, and asphalt no longer has repeated artificial dark blotches.
Neighbouring lots are included as approximate traced pavement footprints.

### Marked forecourt cleanup

Removed all four blank freestanding advertising boards (including their posts
and bases) and all three standalone lot-light poles. Recessed canopy lights,
public-road lights and roadside Texaco price signs remain. Canopy end logos use
upright outward-facing circular meshes instead of rotated cylinder-cap textures,
so the star and T read upright from either end. The reference-design regression
checks both face orientations and the absence of the removed objects.

### Dumpster, rear grass and roof-mounted flag lighting

The enclosure is shifted 1.2 m toward local left, with grass strips behind the
store and enclosure, keeping the pad and gate clear. Rooftop equipment now seats
on the fitted store roof height rather than a fixed guessed elevation. A visible
roof-corner floodlight tracks that roof height and aims upward at the flag; it
lights at night. The silver pole remains unchanged. Cloth motion combines slow
gusts, travelling folds, changing wind direction, sag and faster free-edge flutter,
while keeping the hoist edge pinned and honoring reduced-motion preferences.
Regression tests check clearances, roof height, fixture aim, night activation,
anchoring and finite animated coordinates over long animation times.

### Roadside obstacle clearance

Legacy straight-road streetlight placements are removed. Streetlights, trees and
shrubs now check their full footprint (including lamp arms / tree canopies) against
the rendered road triangles plus a 0.5 m buffer. Checks cover both frontage roads,
I-35, the cross street, rear access and driveway/hotel aisle surfaces. Conflicting
decorations are omitted rather than arbitrarily pushed into another driveway.
Regression: `node --experimental-default-type=module tests/road-clearance.mjs`.

### Store-side aerial landscaping

The top-down references now drive separate curved/polygonal grass pockets and
walks rather than a rectangular sidewalk frame. Rear grass stays outside the
store footprint; the tan rear walk bends around the shifted dumpster instead of
crossing its enclosure. A front-door walkway, side-wall walk, curved side
connector and car-wash approach are linked, with a small curbed planted island
beside the accessible approach. The dumpster gate and parking bays stay open.
The requested silver pole, animated flag and roof-mounted spotlight are retained.
These are visually fitted outlines, not survey/accessibility-certified dimensions.
Browser verification: Aerial plan renders with no JavaScript errors or fallback.

The store now also has a 1.45 m wall-hugging sidewalk on the north and rear
walls and both exposed south-wall sections, joined to the existing storefront
walk. The south-wall segment directly behind the dumpster is deliberately left
unpaved across the full pad width. Adjacent rear grass was trimmed back to avoid
covering the new walk; overlapping old storefront slab geometry was removed.

The owner's green-marked screenshot defines two additional lawn strips: the
car-wash-facing side of the store and the rear wall outside its sidewalk. These
are explicit polygonal grass surfaces, replacing the smaller rear-lawn overlay;
wall-side concrete, the outer curved walk and dumpster access remain clear.
Grass uses depth bias to prevent underlying forecourt concrete bleeding through.

### Car-wash / accessible-approach correction

Removed the owner-crossed small planted island beside the accessible bay,
including its curb; the larger marked wall-side grass strips remain. Car-wash
position now uses measured roof corners in the same 111913 flat image as the
canopy and pavement. Its approximately 7.30 × 11.23 m footprint and -0.722 rad
rotation supersede the rejected second-image placement. Regression:
`node --experimental-default-type=module tests/car-wash-placement.mjs`.

### Shared-image car-wash and pavement retrace

All four wash roof corners are stored as source pixels in `reference-plan.js`.
Their converted centre, mean opposing-edge dimensions and heading define the
wash model; the regression checks the rectangle against each image corner.
The invented rear vehicle loop is removed. The forecourt ends along the curved
pedestrian path, with only a short service approach to the dumpster gate.
Frontage-road curvature and hotel-driveway endpoints have been retraced closer
to the source; both driveway tips are checked against the rendered road surface.
The source-image overlay and browser Aerial plan were inspected. Screenshot
resolution, perspective and assumed canopy scale still preclude survey accuracy.

### Owner-selected 111922 local reference (current local layout)

The owner selected `Screenshot_20261028-111922_Chrome.jpg` as authoritative for
the immediate station layout. `scripts/reference-close.js` stores its normalised
pixel outlines and a joint eight-corner store/canopy calibration. The car wash,
connected wash apron, forecourt, grass islands, pedestrian path and entrances
now use that image. An adapter expresses them in the existing scene frame;
wide-image context remains for the surrounding highway/hotel. The deliberately
shifted dumpster and its walking bypass retain the owner's custom placement.

**Reference** (`?view=reference`) is a close overhead comparison view with markers
hidden; **Aerial plan** remains the wider surroundings overview. Browser rendering
was checked without JS errors. `tests/reference-close.mjs` checks eight anchors
and consistency of the image-frame conversion; it does not prove survey accuracy.
This section supersedes the earlier 111913-only local-placement notes.

### Owner-painted broader pavement envelope (091341 markup)

The latest markup overrides the narrow aerial forecourt boundary for rendering:
a single continuous concrete apron now extends outside the curved rear walk,
wraps behind the store/car wash and broadens around the south sign/entrance.
Wall-side sidewalks and planted pockets remain separate raised surfaces. The
expanded apron is included in decoration clearance, so legacy trees/shrubs/poles
cannot be left in the newly paved area. This is an owner-directed layout change,
not a claim that the larger envelope was surveyed from the aerial.
Regression: `node --experimental-default-type=module tests/owner-pavement.mjs`.
