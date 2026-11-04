// node --experimental-default-type=module tests/live-conditions.mjs
import assert from 'node:assert/strict';
import { lightingWeights, blendPresets, lerpHex, weatherAdjust, parseObservation, parseAlerts, weatherOverride, weatherSummary, fetchWeather, storeTime, compassPoint } from '../scripts/live-conditions.js';
import { moonIllumination, moonPosition, skyVector, solarPosition } from '../scripts/sun-position.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// Lighting weights: full day high, golden around the horizon, night after civil twilight.
assert.deepEqual(lightingWeights(40), { day: 1, golden: 0, night: 0 });
assert.deepEqual(lightingWeights(-12), { day: 0, golden: 0, night: 1 });
near(lightingWeights(10).day, 0.5, 1e-9, 'half day at +10°');
near(lightingWeights(-1).night, 0.5, 1e-9, 'half night at -1°');
for (let e = -20; e <= 60; e += 0.5) { const w = lightingWeights(e); near(w.day + w.golden + w.night, 1, 1e-9, `weights sum at ${e}`); }
console.log('PASS: lighting weights');

// Preset blending reproduces a preset exactly at full weight and mixes colours channel-wise.
const P = {
  day: { sky: [0x3d6fb8, 0x87b5e0, 0xdfe9f2], fog: 0x87b5e0, bg: 0x87b5e0, sun: 2.3, sunPos: [38, 46, 24], sunCol: 0xffffff, hemi: 0.55, exp: 1.06, stars: 0 },
  golden: { sky: [0x51628f, 0xe99a5f, 0xf7c489], fog: 0xe0a06a, bg: 0xe99a5f, sun: 1.65, sunPos: [-52, 12, 20], sunCol: 0xffb066, hemi: 0.32, exp: 1.02, stars: 0 },
  night: { sky: [0x02040c, 0x0a1a30, 0x12233e], fog: 0x0a1a30, bg: 0x0a1a30, sun: 0.45, sunPos: [-24, 38, -16], sunCol: 0x9db8ff, hemi: 0.4, exp: 1.18, stars: 1 }
};
const day = blendPresets(P, { day: 1, golden: 0, night: 0 });
assert.deepEqual(day.sky, P.day.sky); assert.equal(day.sun, 2.3); assert.equal(day.sunCol, 0xffffff);
const dusk = blendPresets(P, { day: 0, golden: 0.5, night: 0.5 });
near(dusk.sun, (1.65 + 0.45) / 2, 1e-9, 'blended sun'); near(dusk.stars, 0.5, 1e-9, 'blended stars');
assert.equal(lerpHex(0x000000, 0xffffff, 0.5), 0x808080);
assert.equal(lerpHex(0x102030, 0x405060, 0), 0x102030);
console.log('PASS: preset blending');

// Weather adjustments: overcast dims the sun and greys the sky, fog closes in, no weather is a no-op.
assert.equal(weatherAdjust(day, null, { day: 1 }), day);
const over = weatherAdjust(day, weatherOverride('overcast'), { day: 1, golden: 0, night: 0 });
assert.ok(over.sun < day.sun * 0.5, 'overcast dims the sun');
assert.notDeepEqual(over.sky, day.sky);
const foggy = weatherAdjust(day, weatherOverride('fog'), { day: 1, golden: 0, night: 0 });
assert.ok(foggy.fogFar < 200 && foggy.fogNear < 50, 'fog closes in');
assert.equal(weatherAdjust(blendPresets(P, { day: 0, golden: 0, night: 1 }), weatherOverride('overcast'), { day: 0, golden: 0, night: 1 }).stars, 0, 'clouds hide the stars');
console.log('PASS: weather adjustments');

// NWS observation parsing (shapes follow api.weather.gov /stations/{id}/observations/latest).
const now = new Date('2026-11-02T21:00:00Z');
const obs = (props) => ({ properties: { timestamp: '2026-11-02T20:51:00+00:00', ...props } });
const clear = parseObservation(obs({ textDescription: 'Clear', temperature: { unitCode: 'wmoUnit:degC', value: 20 }, windSpeed: { unitCode: 'wmoUnit:km_h-1', value: 16 }, windDirection: { unitCode: 'wmoUnit:degree_(angle)', value: 180 }, visibility: { unitCode: 'wmoUnit:m', value: 16090 }, cloudLayers: [{ amount: 'CLR', base: { value: null } }], presentWeather: [] }), now);
near(clear.tempF, 68, 1e-9, '20 °C'); near(clear.windMph, 9.94, 0.01, '16 km/h'); assert.equal(clear.cloud, 0); assert.equal(clear.rain, 0); assert.equal(clear.fog, 0); assert.equal(clear.stale, false);
assert.equal(weatherSummary(clear), '68°F · Clear · Wind S 10 mph');
const rain = parseObservation(obs({ textDescription: 'Light Rain', temperature: { unitCode: 'wmoUnit:degC', value: 15 }, cloudLayers: [{ amount: 'BKN' }, { amount: 'OVC' }], presentWeather: [{ intensity: 'light', weather: 'rain', rawString: '-RA' }], visibility: { value: 8000 } }), now);
assert.equal(rain.rain, 0.4); assert.equal(rain.cloud, 1); assert.equal(rain.thunder, false);
const storm = parseObservation(obs({ textDescription: 'Thunderstorms and Rain', presentWeather: [{ intensity: 'heavy', weather: 'thunderstorms' }] }), now);
assert.equal(storm.rain, 1); assert.equal(storm.thunder, true); assert.ok(storm.cloud >= 0.8);
const fog = parseObservation(obs({ textDescription: 'Fog/Mist', visibility: { value: 400 } }), now);
assert.equal(fog.fog, 1);
const old = parseObservation({ properties: { timestamp: '2026-11-02T14:00:00+00:00', textDescription: 'Clear' } }, now);
assert.equal(old.stale, true); assert.equal(weatherSummary(old), '', 'stale observations are not shown');
assert.equal(parseObservation({}), null);
const nulls = parseObservation(obs({ textDescription: 'Mostly Cloudy', temperature: { value: null }, windSpeed: { value: null } }), now);
assert.equal(nulls.tempF, null); assert.equal(nulls.cloud, 0.75); assert.equal(weatherSummary(nulls), 'Mostly Cloudy');
assert.equal(compassPoint(0), 'N'); assert.equal(compassPoint(350), 'N'); assert.equal(compassPoint(135), 'SE');
console.log('PASS: observation parsing');

// Alerts sorted most severe first.
const alerts = parseAlerts({ features: [
  { properties: { event: 'Wind Advisory', headline: 'Wind Advisory until 6 PM', severity: 'Moderate' } },
  { properties: { event: 'Flash Flood Warning', headline: 'Flash Flood Warning until 9 PM', severity: 'Severe' } },
  { properties: {} }
] });
assert.deepEqual(alerts.map(a => a.event), ['Flash Flood Warning', 'Wind Advisory']);
assert.deepEqual(parseAlerts(null), []);
console.log('PASS: alerts');

// Fetch: parses both endpoints; a failing network yields nulls, never throws.
const calls = [];
const fakeFetch = async (url) => { calls.push(url); return { ok: true, json: async () => url.includes('/alerts/') ? { features: [] } : obs({ textDescription: 'Clear', temperature: { value: 25 } }) }; };
const got = await fetchWeather({ fetchImpl: fakeFetch });
assert.ok(calls.some(u => u.includes('/stations/KBAZ/observations/latest')) && calls.some(u => u.includes('/alerts/active?point=29.7005,-98.0951')));
near(got.observation.tempF, 77, 1e-9, '25 °C'); assert.deepEqual(got.alerts, []);
const down = await fetchWeather({ fetchImpl: async () => { throw new Error('offline'); } });
assert.equal(down.observation, null); assert.equal(down.alerts, null);
const bad = await fetchWeather({ fetchImpl: async () => ({ ok: false, status: 503 }) });
assert.equal(bad.observation, null);
console.log('PASS: weather fetch and fallbacks');

// Store time is Central Time (CST after 1 Nov 2026).
assert.equal(storeTime(new Date('2026-11-02T21:42:00Z')), '3:42 PM');
assert.equal(storeTime(new Date('2026-07-04T17:05:00Z')), '12:05 PM');
console.log('PASS: Central Time clock');

// Moon: full, new and first-quarter dates in January 2026.
assert.ok(moonIllumination(new Date('2026-01-03T10:03:00Z')).fraction > 0.98, 'full moon 3 Jan 2026');
assert.ok(moonIllumination(new Date('2026-01-18T19:52:00Z')).fraction < 0.02, 'new moon 18 Jan 2026');
const q = moonIllumination(new Date('2026-01-26T04:47:00Z'));
near(q.fraction, 0.5, 0.06, 'first quarter 26 Jan 2026'); near(q.phase, 0.25, 0.03, 'first-quarter phase');
for (let h = 0; h < 48; h += 3) {
  const m = moonPosition(new Date(Date.UTC(2026, 10, 2, h)));
  assert.ok(m.altitude >= -90 && m.altitude <= 90 && m.azimuth >= 0 && m.azimuth < 360);
}
const up = skyVector(90, 0, 70); near(up[1], 70, 1e-9, 'zenith'); near(Math.hypot(up[0], up[2]), 0, 1e-9, 'zenith horizontal');
const south = skyVector(0, 180, 10); near(south[2], 10, 1e-9, 'south is +Z (north is -Z)');
// Sun at the store is up at local noon and down at local midnight.
assert.ok(solarPosition(new Date('2026-11-02T18:00:00Z')).elevation > 35);
assert.ok(solarPosition(new Date('2026-11-03T06:00:00Z')).elevation < -40);
console.log('PASS: moon phase/position and sky directions');
