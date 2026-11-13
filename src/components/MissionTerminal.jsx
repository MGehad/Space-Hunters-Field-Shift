'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Lock, MapPinned, Satellite, Sprout, Scale, ShieldAlert, CircleHelp, ClipboardCheck, List } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWorkingSession } from '../context/WorkingSessionContext';
import FarmProStudio from './farmPro/FarmProStudio';
import RotationStrategyWorkbench from './rotation/RotationStrategyWorkbench';
import ResultsDashboardScreen from './ResultsDashboardScreen';

const FLOW = [
  { id: 0, title: 'Location & Farm Boundary', titleAr: 'الموقع وحدود المزرعة', short: 'Location', shortAr: 'الموقع', icon: MapPinned },
  { id: 1, title: 'Environmental Overview', titleAr: 'الظروف البيئية', short: 'Environment', shortAr: 'البيئة', icon: Satellite },
  { id: 2, title: 'Farm Information & Crops', titleAr: 'بيانات المزرعة والمحاصيل', short: 'Farm & crops', shortAr: 'المزرعة', icon: Sprout },
  { id: 3, title: 'Scenario Comparison', titleAr: 'مقارنة السيناريوهات', short: 'Compare', shortAr: 'المقارنة', icon: Scale },
  { id: 4, title: 'Risks & Trade-offs', titleAr: 'المخاطر والموازنات', short: 'Risks', shortAr: 'المخاطر', icon: ShieldAlert },
  { id: 5, title: 'Uncertainty & Limitations', titleAr: 'حدود التحليل', short: 'Uncertainty', shortAr: 'الحدود', icon: CircleHelp },
  { id: 6, title: 'Decision Summary & Report', titleAr: 'ملخص القرار والتقرير', short: 'Summary', shortAr: 'الملخص', icon: ClipboardCheck },
];
const LAST_STEP = FLOW.length - 1;

/** Inputs a confirmed decision depends on. If any of them changes, the summary is locked again. */
function decisionInputsKey(session) {
  return JSON.stringify({
    location: session.farmLocation ? [session.farmLocation.latitude, session.farmLocation.longitude, session.farmLocation.area, session.farmLocation.areaUnit] : null,
    inputs: session.farmInformation?.rotationInputs ?? null,
  });
}

export default function MissionTerminal({ onOpenGame, onWorkflowStepChange, initialStep = 0 }) {
  const { lang, isRtl } = useLanguage();
  const { session, updateSession } = useWorkingSession();
  const ar = lang === 'ar';
  // Highest step unlocked so far. A step opens only by pressing Next on the one before it.
  const [maxReached, setMaxReached] = useState(() => Math.max(0, Math.min(LAST_STEP, session.workflowProgress?.maxReached ?? 0)));
  const [step, setStep] = useState(() => Math.max(0, Math.min(initialStep, session.workflowProgress?.maxReached ?? 0)));
  const [stepsOpen, setStepsOpen] = useState(false);
  const contentRef = useRef(null);
  const farmValidateRef = useRef(null);
  const evaluation = session.analysisResults?.rotationEvaluation || null;
  const selectedStrategyId = session.analysisResults?.selectedStrategyId || evaluation?.baselineId;
  const mission = { countryEn: session.farmLocation?.label || 'Selected farm', countryAr: session.farmLocation?.label || 'المزرعة المحددة', code: 'LOCAL' };
  const inputsKey = decisionInputsKey(session);
  const confirmedKey = session.analysisResults?.decisionInputsKey || null;
  const decisionCurrent = Boolean(evaluation && confirmedKey && confirmedKey === inputsKey);
  const decisionStale = Boolean(confirmedKey && confirmedKey !== inputsKey);

  useEffect(() => {
    if (session.workflowProgress?.maxReached !== maxReached) updateSession({ workflowProgress: { maxReached } });
  }, [maxReached, session.workflowProgress?.maxReached, updateSession]);

  // Changing the farm location or area invalidates everything after the step being edited.
  // A transient "no farm yet" state (while the location step mounts) is ignored.
  const fl = session.farmLocation;
  const locationKey = fl ? [fl.latitude.toFixed(6), fl.longitude.toFixed(6), Number(fl.area).toFixed(6), fl.areaUnit, fl.selectionMethod].join('|') : null;
  const previousLocationKey = useRef(locationKey);
  useEffect(() => {
    if (!locationKey) return;
    if (previousLocationKey.current && previousLocationKey.current !== locationKey) setMaxReached((value) => Math.min(value, step));
    previousLocationKey.current = locationKey;
  }, [locationKey, step]);

  const navigateStep = (next) => {
    const nextStep = Math.max(0, Math.min(maxReached, FLOW.length - 1, typeof next === 'function' ? next(step) : next));
    setStep(nextStep);
    setStepsOpen(false);
    onWorkflowStepChange?.(nextStep);
  };
  const advance = () => {
    if (step === 0 && farmValidateRef.current && !farmValidateRef.current()) return;
    if (step === LAST_STEP - 1 && !decisionCurrent) return;
    const nextStep = Math.min(LAST_STEP, step + 1);
    setMaxReached((value) => Math.max(value, nextStep));
    setStep(nextStep);
    setStepsOpen(false);
    onWorkflowStepChange?.(nextStep);
  };
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [step]);
  const handleDecision = (strategyId, sequence, nextEvaluation) => {
    updateSession({ analysisResults: { ...(session.analysisResults || {}), rotationEvaluation: nextEvaluation, selectedStrategyId: strategyId, selectedSequence: sequence, decisionInputsKey: inputsKey } });
    setMaxReached(LAST_STEP);
    setStep(LAST_STEP);
    onWorkflowStepChange?.(LAST_STEP);
  };
  const current = FLOW[step] || FLOW[0];
  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const workbenchSection = ({ 2: 'inputs', 3: 'comparison', 4: 'tradeoffs', 5: 'uncertainty' })[step];
  const num = (value) => (ar ? value.toLocaleString('ar-EG') : String(value));
  const isLocked = (id) => id > maxReached || (id === LAST_STEP && !decisionCurrent);
  const nextBlocked = step === LAST_STEP - 1 && !decisionCurrent;
  const lockedHint = decisionStale
    ? (ar ? 'تغيّرت مدخلات المزرعة بعد اعتماد الاستراتيجية؛ يُرجى اعتمادها مجددًا لتحديث الملخص.' : 'Farm inputs changed after you confirmed a strategy; confirm it again to update the summary.')
    : (ar ? 'اضغط «اعتماد الاستراتيجية المختارة» لفتح ملخص القرار.' : 'Choose “Confirm selected strategy” to open the decision summary.');
  const stepLockedHint = ar ? 'تُفتح هذه الخطوة بعد إكمال الخطوة السابقة والضغط على «التالي».' : 'This step opens after you finish the previous one and press Next.';

  useEffect(() => {
    if (!stepsOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setStepsOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [stepsOpen]);

  return <div dir={isRtl ? 'rtl' : 'ltr'} className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#040915] text-slate-100">
    <header className="relative z-40 shrink-0 border-b border-white/10 bg-[#061327] px-3 py-1.5 sm:px-5">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2 max-w-[75%] md:max-w-[260px] lg:max-w-[280px]">
          <span className="shrink-0 rounded-md border border-cyan-500/30 bg-cyan-950/80 px-1.5 py-0.5 text-xs font-bold text-cyan-300">
            {ar ? `${num(step + 1)}/${num(FLOW.length)}` : `${step + 1}/${FLOW.length}`}
          </span>
          <h1 className="truncate text-sm font-semibold leading-tight text-white sm:text-base">{ar ? current.titleAr : current.title}</h1>
        </div>
        <div className="relative shrink-0 md:hidden">
          <button type="button" onClick={() => setStepsOpen((open) => !open)} aria-expanded={stepsOpen} aria-controls="workflow-steps-menu" className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10"><List aria-hidden="true" className="h-3.5 w-3.5" /><span>{ar ? 'الخطوات' : 'Steps'}</span></button>
          {stepsOpen && <>
            <div className="fixed inset-0 z-40" onClick={() => setStepsOpen(false)} />
            <nav id="workflow-steps-menu" aria-label={ar ? 'خطوات التحليل' : 'Analysis steps'} className="absolute end-0 top-full z-50 mt-2 grid max-h-[70dvh] w-[min(18rem,calc(100vw-1.5rem))] gap-1 overflow-y-auto rounded-xl border border-white/15 bg-[#061327] p-2 shadow-2xl">{FLOW.map(({ id, icon: Icon, title, titleAr }) => {
              const locked = isLocked(id);
              const done = !locked && id !== step && id < maxReached;
              return <button key={id} type="button" disabled={locked} aria-current={id === step ? 'step' : undefined} title={locked ? (id === LAST_STEP && id <= maxReached ? lockedHint : stepLockedHint) : undefined} onClick={() => navigateStep(id)} className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-start text-sm ${id === step ? 'bg-cyan-900/70 font-semibold text-white' : locked ? 'cursor-not-allowed text-slate-500' : 'text-slate-200 hover:bg-white/10'}`}>{locked ? <Lock aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /> : <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" />}<span className="min-w-0 flex-1">{ar ? titleAr : title}</span>{done && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-400" />}{locked && <span className="sr-only">{ar ? '(مقفلة)' : '(locked)'}</span>}</button>;
            })}</nav>
          </>}
        </div>

        {/* Inline compact stepper from tablet width up so header stays a single slim bar. */}
        <nav aria-label={ar ? 'خطوات التحليل' : 'Analysis steps'} className="hidden min-w-0 flex-1 md:block">
          <ol className="flex items-center justify-end gap-1">{FLOW.map(({ id, title, titleAr, short, shortAr }) => {
            const locked = isLocked(id);
            const active = id === step;
            const done = !locked && !active && id < maxReached;
            return <li key={id} className="flex min-w-0 items-center gap-1">
              <button type="button" disabled={locked} aria-current={active ? 'step' : undefined} title={locked ? (id === LAST_STEP && id <= maxReached ? lockedHint : stepLockedHint) : (ar ? titleAr : title)} onClick={() => navigateStep(id)} className={`flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 text-xs transition-colors lg:px-2 ${active ? 'bg-cyan-900/70 font-semibold text-white ring-1 ring-cyan-400/40' : locked ? 'cursor-not-allowed text-slate-500' : 'text-slate-200 hover:bg-white/10'}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-cyan-500 text-slate-950' : done ? 'bg-emerald-600/80 text-white' : locked ? 'border border-dashed border-slate-600 text-slate-500' : 'border border-slate-400 text-slate-200'}`}>{done ? <Check aria-hidden="true" className="h-3 w-3" /> : locked ? <Lock aria-hidden="true" className="h-2.5 w-2.5" /> : num(id + 1)}</span>
                <span className="hidden truncate lg:inline">{ar ? shortAr : short}</span>
                <span className="sr-only lg:hidden">{ar ? titleAr : title}</span>
                {locked && <span className="sr-only">{ar ? '(مقفلة)' : '(locked)'}</span>}
              </button>
              {id < LAST_STEP && <span aria-hidden="true" className={`hidden h-px w-2 shrink-0 xl:block ${done ? 'bg-emerald-600' : 'bg-slate-700'}`} />}
            </li>;
          })}</ol>
        </nav>
      </div>

      {/* Compact progress bar on phones */}
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800 md:hidden" role="progressbar" aria-label={ar ? 'التقدّم في الخطوات' : 'Workflow progress'} aria-valuemin={1} aria-valuemax={FLOW.length} aria-valuenow={step + 1}><div className="h-full rounded-full bg-cyan-500 transition-[width] duration-200" style={{ width: `${((step + 1) / FLOW.length) * 100}%` }} /></div>
    </header>

    <main ref={contentRef} className="mobile-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <FarmProStudio activeStep={step} validateRef={farmValidateRef} onEditFarm={() => navigateStep(0)} />
      {workbenchSection && <RotationStrategyWorkbench key="rotation-workbench" focusSection={workbenchSection} onDecisionSubmit={handleDecision} />}
      {step === LAST_STEP && decisionCurrent && <ResultsDashboardScreen mission={mission} playerChoice={selectedStrategyId} playerEvaluation={evaluation} onNextMission={onOpenGame} nextLabel={ar ? 'المهام التعليمية' : 'Open learning missions'} />}
      {step === LAST_STEP && !decisionCurrent && <div className="mx-auto max-w-4xl p-6 text-center"><h2 className="text-section-title font-semibold">{ar ? 'ملخص القرار والتقرير' : 'Decision Summary'}</h2><p className="mt-2 text-sm text-slate-300">{ar ? 'اختر استراتيجية واعتمدها أولًا لعرض الملخص.' : 'Select a rotation strategy to view results.'}</p></div>}
    </main>

    <footer className="z-20 shrink-0 border-t border-white/10 bg-[#061327] px-3 py-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] sm:px-5">
      {nextBlocked && <p className="mx-auto mb-2 w-full max-w-[1500px] text-center text-xs text-amber-200 sm:hidden">{lockedHint}</p>}
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3">
        <button type="button" disabled={step === 0} onClick={() => navigateStep((value) => value - 1)} className="app-nav-button flex items-center gap-2 rounded-lg border border-white/15 px-3 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-40"><PreviousIcon aria-hidden="true" className="h-4 w-4" />{ar ? 'السابق' : 'Previous'}</button>
        <span className="hidden min-w-0 text-center text-xs text-slate-300 sm:inline">{nextBlocked ? <span className="text-amber-200">{lockedHint}</span> : step < LAST_STEP ? (ar ? `التالي: ${FLOW[step + 1].titleAr}` : `Next: ${FLOW[step + 1].title}`) : (ar ? 'اكتملت الخطوات' : 'Workflow complete')}</span>
        {step < LAST_STEP
          ? <button type="button" disabled={nextBlocked} onClick={advance} className="app-nav-button flex items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-40">{ar ? 'التالي' : 'Next'}<NextIcon aria-hidden="true" className="h-4 w-4" /></button>
          : <span className="w-px" />}
      </div>
    </footer>
  </div>;
}
