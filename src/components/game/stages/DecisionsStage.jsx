'use client';

import React, { useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useGame } from '../../../game/state/GameContext';
import { IRRIGATION_LEVELS, IRRIGATION_METHODS, simulateSeason } from '../../../game/engine/simulate.js';
import { MONTH_NAMES } from '../../../game/engine/insights.js';
import { CharacterMessage, DataTag, Notice, fmt, pct } from '../ui';
import { MonthChart, CHART_COLORS } from '../charts';
import DataStatus from '../DataStatus';

function OptionGroup({ legend, why, options, value, onChange, disabled, lang }) {
  const ar = lang === 'ar';
  return (
    <fieldset disabled={disabled} className="space-y-2 disabled:opacity-50">
      <legend className="text-card-title font-semibold text-white">{legend}</legend>
      <p className="text-sm text-slate-300">{why}</p>
      <div className="grid gap-2 md:grid-cols-3">
        {options.map((option) => {
          const active = option.id === value;
          return (
            <label key={option.id} className={`flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-xl border p-3 ${active ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/40' : 'border-white/10 bg-[#07152b] hover:bg-[#0a1c38]'}`}>
              <span className="flex items-start gap-2 text-sm font-semibold text-white">
                <input type="radio" name={legend} checked={active} onChange={() => onChange(option.id)} className="mt-0.5" />
                <span>{ar ? option.nameAr : option.nameEn}</span>
              </span>
              <span className="text-xs text-emerald-200"><span aria-hidden="true">+ </span><span className="sr-only">{ar ? 'الميزة: ' : 'Advantage: '}</span>{ar ? option.proAr : option.proEn}</span>
              <span className="text-xs text-amber-200"><span aria-hidden="true">− </span><span className="sr-only">{ar ? 'القيد: ' : 'Drawback: '}</span>{ar ? option.conAr : option.conEn}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function DecisionsStage({ country, region, crop, season, simulation }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const { state, dispatch } = useGame();

  // Context only: need and usable rain do not depend on the irrigation choice.
  const context = useMemo(() => {
    if (season.status !== 'ready' || !crop || !region) return null;
    const rainfed = simulateSeason({ crop, latitude: region.latitude, startYear: state.startYear, plantingMonth: state.plantingMonth, decisions: { irrigationLevel: 'rainfed' }, observations: season.data.months });
    return rainfed.ok ? rainfed : null;
  }, [season.status, season.data, crop, region, state.startYear, state.plantingMonth]);

  if (!country || !crop) return null;
  if (!simulation?.ok || !context) return <DataStatus season={season} simulation={simulation} lang={lang} />;

  const rainShare = context.totals.cropNeedMm > 0 ? Math.min(1, context.totals.effectiveRainMm / context.totals.cropNeedMm) : 1;
  const labels = context.months.map((month) => MONTH_NAMES.enShort[month.month - 1]);
  const rainfed = state.decisions.irrigationLevel === 'rainfed';
  const farmerLine = rainShare < 0.3
    ? { en: 'Look at that gap. In a season like this, a rainfed crop has almost nothing to live on — but every millimetre of irrigation has to come from somewhere.', ar: 'لاحظ هذا الفرق: في موسم كهذا لا يكاد المحصول المطري يجد ماءً يكفيه، ومع ذلك لكل كمية ري تكلفتها.' }
    : rainShare < 0.75
      ? { en: 'Rain helps here but does not cover everything. The question is whether the dry months fall when the crop is thirstiest.', ar: 'الأمطار هنا تساعد لكنها لا تكفي وحدها. السؤال المهم: هل تقع الأشهر الجافة في فترة ذروة احتياج المحصول؟' }
      : { en: 'This season\'s rain covers most of what the crop needs. Irrigation may add little — see for yourself.', ar: 'أمطار هذا الموسم تغطي معظم احتياج المحصول، ولن يُحدث الري فرقًا كبيرًا. جرّب وتحقق بنفسك.' };

  return (
    <div className="space-y-6">
      <section aria-labelledby="context-title" className="surface-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="context-title" className="text-card-title font-semibold text-white">{ar ? 'ما الذي سيواجهه المحصول في هذا الموسم؟' : 'What the crop faces this season'}</h2>
          <span className="flex flex-wrap gap-1.5"><DataTag kind="observed" lang={lang} /><DataTag kind="estimate" lang={lang} /></span>
        </div>
        <MonthChart lang={lang} labels={labels} unit={ar ? 'مم' : 'mm'}
          title={ar ? 'الأمطار الفعّالة مقابل احتياج المحصول شهريًا' : 'Usable rain against estimated crop water need, by month'}
          outline={{ name: ar ? 'الاحتياج المائي التقديري' : 'Estimated crop water need', color: CHART_COLORS.need, values: context.months.map((m) => m.cropNeedMm) }}
          bars={[{ name: ar ? 'الأمطار الفعّالة (من بيانات POWER)' : 'Usable rain (from POWER precipitation)', color: CHART_COLORS.rain, values: context.months.map((m) => m.effectiveRainMm) }]} />
        <p className="text-sm text-slate-200">{ar ? `على مدار الموسم تعادل الأمطار الفعّالة نحو ${pct(rainShare)} من الاحتياج المائي للمحصول (${fmt(context.totals.effectiveRainMm)} من ${fmt(context.totals.cropNeedMm)} مم).` : `Over the season, usable rain equals about ${pct(rainShare)} of the estimated need (${fmt(context.totals.effectiveRainMm)} of ${fmt(context.totals.cropNeedMm)} mm).`}</p>
      </section>

      <CharacterMessage speaker="farmer" countryId={country.id} lang={lang}>{ar ? farmerLine.ar : farmerLine.en}</CharacterMessage>
      <CharacterMessage speaker="assistant" countryId={country.id} lang={lang}>
        {ar ? 'القرار لك. تذكّر أن مستوى الري يحدد مقدار ما يصل إلى الجذور، أما طريقة الري فتحدد كمية المياه اللازم إضافتها لإيصاله. يمكنك تعديل القرار في أي وقت ومقارنة النتائج.' : 'The choice is yours. Remember: the irrigation level sets how much reaches the roots, while the method sets how much you must deliver to get it there. You can come back, change your decisions and compare the results.'}
      </CharacterMessage>

      <OptionGroup lang={lang} legend={ar ? 'مستوى الري' : 'Irrigation strategy'} value={state.decisions.irrigationLevel}
        why={ar ? 'يحدد نسبة ما يُعوَّض من العجز الشهري (بعد الأمطار ومخزون التربة).' : 'Sets what share of each month\'s shortfall (after rain and soil water) you make up with irrigation.'}
        options={IRRIGATION_LEVELS} onChange={(id) => dispatch({ type: 'decisions', patch: { irrigationLevel: id } })} />

      <OptionGroup lang={lang} legend={ar ? 'طريقة الري (اختياري)' : 'Irrigation method (optional)'} value={state.decisions.irrigationMethod} disabled={rainfed}
        why={rainfed ? (ar ? 'لا تُطبَّق عند اختيار الزراعة المطرية.' : 'Not applicable to a rainfed crop.') : (ar ? 'تحدد الكفاءة: نسبة المياه التي تصل فعليًا إلى الجذور (60% و75% و90% قيم إرشادية من الفاو).' : 'Sets efficiency: the share of delivered water that actually reaches the roots (60%, 75% and 90% are indicative FAO values).')}
        options={IRRIGATION_METHODS} onChange={(id) => dispatch({ type: 'decisions', patch: { irrigationMethod: id } })} />

      <section aria-labelledby="planting-title" className="space-y-2">
        <h2 id="planting-title" className="text-card-title font-semibold text-white">{ar ? 'موعد الزراعة (اختياري)' : 'Planting date (optional)'}</h2>
        <p className="text-sm text-slate-300">{ar ? 'عند تغيير شهر الزراعة يتحرك الموسم كله ضمن السنة نفسها، فتتغير الحرارة والأمطار التي يتعرّض لها المحصول.' : 'Changing the planting month slides the whole season along the historical record, so the temperature and rain the crop meets at each stage change.'}</p>
        <label className="block max-w-xs space-y-1 text-sm text-slate-200">
          <span>{ar ? 'شهر الزراعة' : 'Planting month'}</span>
          <select className="field-control" value={state.plantingMonth} onChange={(event) => dispatch({ type: 'planting', month: Number(event.target.value) })}>
            {MONTH_NAMES[ar ? 'ar' : 'en'].map((name, index) => <option key={name} value={index + 1}>{name} {state.startYear}</option>)}
          </select>
        </label>
      </section>

      <Notice>
        <p className="font-medium text-white">{ar ? 'ما لا تشمله هذه المحاكاة' : 'Decisions this game does not offer'}</p>
        <p className="mt-0.5 text-sm">{ar ? 'التسميد ومكافحة الآفات والصنف عوامل مهمة في الواقع، لكن البيانات المتاحة لا تتضمن قيمًا موثوقة لها؛ ولذلك استُبعدت بدلًا من افتراض أرقام.' : 'Fertilizer, pest control and variety choice matter on a real farm, but the available data cannot support a trustworthy simulation rule for them, so they are left out rather than given an invented effect.'}</p>
      </Notice>
    </div>
  );
}
