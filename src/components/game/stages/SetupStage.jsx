'use client';

import React, { useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useGame } from '../../../game/state/GameContext';
import { GAME_CROPS, GROWTH_STAGES } from '../../../game/data/gameCrops.js';
import { availableStartYears } from '../../../game/state/useSeasonData';
import { seasonMonths } from '../../../game/engine/simulate.js';
import { MONTH_NAMES, monthLabel } from '../../../game/engine/insights.js';
import { POWER_VARIABLES } from '../../../game/services/powerMonthly.js';
import GameSource from '../GameSource';
import { CharacterMessage, DataTag, fmt } from '../ui';
import DataStatus from '../DataStatus';

export default function SetupStage({ country, region, crop, mission, season, simulation }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const { state, dispatch } = useGame();
  const set = (patch) => dispatch({ type: 'setup', patch });

  const crops = mission ? GAME_CROPS.filter((item) => mission.cropIds.includes(item.id)) : GAME_CROPS;
  const suggestion = region?.suggestions.find((item) => item.cropId === state.cropId);
  const years = useMemo(() => availableStartYears(state.plantingMonth, crop), [state.plantingMonth, crop]);

  // Fill sensible starting values once; the player can change every one of them.
  useEffect(() => {
    if (!region) return;
    const patch = {};
    const cropId = state.cropId || region.suggestions[0]?.cropId || crops[0].id;
    if (!state.cropId) patch.cropId = cropId;
    if (!state.plantingMonth) patch.plantingMonth = region.suggestions.find((item) => item.cropId === cropId)?.plantingMonth || 5;
    if (!state.startYear) patch.startYear = years.find((year) => year <= new Date().getUTCFullYear() - 2) || years[0];
    if (Object.keys(patch).length) dispatch({ type: 'setup', patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region?.id]);

  if (!country || !region) return null;
  const chooseCrop = (item) => {
    const typical = region.suggestions.find((s) => s.cropId === item.id);
    set({ cropId: item.id, ...(typical ? { plantingMonth: typical.plantingMonth } : {}) });
  };
  const calendar = crop && state.startYear && state.plantingMonth ? seasonMonths(state.startYear, state.plantingMonth, crop) : [];
  const yearOk = !state.startYear || years.includes(state.startYear);
  const unavailable = season.status === 'ready' ? season.data.unavailable : [];

  return (
    <div className="space-y-6">
      <CharacterMessage speaker="assistant" countryId={country.id} lang={lang}>
        {ar ? 'اختر المحصول والفترة. ستُحمَّل الحرارة والأمطار لكل شهر من NASA POWER، وسيُوضَّح أي نقص في البيانات فور ظهوره.' : 'Choose the crop and the period. I will load monthly temperature and precipitation for that period from NASA POWER, and tell you plainly if any of it is unavailable.'}
      </CharacterMessage>

      <section aria-labelledby="setup-region" className="space-y-2">
        <h2 id="setup-region" className="text-card-title font-semibold text-white">{ar ? '1. المنطقة' : '1. Region'}</h2>
        {mission ? (
          <p className="text-sm text-slate-200">{ar ? region.nameAr : region.nameEn} <span className="text-slate-400">— {ar ? 'محددة لهذه المهمة' : 'fixed by this mission'}</span></p>
        ) : (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="setup-region">
            {country.regions.map((item) => (
              <button key={item.id} type="button" role="radio" aria-checked={item.id === region.id} onClick={() => set({ regionId: item.id })}
                className={`app-nav-button rounded-lg border px-3.5 text-sm ${item.id === region.id ? 'border-cyan-400 bg-cyan-900/50 font-semibold text-white' : 'border-white/15 text-slate-200 hover:bg-white/10'}`}>
                {ar ? item.nameAr : item.nameEn}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400">{ar ? 'نقطة البيانات' : 'Data point'}: <span className="ltr-numeric">{region.latitude.toFixed(2)}°, {region.longitude.toFixed(2)}°</span> — {ar ? 'تمثّل النقطة خلية عرضها نحو 50 كم، وليست حقلًا بعينه.' : 'represents a grid cell roughly 50 km across, not a single field.'}</p>
      </section>

      <section aria-labelledby="setup-crop" className="space-y-3">
        <h2 id="setup-crop" className="text-card-title font-semibold text-white">{ar ? '2. المحصول' : '2. Crop'}</h2>
        <div role="radiogroup" aria-labelledby="setup-crop" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {crops.map((item) => {
            const active = item.id === state.cropId;
            const typical = region.suggestions.find((s) => s.cropId === item.id);
            return (
              <button key={item.id} type="button" role="radio" aria-checked={active} onClick={() => chooseCrop(item)}
                className={`flex min-w-0 flex-col gap-1.5 rounded-xl border p-3 text-start transition-colors ${active ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/40' : 'border-white/10 bg-[#07152b] hover:bg-[#0a1c38]'}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-card-title font-semibold text-white"><span aria-hidden="true" className="me-1.5">{item.icon}</span>{ar ? item.nameAr : item.nameEn}</span>
                  {active && <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-cyan-300" />}
                </span>
                <span className="text-sm text-slate-200">{ar ? item.climateAr : item.climateEn}</span>
                <span className="text-xs text-slate-300">{ar ? 'طول الموسم' : 'Season in the model'}: <span className="ltr-numeric">{item.seasonDays}</span> {ar ? 'يوم' : 'days'} · {ar ? 'الاحتياج المائي الإرشادي' : 'indicative water need'}: <span className="ltr-numeric">{item.waterNeedMm[0]}–{item.waterNeedMm[1]}</span> {ar ? 'مم' : 'mm'}</span>
                {typical && <span className="w-fit rounded-full border border-emerald-400/40 px-2 py-0.5 text-xs text-emerald-200">{ar ? `يُزرع هنا عادةً في ${MONTH_NAMES.ar[typical.plantingMonth - 1]}` : `Commonly sown here around ${MONTH_NAMES.en[typical.plantingMonth - 1]}`}</span>}
              </button>
            );
          })}
        </div>
        {crop && (
          <div className="surface-inset space-y-1.5 p-3 text-sm text-slate-200">
            <p>{ar ? crop.descAr : crop.descEn}</p>
            {crop.noteEn && <p className="text-xs text-amber-200">{ar ? crop.noteAr : crop.noteEn}</p>}
            <p className="text-xs text-slate-400">{ar ? 'قيم الاحتياج المائي مأخوذة من الجدول الإرشادي للفاو، والبيانات المتاحة لا تشمل نوع التربة.' : 'Indicative water need is from the FAO crop-water-needs table; soil requirements are not covered by the available data and are therefore not shown.'}</p>
          </div>
        )}
      </section>

      <section aria-labelledby="setup-period" className="space-y-3">
        <h2 id="setup-period" className="text-card-title font-semibold text-white">{ar ? '3. السنة والشهر' : '3. Historical period'}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm text-slate-200">
            <span>{ar ? 'سنة الزراعة' : 'Planting year'}</span>
            <select className="field-control" value={state.startYear || ''} onChange={(event) => set({ startYear: Number(event.target.value) })}>
              {!yearOk && <option value={state.startYear}>{state.startYear} — {ar ? 'غير متاحة' : 'not available'}</option>}
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-sm text-slate-200">
            <span>{ar ? 'شهر الزراعة' : 'Planting month'}</span>
            <select className="field-control" value={state.plantingMonth || ''} onChange={(event) => set({ plantingMonth: Number(event.target.value) })}>
              {MONTH_NAMES[ar ? 'ar' : 'en'].map((name, index) => <option key={name} value={index + 1}>{name}{suggestion?.plantingMonth === index + 1 ? (ar ? ' — المعتاد هنا' : ' — typical here') : ''}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs text-slate-400">
          {ar ? `السنوات المتاحة محسوبة من سجل NASA POWER (من 1981 حتى العام الماضي) بحيث يقع الموسم كاملًا ضمنه: ${years[years.length - 1]}–${years[0]}.` : `Available years are derived from the NASA POWER monthly record (1981 to last year) so that the whole season falls inside it: ${years[years.length - 1]}–${years[0]}.`}
        </p>
        {calendar.length > 0 && <p className="text-sm text-slate-200">{ar ? 'موسم التجربة' : 'Experiment season'}: <strong className="font-semibold text-white">{monthLabel(lang, calendar[0].month, calendar[0].year)} – {monthLabel(lang, calendar[calendar.length - 1].month, calendar[calendar.length - 1].year)}</strong> ({ar ? `${calendar.length} أشهر` : `${calendar.length} months`})</p>}
        {!yearOk && <p role="alert" className="text-sm text-amber-200">{ar ? 'مع هذا الشهر للزراعة يتجاوز الموسم آخر سنة متاحة في السجل. اختر سنة أقدم.' : 'With this planting month the season runs past the end of the available record. Choose an earlier year.'}</p>}
      </section>

      <section aria-labelledby="setup-data" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="setup-data" className="text-card-title font-semibold text-white">{ar ? '4. الحرارة والأمطار المسجَّلة في هذا الموسم' : '4. Recorded conditions for this season'}</h2>
          <DataTag kind="observed" lang={lang} />
        </div>
        <DataStatus season={season} simulation={simulation} lang={lang} />
        {simulation?.ok && (
          <>
            <div dir="ltr" className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[26rem] text-sm" dir={ar ? 'rtl' : 'ltr'}>
                <thead className="bg-white/[0.04] text-xs text-slate-300">
                  <tr><th className="px-3 py-2 text-start font-medium">{ar ? 'الشهر' : 'Month'}</th><th className="px-3 py-2 text-end font-medium">{ar ? 'متوسط الحرارة (°م)' : 'Mean temp. (°C)'}</th><th className="px-3 py-2 text-end font-medium">{ar ? 'كمية الأمطار (مم)' : 'Precipitation (mm)'}</th><th className="px-3 py-2 text-end font-medium">{ar ? 'رطوبة منطقة الجذور' : 'Root-zone wetness'}</th></tr>
                </thead>
                <tbody>
                  {simulation.months.map((month) => (
                    <tr key={month.key} className="border-t border-white/5">
                      <th scope="row" className="px-3 py-2 text-start font-normal text-slate-100">{monthLabel(lang, month.month, month.year)}</th>
                      <td className="ltr-numeric px-3 py-2 text-end">{fmt(month.tMean)}</td>
                      <td className="ltr-numeric px-3 py-2 text-end">{fmt(month.rainMm)}</td>
                      <td className="ltr-numeric px-3 py-2 text-end">{month.soilWetness === null ? (ar ? 'غير متاحة' : 'not available') : fmt(month.soilWetness, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <GameSource season={season} region={region} lang={lang} />
            <div className="space-y-1 text-xs text-slate-400">
              <p>{ar ? 'كمية الأمطار الشهرية = المعدل اليومي × عدد أيام الشهر. ورطوبة منطقة الجذور (من 0 إلى 1) للسياق فقط ولا تدخل في الحساب.' : 'Monthly precipitation = the POWER daily rate × days in the month. Root-zone wetness is a 0–1 fraction shown for context only; it is not used in the calculation.'}</p>
              {unavailable.length > 0 && <p className="text-amber-200">{ar ? 'بيانات لم تُرجعها POWER في هذا الطلب' : 'Variables POWER did not return for this request'}: {unavailable.map((name) => (ar ? POWER_VARIABLES[name].nameAr : POWER_VARIABLES[name].nameEn)).join(ar ? '، ' : ', ')}.</p>}
              <p>{ar ? 'غير متاح هنا: قياس التبخر والنتح الفعلي، والإشعاع الشمسي، ورطوبة التربة المرصودة مباشرة من الأقمار الصناعية.' : 'Not part of this integration: observed evapotranspiration, radiation and satellite soil moisture.'}</p>
            </div>
          </>
        )}
      </section>

      {crop && (
        <details className="surface-card p-3">
          <summary className="min-h-11 py-2 text-sm font-semibold text-cyan-200">{ar ? 'مراحل نمو المحصول في الحساب' : 'Growth stages used by the model'}</summary>
          <ol className="mt-1 space-y-1.5 text-sm text-slate-200">
            {GROWTH_STAGES.map((stage, index) => <li key={stage.id}><strong className="font-semibold text-white">{ar ? stage.nameAr : stage.nameEn}</strong> (<span className="ltr-numeric">{crop.stageDays[index]}</span> {ar ? 'يومًا، معامل المحصول' : 'days, crop factor'} <span className="ltr-numeric">{crop.kc[index]}</span>): {ar ? stage.descAr : stage.descEn}</li>)}
          </ol>
        </details>
      )}
    </div>
  );
}
