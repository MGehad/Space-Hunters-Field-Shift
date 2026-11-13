import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveRainMm, evaluateCropSeason, evaluateScenario, compareScenarios, climatologyMonths, yearMonths } from '../src/analysis/scenario/cropClimateScenario.js';
import { cropCatalog } from '../src/data/cropCatalog.js';

const crop = (id) => cropCatalog.find((c) => c.id === id);
const flat = (tMean, rainMm) => ({ available: true, period: 'test', get: (o, m) => ({ tMean, rainMm, days: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m] }) });

test('effective rainfall reproduces the worked example in the FAO manual', () => {
  // FAO Irrigation Water Needs, Chapter 4: P = 35, 90, 116, 5 → Pe = 11, 47, 68, 0.
  assert.deepEqual([35, 90, 116, 5].map((p) => Math.round(effectiveRainMm(p))), [11, 47, 68, 0]);
  assert.equal(effectiveRainMm(null), null);
});

test('catalog values match the FAO tables', () => {
  assert.deepEqual(crop('winter_wheat').growingPeriodDays.range, [120, 150]);
  assert.deepEqual(crop('summer_corn').growingPeriodDays.range, [125, 180]);
  assert.deepEqual(crop('winter_wheat').optimumTemperatureC.range, [15, 20]);
  assert.equal(crop('sunflower').optimumTemperatureC, null); // not in FAO Table 33
  assert.equal(crop('faba_beans').growingPeriodDays.generic, true);
});

test('crop season: rain, irrigation need and temperature status', () => {
  // 120 days from November: Nov 30 + Dec 31 + Jan 31 + Feb 28 = 120 days, 4 whole months of 100 mm.
  const r = evaluateCropSeason({ crop: crop('winter_wheat'), plantingMonth: 10, seasonDays: 120, months: flat(18, 100) });
  assert.equal(r.status, 'ok');
  assert.equal(Math.round(r.seasonRainMm), 400);
  assert.equal(Math.round(r.effectiveRainMm), 220); // 4 × (0.8×100 − 25)
  assert.deepEqual(r.irrigationNeedMm.map(Math.round), [230, 430]); // 450−220, 650−220
  assert.equal(r.temperatureStatus, 'within');
  assert.equal(r.monthsUsed[2].offsetYear, 1); // season crosses into the next year
  const hot = evaluateCropSeason({ crop: crop('winter_wheat'), plantingMonth: 5, seasonDays: 120, months: flat(30, 0) });
  assert.equal(hot.temperatureStatus, 'above');
  assert.deepEqual(hot.irrigationNeedMm, [450, 650]);
  // partial month: 45 days from January = 31 + 14/28 of February
  const part = evaluateCropSeason({ crop: crop('winter_wheat'), plantingMonth: 0, seasonDays: 45, months: flat(18, 100) });
  assert.ok(Math.abs(part.seasonRainMm - 150) < 1e-9);
});

test('crop season: honest statuses when something is missing', () => {
  assert.equal(evaluateCropSeason({ crop: crop('winter_wheat'), plantingMonth: null, seasonDays: 120, months: flat(18, 10) }).status, 'no-planting-month');
  assert.equal(evaluateCropSeason({ crop: crop('winter_wheat'), plantingMonth: 10, seasonDays: 120, months: { available: false } }).status, 'no-climate-data');
  const year = yearMonths({ '2025-11': { tMean: 20, rainMm: 5 }, '2025-12': { tMean: 16, rainMm: 8 } }, 2025);
  assert.equal(evaluateCropSeason({ crop: crop('winter_wheat'), plantingMonth: 10, seasonDays: 120, months: year }).status, 'missing-months');
  const noWater = evaluateCropSeason({ crop: crop('lentils'), plantingMonth: 10, seasonDays: 160, months: flat(15, 20) });
  assert.equal(noWater.status, 'ok');
  assert.equal(noWater.irrigationNeedMm, null);
  assert.equal(noWater.temperatureStatus, 'unavailable');
});

test('climatology provider converts mm/day to monthly totals', () => {
  const obs = [{ variable: 'T2M', referenceDate: 'climatology:JAN', value: 13.17, temporalCoverage: '2001–2025' }, { variable: 'PRECTOTCORR', referenceDate: 'climatology:JAN', value: 0.45 }];
  const months = climatologyMonths(obs);
  assert.equal(months.period, '2001–2025');
  assert.ok(Math.abs(months.get(0, 0).rainMm - 13.95) < 1e-9);
  assert.equal(months.get(0, 1).rainMm, null);
});

test('scenario totals and comparison', () => {
  const seasons = [{ plantingMonth: 10, seasonDays: 120 }, { plantingMonth: 4, seasonDays: 120 }];
  const a = evaluateScenario({ id: 'a', name: 'A', crops: [crop('winter_wheat'), crop('summer_corn')], seasons, months: flat(22, 100), basis: 'x' });
  const b = evaluateScenario({ id: 'b', name: 'B', crops: [crop('winter_wheat'), crop('sunflower')], seasons, months: flat(22, 100), basis: 'x' });
  assert.equal(a.complete, true);
  assert.deepEqual(a.totals.waterNeedMm, [950, 1450]);
  assert.equal(a.totals.irrigationNeedM3PerHa[0], a.totals.irrigationNeedMm[0] * 10);
  assert.equal(a.totals.temperatureAssessed, 2);
  assert.equal(b.totals.temperatureAssessed, 1);
  const cmp = compareScenarios([a, b]);
  assert.equal(cmp.lowestIrrigationId, 'a');
  assert.equal(cmp.highestIrrigationId, 'b');
  const c = evaluateScenario({ id: 'c', name: 'C', crops: [crop('lentils')], seasons: [seasons[0]], months: flat(15, 10), basis: 'x' });
  assert.equal(c.totals.irrigationNeedMm, null);
  assert.equal(compareScenarios([a, c]).lowestIrrigationId, null);
});
