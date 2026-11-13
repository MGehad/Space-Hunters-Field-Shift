'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Droplets, Sprout, Thermometer } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useGame } from '../../../game/state/GameContext';
import { GROWTH_STAGES } from '../../../game/data/gameCrops.js';
import { stressLevel } from '../../../game/engine/simulate.js';
import { MONTH_NAMES, monthLabel, monthComments, STRESS_LABELS } from '../../../game/engine/insights.js';
import { CharacterMessage, DataTag, Stat, fmt, primaryButton, secondaryButton } from '../ui';
import { MonthChart, Meter, CHART_COLORS } from '../charts';
import DataStatus from '../DataStatus';

const STRESS_TONE = { none: 'emerald', mild: 'cyan', moderate: 'amber', severe: 'rose' };

export default function SimulationStage({ country, crop, season, simulation }) {
  const { lang, isRtl } = useLanguage();
  const ar = lang === 'ar';
  const { state, dispatch } = useGame();
  if (!country || !crop) return null;
  if (!simulation?.ok) return <DataStatus season={season} simulation={simulation} lang={lang} />;

  const months = simulation.months;
  const index = Math.min(state.simMonth, months.length - 1);
  const month = months[index];
  const previous = index > 0 ? months[index - 1] : null;
  const isLast = index === months.length - 1;
  const stage = GROWTH_STAGES.find((item) => item.id === month.stageId);
  const level = stressLevel(month.stress);
  const comments = monthComments(month, previous, crop, isLast);
  const labels = months.map((item) => MONTH_NAMES.enShort[item.month - 1]);
  const go = (next) => dispatch({ type: 'simMonth', index: Math.max(0, Math.min(months.length - 1, next)) });
  const Prev = isRtl ? ArrowRight : ArrowLeft;
  const Next = isRtl ? ArrowLeft : ArrowRight;
  const mm = ar ? 'مم' : 'mm';

  return (
    <div className="space-y-5">
      <nav aria-label={ar ? 'أشهر الموسم' : 'Season months'}>
        <ol className="flex gap-1.5 overflow-x-auto pb-1">
          {months.map((item, i) => {
            const reached = i <= index;
            return (
              <li key={item.key} className="min-w-0 flex-1">
                <button type="button" onClick={() => go(i)} disabled={i > index + 1} aria-current={i === index ? 'step' : undefined}
                  className={`flex min-h-11 w-full min-w-[3.75rem] flex-col items-center justify-center rounded-lg border px-1 text-xs ${i === index ? 'border-cyan-400 bg-cyan-900/60 font-semibold text-white' : reached ? 'border-white/15 bg-white/[0.05] text-slate-100 hover:bg-white/10' : 'border-white/10 text-slate-400'} disabled:opacity-40`}>
                  <span>{ar ? MONTH_NAMES.ar[item.month - 1] : MONTH_NAMES.enShort[item.month - 1]}</span>
                  <span className="ltr-numeric text-2xs opacity-80">{item.year}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-cyan-300">{ar ? `الشهر ${index + 1} من ${months.length}` : `Month ${index + 1} of ${months.length}`}</p>
          <h2 className="text-section-title font-semibold text-white">{monthLabel(lang, month.month, month.year)}</h2>
        </div>
        <p className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/30 px-3 py-1 text-sm text-emerald-100"><Sprout aria-hidden="true" className="h-4 w-4" />{ar ? stage.nameAr : stage.nameEn}</p>
      </header>
      <p className="text-sm text-slate-300">{ar ? stage.descAr : stage.descEn}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="observed-title" className="surface-card space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="observed-title" className="flex items-center gap-2 text-card-title font-semibold text-white"><Thermometer aria-hidden="true" className="h-5 w-5 text-sky-300" />{ar ? 'الحرارة والأمطار' : 'Environmental conditions'}</h3>
            <DataTag kind="observed" lang={lang} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={ar ? 'متوسط الحرارة' : 'Mean temperature'} value={fmt(month.tMean)} unit="°C" hint={previous ? `${ar ? 'الشهر السابق' : 'previous month'}: ${fmt(previous.tMean)} °C` : null} />
            <Stat label={ar ? 'كمية الأمطار' : 'Precipitation'} value={fmt(month.rainMm)} unit={mm} hint={previous ? `${ar ? 'الشهر السابق' : 'previous month'}: ${fmt(previous.rainMm)} ${mm}` : null} />
            <Stat label={ar ? 'أعلى حرارة في الشهر' : 'Highest temperature in the month'} value={month.tMax === null ? (ar ? 'غير متاحة' : 'not available') : fmt(month.tMax)} unit={month.tMax === null ? null : '°C'} />
            <Stat label={ar ? 'رطوبة منطقة الجذور (0–1)' : 'Root-zone wetness (0–1)'} value={month.soilWetness === null ? (ar ? 'غير متاحة' : 'not available') : fmt(month.soilWetness, 2)} hint={ar ? 'تقدير من MERRA-2' : 'modeled by MERRA-2'} />
          </div>
        </section>

        <section aria-labelledby="estimate-title" className="surface-card space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="estimate-title" className="flex items-center gap-2 text-card-title font-semibold text-white"><Droplets aria-hidden="true" className="h-5 w-5 text-violet-300" />{ar ? 'الميزان المائي للمحصول' : 'Crop water balance'}</h3>
            <DataTag kind="estimate" lang={lang} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={ar ? 'الاحتياج المائي للمحصول' : 'Water need'} value={fmt(month.cropNeedMm)} unit={mm} hint={`${ar ? 'معامل المحصول' : 'crop factor'} ${month.kc}`} />
            <Stat label={ar ? 'الأمطار الفعّالة' : 'Usable rain'} value={fmt(month.effectiveRainMm)} unit={mm} />
            <Stat label={ar ? 'المسحوب من مخزون التربة' : 'From soil store'} value={fmt(Math.max(0, month.cropUseMm - month.effectiveRainMm - month.irrigationNetMm))} unit={mm} hint={`${ar ? 'المتبقي في التربة' : 'left'}: ${fmt(month.soilStoreEndMm)} ${mm}`} />
            <Stat label={ar ? 'الري (الواصل / المضاف)' : 'Irrigation (at roots / delivered)'} value={`${fmt(month.irrigationNetMm)} / ${fmt(month.irrigationGrossMm)}`} unit={mm} />
          </div>
          <Meter value={1 - month.stress} tone={STRESS_TONE[level]} label={`${ar ? 'نسبة تلبية الاحتياج' : 'Share of need met'} — ${ar ? STRESS_LABELS[level].ar : STRESS_LABELS[level].en}`} />
        </section>
      </div>

      <section aria-label={ar ? 'تعليق المهندس ومساعدة البيانات' : 'Engineer and data guide comments'} aria-live="polite" className="space-y-3">
        {comments.map((comment, i) => <CharacterMessage key={`${month.key}-${i}`} speaker={comment.speaker} countryId={country.id} lang={lang} compact>{ar ? comment.ar : comment.en}</CharacterMessage>)}
      </section>

      <section className="surface-card p-4">
        <MonthChart lang={lang} labels={labels} stacked dimAfter={index} unit={mm}
          title={ar ? 'مصادر مياه المحصول حتى الآن' : 'Where the crop\'s water has come from so far'}
          outline={{ name: ar ? 'الاحتياج المائي' : 'Water need', color: CHART_COLORS.need, values: months.map((m) => m.cropNeedMm) }}
          bars={[
            { name: ar ? 'أمطار فعّالة' : 'Usable rain', color: CHART_COLORS.rain, values: months.map((m) => Math.min(m.effectiveRainMm, m.cropUseMm)) },
            { name: ar ? 'مخزون التربة' : 'Soil store', color: CHART_COLORS.soil, values: months.map((m) => Math.max(0, m.cropUseMm - m.effectiveRainMm - m.irrigationNetMm)) },
            { name: ar ? 'ري' : 'Irrigation', color: CHART_COLORS.irrigation, values: months.map((m) => Math.min(m.irrigationNetMm, m.cropUseMm)) },
          ]} />
        <p className="mt-2 text-xs text-slate-400">{ar ? 'المسافة الفارغة حتى الخط المنقّط تمثّل العجز المائي. والأشهر المقبلة تظهر باهتة إلى أن تصل إليها.' : 'The gap between a bar and its dashed outline is unmet need. Coming months stay dimmed until you reach them.'}</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" disabled={index === 0} onClick={() => go(index - 1)} className={secondaryButton}><Prev aria-hidden="true" className="h-4 w-4" />{ar ? 'الشهر السابق' : 'Previous month'}</button>
        {isLast
          ? <button type="button" onClick={() => dispatch({ type: 'goto', stage: 'report' })} className={primaryButton}>{ar ? 'عرض التقرير النهائي' : 'See the final report'}<Next aria-hidden="true" className="h-4 w-4" /></button>
          : <button type="button" onClick={() => go(index + 1)} className={primaryButton}>{ar ? 'الشهر التالي' : 'Next month'}<Next aria-hidden="true" className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}
