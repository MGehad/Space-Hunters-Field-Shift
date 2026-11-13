'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkingSession } from '../../context/WorkingSessionContext';
import { cropCatalog, buildMissionCropCatalog } from '../../data/cropCatalog.js';
import { DEFAULT_ROTATION_PRIORITIES, ROTATION_CRITERIA, evaluateRotationStrategies } from '../../analysis/rotation/evaluateStrategies.js';
import { analyzeRotationTradeoffs } from '../../analysis/rotation/analyzeTradeoffs.js';
import { assessRotationUncertainty } from '../../analysis/uncertainty/assessRotationUncertainty.js';
import { assessEnvironmentalRisk } from '../../analysis/risk/assessEnvironmentalRisk.js';
import { formatArea, convertArea } from '../../utils/farmGeometry.js';
import { climatologyMonths, yearMonths, evaluateScenario, compareScenarios } from '../../analysis/scenario/cropClimateScenario.js';
import { getPowerMonthly, lastAvailableYear } from '../../services/nasa/powerMonthly.js';
import { SCENARIO_TEXT } from '../../data/i18n/scenarioText.js';
import ScenarioComparisonPanel from './ScenarioComparisonPanel';

const starterSequences = [
  ['winter_wheat', 'faba_beans', 'summer_corn'],
  ['winter_wheat', 'faba_beans', 'sorghum_grain'],
  ['barley', 'faba_beans', 'sunflower'],
];
const labels = ['Existing rotation (baseline)', 'Alternative rotation 1', 'Alternative rotation 2'];
const labelAr = ['الدورة الحالية (خط الأساس)', 'الدورة البديلة 1', 'الدورة البديلة 2'];
const priorityLabels = {
  waterNeed: ['Lower crop water need', 'انخفاض الاحتياج المائي للمحاصيل'],
  nitrogenPotential: ['Legume fixation potential', 'القدرة على تثبيت النيتروجين'],
  familyDiversity: ['Crop-family diversity', 'تنوع الفصائل النباتية'],
  pestBreak: ['Potential pest-cycle breaks', 'كسر دورة الآفات'],
  droughtResilience: ['Drought resilience', 'تحمّل الجفاف'],
};
const priorityAria = {
  waterNeed: 'أهمية انخفاض الاحتياج المائي', nitrogenPotential: 'أهمية تثبيت النيتروجين',
  familyDiversity: 'أهمية تنوع الفصائل النباتية', pestBreak: 'أهمية كسر دورة الآفات', droughtResilience: 'أهمية تحمّل الجفاف',
};
const priorityDescriptions = {
  waterNeed: ['How strongly the comparison should favor crops with lower published water needs.', 'مدى تفضيل المحاصيل ذات الاحتياج المائي المنشور الأقل.'],
  nitrogenPotential: ['How much to value the share of crops with sourced legume-fixation potential.', 'وزن نسبة المحاصيل البقولية ذات القدرة الموثَّقة على تثبيت النيتروجين.'],
  familyDiversity: ['How much to value the number of different crop families in a sequence.', 'وزن عدد الفصائل النباتية المختلفة في التعاقب.'],
  pestBreak: ['How much to value changes in crop family between seasons as a pest-cycle proxy.', 'وزن تغيّر الفصيلة النباتية بين المواسم، بوصفه مؤشرًا تقريبيًا لكسر دورة الآفات.'],
  droughtResilience: ['How much to value sourced drought-response classes when every strategy has comparable data.', 'وزن فئات تحمّل الجفاف الموثَّقة، عند توافر بيانات قابلة للمقارنة لجميع الاستراتيجيات.'],
};
const formatPercent = (value) => `${Math.round(value)}%`;
const defaultSeasonDays = (crop) => (crop?.growingPeriodDays ? Math.round((crop.growingPeriodDays.range[0] + crop.growingPeriodDays.range[1]) / 2) : null);
const YEARS_BACK = 5;

export default function RotationStrategyWorkbench({ mission = null, onBack, onDecisionSubmit, focusSection = 'comparison' }) {
  const { lang, isRtl } = useLanguage();
  const { session, updateSession } = useWorkingSession();
  const ar = lang === 'ar';
  // Learning missions render this workbench as a single screen; the farm
  // workflow shows one section per step.
  const standalone = Boolean(mission);
  const show = (section) => (standalone ? section !== 'inputs' : focusSection === section);
  const fmt = (value) => (Number.isFinite(value) ? Math.round(value * 10) / 10 : value);
  const catalog = useMemo(() => mission ? buildMissionCropCatalog(mission.crops) : cropCatalog, [mission]);
  const starter = useMemo(() => {
    if (!mission?.rotations?.length) return starterSequences;
    return mission.rotations.slice(0, 3).map((rotation, index) => (rotation.sequenceIds || []).slice(0, 3).map((id) => id));
  }, [mission]);
  const savedInputs = session.farmInformation?.rotationInputs || {};
  const [sequences, setSequences] = useState(() => starter);
  const [baselineConfirmed, setBaselineConfirmed] = useState(() => Boolean(session.analysisResults?.rotationEvaluation?.farmInputs?.baselineConfirmed));
  const [selectedId, setSelectedId] = useState(() => session.analysisResults?.selectedStrategyId || 'strategy-0');
  const [priorities, setPriorities] = useState(() => savedInputs.priorities || DEFAULT_ROTATION_PRIORITIES);
  const [farm, setFarm] = useState(() => ({ region: session.farmLocation?.label || mission?.regionEn || '', soilType: '', waterAvailability: '', equipment: '', market: '', ...savedInputs, region: session.farmLocation?.label || mission?.regionEn || savedInputs.region || '' }));

  // Crop–climate scenario settings: one climate period per scenario, a planting month and season length per crop.
  const [scenarioSettings, setScenarioSettings] = useState(() => {
    const saved = savedInputs.scenarioSettings;
    if (Array.isArray(saved) && saved.length === 3) return saved;
    return starter.map((sequence) => ({ basis: 'average', seasons: sequence.map((id) => ({ plantingMonth: null, seasonDays: defaultSeasonDays(catalog.find((crop) => crop.id === id)) })) }));
  });
  const [yearly, setYearly] = useState({ status: 'idle', months: null });
  const [yearlyAttempt, setYearlyAttempt] = useState(0);
  const needsYearly = !standalone && scenarioSettings.some((item) => item.basis !== 'average');
  const farmLat = session.farmLocation?.latitude; const farmLon = session.farmLocation?.longitude;
  useEffect(() => {
    if (!needsYearly || !Number.isFinite(farmLat) || !Number.isFinite(farmLon)) return undefined;
    const controller = new AbortController();
    const last = lastAvailableYear();
    setYearly({ status: 'loading', months: null });
    getPowerMonthly({ latitude: farmLat, longitude: farmLon, startYear: last - YEARS_BACK + 1, endYear: last + 1, signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setYearly({ status: 'ready', months: data.months, retrievedAt: data.retrievedAt }); })
      .catch(() => { if (!controller.signal.aborted) setYearly({ status: 'error', months: null }); });
    return () => controller.abort();
  }, [needsYearly, farmLat, farmLon, yearlyAttempt]);

  useEffect(() => {
    const ids = new Set(catalog.map((crop) => crop.id));
    const saved = session.rotationStrategies?.length === 3 ? session.rotationStrategies.map((strategy) => strategy.sequence || []) : null;
    if (saved && saved.every((sequence) => sequence.length === 3 && sequence.every((id) => ids.has(id)))) setSequences(saved);
    else setSequences(starter);
    setBaselineConfirmed(Boolean(session.analysisResults?.rotationEvaluation?.farmInputs?.baselineConfirmed));
    setSelectedId(session.analysisResults?.selectedStrategyId || 'strategy-0');
  }, [starter, catalog]);

  const strategies = useMemo(() => sequences.map((sequence, index) => ({
    id: `strategy-${index}`, name: ar ? labelAr[index] : labels[index], isBaseline: index === 0, sequence,
  })), [sequences, ar]);
  const evaluation = useMemo(() => evaluateRotationStrategies(strategies, {
    cropCatalog: catalog, priorities, environmentalObservations: session.environmentalObservations || [],
    farmInputs: { ...farm, baselineConfirmed },
  }), [strategies, catalog, priorities, session.environmentalObservations, farm, baselineConfirmed]);

  const averageMonths = useMemo(() => climatologyMonths(session.environmentalObservations || []), [session.environmentalObservations]);
  const scenarioText = SCENARIO_TEXT[ar ? 'ar' : 'en'];
  const basisOptions = useMemo(() => {
    const last = lastAvailableYear();
    return [{ value: 'average', label: scenarioText.basisAverage(averageMonths.period) }, ...Array.from({ length: YEARS_BACK }, (_, index) => ({ value: String(last - index), label: scenarioText.basisYear(last - index) }))];
  }, [scenarioText, averageMonths.period]);
  const scenarios = useMemo(() => evaluation.strategies.map((strategy, index) => {
    const setting = scenarioSettings[index];
    const months = setting.basis === 'average' ? averageMonths : (yearly.months ? yearMonths(yearly.months, Number(setting.basis)) : { available: false });
    return { ...evaluateScenario({ id: strategy.id, name: strategy.name, crops: strategy.crops, seasons: setting.seasons, months, basis: setting.basis }), crops: strategy.crops };
  }), [evaluation, scenarioSettings, averageMonths, yearly.months]);
  const scenarioComparison = useMemo(() => compareScenarios(scenarios), [scenarios]);
  const farmAreaHa = session.farmLocation?.area != null ? convertArea(session.farmLocation.area, session.farmLocation.areaUnit, 'hectare') : null;

  useEffect(() => {
    updateSession({
      selectedCrops: sequences[0]?.map((id) => catalog.find((crop) => crop.id === id)).filter(Boolean) || [],
      rotationStrategies: strategies,
      analysisResults: { ...(session.analysisResults || {}), rotationEvaluation: evaluation, scenarioComparison: { scenarios, comparison: scenarioComparison, basisLabels: Object.fromEntries(basisOptions.map((o) => [o.value, o.label])), farmAreaHa, averagePeriod: averageMonths.period } },
      farmInformation: { ...(session.farmInformation || {}), rotationInputs: { ...farm, priorities, scenarioSettings } },
    });
  // Session update is intentionally based on evaluator inputs only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluation, scenarios, scenarioSettings]);

  const setCrop = (strategyIndex, seasonIndex, cropId) => {
    setSequences((current) => current.map((sequence, i) => i === strategyIndex ? sequence.map((id, j) => j === seasonIndex ? cropId : id) : sequence));
    // A different crop gets its own reference season length; the planting month must be chosen again.
    setScenarioSettings((current) => current.map((item, i) => i === strategyIndex ? { ...item, seasons: item.seasons.map((season, j) => j === seasonIndex ? { plantingMonth: null, seasonDays: defaultSeasonDays(catalog.find((crop) => crop.id === cropId)) } : season) } : item));
  };
  const setSeason = (strategyIndex, seasonIndex, patch) => setScenarioSettings((current) => current.map((item, i) => i === strategyIndex ? { ...item, seasons: item.seasons.map((season, j) => j === seasonIndex ? { ...season, ...patch } : season) } : item));
  const setBasis = (strategyIndex, basis) => setScenarioSettings((current) => current.map((item, i) => i === strategyIndex ? { ...item, basis } : item));
  const fieldClass = 'field-control';
  const selected = evaluation.strategies.find((strategy) => strategy.id === selectedId) || evaluation.strategies[0];
  const tradeoffs = useMemo(() => analyzeRotationTradeoffs(evaluation), [evaluation]);
  const uncertainty = useMemo(() => assessRotationUncertainty({ strategy: selected, evaluation, farmLocation: session.farmLocation, environmentalObservations: session.environmentalObservations || [] }), [selected, evaluation, session.farmLocation, session.environmentalObservations]);
  const riskAssessment = useMemo(() => assessEnvironmentalRisk({ observations: session.environmentalObservations || [], farmLocation: session.farmLocation, farmInputs: farm, strategies }), [session.environmentalObservations, session.farmLocation, farm, strategies]);
  const cropName = (crop) => ar ? crop?.nameAr : crop?.nameEn;
  const submit = () => onDecisionSubmit?.(selected.id, { season1: selected.sequence[0], season2: selected.sequence[1], season3: selected.sequence[2] }, evaluation);
  const selectStrategy = (id) => {
    setSelectedId(id);
    updateSession({ analysisResults: { ...(session.analysisResults || {}), selectedStrategyId: id } });
  };

  const farmLocation = session.farmLocation;
  const farmArea = session.farmArea || farmLocation;
  const locationLabel = farmLocation?.label || (ar ? mission?.regionAr || 'لم يُحدَّد موقع المزرعة' : mission?.regionEn || 'No farm location selected');
  const areaLabel = farmArea?.area != null && farmArea?.areaUnit
    ? formatArea(farmArea.area, farmArea.areaUnit, ar ? 'ar' : 'en')
    : (ar ? 'غير متاح' : 'Unavailable');
  const methodLabel = farmLocation?.selectionMethod === 'polygon-boundary'
    ? (ar ? 'مساحة محسوبة من الحدود المرسومة' : 'Calculated from drawn boundary')
    : farmLocation?.selectionMethod === 'point-area'
      ? (ar ? 'نقطة مرجعية ومساحة مُدخلة' : 'Reference point and entered area')
      : (ar ? 'طريقة القياس غير مسجَّلة' : 'Measurement method unavailable');

  return <div dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto w-full max-w-[1500px] shrink-0 space-y-4 px-3 py-4 text-slate-100 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {standalone && <>
          <p className="text-xs text-cyan-300">{ar ? 'مثال تعليمي' : 'Learning scenario'}</p>
          <h1 className="text-page-title font-semibold text-white">{ar ? 'مقارنة استراتيجيات الدورة الزراعية' : 'Rotation Strategy Comparison'}</h1>
        </>}
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">{focusSection === 'comparison' ? (ar ? 'قارن الدورة الحالية (خط الأساس) ببديلين وفق خصائص المحاصيل الموثَّقة وأولوياتك، ثم قيّم ملاءمتها لمناخ الموقع.' : 'Compare an existing-rotation baseline with two alternatives using sourced crop traits and priorities you control.') : focusSection === 'inputs' ? (ar ? 'راجع بيانات المزرعة وحدِّد أوزان معايير المقارنة.' : 'Review farm context and set comparison priorities.') : focusSection === 'tradeoffs' ? (ar ? 'راجع ما يتحسّن وما يتراجع في كل استراتيجية مقارنةً بخط الأساس، وحدود تقييم المخاطر.' : 'Review supported criterion changes and available risk classifications.') : (ar ? 'راجع مدى اكتمال البيانات وما لا يشمله التحليل.' : 'Review evidence completeness, assumptions, and limitations.')}</p>
      </div>
      {onBack && <button type="button" onClick={onBack} className="app-nav-button shrink-0 rounded-lg border border-slate-600 px-3 text-sm">{ar ? 'رجوع' : 'Back'}</button>}
    </header>

    <div className="flex min-w-0 flex-col gap-4">
      <aside id="workflow-section-2" aria-label={ar ? 'بيانات المزرعة والمحاصيل' : 'Farm Information & Crops'} className={`${show('inputs') ? 'block' : 'hidden'} surface-card mx-auto w-full min-w-0 max-w-4xl scroll-mt-4 space-y-4 p-3 sm:p-5`}>
        <section aria-labelledby="selected-farm-context-title" className="rounded-lg border border-cyan-900/70 bg-[#030914] p-3">
          <h3 id="selected-farm-context-title" className="text-card-title font-semibold text-white">{ar ? 'بيانات المزرعة المحددة' : 'Selected Farm Context'}</h3>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div className="min-w-0"><dt className="text-slate-400">{ar ? 'الموقع' : 'Location'}</dt><dd className="break-words font-semibold">{locationLabel}</dd></div>
            <div className="min-w-0"><dt className="text-slate-400">{ar ? 'الإحداثيات' : 'Coordinates'}</dt><dd className="ltr-numeric break-words rtl:text-end">{Number.isFinite(farmLocation?.latitude) && Number.isFinite(farmLocation?.longitude) ? `${farmLocation.latitude.toFixed(5)}, ${farmLocation.longitude.toFixed(5)}` : (ar ? 'غير متاحة' : 'Unavailable')}</dd></div>
            <div><dt className="text-slate-400">{ar ? 'مساحة المزرعة' : 'Farm area'}</dt><dd className="font-semibold">{areaLabel}</dd></div>
            <div className="min-w-0"><dt className="text-slate-400">{ar ? 'طريقة قياس المساحة' : 'Area measurement method'}</dt><dd className="break-words">{methodLabel}</dd></div>
          </dl>
        </section>

        <details className="rounded-lg border border-slate-700 bg-[#030914]">
          <summary className="cursor-pointer px-3 py-3 text-sm font-bold text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">{ar ? 'بيانات إضافية عن المزرعة (اختياري)' : 'Additional Farm Information (Optional)'}</summary>
          <div className="space-y-4 border-t border-slate-700 p-3">
            <p className="text-xs leading-relaxed text-slate-400">{ar ? 'هذه بيانات يُدخلها المستخدم للسياق فقط؛ ليست قياسات من الأقمار الصناعية ولا تغيّر درجات المقارنة.' : 'These are user-provided context only. They are not satellite measurements and do not change comparison scores.'}</p>
            <label className="block space-y-1.5 text-sm text-slate-200"><span>{ar ? 'نوع التربة (اختياري)' : 'Soil type (optional)'}</span><input className={fieldClass} value={farm.soilType || ''} onChange={(e) => setFarm({ ...farm, soilType: e.target.value })} placeholder={ar ? 'أدخل نوع التربة إن كان معروفًا' : 'Enter the soil type if known'} /><span className="block text-xs leading-relaxed text-slate-400">{ar ? 'لا يمكن تحديد نوع التربة من الإحداثيات عبر الأقمار الصناعية، وهذا الحقل لا يغيّر النتيجة.' : 'Soil type is not inferred from coordinates and does not affect the score.'}</span></label>
            <label className="block space-y-1.5 text-sm text-slate-200"><span>{ar ? 'توافر المياه (اختياري)' : 'Water availability (optional)'}</span><select className={fieldClass} value={farm.waterAvailability === 'Adequate' ? 'Sufficient' : farm.waterAvailability || ''} onChange={(e) => setFarm({ ...farm, waterAvailability: e.target.value })}><option value="">{ar ? 'غير معروف' : 'Unknown'}</option><option value="Limited">{ar ? 'محدود' : 'Limited'}</option><option value="Moderate">{ar ? 'متوسط' : 'Moderate'}</option><option value="Sufficient">{ar ? 'كافٍ' : 'Sufficient'}</option></select><span className="block text-xs leading-relaxed text-slate-400">{ar ? 'تقدير المستخدم فقط؛ ليس قياسًا للأمطار أو لمياه الري، ولا يغيّر الدرجة.' : 'A self-reported context value, not a measure of rainfall, soil moisture, or groundwater; it does not affect the score.'}</span></label>
          </div>
        </details>

        <div className="border-t border-slate-700 pt-3">
          <h3 className="text-card-title font-semibold text-white">{ar ? 'أولويات المقارنة' : 'Comparison Priorities'}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{ar ? 'تحدِّد هذه الأوزان تأثير كل معيار في درجة المقارنة. المعايير التي لا تتوافر لها بيانات قابلة للمقارنة تُستبعد، ويُعاد توزيع الأوزان على المعايير المتبقية.' : 'These weights set how supported crop traits influence the relative comparison score. Traits without comparable data are excluded, and remaining weights are renormalized.'}</p>
          <div className="mt-3 space-y-4">{Object.entries(DEFAULT_ROTATION_PRIORITIES).map(([key]) => <label key={key} className="block space-y-1.5 text-sm text-slate-200"><span className="flex items-start justify-between gap-3"><span>{priorityLabels[key][ar ? 1 : 0]}</span><b className="shrink-0 font-semibold tabular-nums text-cyan-300">{priorities[key]}</b></span><span className="block text-xs leading-relaxed text-slate-400">{priorityDescriptions[key][ar ? 1 : 0]}</span><input className="w-full accent-cyan-400" type="range" min="0" max="100" value={priorities[key]} aria-label={ar ? priorityAria[key] : priorityLabels[key][0]} onChange={(e) => setPriorities({ ...priorities, [key]: Number(e.target.value) })} /></label>)}</div>
        </div>
      </aside>

      <section id="workflow-section-3" className={`${show('comparison') ? 'block' : 'hidden'} scroll-mt-4 space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-card-title font-semibold text-white">{ar ? 'استراتيجيات الدورة الزراعية' : 'Rotation strategies'}</h2><button type="button" onClick={() => { setSequences(starter); setScenarioSettings(starter.map((sequence) => ({ basis: 'average', seasons: sequence.map((id) => ({ plantingMonth: null, seasonDays: defaultSeasonDays(catalog.find((crop) => crop.id === id)) })) }))); setBaselineConfirmed(false); selectStrategy('strategy-0'); setPriorities(DEFAULT_ROTATION_PRIORITIES); }} className="app-nav-button rounded-lg border border-white/15 px-3 text-sm text-slate-100 hover:bg-white/10">{ar ? 'استعادة الأمثلة الافتراضية' : 'Restore starter sequences'}</button></div>
      <div id="rotation-comparison" className="grid min-w-0 scroll-mt-4 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {strategies.map((strategy, si) => {
          const result = evaluation.strategies[si];
          const strengths = si === 0 ? (ar ? 'مرجع المقارنة.' : 'Comparison reference.') : (evaluation.scoredCriteria.filter((key) => result.metrics[key] > evaluation.strategies[0].metrics[key]).map((key) => ar ? ROTATION_CRITERIA[key].labelAr : ROTATION_CRITERIA[key].labelEn).join(', ') || (ar ? 'لا يوجد معيار أعلى من خط الأساس.' : 'No higher supported criterion score.'));
          const tradeoffs = si === 0 ? (baselineConfirmed ? (ar ? 'الدورة الحالية المؤكَّدة؛ مرجع المقارنة.' : 'Confirmed existing rotation; comparison reference.') : (ar ? 'نموذج افتراضي لم يُؤكَّد بعدُ أنه الدورة الفعلية للمزرعة.' : 'Baseline template has not been confirmed yet.')) : (evaluation.scoredCriteria.filter((key) => result.metrics[key] < evaluation.strategies[0].metrics[key]).map((key) => ar ? ROTATION_CRITERIA[key].labelAr : ROTATION_CRITERIA[key].labelEn).join(', ') || (ar ? 'لا يوجد معيار أقل من خط الأساس.' : 'No lower supported criterion score.'));
          return <article key={strategy.id} className={`min-w-0 rounded-xl border bg-[#07152b] p-3 sm:p-4 ${selectedId === strategy.id ? 'border-cyan-400 ring-1 ring-cyan-400/40' : 'border-white/10'}`}>
            <div className="flex items-center justify-between gap-2"><h3 className="min-w-0 text-card-title font-semibold text-white">{ar ? labelAr[si] : labels[si]}</h3><label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm text-cyan-100"><input aria-label={ar ? `اختيار ${labelAr[si]}` : `Select ${labels[si]}`} type="radio" checked={selectedId === strategy.id} onChange={() => selectStrategy(strategy.id)} />{ar ? 'اختيار' : 'Select'}</label></div>
            <p className="mt-1 break-words text-sm font-medium text-slate-100 sm:text-base">{result.crops.map((crop) => cropName(crop)).join(isRtl ? ' ← ' : ' → ')}</p>
            <div className="surface-inset mt-3 p-3"><div className="text-xs text-slate-300">{ar ? 'درجة الملاءمة النسبية' : 'Relative fit score'}</div><div className="ltr-numeric text-2xl font-semibold text-cyan-300 rtl:text-end">{result.metrics.overallScore ?? '—'}<span className="text-sm font-normal text-slate-400"> / 100</span></div>{result.comparisonToBaseline !== null && <p className="text-xs text-slate-300">{ar ? 'الفرق عن خط الأساس' : 'vs baseline'}: <span className="ltr-numeric">{result.comparisonToBaseline > 0 ? '+' : ''}{result.comparisonToBaseline}</span></p>}</div>
            <p className="mt-3 text-sm text-emerald-200"><b className="font-semibold">{ar ? 'نقاط القوة: ' : 'Supported strength: '}</b>{strengths}</p>
            <p className="mt-1 text-sm text-amber-200"><b className="font-semibold">{ar ? 'الموازنات: ' : 'Trade-off: '}</b>{tradeoffs}</p>
            <details className="mt-3 border-t border-slate-700 pt-2">
              <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold text-cyan-200">{ar ? 'تعديل المحاصيل وعرض المصادر والمؤشرات' : 'Edit crops and view evidence & metrics'}</summary>
              {si === 0 && <label className="my-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-amber-200"><input type="checkbox" checked={baselineConfirmed} onChange={(event) => setBaselineConfirmed(event.target.checked)} />{ar ? 'أؤكد أن هذا التعاقب هو الدورة الفعلية الحالية للمزرعة' : 'Confirm this sequence matches the farm’s actual existing rotation'}</label>}
              <div className="mt-2 space-y-2">{[0, 1, 2].map((season) => <label key={season} className="block text-sm text-slate-200">{ar ? `الموسم ${season + 1}` : `Season ${season + 1}`}<select className={`${fieldClass} mt-1`} value={sequences[si]?.[season] || ''} onChange={(event) => setCrop(si, season, event.target.value)}>{catalog.map((crop) => <option key={crop.id} value={crop.id}>{cropName(crop)}</option>)}</select></label>)}</div>
              <div className="mt-2 space-y-1">{result.crops.map((crop, index) => crop && <p key={`${crop.id}-source-${index}`} className="text-xs text-slate-400">{cropName(crop)}: {crop.cropWaterNeed ? <a className="text-cyan-300 underline" href={crop.cropWaterNeed.source.url} target="_blank" rel="noreferrer">FAO · {ar ? crop.cropWaterNeed.scopeAr : crop.cropWaterNeed.scope}</a> : (ar ? 'الخصائص الزراعية غير متاحة أو غير موثَّقة' : 'Agronomic traits unavailable or unverified')}{crop.familyEvidence && <> · <a className="text-cyan-300 underline" href={crop.familyEvidence.url} target="_blank" rel="noreferrer">{ar ? 'مصدر الفصيلة' : 'family source'}</a></>}</p>)}</div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Metric label={ar ? 'الاحتياج المائي الإرشادي للمحاصيل' : 'Indicative crop water need'} value={result.metrics.waterNeedRangeMm ? `${result.metrics.waterNeedRangeMm.min}–${result.metrics.waterNeedRangeMm.max} mm` : 'Unavailable'} />
              <Metric label={ar ? 'القدرة على تثبيت النيتروجين' : 'Nitrogen fixation potential'} value={result.metrics.nitrogenPotential == null ? 'Unavailable' : `${formatPercent(result.metrics.nitrogenPotential)} ${ar ? 'من المحاصيل' : 'of crops'}`} />
              <Metric label={ar ? 'تنوع الفصائل' : 'Family diversity'} value={result.metrics.familyDiversity == null ? 'Unavailable' : formatPercent(result.metrics.familyDiversity)} />
              <Metric label={ar ? 'كسر دورة الآفات' : 'Potential pest-cycle breaks'} value={result.metrics.pestBreak == null ? 'Unavailable' : `${formatPercent(result.metrics.pestBreak)} ${ar ? 'من الانتقالات بين المواسم' : 'of transitions'}`} />
              <Metric label={ar ? 'تحمّل الجفاف (غير مقيَّم لغياب مصدر موثَّق)' : 'Drought resilience (not scored; no sourced class)'} value={result.metrics.droughtResilience == null ? (ar ? 'غير متاح' : 'Unavailable') : `${Math.round(result.metrics.droughtResilience)}/100`} />
              <Metric label={ar ? 'التوافق البيئي' : 'Environmental compatibility'} value={ar ? 'يُقيَّم في مقارنة السيناريوهات أدناه؛ غير داخل في الدرجة' : 'Assessed in the scenario comparison below; not part of the score'} />
            </dl>
            </details>
          </article>;
        })}
      </div>

    {!standalone && show('comparison') && <ScenarioComparisonPanel lang={ar ? 'ar' : 'en'} scenarios={scenarios} comparison={scenarioComparison} settings={scenarioSettings} onSeasonChange={setSeason} onBasisChange={setBasis} basisOptions={basisOptions} yearly={{ ...yearly, retry: () => setYearlyAttempt((value) => value + 1) }} fitScores={Object.fromEntries(evaluation.strategies.map((item) => [item.id, item.metrics.overallScore]))} farmAreaHa={farmAreaHa} cropName={cropName} />}

    <section className="grid lg:grid-cols-2 gap-3">
      <div className="surface-card min-w-0 p-3 sm:p-4"><h3 className="text-card-title font-semibold text-white">{ar ? 'تفسير نتيجة الاستراتيجية' : 'Strategy explanation'}</h3><p className="mt-2 text-sm text-slate-200">{selected.metrics.overallScore == null ? (ar ? 'لا تتوافر بيانات كافية وقابلة للمقارنة لحساب درجة موحَّدة.' : 'There is not enough comparable crop data for a combined score.') : (ar ? `الدرجة ${selected.metrics.overallScore}/100 تعبّر عن ملاءمة الاستراتيجية للمعايير الموزونة فقط.` : `Score ${selected.metrics.overallScore}/100 reflects relative fit to the selected priorities only.`)}</p><p className="mt-1 text-xs text-slate-400">{ar ? 'معيار المياه يعبّر عن الاحتياج المائي الإرشادي للمحاصيل، وتثبيت النيتروجين قدرة محتملة وليس كمية مضمونة. الدرجات أدوات مساندة وليست ضمانًا للإنتاجية أو العائد.' : 'Water means crop evapotranspiration need, not irrigation efficiency. Legume potential is not a guaranteed nitrogen quantity. Scores are not guaranteed recommendations.'}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs min-[420px]:grid-cols-2">{evaluation.scoredCriteria.map((key) => <div key={key} className="rounded bg-slate-900 p-2"><span>{ar ? ROTATION_CRITERIA[key].labelAr : ROTATION_CRITERIA[key].labelEn}</span><div className="mt-1 h-1.5 bg-slate-700 rounded"><div className="h-full bg-cyan-400 rounded" style={{ width: `${selected.metrics[key]}%` }} /></div><span className="text-cyan-300">{Math.round(selected.metrics[key])} · {evaluation.normalizedWeights[key].toFixed(0)}% {ar ? 'الوزن' : 'weight'}</span></div>)}</div>
      </div>
      <div className="surface-card min-w-0 p-3 sm:p-4"><h3 className="text-card-title font-semibold text-white">{ar ? 'المصادر والافتراضات والحدود' : 'Evidence, assumptions & limits'}</h3><p className="mt-2 text-sm text-slate-200">{ar ? 'كل خاصية علمية للمحاصيل مرتبطة بمصدرها.' : 'Scientific crop facts are linked to their source in the unified catalog.'}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"><a className="text-cyan-300 underline" href="https://www.fao.org/4/S2022E/s2022e07.htm" target="_blank" rel="noreferrer">FAO · indicative crop water needs</a><a className="text-cyan-300 underline" href="https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/living-soil-healthy-garden" target="_blank" rel="noreferrer">UMN Extension · crop families & legumes</a><a className="text-cyan-300 underline" href="https://extension.psu.edu/plant-rotation-in-the-garden-based-on-plant-families" target="_blank" rel="noreferrer">Penn State · family rotation</a></div><ul className="mt-2 list-disc space-y-1 ps-4 text-xs text-amber-200">{selected.assumptions.map((item, i) => <li key={i}>{item}</li>)}<li>{ar ? 'مواعيد الزراعة المحلية والتربة والسوق والإنتاج الفعلي غير داخلة في الدرجة.' : 'Local calendars, soil response, markets, yield, and soil cover are unavailable or unverified; they do not contribute to the score.'}</li></ul>
        {selected.crops.map((crop) => crop?.cropWaterNeed && <p className="mt-1 text-xs text-slate-400" key={crop.id}>{cropName(crop)}: {crop.cropWaterNeed.scope}</p>)}
      </div>
    </section>
      </section>
    </div>
    <section id="workflow-section-4" aria-label={ar ? 'المخاطر والموازنات' : 'Risks & Trade-offs'} className={`${show('tradeoffs') ? 'block' : 'hidden'} surface-card scroll-mt-4 p-3 sm:p-4`}>
      {standalone && <h2 className="text-card-title font-semibold text-white">{ar ? 'المخاطر والموازنات' : 'Risks & Trade-offs'}</h2>}
      <p className="text-sm text-slate-300">{ar ? 'الأشرطة تقارن درجات المعايير الموثَّقة بخط الأساس، ولا تمثّل الإنتاجية أو العائد المالي.' : 'Bars compare supported trait scores with the baseline. They do not represent yield or profit.'}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tradeoffs.map((item, si) => <article key={item.strategyId} className="surface-inset min-w-0 p-3"><h3 className="text-sm font-semibold text-white">{ar ? labelAr[si] : labels[si]}</h3>
        <div className="mt-2 space-y-2">{item.changes.map((change) => <div key={change.criterion}><div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 text-slate-200">{ar ? change.labelAr : change.label}</span><span className="ltr-numeric shrink-0 font-medium text-white">{fmt(change.value)} <span className="font-normal text-slate-400">({change.delta > 0 ? '+' : ''}{fmt(change.delta)})</span></span></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-700"><div className={`h-full ${change.delta < 0 ? 'bg-amber-400' : 'bg-cyan-400'}`} style={{ width: `${change.value}%` }} /></div></div>)}</div>
        <div className="mt-3 text-sm"><span className="font-medium text-emerald-300">{ar ? 'يتحسّن:' : 'Improves:'}</span> <span className="text-slate-300">{item.improves.map((c) => ar ? c.labelAr : c.label).join(', ') || (ar ? 'لا يوجد تحسّن موثَّق' : 'No supported increase')}</span></div>
        <div className="mt-1 text-sm"><span className="font-medium text-amber-300">{ar ? 'يتراجع:' : 'Sacrifices:'}</span> <span className="text-slate-300">{item.sacrifices.map((c) => ar ? c.labelAr : c.label).join(', ') || (ar ? 'لا يوجد تراجع موثَّق' : 'No supported decrease')}</span></div>
      </article>)}</div>
      <p className="mt-2 text-xs text-amber-200">{ar ? 'ملاءمة السوق وتغطية التربة وقيود الإنتاج غير متاحة، ولذلك لا يمكن تقييم هذه الموازنات أو نتائج الإنتاج.' : 'Market fit, soil cover, production constraints, and growing-season fit are unavailable, so those trade-offs and production outcomes cannot be evaluated.'}</p>
      <details className="mt-3 border-t border-slate-700 pt-2"><summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold text-amber-100">{ar ? 'المخاطر البيئية (غير مصنَّفة)' : 'Environmental risks (unclassified)'}</summary><p className="mt-1 text-xs text-slate-400">{ar ? 'قيم الحرارة والأمطار مرجع مناخي للسياق، ولا تُصنَّف مخاطرَ دون حدود محلية خاصة بالمحصول والموقع. لا يتضمن التحليل أي تنبؤات.' : 'Temperature and rainfall are climatological context; hazards are not classified without local thresholds. No forecasts are generated.'}</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{riskAssessment.risks.map((item) => <div key={item.id} className="rounded bg-[#030914] p-2"><div className="flex justify-between gap-2 text-sm"><span>{ar ? item.labelAr : item.label}</span><b className="shrink-0 font-semibold text-amber-200">{ar ? 'غير مصنَّف' : 'Unclassified'}</b></div><p className="mt-1 text-xs text-slate-400">{ar ? item.reasonAr : item.reason}</p></div>)}</div><p className="mt-2 text-xs text-amber-200">{riskAssessment.spatial.explanation}</p></details>
    </section>
    <section id="workflow-section-5" aria-label={ar ? 'عدم اليقين وحدود التحليل' : 'Uncertainty & Limitations'} className={`${show('uncertainty') ? 'block' : 'hidden'} surface-card scroll-mt-4 p-3 sm:p-4`}>
      {standalone && <h2 className="text-card-title font-semibold text-white">{ar ? 'عدم اليقين وحدود التحليل' : 'Uncertainty & Limitations'}</h2>}
      <p className="text-base font-medium text-violet-200">{ar ? uncertainty.overallAr : uncertainty.cropEvidence.status}</p>
      <details className="mt-2"><summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold text-violet-200">{ar ? 'عرض مصادر الأدلة والحدود التفصيلية' : 'View evidence sources and detailed limits'}</summary><div className="mt-2 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-[#030914] p-2.5"><b className="text-sm font-semibold text-violet-200">{ar ? 'مقارنة خصائص المحاصيل' : 'Crop-trait comparison'}</b><p className="mt-1 text-xs text-cyan-200">{ar ? uncertainty.overallAr : uncertainty.cropEvidence.status}</p><p className="text-xs text-slate-400">{ar ? `يتوافر ${uncertainty.cropEvidence.sourcedTraitCount} من أصل ${uncertainty.cropEvidence.expectedTraitCount} خاصية موثَّقة. هذا مقياس لاكتمال البيانات وليس نسبة ثقة.` : `${uncertainty.cropEvidence.sourcedTraitCount} sourced trait entries across ${uncertainty.cropEvidence.expectedTraitCount} expected entries. Completeness label only, not confidence.`}</p></div>
        <div className="rounded-lg bg-[#030914] p-2.5"><b className="text-sm font-semibold text-violet-200">{ar ? 'البيانات البيئية' : 'Environmental data'}</b><p className="mt-1 text-xs text-cyan-200">{ar ? (uncertainty.environmentalEvidence.status === 'Unavailable' ? 'غير متاحة' : 'أدلة محدودة') : uncertainty.environmentalEvidence.status}</p><p className="text-xs text-slate-300">{ar ? uncertainty.environmentalEvidence.kindAr : uncertainty.environmentalEvidence.kind}</p><p className="mt-1 text-xs text-slate-500">{uncertainty.environmentalEvidence.provider || (ar ? 'الجهة المزوِّدة غير متاحة' : 'Provider unavailable')} · {uncertainty.environmentalEvidence.dataset || (ar ? 'اسم مجموعة البيانات غير متاح' : 'Dataset unavailable')}</p><p className="text-xs text-slate-500">{uncertainty.environmentalEvidence.temporalResolution || (ar ? 'الدقة الزمنية غير متاحة' : 'Temporal resolution unavailable')} · {uncertainty.environmentalEvidence.temporalCoverage || (ar ? 'التغطية الزمنية غير متاحة' : 'Coverage unavailable')}</p><p className="text-xs text-slate-500">{uncertainty.environmentalEvidence.spatialResolution || (ar ? 'الدقة المكانية غير متاحة' : 'Spatial resolution unavailable')} · {ar ? 'تاريخ الاسترجاع' : 'Retrieved'} {uncertainty.environmentalEvidence.retrievalDate ? new Date(uncertainty.environmentalEvidence.retrievalDate).toLocaleDateString(ar ? 'ar-EG' : 'en-US') : (ar ? 'غير متاح' : 'date unavailable')}</p>{uncertainty.environmentalEvidence.quality && <p className="mt-1 text-xs text-amber-200">{ar ? 'الجودة' : 'Quality'}: {uncertainty.environmentalEvidence.quality}</p>}{uncertainty.environmentalEvidence.sourceUrl && <a className="text-xs text-cyan-300 underline" href={uncertainty.environmentalEvidence.sourceUrl} target="_blank" rel="noreferrer">{ar ? 'صفحة المصدر' : 'Provider documentation'}</a>}<ul className="mt-1 list-disc ps-3 text-xs text-slate-500">{uncertainty.environmentalEvidence.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div className="rounded-lg bg-[#030914] p-2.5"><b className="text-sm font-semibold text-violet-200">{ar ? 'بيانات من شأنها تحسين النتيجة' : 'Data that would improve the result'}</b><ul className="mt-1 list-disc space-y-1 ps-4 text-xs text-slate-300">{(ar ? uncertainty.improvementNeedsAr : uncertainty.improvementNeeds).slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <div className="mt-2 grid gap-3 md:grid-cols-2"><div><h3 className="text-sm font-semibold text-amber-200">{ar ? 'مدخلات ناقصة' : 'Missing inputs'}</h3><ul className="mt-1 list-disc space-y-1 ps-4 text-xs text-slate-400">{(ar ? uncertainty.missingInputsAr : uncertainty.missingInputs).map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3 className="text-sm font-semibold text-amber-200">{ar ? 'افتراضات المنهجية' : 'Method assumptions'}</h3><ul className="mt-1 list-disc space-y-1 ps-4 text-xs text-slate-400">{uncertainty.assumptions.map((item) => <li key={item}>{ar ? 'المقارنة مبنية على افتراضات معلنة، ولا تمثّل ضمانًا زراعيًا.' : item}</li>)}</ul></div></div>
      <p className="mt-2 text-xs text-slate-400">{ar ? uncertainty.basisAr : uncertainty.basis}</p></details>
    </section>
    {show('uncertainty') && <footer className="flex flex-wrap items-center justify-end gap-2 pb-2"><button type="button" onClick={submit} disabled={!onDecisionSubmit} className="app-nav-button inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">{ar ? 'اعتماد الاستراتيجية المختارة' : 'Confirm selected strategy'}{isRtl ? <ArrowLeft aria-hidden="true" size={16} /> : <ArrowRight aria-hidden="true" size={16} />}</button></footer>}
  </div>;
}

function Metric({ label, value }) { return <div className="flex justify-between gap-2 border-b border-white/5 pb-1"><dt className="text-slate-400">{label}</dt><dd className="text-end text-slate-100">{value}</dd></div>; }
