# Handover prompt: raise the sidewalks to curb height across the whole map

Paste everything below into the next session.

---

## Task

In the 3D site (`index.html`, Three.js, no build step), every sidewalk on the map sits too low. Along the sidewalk edges there is a raised curb line, and the sidewalk surface is below the top of it. Fix every sidewalk area on the map so that:

- the sidewalk's top surface is level with the top of its raised curb line, and
- the sidewalk is about **6 inches (0.15 m) above the adjacent parking lot**.

The site is not flat: parking lots and the forecourt sit at different levels, with ground height varying by more than a metre. Each sidewalk must sit 0.15 m above the lot it borders, not at one global height.

## What you're actually editing (important)

The page shows a Blender export, not the procedural scene:

- `assets/web-station/shortstop_detailed.glb` is exported from `blender/shortstop_station.blend` (collection "20a Ground, paving & landscape").
- It's loaded at the end of `index.html`, in the block that starts `/* ===== Detailed station model built in Blender`. The root is placed at `(-37.55, -0.4, -5.33)` in scene space.
- After loading, that block hides every procedural object: `world.children.forEach(c => { if (!keepMoving.has(c)) c.visible = false; })`. Only moving traffic stays visible.
- So the sidewalks and curbs you see come from the GLB. The procedural sidewalks only appear if the GLB fails to load.

What's inside the GLB:

- It uses `EXT_meshopt_compression` and `KHR_mesh_quantization`: positions are quantised int16 under scaled nodes. The flag code in the same `index.html` block shows how to bake that geometry to float metres in root space; reuse that pattern.
- Sidewalks are **one merged mesh**, material `SS Walk concrete`. Its first node is named "Frontage sidewalk (traced)" and it has 22,531 vertices covering the whole map.
- Curbs are merged into material `SS Curb concrete`: 2 meshes, about 121k vertices. This material also covers island borders and road medians, including the I-35 pier median. Don't treat every `SS Curb concrete` vertex as a sidewalk curb.
- Roads use `SS Asphalt`. Lot and forecourt paving has no named material: it's merged into palette materials such as `PaletteMaterial001`.

Measured from the GLB at 0.5 m sampling: 458 of 459 walk cells within 1 m of a curb sit below that curb's top.

Blender is not installed in the cloud container (`which blender` finds nothing).

## Approach

1. If you have Blender, fix the sidewalks in `blender/shortstop_station.blend`, which is the source of truth. Re-export to the same path with the same frame and compression (the deployed GLB is about 5.6 MB).
2. Otherwise, correct the geometry at load time in `index.html`, right after the GLB is added. Keep it data-driven, not a list of hand-placed patches:
   1. Find the `SS Walk concrete` mesh and bake its positions to float, like the flag code does.
   2. For each walk vertex, find the local lot height by raycasting down against the paving and asphalt meshes, excluding walk and curb meshes.
   3. Set the walk's top to lot + 0.152 m, and to the nearby curb top where a curb line borders it.
   4. Raise top faces as a whole surface, so walks stay planar where they were planar.
   5. Check the walk's edges for gaps or see-through slits. Add or extend skirt faces down to the lot if needed.
   6. Do not move curbs, lawns, buildings, pumps, islands or roads.
3. Make the procedural fallback match, so the scene is right even when the GLB doesn't load:
   - The procedural pavement is at `y = 0.025` (`Traced-forecourt-footprint` in `scripts/site-circulation.js`), so walk tops should be about 0.177 and curb tops flush with them.
   - `index.html` `Station-front-sidewalk` boxes (around lines 841–860) have tops at about 0.04, which is far too low.
   - The store wall walks, connector and approach walks in `scripts/store-side-landscape.js` sit at 0.14.
   - `Traced-rear-pedestrian-walk` in `scripts/site-circulation.js` sits at 0.14.
   - The curbs in both of those files are 0.14 tall with tops at 0.15.
   - The shared walk and pavement polygons come from `scripts/surface-plan.js`.

## Verify

- **Numbers:** after the fix, re-sample the decoded GLB. Walk top minus curb top should be within ±0.02 m wherever a curb borders a walk, and walk top minus the adjacent lot should be about 0.15 m.
- **Decoding in Node for analysis:** strip `images`, `textures` and `samplers` (and material texture references) from the GLB's JSON chunk. Then parse it with `vendor/jsm/loaders/GLTFLoader.js` and `vendor/jsm/libs/meshopt_decoder.module.js` under `node --loader ./tests/three-loader.mjs`.
- **Visuals:** take close-ups of the storefront walks, the walks along the frontage road, and the walks by the hotel and south lots.
  - The full page renders at about 0.5 fps in headless Chromium.
  - Use `?view=store|pumps|grounds|road|site` and `&time=day` to set the camera at load, and turn the tour off.
  - Playwright clicks on the toolbar time out; use `page.evaluate(() => el.click())` instead.
  - For fast close-ups, load just the GLB in a minimal Three.js page (GLTFLoader + MeshoptDecoder, root at `(-37.55, -0.4, -5.33)`).
  - Start the local server with `python3 scripts/preview-server.py --port 8081`.
- **Tests:**
  - Run with `node --experimental-default-type=module --loader ./tests/three-loader.mjs tests/<name>.mjs`; tests that don't import Three.js add-ons can drop the `--loader` flag.
  - These four already fail on `main` before any sidewalk work: `forecourt-alignment`, `owner-pavement` ("owner-marked pavement at -47,-3 must be filled"), `road-clearance` and `store-side-landscape` ("grass remains beyond rear wall sidewalk"). `owner-pavement` and `store-side-landscape` cover sidewalks, so check whether your change affects them, but don't count their existing failures as yours.

## Repo and branch notes

- The previous session's canopy and pump work is not on GitHub: pushes failed with a 403 because the Claude GitHub App has read-only access to `DOGECOIN87/shortstop-35`. The owner has it as a patch file. Check write access before starting, and base your work on whichever branch the owner tells you to.
- That canopy and pump work is procedural, so the GLB override described above hides it too. It isn't part of this task, but don't be surprised by it.
