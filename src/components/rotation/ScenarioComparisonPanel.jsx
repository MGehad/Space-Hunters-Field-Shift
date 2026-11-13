'use client';

import React from 'react';
import { SCENARIO_TEXT, MONTH_NAMES } from '../../data/i18n/scenarioText.js';
import { CROP_DATA_SOURCES } from '../../data/cropCatalog.js';

const KIND_STYLES = { model: 'bg-sky-400', derived: 'bg-emerald-400', reference: 'bg-amber-400', score: 'bg-violet-400', none: 'bg-slate-500' };
const round = (value) => Math.round(value).toLocaleString('en-GB');
const range = (pair) => (Math.round(pair[0]) === Math.round(pair[1]) ? round(pair[0]) : `${round(pair[0])}–${round(pair[1])}`);

function Kind({ kind, t }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${KIND_STYLES[kind]}`} />{t.kinds[kind]}</span>;
}

/**
 * Crop performance and scenario comparison (presentation only).
 * `scenarios` come from evaluateScenario(); settings are edited through `onChange`.
 */
export default function ScenarioComparisonPanel({ lang, scenarios, comparison, settings, onSeasonChange, onBasisChange, basisOptions, yearly, fitScores, farmAreaHa, cropName }) {
  const t = SCENARIO_TEXT[lang] || SCENARIO_TEXT.en;
  const months = MONTH_NAMES[lang] || MONTH_NAMES.en;
  const basisLabel = (value) => basisOptions.find((option) => option.value === value)?.label || value;
  const maxIrrigation = Math.max(1, ...scenarios.map((s) => s.totals.irrigationNeedMm?.[1] || 0));
  const total = (scenario, key, formatter = range) => (scenario.totals[key] == null ? null : formatter(scenario.totals[key]));
  const cell = (value) => (value == null ? <span className="text-slate-400">{t.incomplete}</span> : <span className="ltr-numeric">{value}</span>);

  const findings = [];
  if (comparison.lowestIrrigationId) {
    const lowest = scenarios.find((s) => s.id === comparison.lowestIrrigationId);
    findings.push(t.findingLowest(lowest.name, round(comparison.spreadMm)));
  }
  scenarios.forEach((scenario) => {
    const names = (filter) => scenario.results.map((result, index) => ({ result, index })).filter(({ result }) => result.status === 'ok' && filter(result)).map(({ index }) => cropName(scenario.crops[index])).join(lang === 'ar' ? '، ' : ', ');
    const above = names((r) => r.temperatureStatus === 'above'); if (above) findings.push(t.findingTempAbove(scenario.name, above));
    const below = names((r) => r.temperatureStatus === 'below'); if (below) findings.push(t.findingTempBelow(scenario.name, below));
    const dry = names((r) => r.rainCoveragePct && r.rainCoveragePct[1] < 25); if (dry) findings.push(t.findingRainfed(scenario.name, dry));
  });

  const rows = [
    { key: 'crops', kind: null, render: (s) => s.crops.map((crop) => cropName(crop)).join(lang === 'ar' ? ' ← ' : ' → ') },
    { key: 'basis', kind: 'model', render: (s) => basisLabel(s.basis) },
    { key: 'need', kind: 'reference', render: (s) => cell(total(s, 'waterNeedMm')) },
    { key: 'rain', kind: 'model', render: (s) => cell(total(s, 'seasonRainMm', round)) },
    { key: 'effective', kind: 'derived', render: (s) => cell(total(s, 'effectiveRainMm', round)) },
    { key: 'irrigation', kind: 'derived', render: (s) => <strong className="font-semibold text-white">{cell(total(s, 'irrigationNeedMm'))}</strong> },
    { key: 'irrigationHa', kind: 'derived', render: (s) => cell(total(s, 'irrigationNeedM3PerHa')) },
    ...(farmAreaHa ? [{ key: 'irrigationFarm', kind: 'derived', render: (s) => cell(s.totals.irrigationNeedM3PerHa ? range(s.totals.irrigationNeedM3PerHa.map((v) => v * farmAreaHa)) : null) }] : []),
    { key: 'temperature', kind: 'derived', render: (s) => (s.complete ? t.tempCount(s.totals.temperatureWithin, s.totals.temperatureAssessed, s.results.length) : <span className="text-slate-400">{t.incomplete}</span>) },
    { key: 'fit', kind: 'score', render: (s) => cell(fitScores[s.id] ?? null) },
    { key: 'soil', kind: 'none', render: () => <span className="text-slate-400">{t.soilNote}</span> },
    { key: 'yield', kind: 'none', render: () => <span className="text-slate-400">{t.yieldNote}</span> },
  ];

  return (
    <section id="scenario-comparison" aria-labelledby="scenario-comparison-title" className="surface-card min-w-0 space-y-4 p-3 sm:p-4">
      <div>
        <h2 id="scenario-comparison-title" className="text-card-title font-semibold text-white">{t.title}</h2>
        <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-300">{t.intro}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{['model', 'reference', 'derived', 'score'].map((kind) => <Kind key={kind} kind={kind} t={t} />)}</div>
      </div>

      {yearly.status === 'loading' && <p role="status" className="rounded-md bg-cyan-950/40 px-3 py-2 text-sm text-cyan-100">{t.loadingYears}</p>}
      {yearly.status === 'error' && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-rose-950/40 px-3 py-2 text-sm text-rose-100"><span>{t.yearsError}</span><button type="button" onClick={yearly.retry} className="app-nav-button rounded-md border border-rose-300/40 px-3 text-sm">{t.retry}</button></div>}

      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario, si) => (
          <article key={scenario.id} className="surface-inset min-w-0 space-y-3 p-3">
            <h3 className="text-sm font-semibold text-white">{scenario.name}</h3>
            <label className="block space-y-1 text-sm text-slate-200"><span>{t.basis}</span>
              <select className="field-control" value={settings[si].basis} onChange={(event) => onBasisChange(si, event.target.value)}>
                {basisOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {scenario.results.map((result, ci) => {
              const crop = scenario.crops[ci];
              const reference = crop?.growingPeriodDays;
              const season = settings[si].seasons[ci];
              return (
                <div key={`${scenario.id}-${ci}`} className="space-y-2 border-t border-white/10 pt-3">
                  <p className="text-sm font-semibold text-cyan-100">{ci + 1}. {cropName(crop)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1 text-xs text-slate-300"><span>{t.plantingMonth}</span>
                      <select className="field-control" value={season.plantingMonth ?? ''} onChange={(event) => onSeasonChange(si, ci, { plantingMonth: event.target.value === '' ? null : Number(event.target.value) })}>
                        <option value="">{t.choose}</option>
                        {months.map((name, index) => <option key={name} value={index}>{name}</option>)}
                      </select>
                    </label>
                    <label className="block space-y-1 text-xs text-slate-300"><span>{t.seasonDays}</span>
                      <input className="field-control" type="number" inputMode="numeric" dir="ltr" min="30" max="365" value={season.seasonDays ?? ''} onChange={(event) => onSeasonChange(si, ci, { seasonDays: event.target.value === '' ? null : Number(event.target.value) })} />
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">{reference ? t.seasonDaysHint(reference.range, reference.generic) : t.seasonDaysNoRef}</p>
                  {result.status !== 'ok'
                    ? <p role="status" className="text-sm text-amber-200">{t.status[result.status]}</p>
                    : (
                      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm">
                        <dt className="text-slate-400">{t.cropResult.rain}</dt><dd className="ltr-numeric text-end">{round(result.seasonRainMm)} mm</dd>
                        <dt className="text-slate-400">{t.cropResult.effective}</dt><dd className="ltr-numeric text-end">{round(result.effectiveRainMm)} mm</dd>
                        <dt className="text-slate-400">{t.cropResult.need}</dt><dd className="ltr-numeric text-end">{result.waterNeedMm ? `${range(result.waterNeedMm)} mm` : t.notAvailable}</dd>
                        <dt className="font-medium text-slate-200">{t.cropResult.irrigation}</dt><dd className="ltr-numeric text-end font-semibold text-white">{result.irrigationNeedMm ? `${range(result.irrigationNeedMm)} mm` : t.notAvailable}</dd>
                        <dt className="text-slate-400">{t.cropResult.temp}</dt><dd className="ltr-numeric text-end">{result.seasonMeanTempC.toFixed(1)} °C</dd>
                        <dt className="text-slate-400">{t.cropResult.optimum}</dt><dd className="text-end">{result.optimumTemperatureC ? <span className="ltr-numeric">{result.optimumTemperatureC[0]}–{result.optimumTemperatureC[1]} °C</span> : '—'}</dd>
                        <dd className={`col-span-2 text-xs ${result.temperatureStatus === 'within' ? 'text-emerald-300' : result.temperatureStatus === 'unavailable' ? 'text-slate-400' : 'text-amber-200'}`}>{t.tempStatus[result.temperatureStatus]}</dd>
                      </dl>
                    )}
                </div>
              );
            })}
          </article>
        ))}
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-white">{t.tableTitle}</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-xs text-slate-400"><tr><th scope="col" className="px-2 py-2 text-start font-medium">{t.indicator}</th>{scenarios.map((s) => <th key={s.id} scope="col" className="px-2 py-2 text-start font-medium">{s.name}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5 text-slate-100">
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="px-2 py-2 text-start font-normal text-slate-300"><span className="block">{t.rows[row.key]}</span>{row.kind && <Kind kind={row.kind} t={t} />}</th>
                  {scenarios.map((s) => <td key={s.id} className="px-2 py-2 align-top">{row.render(s)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {scenarios.some((s) => s.totals.irrigationNeedMm) && (
        <figure className="min-w-0">
          <figcaption className="text-sm font-semibold text-white">{t.chartTitle}</figcaption>
          <div className="mt-2 space-y-2" dir="ltr">
            {scenarios.map((s) => {
              const need = s.totals.irrigationNeedMm;
              return (
                <div key={s.id} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-2 text-xs sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto]">
                  <span dir="auto" className="truncate text-slate-300">{s.name}</span>
                  <span className="relative h-3 rounded bg-slate-800">{need && <span className="absolute inset-y-0 rounded bg-emerald-500/80" style={{ left: `${(100 * need[0]) / maxIrrigation}%`, width: `${Math.max(1.5, (100 * (need[1] - need[0])) / maxIrrigation)}%` }} />}</span>
                  <span className="ltr-numeric w-24 text-end text-slate-200">{need ? range(need) : '—'}</span>
                </div>
              );
            })}
          </div>
        </figure>
      )}

      <div>
        <h3 className="text-sm font-semibold text-white">{t.findingsTitle}</h3>
        <ul className="mt-1 list-disc space-y-1 ps-5 text-sm text-slate-200">{(findings.length ? findings : [t.findingNone]).map((item) => <li key={item}>{item}</li>)}</ul>
      </div>

      <details className="surface-inset px-3 py-1 text-sm">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold text-cyan-200">{t.methodTitle}</summary>
        <ul className="list-disc space-y-1.5 pb-2 ps-5 text-slate-300">{t.method.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="pb-3 text-xs text-slate-400">{t.sources}: {[
          [t.sourcePower, 'https://power.larc.nasa.gov/docs/'],
          [t.sourceWater, CROP_DATA_SOURCES.faoWater.url],
          [t.sourceRain, CROP_DATA_SOURCES.faoIrrigationNeeds.url],
          [t.sourceTemp, CROP_DATA_SOURCES.faoLandEvaluation.url],
        ].map(([label, url], index) => <React.Fragment key={url}>{index > 0 && ' · '}<a className="text-cyan-300 underline" href={url} target="_blank" rel="noreferrer">{label}</a></React.Fragment>)}</p>
      </details>
    </section>
  );
}
