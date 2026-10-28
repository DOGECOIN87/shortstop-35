# Texaco ShortStop — shortstop35.store

Official website for Texaco ShortStop, 1185 Interstate 35 N, New Braunfels, TX 78130 · (830) 606-1892

- `index.html` — interactive 3D site (Three.js, self-hosted in `vendor/` — no CDN dependency)
- `classic.html` — lightweight non-3D version
- Hosted on GitHub Pages. Custom domain: shortstop35.store (see CNAME).
- 3D deep links: `?view=pumps|store|road|overview` and `?time=day|golden|night`
- To update the site, edit the HTML and commit — GitHub Pages redeploys automatically.

## 3D model credits

- "BMW E46 MSport" by Ricy (https://sketchfab.com/ngon_3d), licensed CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/bmw-e46-msport-614c2f1660474178a1d4717b7492d1c7. Modified: geometry compressed, textures resized to WebP, car paint recoloured in the page.
- "Low Poly Tesla Cybertruck" by kulonee (https://sketchfab.com/ynesolefru), Sketchfab Standard license. Source: https://sketchfab.com/3d-models/low-poly-tesla-cybertruck-64b4af3ab92543d297992ac4c2f8ed96. Modified: geometry compressed, materials adjusted in the page.

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

The completed site group is rotated by an estimated -35° about world Y so the
highway runs NE/SW rather than straight north/south. This is a visual heading
estimate, not a surveyed bearing. `?view=site` is north-up (world -Z); close-up
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
