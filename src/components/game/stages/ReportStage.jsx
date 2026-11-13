'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useGame } from '../../../game/state/GameContext';
import { GAME_CROP_SOURCES } from '../../../game/data/gameCrops.js';
import { ASSUMPTIONS, IRRIGATION_METHODS, stressLevel } from '../../../game/engine/simulate.js';
import { MONTH_NAMES, monthLabel, seasonLessons, decisionLabel, STRESS_LABELS } from '../../../game/engine/insights.js';
import { POWER_MONTHLY_DOCS_URL } from '../../../game/services/powerMonthly.js';
import GameSource from '../GameSource';
import { missionsData } from '../../../data/missionsData';
import { CharacterMessage, DataTag, Stat, Notice, fmt, pct, primaryButton, secondaryButton } from '../ui';
import { MonthChart, Meter, CHART_COLORS } from '../charts';
import DataStatus from '../DataStatus';
import CompareView from '../CompareView';

const COMPACT_FIELDS = ['key', 'year', 'month', 'stageId', 'tMean', 'rainMm', 'cropNeedMm', 'effectiveRainMm', 'irrigationNetMm', 'irrigationGrossMm', 'cropUseMm', 'stress', 'temperatureFlag'];

export default function ReportStage({ country, region, crop, mission, season, simulation }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState('report');
  const ok = Boolean(simulation?.ok);

  // Save a compact record (choices + monthly summary) for later comparison.
  const record = useMemo(() => {
    if (!ok || !crop || !region) return null;
    const id = [state.countryId, region.id, crop.id, state.startYear, state.plantingMonth, state.decisions.irrigationLevel, state.decisions.irrigationLevel === 'rainfed' ? '-' : state.decisions.irrigationMethod].join('|');
    return {
      id, mode: state.mode, missionId: state.missionId, countryId: state.countryId, regionId: region.id, cropId: crop.id,
      startYear: state.startYear, plantingMonth: state.plantingMonth, decisions: state.decisions,
      months: simulation.months.map((month) => Object.fromEntries(COMPACT_FIELDS.map((field) => [field, month[field]]))),
      totals: simulation.totals,
    };
  }, [ok, simulation, crop, region, state.countryId, state.startYear, state.plantingMonth, state.decisions, state.mode, state.missionId]);
  const recordId = record?.id;
  useEffect(() => {
    if (record) dispatch({ type: 'saveExperiment', experiment: { ...record, savedAt: new Date().toISOString() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  if (!country || !crop || !region) return null;
  if (!ok) return <DataStatus season={season} simulation={simulation} lang={lang} />;

  const { months, totals } = simulation;
  const { lessons, next } = seasonLessons(simulation, crop);
  const labels = months.map((month) => MONTH_NAMES.enShort[month.month - 1]);
  const mm = ar ? 'مم' : 'mm';
  const flag = missionsData.find((item) => item.id === country.id);
  const method = IRRIGATION_METHODS.find((item) => item.id === totals.irrigationMethod);
  const yieldTone = totals.relativeYield >= 0.85 ? 'emerald' : totals.relativeYield >= 0.6 ? 'cyan' : totals.relativeYield >= 0.35 ? 'amber' : 'rose';
  const challenges = months.filter((month) => month.stress >= 0.2);
  const tabs = [{ id: 'report', en: 'Report', ar: 'التقرير' }, { id: 'compare', en: `Compare (${state.experiments.length})`, ar: `المقارنة (${state.experiments.length})` }];

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={ar ? 'أقسام التقرير' : 'Report sections'} className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#061633] p-1 sm:w-fit sm:min-w-[22rem]">
        {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-11 rounded-lg px-4 text-sm ${tab === item.id ? 'bg-cyan-700 font-semibold text-white' : 'text-slate-200 hover:bg-white/10'}`}>{ar ? item.ar : item.en}</button>)}
      </div>

      {tab === 'compare' ? <CompareView /> : (
        <>
          <section aria-labelledby="summary-title" className="surface-card space-y-3 p-4">
            <h2 id="summary-title" className="text-section-title font-semibold text-white">{flag?.flag} {ar ? crop.nameAr : crop.nameEn} · {ar ? region.nameAr : region.nameEn}</h2>
            <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              <div className="flex gap-2"><dt className="text-slate-400">{ar ? 'البلد والمنطقة:' : 'Country and region:'}</dt><dd>{ar ? flag?.countryAr : flag?.countryEn} · {ar ? region.nameAr : region.nameEn}</dd></div>
              <div className="flex gap-2"><dt className="text-slate-400">{ar ? 'الفترة:' : 'Period:'}</dt><dd>{monthLabel(lang, months[0].month, months[0].year)} – {monthLabel(lang, months[months.length - 1].month, months[months.length - 1].year)}</dd></div>
              <div className="flex gap-2"><dt className="text-slate-400">{ar ? 'القرارات:' : 'Decisions:'}</dt><dd>{decisionLabel(lang, state.decisions)}</dd></div>
              <div className="flex gap-2"><dt className="text-slate-400">{ar ? 'نوع التجربة:' : 'Mode:'}</dt><dd>{mission ? (ar ? mission.titleAr : mission.titleEn) : (ar ? 'محاكاة حرة' : 'Open simulation')}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="outcome-title" className="surface-card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="outcome-title" className="text-card-title font-semibold text-white">{ar ? 'النتيجة التقديرية' : 'Estimated outcome'}</h2>
              <DataTag kind="estimate" lang={lang} />
            </div>
            <Meter value={totals.relativeYield} tone={yieldTone} label={ar ? 'الإنتاجية النسبية التقديرية (مقارنةً بمحصول نال كامل احتياجه المائي)' : 'Estimated relative yield (of the water-unlimited potential)'} />
            <p className="text-sm text-slate-200">{ar ? `حصل المحصول على نحو ${pct(totals.supplyRatio)} من احتياجه المائي خلال الموسم، وبمعامل استجابة ${crop.ky} تكون الإنتاجية النسبية نحو ${pct(totals.relativeYield)}.` : `The crop received about ${pct(totals.supplyRatio)} of its estimated seasonal water need. With a yield response factor of ${crop.ky} for this crop, that corresponds to a relative yield of about ${pct(totals.relativeYield)}.`}</p>
            <p className="text-xs text-amber-200">{ar ? 'تقدير تعليمي لأثر الماء وحده؛ ليس قياسًا فعليًا ولا تنبؤًا بالغلة، ولا يشمل أثر الحرارة أو التسميد أو الآفات.' : 'This is an educational estimate of the effect of water alone. It is not a measurement or a forecast of yield in tonnes, and it excludes heat, fertility and pests.'}</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section aria-labelledby="env-title" className="surface-card space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="env-title" className="text-card-title font-semibold text-white">{ar ? 'الحرارة والأمطار في هذا الموسم' : 'Historical environmental conditions'}</h2><DataTag kind="observed" lang={lang} /></div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label={ar ? 'كمية الأمطار الإجمالية' : 'Total precipitation'} value={fmt(totals.rainMm)} unit={mm} />
                <Stat label={ar ? 'متوسط حرارة الموسم' : 'Mean season temperature'} value={fmt(totals.meanTempC)} unit="°C" />
              </div>
              <MonthChart lang={lang} labels={labels} unit={mm} lineUnit="°C" title={ar ? 'الأمطار والحرارة شهريًا' : 'Monthly precipitation and temperature'}
                bars={[{ name: ar ? 'كمية الأمطار' : 'Precipitation', color: CHART_COLORS.rain, values: months.map((m) => m.rainMm) }]}
                line={{ name: ar ? 'متوسط الحرارة' : 'Mean temperature', color: CHART_COLORS.temp, values: months.map((m) => m.tMean) }} />
            </section>

            <section aria-labelledby="water-title" className="surface-card space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="water-title" className="text-card-title font-semibold text-white">{ar ? 'الميزان المائي' : 'Water indicators'}</h2><DataTag kind="estimate" lang={lang} /></div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label={ar ? 'الاحتياج المائي' : 'Crop water need'} value={fmt(totals.cropNeedMm)} unit={mm} />
                <Stat label={ar ? 'الأمطار الفعّالة' : 'Usable rain'} value={fmt(totals.effectiveRainMm)} unit={mm} />
                <Stat label={ar ? 'مياه الري المضافة' : 'Irrigation delivered'} value={fmt(totals.irrigationGrossMm)} unit={mm} hint={totals.irrigationGrossMm > 0 ? `≈ ${totals.irrigationM3PerHa.toLocaleString('en')} ${ar ? 'م³/هكتار' : 'm³/ha'} · ${ar ? 'الكفاءة' : 'efficiency'} ${pct(method.efficiency)}` : null} />
                <Stat label={ar ? 'العجز المائي' : 'Unmet need'} value={fmt(totals.unmetNeedMm)} unit={mm} />
              </div>
              <MonthChart lang={lang} labels={labels} stacked unit={mm} title={ar ? 'مصادر مياه المحصول شهريًا' : 'Sources of the crop\'s water by month'}
                outline={{ name: ar ? 'الاحتياج المائي' : 'Water need', color: CHART_COLORS.need, values: months.map((m) => m.cropNeedMm) }}
                bars={[
                  { name: ar ? 'أمطار فعّالة' : 'Usable rain', color: CHART_COLORS.rain, values: months.map((m) => Math.min(m.effectiveRainMm, m.cropUseMm)) },
                  { name: ar ? 'مخزون التربة' : 'Soil store', color: CHART_COLORS.soil, values: months.map((m) => Math.max(0, m.cropUseMm - m.effectiveRainMm - m.irrigationNetMm)) },
                  { name: ar ? 'ري' : 'Irrigation', color: CHART_COLORS.irrigation, values: months.map((m) => Math.min(m.irrigationNetMm, m.cropUseMm)) },
                ]} />
            </section>
          </div>

          <section aria-labelledby="monthly-title" className="space-y-2">
            <h2 id="monthly-title" className="text-card-title font-semibold text-white">{ar ? 'ملخص الأشهر' : 'Monthly progress summary'}</h2>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[38rem] text-sm">
                <thead className="bg-white/[0.04] text-xs text-slate-300"><tr>
                  <th className="px-3 py-2 text-start font-medium">{ar ? 'الشهر' : 'Month'}</th>
                  <th className="px-3 py-2 text-start font-medium">{ar ? 'المرحلة' : 'Stage'}</th>
                  <th className="px-3 py-2 text-end font-medium">{ar ? 'الأمطار' : 'Rain'} ({mm})</th>
                  <th className="px-3 py-2 text-end font-medium">{ar ? 'الاحتياج' : 'Need'} ({mm})</th>
                  <th className="px-3 py-2 text-end font-medium">{ar ? 'ري مضاف' : 'Irrigation'} ({mm})</th>
                  <th className="px-3 py-2 text-start font-medium">{ar ? 'الإجهاد المائي' : 'Water stress'}</th>
                </tr></thead>
                <tbody>
                  {months.map((month) => {
                    const level = stressLevel(month.stress);
                    return (
                      <tr key={month.key} className="border-t border-white/5">
                        <th scope="row" className="px-3 py-2 text-start font-normal text-slate-100">{monthLabel(lang, month.month, month.year)}</th>
                        <td className="px-3 py-2 text-slate-200">{ar ? simulationStage(month.stageId).ar : simulationStage(month.stageId).en}</td>
                        <td className="ltr-numeric px-3 py-2 text-end">{fmt(month.rainMm)}</td>
                        <td className="ltr-numeric px-3 py-2 text-end">{fmt(month.cropNeedMm)}</td>
                        <td className="ltr-numeric px-3 py-2 text-end">{fmt(month.irrigationGrossMm)}</td>
                        <td className="px-3 py-2">{ar ? STRESS_LABELS[level].ar : STRESS_LABELS[level].en} <span className="ltr-numeric text-slate-400">({pct(month.stress)})</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="challenges-title" className="space-y-2">
            <h2 id="challenges-title" className="text-card-title font-semibold text-white">{ar ? 'أبرز التحديات في الموسم' : 'Main environmental challenges'}</h2>
            {challenges.length === 0
              ? <Notice tone="good">{ar ? 'لم يُظهر الحساب أشهرًا ذات إجهاد مائي واضح.' : 'The model showed no months with clear water stress.'}</Notice>
              : <ul className="list-disc space-y-1 ps-5 text-sm text-slate-100">{challenges.map((month) => <li key={month.key}>{monthLabel(lang, month.month, month.year)}: {ar ? `حصل المحصول على ${pct(1 - month.stress)} فقط من احتياجه المائي` : `${pct(1 - month.stress)} of water need met`}</li>)}</ul>}
          </section>

          <section aria-labelledby="lessons-title" className="space-y-3">
            <h2 id="lessons-title" className="text-card-title font-semibold text-white">{ar ? 'ما الذي نستخلصه؟' : 'Lessons learned'}</h2>
            <CharacterMessage speaker="assistant" countryId={country.id} lang={lang}><ul className="list-disc space-y-1 ps-4">{lessons.map((item, i) => <li key={i}>{ar ? item.ar : item.en}</li>)}</ul></CharacterMessage>
            <CharacterMessage speaker="farmer" countryId={country.id} lang={lang}>
              {totals.relativeYield >= 0.85 ? (ar ? 'موسم جيد: توافر الماء في الأوقات التي احتاج إليه المحصول فيها.' : 'A good season. Water was available when the crop needed it most.')
                : totals.relativeYield >= 0.5 ? (ar ? 'موسم متوسط: حدثت خسارة في الأشهر الجافة، وتبيّن أي الأشهر كان الأهم.' : 'An average season. Losses came from the dry months, and the results show which months mattered most.')
                : (ar ? 'موسم صعب: دون ماء كافٍ في منتصف الموسم لا يستطيع المحصول تعويض ما فاته.' : 'A difficult season. Without enough water in mid-season, the crop cannot recover the loss.')}
            </CharacterMessage>
          </section>

          <section aria-labelledby="next-title" className="surface-card space-y-2 p-4">
            <h2 id="next-title" className="text-card-title font-semibold text-white">{ar ? 'مقترحات للتجربة التالية' : 'Ideas for your next experiment'}</h2>
            <ul className="list-disc space-y-1 ps-5 text-sm text-slate-100 sm:text-base">{next.map((item, i) => <li key={i}>{ar ? item.ar : item.en}</li>)}</ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => dispatch({ type: 'again' })} className={primaryButton}>{ar ? 'تعديل القرارات وإعادة التجربة' : 'Change decisions and rerun'}</button>
              <button type="button" onClick={() => dispatch({ type: 'again', stage: 'setup' })} className={secondaryButton}>{ar ? 'تغيير المحصول أو السنة' : 'Change crop or year'}</button>
              <button type="button" onClick={() => setTab('compare')} className={secondaryButton}>{ar ? 'مقارنة بتجربة أخرى' : 'Compare with another experiment'}</button>
            </div>
            <p className="text-xs text-slate-400">{ar ? 'حُفظت هذه التجربة على جهازك لمقارنتها لاحقًا.' : 'This experiment has been saved on this device for comparison.'}</p>
          </section>

          <details className="surface-card p-3">
            <summary className="min-h-11 py-2 text-sm font-semibold text-cyan-200">{ar ? 'كيف حُسبت هذه النتيجة؟ (المصادر والمنهجية)' : 'How were these results calculated? (assumptions and sources)'}</summary>
            <div className="mt-1 space-y-2 text-sm text-slate-200">
              <p><strong className="font-semibold text-white">{ar ? 'بيانات NASA POWER:' : 'NASA POWER data:'}</strong> {ar ? 'متوسط الحرارة ومعدل هطول الأمطار لكل شهر من NASA POWER (نموذج MERRA-2 لخلية بدقة نصف درجة تقريبًا).' : 'monthly mean temperature and precipitation from NASA POWER (MERRA-2 reanalysis, grid cell of about half a degree).'} <a className="text-cyan-300 underline" href={POWER_MONTHLY_DOCS_URL} target="_blank" rel="noreferrer">{ar ? 'التوثيق' : 'Documentation'}</a></p>
              <ol className="list-decimal space-y-1 ps-5">
                <li>{ar ? 'التبخر والنتح المرجعي بطريقة بلاني–كريدل (الفاو): ETo = p × (0.46 × T + 8)، حيث p نسبة ساعات النهار.' : 'Reference evapotranspiration by the Blaney-Criddle method (FAO): ETo = p × (0.46 × T + 8), where p is the share of daytime hours for the latitude and month.'}</li>
                <li>{ar ? 'الاحتياج المائي للمحصول = معامل المحصول Kc × التبخر والنتح المرجعي × عدد أيام الشهر (من جداول الفاو).' : 'Crop water need = crop factor Kc × ETo × days, with Kc values and stage lengths from FAO tables.'}</li>
                <li>{ar ? 'الأمطار الفعّالة محسوبة بطريقة USDA-SCS المعتمدة لدى الفاو.' : 'Usable (effective) rain by the USDA-SCS method used by default in FAO CROPWAT.'}</li>
                <li>{ar ? `مخزون تربة افتراضي سعته ${ASSUMPTIONS.soilStoreCapacityMm} مم (تربة متوسطة القوام بعمق جذور متر واحد)، يُملأ قبل الزراعة من أمطار الأشهر الثلاثة السابقة ${totals.initialStoreBasis === 'observed-rain' ? `(بدأ بـ ${fmt(totals.initialStoreMm)} مم)` : '(لم تتوافر بيانات قبل الموسم فافتُرض نصف السعة)'}.` : `An assumed soil store of ${ASSUMPTIONS.soilStoreCapacityMm} mm (medium-textured soil, 1 m root zone), pre-filled from the observed rain of the three months before planting ${totals.initialStoreBasis === 'observed-rain' ? `(it started at ${fmt(totals.initialStoreMm)} mm)` : '(pre-season data was unavailable, so half capacity was assumed)'}.`}</li>
                <li>{ar ? 'الري الواصل إلى الجذور = مستوى الري × العجز؛ والري المضاف = الواصل ÷ كفاءة طريقة الري.' : 'Irrigation at the roots = irrigation level × monthly shortfall; water delivered = that ÷ method efficiency.'}</li>
                <li>{ar ? `الإنتاجية النسبية = 1 − Ky × (1 − الماء المستهلك ÷ الاحتياج) وفق معادلة الفاو، ومعامل Ky = ${crop.ky}.` : `Relative yield = 1 − Ky × (1 − water used ÷ water need), the FAO water production function (Irrigation and Drainage Paper 33), Ky = ${crop.ky}.`}{crop.kyAssumed && <span className="block text-amber-200">{ar ? 'قيمة Ky لهذا المحصول افتراض خاص بالمحاكاة: الجدول الموسمي للفاو لا يتضمن قيمة له.' : 'The Ky for this crop is an assumption of this game: FAO\'s seasonal table gives no value for it.'}</span>}</li>
              </ol>
              <p className="text-amber-200">{ar ? 'حدود ينبغي معرفتها: طريقة بلاني–كريدل تقريبية؛ والقيم الشهرية لا تُظهر فترات الجفاف اليومية؛ ويُفترض نوع تربة واحد لجميع المواقع، دون احتساب أثر الحرارة أو التسميد أو الآفات أو الملوحة.' : 'Known limits: Blaney-Criddle is approximate (it tends to overestimate in calm, humid climates and underestimate in dry, windy ones); monthly totals hide short dry spells; one soil for every location; no effect of heat, fertility, pests or salinity.'}</p>
              <GameSource season={season} region={region} lang={lang} />
              <ul className="space-y-0.5 text-xs">{GAME_CROP_SOURCES.map((source) => <li key={source.id}><a className="text-cyan-300 underline" href={source.url} target="_blank" rel="noreferrer">{source.name}</a></li>)}</ul>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

const STAGE_NAMES = { initial: { en: 'Establishment', ar: 'الزراعة والإنبات' }, development: { en: 'Vegetative growth', ar: 'النمو الخضري' }, mid: { en: 'Flowering / grain filling', ar: 'التزهير وامتلاء الحبوب' }, late: { en: 'Ripening', ar: 'النضج' } };
const simulationStage = (id) => STAGE_NAMES[id] || STAGE_NAMES.initial;
