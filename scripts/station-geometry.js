// Measured station geometry (USGS 3DEP 2017 StratMap lidar + OpenStreetMap),
// fitted in a local true-north frame around the store coordinate. See README
// "Measured geometry (lidar/OSM)". Heights are metres above the forecourt slab.
//
// The screenshot calibration anchors in reference-plan.js / reference-close.js
// still drive the traced ground layout; these constants size the 3D model.

// Canopy roof returns: 32.4 x 12.8 m (core 31.6 x 12.1), roof deck ~5.34 m,
// fascia/edge returns to ~5.69 m. The underside cannot be seen by airborne
// lidar, so `clearance` (14 ft 6 in) is an assumption until the posted
// clearance sign is read; everything below the fascia derives from it.
const canopyEdgeTop = 5.69;
const canopyFascia = 0.99;
const canopyEdge = 0.13;
const canopySoffit = 0.16;
export const CANOPY = Object.freeze({
  width: 12.8,
  length: 32.4,
  centerZ: -2,
  edgeTop: canopyEdgeTop,
  roofTop: 5.34,
  fasciaTop: canopyEdgeTop - canopyEdge,
  fasciaBottom: canopyEdgeTop - canopyEdge - canopyFascia,
  clearance: canopyEdgeTop - canopyEdge - canopyFascia - canopySoffit,
  fasciaDepth: canopyFascia,
  edgeDepth: canopyEdge,
  soffitDepth: canopySoffit,
  get startZ() { return this.centerZ - this.length / 2; },
  get endZ() { return this.centerZ + this.length / 2; }
});

// Store: wall outline (OSM 19.8 x 15.8 m) and roof returns (21.2 x 17.3 m)
// both agree with the existing 21.4 x 16 m plan, so the footprint is kept.
// Height: roof deck ~4.09 m, parapet/fascia edge ~4.65 m, rooftop units to ~5.2 m.
export const STORE = Object.freeze({
  roofDeck: 4.09,
  parapetTop: 4.65
});

// Rigid fit of the screenshot-built layout onto the lidar footprints
// (store, canopy and car-wash centres; residuals 0.4-1.3 m): the whole site
// turns a further 5.81 degrees clockwise seen from above.
export const SITE_HEADING_DEG = -35 - 5.81;

// Recessed canopy light grid (8 rows x 2 banks) spread along the canopy.
export function canopyLightRows(rows = 8, inset = 2.0) {
  const first = CANOPY.startZ + inset, step = (CANOPY.length - inset * 2) / (rows - 1);
  return Array.from({ length: rows }, (_, r) => first + r * step);
}
