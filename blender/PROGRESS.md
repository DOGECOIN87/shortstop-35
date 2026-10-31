# Blender progress checkpoint — October 30, 2026

This is an in-progress scene checkpoint, not a finished website release.

Saved source: `blender/shortstop_station.blend`.

Completed in the current Blender scene:

- Packed tileable walk, curb, and asphalt image textures; UVs added to 70 pavement surfaces, with along-path sidewalk UVs.
- Corrected ground-level carriageway height so asphalt no longer covers the stamped medians.
- Rebuilt continuous reference-area asphalt and seven island outlines, using the local reference mosaic and existing outside curb traces.
- Replaced overlapping island surfaces with separate concrete borders and stamped infill.
- Moved three signal-mast assemblies onto island pads with clearance around their bases.
- Kept three reference-based streetlight groups and parked unsupported approximate lamps in hidden QA collections.
- Added a 144-second traffic animation with 25 vehicles and a 72-second signal cycle. This bake predates the latest road reconstruction and needs revalidation.

Current review state:

- Moving traffic and the previous road paint are temporarily hidden for inspection of the road boundaries.
- The station-side access road is one-way southwest; do not introduce opposing lanes or a two-way centre divider.
- The roof spotlight, building/pump positions, storefront decisions, flag, and car templates are preserved.
- Original road islands and approximate lamps are retained in hidden `zz QA` collections.

Remaining work:

1. Repair the four overpass deck-to-road approach joins; existing approach width/height discontinuities are still visible.
2. Finish and visually verify all road boundaries, ramps, and markings against the imagery. Boundaries in bridge shadow remain approximate.
3. Rebuild crosswalks and lane markings on the corrected top road surface.
4. Refit and revalidate traffic against the corrected roads, restore its visibility, and check signal queueing.
5. Finish and verify the website export and camera tour, then publish the website changes.

The deployed web GLB and website source are not updated by this Blender-only checkpoint.
Reference imagery and screenshots must not be committed.
