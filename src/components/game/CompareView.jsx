'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useGame } from '../../game/state/GameContext';
import { getGameCrop } from '../../game/data/gameCrops.js';
import { getRegion } from '../../game/data/gameCountries.js';
import { compareExperiments, decisionLabel, monthLabel } from '../../game/engine/insights.js';
import { missionsData } from '../../data/missionsData';
import { DataTag, Notice, fmt, pct, secondaryButton } from './ui';
import { MonthChart, CHART_COLORS } from './charts';
import { experimentTitle } from './GameHome';

export default function CompareView({ standalone = false }) {
  const { lang, isRtl } = useLanguage();
  const ar = lang === 'ar';
  const { state, dispatch } = useGame();
  const list = state.experiments;
  const Back = isRtl ? ArrowRight : ArrowLeft;
  const header = standalone && (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-page-title font-semibold text-white">{ar ? 'مقارنة التجارب' : 'Compare experiments'}</h1>
      <button type="button" onClick={() => dispatch({ type: 'home' })} className={secondaryButton}><Back aria-hidden="true" className="h-4 w-4" />{ar ? 'قائمة المهام' : 'Game menu'}</button>
    </div>
  );

  if (list.length < 2) {
    return <div>{header}<Notice>{ar ? 'يلزم وجود تجربتين محفوظتين على الأقل. أكمل تجربة أخرى (باستراتيجية ري مختلفة مثلًا) ثم عُد إلى هذه الصفحة.' : 'You need at least two saved experiments. Finish another one (for example with a different irrigation decision), then come back here.'}</Notice></div>;
  }

  const a = list.find((item) => item.id === state.compareIds[0]) || list[1];
  const b = list.find((item) => item.id === state.compareIds[1]) || list.find((item) => item.id !== a.id);
  const setPair = (idA, idB) => dispatch({ type: 'compare', ids: [idA, idB] });
  const comparison = compareExperiments(a, b);
  const count = Math.max(a.months.length, b.months.length);
  const labels = Array.from({ length: count }, (_, i) => (ar ? `ش${i + 1}` : `M${i + 1}`));
  const series = (experiment, field, scale = 1) => Array.from({ length: count }, (_, i) => (experiment.months[i] ? Math.round(experiment.months[i][field] * scale * 10) / 10 : 0));
  const mm = ar ? 'مم' : 'mm';
  const nameA = ar ? 'التجربة (أ)' : 'Experiment A';
  const nameB = ar ? 'التجربة (ب)' : 'Experiment B';
  const flag = (id) => missionsData.find((item) => item.id === id)?.flag || '';

  const rows = [
    { label: ar ? 'كمية الأمطار (POWER)' : 'Precipitation (POWER)', kind: 'observed', get: (e) => `${fmt(e.totals.rainMm)} ${mm}` },
    { label: ar ? 'متوسط حرارة الموسم (POWER)' : 'Mean season temperature (POWER)', kind: 'observed', get: (e) => `${fmt(e.totals.meanTempC)} °C` },
    { label: ar ? 'الاحتياج المائي للمحصول' : 'Crop water need', kind: 'estimate', get: (e) => `${fmt(e.totals.cropNeedMm)} ${mm}` },
    { label: ar ? 'الأمطار الفعّالة' : 'Usable rain', kind: 'estimate', get: (e) => `${fmt(e.totals.effectiveRainMm)} ${mm}` },
    { label: ar ? 'مياه الري المضافة' : 'Irrigation delivered', kind: 'estimate', get: (e) => `${fmt(e.totals.irrigationGrossMm)} ${mm}` },
    { label: ar ? 'العجز المائي' : 'Unmet need', kind: 'estimate', get: (e) => `${fmt(e.totals.unmetNeedMm)} ${mm}` },
    { label: ar ? 'أشهر الإجهاد المائي (≥20%)' : 'Months with water stress (≥20%)', kind: 'estimate', get: (e) => String(e.totals.stressedMonths) },
    { label: ar ? 'الإنتاجية النسبية التقديرية' : 'Estimated relative yield', kind: 'estimate', get: (e) => pct(e.totals.relativeYield) },
  ];

  const Picker = ({ value, other, onChange, label }) => (
    <label className="block min-w-0 space-y-1 text-sm text-slate-200">
      <span>{label}</span>
      <select className="field-control" value={value} onChange={(event) => onChange(event.target.value)}>
        {list.map((item) => <option key={item.id} value={item.id} disabled={item.id === other}>{experimentTitle(item, lang)} — {decisionLabel(lang, item.decisions)}</option>)}
      </select>
    </label>
  );
  const Card = ({ experiment, name, color }) => {
    const crop = getGameCrop(experiment.cropId);
    const region = getRegion(experiment.countryId, experiment.regionId);
    return (
      <article className="surface-card min-w-0 space-y-2 p-4" style={{ borderTopColor: color, borderTopWidth: 3 }}>
        <h3 className="text-card-title font-semibold text-white">{name}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-400">{ar ? 'الموقع' : 'Place'}</dt><dd>{flag(experiment.countryId)} {region ? (ar ? region.nameAr : region.nameEn) : experiment.regionId}</dd>
          <dt className="text-slate-400">{ar ? 'المحصول' : 'Crop'}</dt><dd>{crop ? (ar ? crop.nameAr : crop.nameEn) : experiment.cropId}</dd>
          <dt className="text-slate-400">{ar ? 'الفترة' : 'Period'}</dt><dd>{monthLabel(lang, experiment.months[0].month, experiment.months[0].year)} – {monthLabel(lang, experiment.months[experiment.months.length - 1].month, experiment.months[experiment.months.length - 1].year)}</dd>
          <dt className="text-slate-400">{ar ? 'القرارات' : 'Decisions'}</dt><dd>{decisionLabel(lang, experiment.decisions)}</dd>
        </dl>
        <p className="text-sm text-slate-300">{ar ? 'الإنتاجية النسبية التقديرية' : 'Estimated relative yield'}: <strong className="ltr-numeric text-xl font-semibold text-white">{pct(experiment.totals.relativeYield)}</strong></p>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      {header}
      <div className="grid gap-3 sm:grid-cols-2">
        <Picker label={nameA} value={a.id} other={b.id} onChange={(id) => setPair(id, b.id)} />
        <Picker label={nameB} value={b.id} other={a.id} onChange={(id) => setPair(a.id, id)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card experiment={a} name={nameA} color={CHART_COLORS.a} />
        <Card experiment={b} name={nameB} color={CHART_COLORS.b} />
      </div>

      <section aria-labelledby="fairness-title" className="space-y-2">
        <h2 id="fairness-title" className="text-card-title font-semibold text-white">{ar ? 'هل المقارنة منصفة؟' : 'Is this a fair comparison?'}</h2>
        {comparison.notes.map((note, i) => <Notice key={i} tone={note.tone}>{ar ? note.ar : note.en}</Notice>)}
      </section>

      <section aria-labelledby="differences-title" className="surface-card space-y-2 p-4">
        <h2 id="differences-title" className="text-card-title font-semibold text-white">{ar ? 'أهم الفروق' : 'Main differences'}</h2>
        <ul className="list-disc space-y-1.5 ps-5 text-sm text-slate-100 sm:text-base">{comparison.differences.map((item, i) => <li key={i}>{ar ? item.ar : item.en}</li>)}</ul>
      </section>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[30rem] text-sm">
          <thead className="bg-white/[0.04] text-xs text-slate-300"><tr><th className="px-3 py-2 text-start font-medium">{ar ? 'المؤشر' : 'Indicator'}</th><th className="px-3 py-2 text-end font-medium">{nameA}</th><th className="px-3 py-2 text-end font-medium">{nameB}</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-white/5">
                <th scope="row" className="px-3 py-2 text-start font-normal text-slate-100"><span className="me-2">{row.label}</span><span className={`text-xs ${row.kind === 'observed' ? 'text-sky-300' : 'text-violet-300'}`}>{row.kind === 'observed' ? (ar ? 'بيانات' : 'data') : (ar ? 'تقدير' : 'estimate')}</span></th>
                <td className="ltr-numeric px-3 py-2 text-end">{row.get(a)}</td>
                <td className="ltr-numeric px-3 py-2 text-end">{row.get(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card space-y-2 p-4">
          <DataTag kind="observed" lang={lang} />
          <MonthChart lang={lang} labels={labels} unit={mm} title={ar ? 'كمية الأمطار الشهرية منذ الزراعة' : 'Monthly precipitation since planting'}
            bars={[{ name: nameA, color: CHART_COLORS.a, values: series(a, 'rainMm') }, { name: nameB, color: CHART_COLORS.b, values: series(b, 'rainMm') }]} />
        </section>
        <section className="surface-card space-y-2 p-4">
          <DataTag kind="estimate" lang={lang} />
          <MonthChart lang={lang} labels={labels} unit="%" title={ar ? 'الإجهاد المائي الشهري (نسبة العجز المائي)' : 'Monthly water stress (share of need not met)'}
            bars={[{ name: nameA, color: CHART_COLORS.a, values: series(a, 'stress', 100) }, { name: nameB, color: CHART_COLORS.b, values: series(b, 'stress', 100) }]} />
        </section>
        <section className="surface-card space-y-2 p-4 lg:col-span-2">
          <DataTag kind="estimate" lang={lang} />
          <MonthChart lang={lang} labels={labels} unit={mm} title={ar ? 'مياه الري المضافة شهريًا' : 'Irrigation water delivered each month'}
            bars={[{ name: nameA, color: CHART_COLORS.a, values: series(a, 'irrigationGrossMm') }, { name: nameB, color: CHART_COLORS.b, values: series(b, 'irrigationGrossMm') }]} />
        </section>
      </div>
      <p className="text-xs text-slate-400">{ar ? 'تُرقَّم الأشهر من موعد الزراعة (ش1 = شهر الزراعة) لإتاحة مقارنة مواسم مختلفة التواريخ.' : 'Months are numbered from planting (M1 = planting month) so seasons with different dates can be compared.'}</p>
    </div>
  );
}
