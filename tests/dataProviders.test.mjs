import test from 'node:test';
import assert from 'node:assert/strict';
import { requestData, clearDataCache, DataSourceError } from '../src/services/data/http.js';
import { isPossiblyInUnitedStates } from '../src/services/data/coverage.js';
import { mod13q1Composites, chunk, normalizeNdviSubsets, getModisNdvi } from '../src/services/nasa/modisNdvi.js';
import { aggregateEra5Monthly, getEra5Monthly } from '../src/services/era5/openMeteoEra5.js';
import { parseSsurgo, getSsurgoAtPoint } from '../src/services/usda/ssurgo.js';
import { getPowerRecentMonths } from '../src/services/nasa/powerMonthly.js';
import { MODIS_NDVI_EGYPT, MODIS_RELIABILITY_EGYPT, MODIS_TOO_MANY_DATES, ERA5_EGYPT, SDA_IOWA, SDA_EGYPT } from './fixtures/realResponses.mjs';

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

test('request helper: retries 503, does not retry 400, reports timeouts and cancellations', async () => {
  let calls = 0;
  const flaky = async () => { calls += 1; return calls === 1 ? json('busy', 503) : json({ ok: 1 }); };
  const answer = await requestData('https://x.test/a', { fetchImpl: flaky, retries: 1 });
  assert.equal(calls, 2);
  assert.deepEqual(answer.data, { ok: 1 });
  assert.equal(answer.fromCache, false);

  calls = 0;
  await assert.rejects(requestData('https://x.test/b', { fetchImpl: async () => { calls += 1; return json('bad', 400); }, retries: 2 }), (e) => e.code === 'http' && e.status === 400);
  assert.equal(calls, 1);

  const never = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  await assert.rejects(requestData('https://x.test/c', { fetchImpl: never, timeoutMs: 30, retries: 0 }), (e) => e.code === 'timeout');

  const controller = new AbortController();
  const pending = requestData('https://x.test/d', { fetchImpl: never, timeoutMs: 5000, retries: 0, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (e) => e.code === 'aborted');
});

test('request helper: identical requests share one call and later ones come from cache', async () => {
  clearDataCache();
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; await new Promise((r) => setTimeout(r, 10)); return json({ n: calls }); };
  try {
    const [a, b] = await Promise.all([requestData('https://x.test/same'), requestData('https://x.test/same')]);
    assert.equal(calls, 1);
    assert.deepEqual(a.data, b.data);
    const c = await requestData('https://x.test/same');
    assert.equal(calls, 1);
    assert.equal(c.fromCache, true);
  } finally { globalThis.fetch = original; clearDataCache(); }
});

test('coverage: US-only service is gated before any request', async () => {
  assert.equal(isPossiblyInUnitedStates(42.0, -93.5), true);
  assert.equal(isPossiblyInUnitedStates(30.82, 31.31), false); // Nile Delta
  assert.equal(isPossiblyInUnitedStates(-15.6, -56.1), false); // Brazil
  let called = false;
  const result = await getSsurgoAtPoint({ latitude: 30.82, longitude: 31.31, fetchImpl: async () => { called = true; return json({}); } });
  assert.equal(result.status, 'not-covered');
  assert.equal(called, false);
});

test('MODIS: composite dates follow the 16-day Terra calendar and respect the 10-per-request limit', () => {
  const codes = mod13q1Composites('2025-11-01', '2026-02-18');
  assert.deepEqual(codes.map((c) => c.code), ['A2025305', 'A2025321', 'A2025337', 'A2025353', 'A2026001', 'A2026017', 'A2026033', 'A2026049']);
  assert.deepEqual(codes.map((c) => c.date), MODIS_NDVI_EGYPT.subset.map((s) => s.calendar_date)); // same dates as the real service
  const year = mod13q1Composites('2025-11-13', '2026-11-12');
  assert.equal(year.length, 23);
  assert.deepEqual(chunk(year).map((g) => g.length), [10, 10, 3]);
  assert.match(MODIS_TOO_MANY_DATES, /maximum subset tiles support of 10/);
  assert.equal(mod13q1Composites('1999-01-01', '2000-03-01')[0].date, '2000-02-18'); // record start
});

test('MODIS: real NDVI subset is scaled and quality-filtered', () => {
  const { series, cellsizeM, tile } = normalizeNdviSubsets([MODIS_NDVI_EGYPT], [MODIS_RELIABILITY_EGYPT]);
  assert.equal(series.length, 8);
  assert.equal(series[0].ndvi, 0.5397);
  assert.equal(series[3].ndvi, 0.7904);
  assert.equal(series[3].quality, 'marginal');
  assert.equal(Math.round(cellsizeM), 232);
  assert.equal(tile, 'h20v05');
  const cloudy = structuredClone(MODIS_RELIABILITY_EGYPT); cloudy.subset[1].data = [3];
  const fill = structuredClone(MODIS_NDVI_EGYPT); fill.subset[2].data = [-3000];
  const out = normalizeNdviSubsets([fill], [cloudy]).series;
  assert.equal(out[1].ndvi, null); assert.equal(out[1].quality, 'cloudy');
  assert.equal(out[2].ndvi, null);
});

test('MODIS: requests are split, and a not-yet-processed period is treated as missing', async () => {
  const urls = [];
  const fake = async (url) => {
    urls.push(url);
    const u = new URL(url);
    if (u.searchParams.get('startDate') !== 'A2025305') return json('"No data available for time period A2026065 to A2026209 for MOD13Q1 30.82 31.31 combination."', 400);
    return json(u.searchParams.get('band') === '250m_16_days_NDVI' ? MODIS_NDVI_EGYPT : MODIS_RELIABILITY_EGYPT);
  };
  const result = await getModisNdvi({ latitude: 30.82, longitude: 31.31, startDate: '2025-11-01', endDate: '2026-07-28', fetchImpl: fake });
  assert.equal(urls.length, 4); // 2 date groups × 2 bands
  assert.ok(urls.every((u) => (new URL(u).searchParams.get('kmAboveBelow') === '0')));
  assert.equal(result.series.length, 8);
  assert.equal(result.fromCache, false);
});

test('ERA5: real daily response is grouped by month; partial months get no totals', () => {
  const months = aggregateEra5Monthly(ERA5_EGYPT);
  assert.deepEqual(months.map((m) => m.key), ['2026-01', '2026-02']);
  assert.equal(months[0].complete, false);
  assert.equal(months[0].rainMm, null);
  assert.equal(months[0].daysWithData.et0Mm, 2);
});

test('ERA5: complete month totals and means are exact', () => {
  const time = Array.from({ length: 30 }, (_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`);
  const fill = (v) => time.map(() => v);
  const months = aggregateEra5Monthly({ daily: { time, temperature_2m_mean: fill(20), precipitation_sum: fill(1), et0_fao_evapotranspiration: fill(5), soil_moisture_0_to_7cm_mean: fill(0.2), soil_moisture_7_to_28cm_mean: fill(0.25) } });
  assert.equal(months[0].complete, true);
  assert.equal(months[0].rainMm, 30);
  assert.equal(months[0].et0Mm, 150);
  assert.ok(Math.abs(months[0].soil0to7 - 0.2) < 1e-12);
});

test('ERA5: request names the ERA5 model explicitly (never best_match)', async () => {
  let seen;
  const result = await getEra5Monthly({ latitude: 30.82, longitude: 31.31, startDate: '2026-01-30', endDate: '2026-02-02', fetchImpl: async (url) => { seen = new URL(url); return json(ERA5_EGYPT); } });
  assert.equal(seen.searchParams.get('models'), 'era5');
  assert.equal(result.grid.latitude, 30.75);
  assert.equal(result.units.soil_moisture_0_to_7cm_mean, 'm³/m³');
});

test('SSURGO: real Iowa answer is parsed; an empty answer means no map unit', async () => {
  const soil = parseSsurgo(SDA_IOWA);
  assert.equal(soil.status, 'ok');
  assert.equal(soil.mapUnit.name, 'Harps clay loam, Bemis moraine, 0 to 2 percent slopes');
  assert.equal(soil.drainageClass, 'Poorly drained');
  assert.equal(soil.availableWaterStorageCm, 18.93);
  assert.equal(soil.surface.textureName, 'Clay loam');
  assert.equal(soil.surface.clayPct, 28);
  assert.equal(parseSsurgo(SDA_EGYPT).status, 'no-map-unit');
  let body;
  const result = await getSsurgoAtPoint({ latitude: 42.0, longitude: -93.5, fetchImpl: async (url, init) => { body = JSON.parse(init.body); return json(SDA_IOWA); } });
  assert.equal(result.status, 'ok');
  assert.match(body.query, /point\(-93\.500000 42\.000000\)/);
  assert.equal(body.format, 'JSON+COLUMNNAME');
});

test('POWER: recent months skip months POWER has not published (-999)', async () => {
  // T2M values (including -999 for Oct/Nov 2026) are from the real 2025–2026 response for 30.82 N, 31.31 E
  // fetched 2026-11-13; PRECTOTCORR is set to the fill value here only to exercise the filter.
  const real = {
    header: { title: 'NASA/POWER Source Native Resolution Monthly and Annual', sources: ['MERRA2', 'POWER'], fill_value: -999.0 },
    parameters: { T2M: { units: 'C' }, PRECTOTCORR: { units: 'mm/day' } },
    properties: { parameter: {
      T2M: { 202508: 30.37, 202509: 27.41, 202513: 22.88, 202608: 30.57, 202609: 28.18, 202610: -999, 202611: -999 },
      PRECTOTCORR: { 202508: -999, 202509: -999, 202513: -999, 202608: -999, 202609: -999, 202610: -999, 202611: -999 },
    } },
  };
  const result = await getPowerRecentMonths({ latitude: 30.82, longitude: 31.31, now: new Date('2026-11-13T00:00:00Z'), fetchImpl: async () => ({ ok: true, status: 200, json: async () => real }) });
  assert.deepEqual(result.recent.map((m) => m.key), ['2025-08', '2025-09', '2026-08', '2026-09']);
  assert.equal(result.recent.at(-1).tMean, 28.18);
});
