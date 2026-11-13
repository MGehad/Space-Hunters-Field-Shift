'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Download, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWorkingSession } from '../context/WorkingSessionContext';
import { ROTATION_CRITERIA } from '../analysis/rotation/evaluateStrategies.js';
import { REPORT_TEXT } from '../data/i18n/reportText.js';
import { SCENARIO_TEXT } from '../data/i18n/scenarioText.js';

// The report view and its builder are loaded only when a report is requested.
const FarmReportView = dynamic(() => import('./report/FarmReportView'), { ssr: false });

const range = (pair) => (Math.round(pair[0]) === Math.round(pair[1]) ? Math.round(pair[0]).toLocaleString('en-GB') : `${Math.round(pair[0]).toLocaleString('en-GB')}–${Math.round(pair[1]).toLocaleString('en-GB')}`);

/** Decision summary of the farm-planning workflow, with the technical report and CSV export. */
export default function ResultsDashboardScreen({ playerChoice, playerEvaluation }) {
  const { lang, isRtl } = useLanguage();
  const { session } = useWorkingSession();
  const ar = lang === 'ar';
  const text = REPORT_TEXT[ar ? 'ar' : 'en'];
  const t = text.summary;
  const st = SCENARIO_TEXT[ar ? 'ar' : 'en'];
  const [reportOpen, setReportOpen] = useState(false);
  const [exportError, setExportError] = useState(false);

  const strategies = playerEvaluation?.strategies || [];
  const index = Math.max(0, strategies.findIndex((item) => item.id === playerChoice));
  const chosen = strategies[index];
  if (!chosen) return <div className="m-auto p-6 text-center text-white"><p>{t.noResult}</p></div>;

  const baseline = strategies[0];
  const label = (key) => (ar ? ROTATION_CRITERIA[key].labelAr : ROTATION_CRITERIA[key].labelEn);
  const joiner = ar ? '، ' : ', ';
  const higher = playerEvaluation.scoredCriteria.filter((key) => chosen.metrics[key] > baseline.metrics[key]).map(label);
  const lower = playerEvaluation.scoredCriteria.filter((key) => chosen.metrics[key] < baseline.metrics[key]).map(label);
  const scenarioData = session.analysisResults?.scenarioComparison;
  const scenario = scenarioData?.scenarios?.[index];
  const scenarioReady = scenario?.results?.some((item) => item.status === 'ok');

  const downloadCsv = async () => {
    try {
      setExportError(false);
      const { buildFarmReport, reportToCsv } = await import('../reports/buildFarmReport.js');
      const report = buildFarmReport({ session, lang: ar ? 'ar' : 'en' });
      const url = URL.createObjectURL(new Blob([reportToCsv(report)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `field-shift-report-${report.generatedAt.slice(0, 10)}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setExportError(true); }
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto w-full max-w-6xl shrink-0 space-y-4 p-4 pb-8 text-slate-100 sm:p-6 sm:pb-8">
      <header>
        <p className="text-xs text-cyan-300">{t.kicker}{session.farmLocation?.label ? <> · <bdi>{session.farmLocation.label}</bdi></> : null}</p>
        <h1 className="text-page-title font-semibold text-white">{t.title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-300">{t.intro}</p>
      </header>

      <section className="surface-card p-4">
        <h2 className="text-card-title font-semibold text-white">{text.strategies.names[index] || chosen.name}</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-3">
          {(chosen.crops || []).map((crop, i) => <li key={`${crop?.id}-${i}`} className="surface-inset p-3"><span className="text-xs text-slate-300">{t.season(i + 1)}</span><div className="font-semibold text-white">{ar ? crop?.nameAr : crop?.nameEn}</div></li>)}
        </ol>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className="surface-card min-w-0 space-y-2 p-4">
          <h2 className="text-card-title font-semibold text-white">{t.fit}</h2>
          <p className="text-lg font-medium"><span className="ltr-numeric text-2xl font-semibold text-cyan-300">{chosen.metrics.overallScore ?? '—'}</span> <span className="text-sm text-slate-400">{t.outOf}</span></p>
          {index === 0 ? <p className="text-sm text-slate-300">{t.isBaseline}</p> : (
            <dl className="space-y-1.5 text-sm">
              <div className="flex flex-wrap gap-x-2"><dt className="text-slate-400">{t.versus}:</dt><dd><span className="ltr-numeric">{chosen.comparisonToBaseline == null ? text.notAvailable : `${chosen.comparisonToBaseline > 0 ? '+' : ''}${chosen.comparisonToBaseline}`}</span> {chosen.comparisonToBaseline == null ? '' : t.points}</dd></div>
              <div><dt className="text-emerald-300">{t.higher}</dt><dd className="text-slate-200">{higher.join(joiner) || t.none}</dd></div>
              <div><dt className="text-amber-300">{t.lower}</dt><dd className="text-slate-200">{lower.join(joiner) || t.none}</dd></div>
            </dl>
          )}
          <details className="border-t border-white/10 pt-1">
            <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold text-cyan-200">{t.criteria}</summary>
            <ul className="space-y-1 text-sm text-slate-300">{playerEvaluation.scoredCriteria.map((key) => <li key={key} className="flex justify-between gap-3"><span>{label(key)}</span><span className="ltr-numeric shrink-0">{Math.round(chosen.metrics[key])} · {t.weight} {Math.round(playerEvaluation.normalizedWeights[key])}%</span></li>)}</ul>
          </details>
        </article>

        <article className="surface-card min-w-0 space-y-2 p-4">
          <h2 className="text-card-title font-semibold text-white">{t.climateTitle}</h2>
          {!scenarioReady ? <p role="status" className="text-sm text-amber-200">{t.noScenario}</p> : (
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-400">{t.basis}</dt><dd className="text-end">{scenarioData.basisLabels?.[scenario.basis] || scenario.basis}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">{t.irrigation}</dt><dd className="ltr-numeric text-end font-semibold text-white">{scenario.totals.irrigationNeedMm ? `${range(scenario.totals.irrigationNeedMm)} mm` : text.notAvailable}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">{t.irrigationHa}</dt><dd className="ltr-numeric text-end">{scenario.totals.irrigationNeedM3PerHa ? `${range(scenario.totals.irrigationNeedM3PerHa)} m³/ha` : text.notAvailable}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">{t.temperature}</dt><dd className="text-end">{scenario.complete ? st.tempCount(scenario.totals.temperatureWithin, scenario.totals.temperatureAssessed, scenario.results.length) : text.notAvailable}</dd></div>
            </dl>
          )}
        </article>
      </section>

      <section className="surface-card space-y-3 p-4">
        <div><h2 className="text-card-title font-semibold text-white">{t.reportTitle}</h2><p className="mt-1 text-sm leading-relaxed text-slate-300">{t.reportIntro}</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" id="open-report" onClick={() => setReportOpen(true)} className="app-nav-button inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-600"><FileText aria-hidden="true" className="h-4 w-4" />{text.open}</button>
          <button type="button" id="download-report-csv" onClick={downloadCsv} className="app-nav-button inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 text-sm text-slate-100 hover:bg-white/10"><Download aria-hidden="true" className="h-4 w-4" />{text.downloadCsv}</button>
        </div>
        {exportError && <p role="alert" className="text-sm text-rose-200">{text.exportError}</p>}
      </section>

      {reportOpen && <FarmReportView session={session} lang={ar ? 'ar' : 'en'} onClose={() => setReportOpen(false)} />}
    </div>
  );
}
