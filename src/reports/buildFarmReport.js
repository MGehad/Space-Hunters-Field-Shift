/**
 * Builds the technical report from the analysis state. Pure data in, plain
 * report structure out: the on-screen/PDF view and the CSV export both render
 * this same structure, so they can never disagree.
 *
 * A section is added only when the analysis actually produced its data.
 * Block types: kv (label/value pairs), table, list, text, figure.
 */
import { REPORT_TEXT } from '../data/i18n/reportText.js';
import { SCENARIO_TEXT, MONTH_NAMES } from '../data/i18n/scenarioText.js';
import { ROTATION_CRITERIA } from '../analysis/rotation/evaluateStrategies.js';
import { CROP_DATA_SOURCES } from '../data/cropCatalog.js';
import { convertArea } from '../utils/farmGeometry.js';

const CODES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const fix = (value, digits = 1) => (value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value).toFixed(digits));
const int = (value) => (Number.isFinite(value) ? Math.round(value).toLocaleString('en-GB') : null);
const range = (pair) => (!pair ? null : Math.round(pair[0]) === Math.round(pair[1]) ? int(pair[0]) : `${int(pair[0])}–${int(pair[1])}`);
const signed = (value, digits = 1) => (value === null || !Number.isFinite(value) ? null : `${value > 0 ? '+' : ''}${value.toFixed(digits)}`);

export function buildFarmReport({ session, lang = 'en', now = new Date() }) {
  const t = REPORT_TEXT[lang] || REPORT_TEXT.en;
  const st = SCENARIO_TEXT[lang] || SCENARIO_TEXT.en;
  const ar = lang === 'ar';
  const na = t.notAvailable;
  const or = (value) => (value === null || value === undefined || value === '' ? na : value);
  const cropName = (crop) => (crop ? (ar ? crop.nameAr : crop.nameEn) : na);
  const sequence = (crops) => crops.map(cropName).join(ar ? ' ← ' : ' → ');
  const monthKey = (key) => `${t.months[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`;
  const sections = [];
  const sources = [];
  const addSource = (name, provider, url, retrievedAt) => { if (!sources.some((item) => item.url === url)) sources.push({ name, provider, url, retrievedAt: retrievedAt || null }); };

  const farm = session?.farmLocation || null;
  const observations = (session?.environmentalObservations || []).filter((item) => item?.source?.id === 'nasa-power-climatology');
  const results = session?.analysisResults || {};
  const evaluation = results.rotationEvaluation || null;
  const scenarioData = results.scenarioComparison || null;
  const recent = session?.recentConditions || null;
  const sameFarm = recent && farm && recent.pointKey === `${farm.latitude.toFixed(5)},${farm.longitude.toFixed(5)}`;

  // 1. Location
  if (farm) {
    const polygon = farm.selectionMethod === 'polygon-boundary';
    const ring = polygon ? (farm.geometry?.coordinates?.[0] || []).slice(0, -1) : [];
    const areaHa = convertArea(farm.area, farm.areaUnit, 'hectare');
    const blocks = [{ type: 'kv', items: [
      [t.location.name, or(farm.label)],
      [t.location.coords, `${farm.latitude.toFixed(5)}, ${farm.longitude.toFixed(5)}`],
      [t.location.method, polygon ? t.location.polygon : t.location.point],
      [t.location.area, farm.area != null ? `${Number(farm.area).toFixed(2)} ${(ar ? { feddan: 'فدان', hectare: 'هكتار', squareMeter: 'م²', squareKilometer: 'كم²' } : { feddan: 'feddan', hectare: 'ha', squareMeter: 'm²', squareKilometer: 'km²' })[farm.areaUnit]}` : na],
      [t.location.areaHa, or(fix(areaHa, 2))],
    ] }];
    if (ring.length >= 3) {
      blocks.push({ type: 'table', title: t.location.vertices, head: [t.location.vertex, t.location.lat, t.location.lon], rows: ring.map(([lon, lat], index) => [String(index + 1), lat.toFixed(6), lon.toFixed(6)]) });
      blocks.push({ type: 'figure', figure: 'boundary', caption: t.location.figure, points: ring.map(([lon, lat]) => ({ lat, lon })) });
    }
    sections.push({ id: 'location', title: t.s.location, blocks });
  }

  // 2. Long-term climate
  const clim = (variable, index) => { const item = observations.find((o) => o.variable === variable && o.referenceDate === `climatology:${CODES[index]}`); return Number.isFinite(item?.value) ? item.value : null; };
  if (observations.length) {
    const source = observations[0].source;
    const rows = CODES.map((_, i) => { const rate = clim('PRECTOTCORR', i); return [t.months[i], fix(clim('T2M', i)), fix(rate, 2), fix(rate === null ? null : rate * DAYS[i]), fix(clim('RH2M', i)), fix(clim('ALLSKY_SFC_SW_DWN', i))].map(or); });
    sections.push({ id: 'climate', title: t.s.climate, kind: t.kinds.model, blocks: [
      { type: 'kv', items: [[t.climate.period, or(observations[0].temporalCoverage)]] },
      { type: 'table', head: [t.climate.month, t.climate.temp, t.climate.rainRate, t.climate.rain, t.climate.rh, t.climate.solar], rows },
      { type: 'figure', figure: 'climate', caption: t.climate.chart, labels: t.months, rain: CODES.map((_, i) => { const r = clim('PRECTOTCORR', i); return r === null ? null : r * DAYS[i]; }), temp: CODES.map((_, i) => clim('T2M', i)) },
      { type: 'text', text: t.climate.note },
    ] });
    addSource(source.dataset, source.provider, source.url, source.retrievedAt);
  }

  // 3. Recent months (NASA POWER)
  if (sameFarm && recent.power?.recent?.length) {
    const rows = recent.power.recent.map((m) => {
      const i = Number(m.key.slice(5)) - 1; const days = new Date(Date.UTC(Number(m.key.slice(0, 4)), i + 1, 0)).getUTCDate();
      const normalT = clim('T2M', i); const normalRate = clim('PRECTOTCORR', i); const normalRain = normalRate === null ? null : normalRate * days;
      return [monthKey(m.key), fix(m.tMean), m.tMean === null || normalT === null ? null : signed(m.tMean - normalT), fix(m.rainMm), m.rainMm === null || normalRain === null ? null : signed(m.rainMm - normalRain)].map(or);
    });
    sections.push({ id: 'recent', title: t.s.recent, kind: t.kinds.model, blocks: [{ type: 'table', head: [t.recent.month, t.recent.temp, t.recent.tempDiff, t.recent.rain, t.recent.rainDiff], rows }, { type: 'text', text: t.recent.note }] });
    addSource('NASA POWER monthly data (MERRA-2)', 'NASA Langley Research Center POWER Project', 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/', recent.power.retrievedAt);
  }

  // 4. ERA5
  const era5Months = sameFarm ? (recent.era5?.months || []).filter((m) => m.complete) : [];
  if (era5Months.length) {
    sections.push({ id: 'era5', title: t.s.era5, kind: t.kinds.model, blocks: [
      { type: 'table', head: [t.era5.month, t.era5.rain, t.era5.et0, t.era5.balance, t.era5.soil1, t.era5.soil2], rows: era5Months.map((m) => [monthKey(m.key), fix(m.rainMm), fix(m.et0Mm), signed(m.rainMm - m.et0Mm), fix(m.soil0to7, 3), fix(m.soil7to28, 3)].map(or)) },
      { type: 'text', text: t.era5.note },
    ] });
    addSource('ERA5 reanalysis (via Open-Meteo Historical Weather API)', 'ECMWF / Copernicus Climate Change Service', 'https://open-meteo.com/en/docs/historical-weather-api', recent.era5.retrievedAt);
  }

  // 5. NDVI
  if (sameFarm && recent.ndvi?.series?.length) {
    const series = recent.ndvi.series; const usable = series.filter((item) => item.ndvi !== null);
    const pick = (item) => (item ? `${item.ndvi.toFixed(2)} (${item.date})` : na);
    const max = usable.reduce((b, i) => (!b || i.ndvi > b.ndvi ? i : b), null); const min = usable.reduce((b, i) => (!b || i.ndvi < b.ndvi ? i : b), null);
    sections.push({ id: 'ndvi', title: t.s.ndvi, kind: t.kinds.satellite, blocks: [
      { type: 'kv', items: [[t.ndvi.period, `${series[0].date} → ${series[series.length - 1].date}`], [t.ndvi.count, `${usable.length} / ${series.length}`], [t.ndvi.latest, pick(usable[usable.length - 1])], [t.ndvi.highest, pick(max)], [t.ndvi.lowest, pick(min)]] },
      { type: 'text', text: t.ndvi.note },
    ] });
    addSource('MOD13Q1 v6.1 Vegetation Indices (ORNL DAAC subset service)', 'NASA LP DAAC / ORNL DAAC', 'https://doi.org/10.5067/MODIS/MOD13Q1.061', recent.ndvi.retrievedAt);
  }

  // 6. Soil
  const inputs = session?.farmInformation?.rotationInputs || {};
  const soil = sameFarm && recent.soil?.status === 'ok' ? recent.soil : null;
  if (soil || inputs.soilType || inputs.waterAvailability) {
    const blocks = [];
    if (soil) {
      blocks.push({ type: 'kv', kind: t.kinds.survey, items: [
        [t.soil.unit, or(soil.mapUnit.name)], [t.soil.component, `${or(soil.component.name)}${soil.component.percent !== null ? ` (${int(soil.component.percent)}%)` : ''}`],
        [t.soil.texture, or(soil.surface.textureName || soil.surface.textureCode)], [t.soil.fractions, [soil.surface.sandPct, soil.surface.siltPct, soil.surface.clayPct].map((v) => or(int(v))).join(' / ')],
        [t.soil.om, or(fix(soil.surface.organicMatterPct))], [t.soil.aws, or(fix(soil.availableWaterStorageCm))], [t.soil.drainage, or(soil.drainageClass)], [t.soil.hydro, or(soil.hydrologicGroup)], [t.soil.slope, or(fix(soil.slopePercent))],
      ] });
      blocks.push({ type: 'text', text: t.soil.note });
      addSource('SSURGO via Soil Data Access', 'USDA Natural Resources Conservation Service', 'https://sdmdataaccess.nrcs.usda.gov/', soil.retrievedAt);
    }
    const user = [];
    if (inputs.soilType) user.push([t.soil.userSoil, inputs.soilType]);
    if (inputs.waterAvailability) user.push([t.soil.userWater, inputs.waterAvailability]);
    if (user.length) blocks.push({ type: 'kv', kind: t.kinds.user, items: user });
    if (!soil) blocks.push({ type: 'text', text: t.soil.noSurvey });
    sections.push({ id: 'soil', title: t.s.soil, blocks });
  }

  // 7. Strategies
  const selectedId = results.selectedStrategyId || evaluation?.baselineId;
  const criterion = (key) => (ar ? ROTATION_CRITERIA[key].labelAr : ROTATION_CRITERIA[key].labelEn);
  if (evaluation?.strategies?.length) {
    const pct = (value) => (Number.isFinite(value) ? `${Math.round(value)}` : na);
    sections.push({ id: 'strategies', title: t.s.strategies, blocks: [
      { type: 'table', head: [t.strategies.strategy, t.strategies.crops, t.strategies.fit, t.strategies.water, t.strategies.nitrogen, t.strategies.diversity, t.strategies.pest, t.strategies.selected],
        rows: evaluation.strategies.map((s, i) => [t.strategies.names[i] || s.name, sequence(s.crops), or(s.metrics.overallScore), s.metrics.waterNeedRangeMm ? `${s.metrics.waterNeedRangeMm.min}–${s.metrics.waterNeedRangeMm.max}` : na, pct(s.metrics.nitrogenPotential), pct(s.metrics.familyDiversity), pct(s.metrics.pestBreak), s.id === selectedId ? t.yes : '']) },
      { type: 'kv', items: [[t.strategies.weights, evaluation.scoredCriteria.map((key) => `${criterion(key)}: ${Math.round(evaluation.normalizedWeights[key])}%`).join(ar ? '؛ ' : '; ') || na], [t.strategies.baselineConfirmed, evaluation.farmInputs?.baselineConfirmed ? t.yes : t.no]] },
      { type: 'text', text: t.strategies.note },
    ] });
    addSource(CROP_DATA_SOURCES.faoWater.name, 'FAO', CROP_DATA_SOURCES.faoWater.url);
    addSource(CROP_DATA_SOURCES.extensionFamilies.name, CROP_DATA_SOURCES.extensionFamilies.provider, CROP_DATA_SOURCES.extensionFamilies.url);
  }

  // 8. Scenario comparison
  const scenarios = scenarioData?.scenarios || [];
  const evaluated = scenarios.some((s) => s.results.some((r) => r.status === 'ok'));
  const name = (index, fallback) => t.strategies.names[index] || fallback;
  const basisLabel = (value) => (value === 'average' ? st.basisAverage(scenarioData?.averagePeriod) : st.basisYear(value));
  const considerations = [];
  if (evaluated) {
    const cropRows = scenarios.flatMap((s, si) => s.results.map((r, ci) => (r.status === 'ok'
      ? [name(si, s.name), cropName(s.crops[ci]), basisLabel(s.basis), MONTH_NAMES[lang][r.plantingMonth], String(r.seasonDays), int(r.seasonRainMm), int(r.effectiveRainMm), or(range(r.waterNeedMm)), or(range(r.irrigationNeedMm)), r.seasonMeanTempC.toFixed(1), r.optimumTemperatureC ? `${r.optimumTemperatureC[0]}–${r.optimumTemperatureC[1]}` : na, st.tempStatus[r.temperatureStatus]]
      : [name(si, s.name), cropName(s.crops[ci]), basisLabel(s.basis), t.scenarios.notEvaluated, '', '', '', '', '', '', '', ''])));
    const areaHa = scenarioData.farmAreaHa;
    const totalRows = scenarios.map((s, si) => [name(si, s.name), or(range(s.totals.waterNeedMm)), or(int(s.totals.seasonRainMm)), or(int(s.totals.effectiveRainMm)), or(range(s.totals.irrigationNeedMm)), or(range(s.totals.irrigationNeedM3PerHa)), ...(areaHa ? [or(range(s.totals.irrigationNeedM3PerHa?.map((v) => v * areaHa)))] : []), s.complete ? st.tempCount(s.totals.temperatureWithin, s.totals.temperatureAssessed, s.results.length) : na]);
    const findings = [];
    const cmp = scenarioData.comparison;
    if (cmp?.lowestIrrigationId) { const index = scenarios.findIndex((s) => s.id === cmp.lowestIrrigationId); findings.push(st.findingLowest(name(index, ''), int(cmp.spreadMm))); }
    const blocks = [
      { type: 'table', kind: t.kinds.derived, head: [t.scenarios.scenario, t.scenarios.crop, t.scenarios.basis, t.scenarios.planting, t.scenarios.days, t.scenarios.rain, t.scenarios.effective, t.scenarios.need, t.scenarios.irrigation, t.scenarios.temp, t.scenarios.optimum, t.scenarios.status], rows: cropRows, compact: true },
      { type: 'table', title: t.scenarios.totals, head: [t.scenarios.scenario, t.scenarios.need, t.scenarios.rain, t.scenarios.effective, t.scenarios.irrigation, t.scenarios.irrigationHa, ...(areaHa ? [t.scenarios.irrigationFarm] : []), t.scenarios.within], rows: totalRows },
      { type: 'figure', figure: 'irrigation', caption: st.chartTitle, bars: scenarios.map((s, si) => ({ label: name(si, s.name), range: s.totals.irrigationNeedMm })) },
    ];
    if (findings.length) blocks.push({ type: 'list', title: t.scenarios.findings, items: findings });
    sections.push({ id: 'scenarios', title: t.s.scenarios, blocks });
    addSource(CROP_DATA_SOURCES.faoIrrigationNeeds.name, 'FAO', CROP_DATA_SOURCES.faoIrrigationNeeds.url);
    addSource(CROP_DATA_SOURCES.faoLandEvaluation.name, 'FAO', CROP_DATA_SOURCES.faoLandEvaluation.url);
    addSource('NASA POWER monthly data (MERRA-2)', 'NASA Langley Research Center POWER Project', 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/');
  }

  // 9. Decision
  const flagged = [];
  if (evaluation?.strategies?.length) {
    const index = Math.max(0, evaluation.strategies.findIndex((s) => s.id === selectedId));
    const chosen = evaluation.strategies[index]; const baseline = evaluation.strategies[0];
    const higher = evaluation.scoredCriteria.filter((key) => chosen.metrics[key] > baseline.metrics[key]).map(criterion);
    const lower = evaluation.scoredCriteria.filter((key) => chosen.metrics[key] < baseline.metrics[key]).map(criterion);
    const joiner = ar ? '، ' : ', ';
    const items = [[t.decision.selected, name(index, chosen.name)], [t.decision.sequence, sequence(chosen.crops)]];
    if (index === 0) items.push([t.decision.versus, t.decision.same]);
    else {
      items.push([t.decision.versus, chosen.comparisonToBaseline == null ? na : `${signed(chosen.comparisonToBaseline, 0)} ${t.decision.points}`]);
      items.push([t.decision.strengths, higher.join(joiner) || t.decision.none], [t.decision.tradeoffs, lower.join(joiner) || t.decision.none]);
    }
    const scenario = scenarios[index];
    if (scenario?.totals?.irrigationNeedMm) items.push([t.decision.irrigation, t.decision.irrigationValue(range(scenario.totals.irrigationNeedMm), range(scenario.totals.irrigationNeedM3PerHa))]);
    if (scenario) {
      scenario.results.forEach((r, ci) => {
        if (r.status !== 'ok') return;
        const crop = cropName(scenario.crops[ci]);
        if (r.temperatureStatus === 'above') flagged.push(t.considerations.tempAbove(crop));
        if (r.temperatureStatus === 'below') flagged.push(t.considerations.tempBelow(crop));
        if (r.rainCoveragePct && r.rainCoveragePct[1] < 25) flagged.push(t.considerations.rainfed(crop));
      });
    }
    considerations.push(...flagged);
    if (!scenario || !scenario.results.some((r) => r.status === 'ok')) considerations.push(t.considerations.noSeasons);
    if (!evaluation.farmInputs?.baselineConfirmed) considerations.push(t.considerations.baseline);
    considerations.push(t.considerations.verify);
    sections.push({ id: 'decision', title: t.s.decision, blocks: [{ type: 'kv', items }, { type: 'list', title: t.decision.considerations, items: considerations }] });

    // 10. Risks
    sections.push({ id: 'risks', title: t.s.risks, blocks: [
      flagged.length ? { type: 'list', title: t.risks.flagged, kind: t.kinds.derived, items: flagged } : { type: 'text', text: t.risks.none },
      { type: 'list', title: t.risks.unassessed, items: Object.values(t.risks.items) },
    ] });
  }

  // 11–12. Sources and method
  if (sources.length) sections.push({ id: 'sources', title: t.s.sources, blocks: [{ type: 'table', head: [ar ? 'المصدر' : 'Source', ar ? 'الجهة' : 'Provider', ar ? 'الرابط' : 'Link', t.sources.retrieved], rows: sources.map((s) => [s.name, s.provider, s.url, s.retrievedAt ? s.retrievedAt.slice(0, 10) : '—']), links: [2] }] });
  sections.push({ id: 'method', title: t.s.method, blocks: [{ type: 'list', items: t.method }] });

  return {
    lang, dir: ar ? 'rtl' : 'ltr', title: t.title, platform: t.platform, team: t.team, notice: t.notice,
    generatedLabel: t.generated, generatedAt: now.toISOString(), generatedDisplay: now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    locationLabel: farm?.label || null, sections: sections.map((section, index) => ({ ...section, title: `${index + 1}. ${section.title}` })),
  };
}

const esc = (value) => { const text = String(value ?? ''); return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; };

/** CSV of every table and key/value block in the report (UTF-8 with BOM so spreadsheets read Arabic correctly). */
export function reportToCsv(report) {
  const t = REPORT_TEXT[report.lang] || REPORT_TEXT.en;
  const lines = [[report.title], [report.generatedLabel, report.generatedDisplay]];
  if (report.locationLabel) lines.push([t.location.name, report.locationLabel]);
  report.sections.forEach((section) => {
    const data = section.blocks.filter((block) => block.type === 'table' || block.type === 'kv');
    if (!data.length) return;
    lines.push([], [section.title]);
    data.forEach((block) => {
      if (block.title) lines.push([block.title]);
      if (block.type === 'kv') { lines.push([t.csv.field, t.csv.value]); block.items.forEach((item) => lines.push(item)); }
      else { lines.push(block.head); block.rows.forEach((row) => lines.push(row)); }
    });
  });
  return `﻿${lines.map((line) => line.map(esc).join(',')).join('\r\n')}\r\n`;
}
