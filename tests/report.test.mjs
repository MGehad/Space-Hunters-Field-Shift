import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFarmReport, reportToCsv } from '../src/reports/buildFarmReport.js';
import { evaluateRotationStrategies } from '../src/analysis/rotation/evaluateStrategies.js';
import { climatologyMonths, evaluateScenario, compareScenarios } from '../src/analysis/scenario/cropClimateScenario.js';

const CODES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const source = { id: 'nasa-power-climatology', dataset: 'NASA POWER Agroclimatology (AG) monthly climatology', provider: 'NASA Langley Research Center POWER Project', url: 'https://power.larc.nasa.gov/docs/', retrievedAt: '2026-11-13T04:00:00.000Z', dataKind: 'reference' };
const observations = ['T2M', 'PRECTOTCORR', 'RH2M', 'ALLSKY_SFC_SW_DWN'].flatMap((variable, v) => CODES.map((code, i) => ({ variable, value: [14 + i, 0.4, 55, 18][v], referenceDate: `climatology:${code}`, temporalCoverage: '2001–2025', source })));
const farmLocation = { latitude: 30.825, longitude: 31.31, label: 'Test farm, "Delta"', area: 10, areaUnit: 'feddan', selectionMethod: 'polygon-boundary', geometry: { type: 'Polygon', coordinates: [[[31.30, 30.82], [31.32, 30.82], [31.32, 30.83], [31.30, 30.82]]] } };

function session({ withScenario, partial = false }) {
  const strategies = [['winter_wheat', 'faba_beans', 'summer_corn'], ['winter_wheat', 'faba_beans', 'sorghum_grain'], ['barley', 'faba_beans', 'sunflower']].map((sequence, i) => ({ id: `strategy-${i}`, name: `S${i}`, isBaseline: i === 0, sequence }));
  const evaluation = evaluateRotationStrategies(strategies, { environmentalObservations: observations, farmInputs: {} });
  const months = climatologyMonths(observations);
  const seasons = withScenario ? [{ plantingMonth: 10, seasonDays: 135 }, { plantingMonth: 9, seasonDays: 103 }, { plantingMonth: 4, seasonDays: 150 }] : [{ plantingMonth: null, seasonDays: 135 }, { plantingMonth: null, seasonDays: 103 }, { plantingMonth: null, seasonDays: 150 }];
  const scenarios = evaluation.strategies.map((s, i) => ({ ...evaluateScenario({ id: s.id, name: s.name, crops: s.crops, seasons: partial && i === 2 ? seasons.map((x) => ({ ...x, plantingMonth: null })) : seasons, months, basis: 'average' }), crops: s.crops }));
  return { farmLocation, environmentalObservations: observations, farmInformation: { rotationInputs: {} }, recentConditions: null,
    analysisResults: { rotationEvaluation: evaluation, selectedStrategyId: 'strategy-1', scenarioComparison: { scenarios, comparison: compareScenarios(scenarios), farmAreaHa: 4.2, averagePeriod: '2001–2025' } } };
}

test('report includes only sections backed by the analysis', () => {
  const report = buildFarmReport({ session: session({ withScenario: false }), lang: 'en', now: new Date('2026-11-13T05:00:00Z') });
  const ids = report.sections.map((s) => s.id);
  assert.deepEqual(ids, ['location', 'climate', 'strategies', 'decision', 'risks', 'sources', 'method']); // no recent, ERA5, NDVI, soil or scenarios
  assert.equal(report.generatedDisplay, '2026-11-13 05:00 UTC');
  const decision = report.sections.find((s) => s.id === 'decision');
  assert.ok(decision.blocks[1].items.some((item) => item.startsWith('Planting months were not set')));
});

test('report with scenarios, sources and Arabic text', () => {
  const s = session({ withScenario: true });
  const en = buildFarmReport({ session: s, lang: 'en' });
  assert.ok(en.sections.some((x) => x.id === 'scenarios'));
  const scenarios = en.sections.find((x) => x.id === 'scenarios');
  assert.equal(scenarios.blocks[0].rows.length, 9);
  assert.equal(scenarios.blocks[0].rows[0][3], 'November');
  const urls = en.sections.find((x) => x.id === 'sources').blocks[0].rows.map((r) => r[2]);
  assert.ok(urls.includes('https://www.fao.org/4/S2022E/s2022e08.htm') && urls.includes('https://power.larc.nasa.gov/docs/'));
  assert.ok(!urls.some((u) => u.includes('open-meteo'))); // ERA5 was not retrieved, so it is not cited
  const location = en.sections[0];
  assert.equal(location.blocks[1].rows.length, 3); // closing vertex not repeated
  const ar = buildFarmReport({ session: s, lang: 'ar' });
  assert.equal(ar.dir, 'rtl');
  assert.equal(ar.title, 'تقرير تحليل الموقع الزراعي');
  assert.equal(ar.sections.find((x) => x.id === 'scenarios').blocks[0].rows[0][3], 'نوفمبر');
});

test('recent data are included only when they belong to the same farm point', () => {
  const s = session({ withScenario: true });
  const era5 = { months: [{ key: '2026-04', complete: true, rainMm: 3, et0Mm: 150, soil0to7: 0.12, soil7to28: 0.15 }, { key: '2026-05', complete: false }], retrievedAt: '2026-11-13T04:00:00Z' };
  s.recentConditions = { pointKey: '30.82500,31.31000', era5 };
  const withData = buildFarmReport({ session: s, lang: 'en' });
  const section = withData.sections.find((x) => x.id === 'era5');
  assert.deepEqual(section.blocks[0].rows, [['Apr 2026', '3.0', '150.0', '-147.0', '0.120', '0.150']]);
  s.recentConditions = { pointKey: '10.00000,10.00000', era5 };
  assert.equal(buildFarmReport({ session: s, lang: 'en' }).sections.some((x) => x.id === 'era5'), false);
});

test('CSV: BOM, quoting, and the same numbers as the report', () => {
  const report = buildFarmReport({ session: session({ withScenario: true }), lang: 'en' });
  const csv = reportToCsv(report);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.ok(csv.includes('"Test farm, ""Delta"""'));
  assert.ok(csv.includes('\r\n'));
  const totals = report.sections.find((x) => x.id === 'scenarios').blocks[1].rows[0];
  assert.ok(csv.includes(totals.map((cell) => (/[",]/.test(cell) ? `"${cell}"` : cell)).join(',')));
  assert.ok(!csv.includes('undefined') && !csv.includes('NaN'));
});

test('report scenario totals keep only metrics available for every scenario', () => {
  const full = buildFarmReport({ session: session({ withScenario: true }), lang: 'en' }).sections.find((x) => x.id === 'scenarios');
  assert.equal(full.blocks.filter((b) => b.type === 'figure').length, 1);
  assert.ok(full.blocks[1].head.length > 2);
  const partial = buildFarmReport({ session: session({ withScenario: true, partial: true }), lang: 'en' }).sections.find((x) => x.id === 'scenarios');
  assert.equal(partial.blocks.filter((b) => b.type === 'figure').length, 0); // no chart comparing a scenario with a gap
  assert.ok(!partial.blocks.some((b) => b.title === 'Scenario totals')); // every totals column needs the incomplete scenario
  assert.ok(!(partial.blocks.find((b) => b.type === 'list')?.items || []).some((item) => /lowest/i.test(item)));
});
