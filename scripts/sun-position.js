// Real solar position for the store coordinate (NOAA low-precision formulas,
// accurate to well under a degree). Used for the Day and Golden presets so
// shadows fall the way they do at 1185 I-35 N on the visitor's date.
export const SITE_LAT = 29.700512;
export const SITE_LON = -98.095070;
const RAD = Math.PI / 180;

function julian(date) { return date.getTime() / 86400000 + 2440587.5; }

// Elevation/azimuth in degrees (azimuth clockwise from true north).
export function solarPosition(date, lat = SITE_LAT, lon = SITE_LON) {
  const n = julian(date) - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = ((gmst * 15 + lon) % 360) * RAD;
  const ha = lst - ra, phi = lat * RAD;
  const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(ha));
  return { elevation: el / RAD, azimuth: ((az / RAD) % 360 + 360) % 360 };
}

// UTC milliseconds of solar noon and sunset on the given calendar day.
export function solarEvents(date, lat = SITE_LAT, lon = SITE_LON) {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  // Solar noon = maximum elevation within ±45 min of mean noon (ternary search),
  // then sunset = elevation crossing -0.833 deg (refraction + solar radius).
  const elev = t => solarPosition(new Date(t), lat, lon).elevation;
  let a = day + (12 - lon / 15) * 3600000 - 2700000, b = a + 5400000;
  for (let i = 0; i < 60; i++) {
    const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3;
    if (elev(m1) < elev(m2)) a = m1; else b = m2;
  }
  const noon = (a + b) / 2;
  let lo = noon, hi = noon + 10 * 3600000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (solarPosition(new Date(mid), lat, lon).elevation > -0.833) lo = mid; else hi = mid;
  }
  return { noon, sunset: lo };
}

// Preset times: Day = solar noon + 1 h (early afternoon); Golden = 40 min before sunset.
export function sunPresetTime(name, date = new Date()) {
  const { noon, sunset } = solarEvents(date);
  if (name === 'day') return new Date(noon + 3600000);
  if (name === 'golden') return new Date(sunset - 40 * 60000);
  return null;
}

// Light position in scene coordinates (+X east, +Y up, -Z true north), or null
// for presets that keep an artistic light (night).
export function sunPresetVector(name, date = new Date(), distance = 70) {
  const t = sunPresetTime(name, date);
  if (!t) return null;
  const { elevation, azimuth } = solarPosition(t);
  const el = Math.max(elevation, name === 'golden' ? 4 : 10) * RAD, az = azimuth * RAD;
  return [Math.sin(az) * Math.cos(el) * distance, Math.sin(el) * distance, -Math.cos(az) * Math.cos(el) * distance];
}
