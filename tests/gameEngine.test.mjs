import test from 'node:test';
import assert from 'node:assert/strict';
import { daytimePercentage, referenceEtMmPerDay } from '../src/game/engine/evapotranspiration.js';
import { simulateSeason, effectiveRainfallMm, monthlyCropFactors, seasonMonths } from '../src/game/engine/simulate.js';
import { getGameCrop, GAME_CROPS } from '../src/game/data/gameCrops.js';
import { normalizePowerMonthly, getPowerMonthly } from '../src/game/services/powerMonthly.js';

const obs = (entries) => Object.fromEntries(entries.map(([key, tMean, rainMm]) => [key, { tMean, rainMm, tMax: null, soilWetness: null }]));
const maize = getGameCrop('maize');
const dry = obs([['2012-05', 20, 10], ['2012-06', 25, 5], ['2012-07', 28, 0], ['2012-08', 27, 5], ['2012-09', 22, 10]]);
const wet = obs([['2012-05', 20, 150], ['2012-06', 25, 180], ['2012-07', 28, 200], ['2012-08', 27, 180], ['2012-09', 22, 150]]);
const base = { crop: maize, latitude: 42, startYear: 2012, plantingMonth: 5 };

test('Blaney-Criddle p matches the FAO table within rounding', () => {
  // FAO Training Manual No. 3, Table 4: 0° → 0.27 all year; 40°N → Jan 0.22, Jul 0.33.
  assert.ok(Math.abs(daytimePercentage(0, 1) - 0.27) < 0.01);
  assert.ok(Math.abs(daytimePercentage(40, 1) - 0.22) < 0.012);
  assert.ok(Math.abs(daytimePercentage(40, 7) - 0.33) < 0.012);
  assert.ok(Math.abs(daytimePercentage(-40, 1) - 0.33) < 0.012);
  // FAO worked example: p = 0.29, Tmean = 21.5 °C → about 5.2 mm/day
  assert.ok(Math.abs(0.29 * (0.46 * 21.5 + 8) - 5.19) < 0.02);
  assert.equal(referenceEtMmPerDay(30, 6, null), null);
});

test('effective rainfall follows the FAO rule of thumb', () => {
  assert.equal(effectiveRainfallMm(100), 84);
  assert.equal(effectiveRainfallMm(0), 0);
  assert.equal(effectiveRainfallMm(300), 155);
  assert.ok(effectiveRainfallMm(250) <= 250 && effectiveRainfallMm(40) < 40);
});

test('monthly crop factors are day-weighted and cover the season', () => {
  GAME_CROPS.forEach((crop) => {
    const factors = monthlyCropFactors(crop);
    assert.equal(factors.reduce((total, item) => total + item.cropDays, 0), crop.seasonDays);
    factors.forEach((item) => assert.ok(item.kc >= Math.min(...crop.kc) - 1e-9 && item.kc <= Math.max(...crop.kc) + 1e-9));
  });
  assert.deepEqual(seasonMonths(2018, 11, getGameCrop('wheat')).map((m) => `${m.year}-${m.month}`), ['2018-11', '2018-12', '2019-1', '2019-2', '2019-3']);
});

test('simulation is deterministic and conserves water', () => {
  const a = simulateSeason({ ...base, decisions: { irrigationLevel: 'deficit', irrigationMethod: 'drip' }, observations: dry });
  const b = simulateSeason({ ...base, decisions: { irrigationLevel: 'deficit', irrigationMethod: 'drip' }, observations: dry });
  assert.deepEqual(a, b);
  a.months.forEach((m) => {
    const inflow = m.effectiveRainMm + m.soilStoreStartMm + m.irrigationNetMm;
    const outflow = m.cropUseMm + m.soilStoreEndMm + m.drainageMm;
    assert.ok(Math.abs(inflow - outflow) < 0.35, `water balance ${m.key}`);
    assert.ok(m.cropUseMm <= m.cropNeedMm + 0.01);
  });
});

test('decisions change modeled outcomes in the expected direction', () => {
  const rainfed = simulateSeason({ ...base, decisions: { irrigationLevel: 'rainfed', irrigationMethod: 'surface' }, observations: dry });
  const deficit = simulateSeason({ ...base, decisions: { irrigationLevel: 'deficit', irrigationMethod: 'surface' }, observations: dry });
  const full = simulateSeason({ ...base, decisions: { irrigationLevel: 'full', irrigationMethod: 'surface' }, observations: dry });
  const fullDrip = simulateSeason({ ...base, decisions: { irrigationLevel: 'full', irrigationMethod: 'drip' }, observations: dry });
  assert.ok(rainfed.totals.relativeYield < deficit.totals.relativeYield);
  assert.ok(deficit.totals.relativeYield < full.totals.relativeYield);
  assert.equal(full.totals.relativeYield, 1);
  assert.equal(rainfed.totals.irrigationGrossMm, 0);
  assert.ok(fullDrip.totals.irrigationGrossMm < full.totals.irrigationGrossMm);
  assert.equal(fullDrip.totals.irrigationNetMm, full.totals.irrigationNetMm);
  const rainfedWet = simulateSeason({ ...base, decisions: { irrigationLevel: 'rainfed', irrigationMethod: 'surface' }, observations: wet });
  assert.ok(rainfedWet.totals.relativeYield > rainfed.totals.relativeYield + 0.3);
  assert.equal(rainfed.totals.initialStoreBasis, 'assumed');
  const withPreSeason = { ...dry, ...obs([['2012-02', 0, 80], ['2012-03', 5, 90], ['2012-04', 12, 100]]) };
  const primed = simulateSeason({ ...base, decisions: { irrigationLevel: 'rainfed', irrigationMethod: 'surface' }, observations: withPreSeason });
  assert.equal(primed.totals.initialStoreBasis, 'observed-rain');
  assert.ok(primed.totals.initialStoreMm > rainfed.totals.initialStoreMm);
});

test('missing observations stop the simulation instead of being filled in', () => {
  const partial = { ...dry, '2012-07': { tMean: null, rainMm: null } };
  const result = simulateSeason({ ...base, decisions: {}, observations: partial });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ['2012-07']);
});

test('POWER monthly payloads are normalized without inventing values', async () => {
  const payload = {
    header: { fill_value: -999, title: 'NASA/POWER Source Native Resolution Monthly and Annual' },
    parameters: { PRECTOTCORR: { units: 'mm/day' }, T2M: { units: 'C' } },
    properties: { parameter: {
      T2M: { 201201: 10, 201202: -999, 201213: 15 },
      PRECTOTCORR: { 201201: 2, 201202: 1, 201213: 1.5 },
      GWETROOT: { 201201: 0.5, 201202: 0.4 },
    } },
  };
  const normalized = normalizePowerMonthly(payload);
  assert.equal(normalized.months['2012-01'].rainMm, 62);
  assert.equal(normalized.months['2012-02'].tMean, null);
  assert.equal(normalized.months['2012-13'], undefined);
  assert.deepEqual(normalized.unavailable, ['T2M_MAX']);
  assert.equal(normalizePowerMonthly({ ...payload, parameters: { PRECTOTCORR: { units: 'mm' } } }).months['2012-01'].rainMm, 2);

  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return calls.length === 1 ? { ok: false, status: 422 } : { ok: true, status: 200, json: async () => payload }; };
  const data = await getPowerMonthly({ latitude: 30, longitude: 31, startYear: 2012, endYear: 2012, fetchImpl });
  assert.equal(calls.length, 2);
  assert.ok(!calls[1].includes('GWETROOT'));
  assert.equal(data.request.startYear, 2012);
  await assert.rejects(() => getPowerMonthly({ latitude: 30, longitude: 31, startYear: 2012, endYear: 2012, fetchImpl: async () => { throw new TypeError('offline'); } }), { code: 'network' });
  await assert.rejects(() => getPowerMonthly({ latitude: 30, longitude: 31, startYear: 1970, endYear: 1971, fetchImpl }), { code: 'out-of-range' });
});

// Shape (keys, header, units, the "13" annual key, the -999 fill value) follows the real
// POWER monthly responses fetched on 2026-11-12. The T2M, T2M_MAX and PRECTOTCORR numbers
// for 2018-01, 2018-05 and 2018-07 are the real values for 30.8 N, 31.0 E; the fill-value
// month and the annual entries are placeholders that only exercise the parser.
test('real POWER monthly response shape: annual key ignored, fill value kept as missing, metadata read', () => {
  const real = {
    header: { title: 'NASA/POWER Source Native Resolution Monthly and Annual', api: { version: 'v2.10.0' }, sources: ['MERRA2', 'POWER'], fill_value: -999.0 },
    parameters: { T2M: { units: 'C' }, T2M_MAX: { units: 'C' }, PRECTOTCORR: { units: 'mm/day' }, GWETROOT: { units: '1' } },
    properties: { parameter: {
      T2M: { 201801: 13.64, 201807: 29.88, 201810: -999.0, 201813: -999.0 },
      T2M_MAX: { 201807: 44.66, 201810: -999.0, 201813: 44.66 },
      PRECTOTCORR: { 201801: 0.92, 201805: 0.0, 201810: -999.0, 201813: -999.0 },
    } },
  };
  const out = normalizePowerMonthly(real);
  assert.equal(out.months['2018-13'], undefined);
  assert.equal(out.months['2018-07'].tMean, 29.88);
  assert.equal(out.months['2018-07'].tMax, 44.66);
  assert.ok(Math.abs(out.months['2018-01'].rainMm - 0.92 * 31) < 1e-9);
  assert.equal(out.months['2018-05'].rainMm, 0);
  assert.equal(out.months['2018-10'].tMean, null);
  assert.equal(out.months['2018-10'].rainMm, null);
  assert.deepEqual(out.unavailable, ['GWETROOT']);
  assert.deepEqual(out.modelSources, ['MERRA2', 'POWER']);
  assert.equal(out.apiVersion, 'v2.10.0');
  assert.equal(out.units.PRECTOTCORR, 'mm/day');
});
