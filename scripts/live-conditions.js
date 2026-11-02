// Live conditions for the 3D station: real-time lighting from the sun's
// position at the store, and current weather from the National Weather
// Service (api.weather.gov — free, public domain, no key) for the New
// Braunfels airport station (KBAZ), with active alerts for the store's point.
import { SITE_LAT, SITE_LON } from './sun-position.js';

export const NWS_STATION = 'KBAZ';
export const TIME_ZONE = 'America/Chicago';
const clamp01 = v => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------- lighting ----------------
// Weights of the Day / Golden / Night presets for a sun elevation (degrees):
// full day above +16°, golden around the horizon, full night below -6°
// (end of civil twilight). Always sums to 1.
export function lightingWeights(elevation) {
  if (!Number.isFinite(elevation)) return { day: 1, golden: 0, night: 0 };
  if (elevation >= 16) return { day: 1, golden: 0, night: 0 };
  if (elevation >= 4) { const t = (elevation - 4) / 12; return { day: t, golden: 1 - t, night: 0 }; }
  if (elevation >= -6) { const t = (elevation + 6) / 10; return { day: 0, golden: t, night: 1 - t }; }
  return { day: 0, golden: 0, night: 1 };
}
export function lerpHex(a, b, t) {
  t = clamp01(t);
  const ch = (v, s) => (v >> s) & 255;
  return [16, 8, 0].reduce((out, s) => out | (Math.round(lerp(ch(a, s), ch(b, s), t)) << s), 0);
}
function mixHex(entries) { // [[hex, weight], ...] with weights summing to 1
  let r = 0, g = 0, b = 0;
  for (const [c, w] of entries) { r += ((c >> 16) & 255) * w; g += ((c >> 8) & 255) * w; b += (c & 255) * w; }
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
// Blend the scene's presets by weight: colours channel-wise, numbers linearly.
export function blendPresets(presets, w) {
  const names = ['day', 'golden', 'night'].filter(n => (w[n] || 0) > 0);
  const out = {};
  for (const key of Object.keys(presets.day)) {
    const v = presets.day[key];
    if (key === 'sky') out.sky = v.map((_, i) => mixHex(names.map(n => [presets[n].sky[i], w[n]])));
    else if (/^(fog|bg|sunCol)$/.test(key)) out[key] = mixHex(names.map(n => [presets[n][key], w[n]]));
    else if (Array.isArray(v)) out[key] = v.map((_, i) => names.reduce((s, n) => s + presets[n][key][i] * w[n], 0));
    else out[key] = names.reduce((s, n) => s + presets[n][key] * w[n], 0);
  }
  out.fogNear ??= 260; out.fogFar ??= 650;
  return out;
}

// Overcast versions of the preset skies, mixed in by cloud, rain and fog.
const OVERCAST = {
  day:    { sky: [0x8f99a4, 0xaeb6bf, 0xc9ced3], fog: 0xb3bac1, bg: 0xaeb6bf },
  golden: { sky: [0x5b6070, 0x9a8a80, 0xb39f90], fog: 0x9c8f86, bg: 0x9a8a80 },
  night:  { sky: [0x07090d, 0x10141b, 0x181d25], fog: 0x10141b, bg: 0x10141b }
};
// Apply a parsed weather state to a blended preset.
export function weatherAdjust(T, wx, w) {
  if (!wx) return T;
  const cloud = clamp01(wx.cloud), rain = clamp01(wx.rain), fog = clamp01(wx.fog);
  const grey = clamp01(cloud * 0.85 + rain * 0.35 + fog * 0.5), dim = clamp01(cloud * 0.9 + rain * 0.4 + fog * 0.3);
  const over = blendPresets(OVERCAST, w);
  return {
    ...T,
    sky: T.sky.map((c, i) => lerpHex(c, over.sky[i], grey)),
    bg: lerpHex(T.bg, over.bg, grey),
    fog: lerpHex(T.fog, over.fog, Math.max(grey, fog)),
    sun: T.sun * (1 - 0.72 * dim),
    hemi: T.hemi * (1 + 0.35 * cloud),
    exp: T.exp * (1 - 0.05 * cloud - 0.07 * rain),
    stars: T.stars * (1 - cloud) * (1 - fog),
    fogNear: lerp(T.fogNear ?? 260, 18, fog),
    fogFar: lerp(T.fogFar ?? 650, 120, fog)
  };
}

// ---------------- weather ----------------
const COVER = { SKC: 0, CLR: 0, NCD: 0, NSC: 0.1, FEW: 0.2, SCT: 0.45, BKN: 0.75, OVC: 1, VV: 1 };
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compassPoint = deg => Number.isFinite(deg) ? COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16] : '';
function quantity(q, kind) {
  const v = q?.value;
  if (v === null || v === undefined || !Number.isFinite(+v)) return null;
  const unit = q.unitCode || '';
  if (kind === 'temp') return /degF/.test(unit) ? +v : +v * 9 / 5 + 32;              // °F
  if (kind === 'speed') return /m_s-1/.test(unit) ? +v * 2.23694 : /km_h-1/.test(unit) ? +v * 0.621371 : +v; // mph
  return +v;
}
// Normalise an NWS /observations/latest response.
export function parseObservation(json, now = new Date()) {
  const p = json?.properties;
  if (!p) return null;
  const text = (p.textDescription || '').trim();
  const t = text.toLowerCase();
  const layers = Array.isArray(p.cloudLayers) ? p.cloudLayers : [];
  let cloud = layers.reduce((m, l) => Math.max(m, COVER[l?.amount] ?? 0), 0);
  if (!layers.length) cloud = /overcast/.test(t) ? 1 : /mostly cloudy/.test(t) ? 0.75 : /partly|scattered/.test(t) ? 0.45 : /cloudy/.test(t) ? 0.9 : /few clouds/.test(t) ? 0.2 : 0;
  const present = (Array.isArray(p.presentWeather) ? p.presentWeather : []).map(w => `${w?.intensity || ''} ${w?.weather || ''}`.toLowerCase()).join(' ');
  const wxText = `${t} ${present}`;
  let rain = 0;
  if (/thunder/.test(wxText)) rain = 1;
  else if (/heavy (rain|showers)/.test(wxText)) rain = 0.9;
  else if (/(light|drizzle)/.test(wxText) && /(rain|drizzle|showers)/.test(wxText)) rain = 0.4;
  else if (/(rain|showers)/.test(wxText)) rain = 0.65;
  const vis = quantity(p.visibility);
  let fog = vis === null ? 0 : vis < 1000 ? 1 : vis < 3000 ? 0.6 : vis < 6000 ? 0.3 : 0;
  if (/fog/.test(wxText)) fog = Math.max(fog, 0.6);
  else if (/mist|haze|smoke/.test(wxText)) fog = Math.max(fog, 0.25);
  if (rain) cloud = Math.max(cloud, 0.8);
  const time = p.timestamp ? new Date(p.timestamp) : null;
  return {
    text, cloud, rain, fog, thunder: /thunder/.test(wxText),
    tempF: quantity(p.temperature, 'temp'),
    windMph: quantity(p.windSpeed, 'speed'), gustMph: quantity(p.windGust, 'speed'),
    windDir: quantity(p.windDirection),
    time, stale: !time || now - time > 3 * 3600 * 1000
  };
}
// Active alerts for the store's location, most severe first.
const SEVERITY = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 };
export function parseAlerts(json) {
  const list = Array.isArray(json?.features) ? json.features : [];
  return list.map(f => f?.properties || {}).filter(p => p.event)
    .map(p => ({ event: String(p.event), headline: String(p.headline || p.event), severity: p.severity || 'Unknown', ends: p.ends || p.expires || null }))
    .sort((a, b) => (SEVERITY[b.severity] || 0) - (SEVERITY[a.severity] || 0));
}
// Named weather for demos and testing (?wx=clear|cloudy|overcast|rain|storm|fog).
export function weatherOverride(name) {
  const base = { tempF: 74, windMph: 9, gustMph: null, windDir: 160, time: new Date(), stale: false, thunder: false, cloud: 0, rain: 0, fog: 0 };
  const table = {
    clear: { text: 'Clear', cloud: 0 }, cloudy: { text: 'Partly Cloudy', cloud: 0.45 },
    overcast: { text: 'Overcast', cloud: 1 }, rain: { text: 'Rain', cloud: 1, rain: 0.65, windMph: 14 },
    storm: { text: 'Thunderstorms and Rain', cloud: 1, rain: 1, thunder: true, windMph: 24, gustMph: 38 },
    fog: { text: 'Fog/Mist', cloud: 0.9, fog: 1, windMph: 2 }
  };
  return table[name] ? { ...base, ...table[name] } : null;
}
async function getJSON(fetchImpl, url, timeoutMs) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { headers: { Accept: 'application/geo+json' }, signal: ctrl?.signal });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return await res.json();
  } finally { if (timer) clearTimeout(timer); }
}
// Fetch the latest observation and active alerts. Either part may be null on
// failure; callers keep their previous state rather than going blank.
export async function fetchWeather({ fetchImpl = globalThis.fetch, station = NWS_STATION, lat = SITE_LAT, lon = SITE_LON, timeoutMs = 9000 } = {}) {
  const base = 'https://api.weather.gov';
  const [obs, alerts] = await Promise.allSettled([
    getJSON(fetchImpl, `${base}/stations/${station}/observations/latest`, timeoutMs),
    getJSON(fetchImpl, `${base}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`, timeoutMs)
  ]);
  return {
    observation: obs.status === 'fulfilled' ? parseObservation(obs.value) : null,
    alerts: alerts.status === 'fulfilled' ? parseAlerts(alerts.value) : null
  };
}
// "3:42 PM" in the store's time zone.
export function storeTime(date) {
  try { return new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' }).format(date); }
  catch { return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
}
// One-line summary for the on-screen chip.
export function weatherSummary(wx) {
  if (!wx || wx.stale) return '';
  const parts = [];
  if (Number.isFinite(wx.tempF)) parts.push(`${Math.round(wx.tempF)}°F`);
  if (wx.text) parts.push(wx.text);
  if (Number.isFinite(wx.windMph)) parts.push(wx.windMph < 1 ? 'Calm' : `Wind ${compassPoint(wx.windDir)} ${Math.round(wx.windMph)} mph`.replace('  ', ' '));
  return parts.join(' · ');
}
