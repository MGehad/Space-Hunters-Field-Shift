'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { ArrowLeft, ArrowRight, Check, Gamepad2, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { GameProvider, useGame, GAME_STAGES } from '../../game/state/GameContext';
import { useSeasonData } from '../../game/state/useSeasonData';
import { getGameCountry, getRegion } from '../../game/data/gameCountries.js';
import { getGameCrop } from '../../game/data/gameCrops.js';
import { getGameMission } from '../../game/data/gameMissions.js';
import { simulateSeason } from '../../game/engine/simulate.js';
import GameHome from './GameHome';
import { STAGE_INFO } from './stageInfo';

const StageLoading = () => <div role="status" className="flex h-40 items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" /></div>;
// Each stage is its own chunk, requested only when the player reaches it.
const CountryStage = dynamic(() => import('./stages/CountryStage'), { loading: StageLoading });
const FarmerStage = dynamic(() => import('./stages/FarmerStage'), { loading: StageLoading });
const SetupStage = dynamic(() => import('./stages/SetupStage'), { loading: StageLoading });
const DecisionsStage = dynamic(() => import('./stages/DecisionsStage'), { loading: StageLoading });
const SimulationStage = dynamic(() => import('./stages/SimulationStage'), { loading: StageLoading });
const ReportStage = dynamic(() => import('./stages/ReportStage'), { loading: StageLoading });
const CompareView = dynamic(() => import('./CompareView'), { loading: StageLoading });

function GameInner() {
  const { lang, isRtl } = useLanguage();
  const ar = lang === 'ar';
  const { state, dispatch } = useGame();
  const mainRef = useRef(null);
  // On wide screens the stage bar sits in the main header (AppNavigation renders the slot).
  const [headerSlot, setHeaderSlot] = useState(null);
  useEffect(() => { setHeaderSlot(document.getElementById('app-header-slot')); }, []);
  const stageIndex = GAME_STAGES.indexOf(state.stage);

  const country = getGameCountry(state.countryId);
  const region = getRegion(state.countryId, state.regionId);
  const crop = getGameCrop(state.cropId);
  const mission = state.mode === 'mission' ? getGameMission(state.missionId) : null;

  // One shared request per experiment; later stages reuse the cached result.
  const season = useSeasonData({ region, crop, startYear: state.startYear, plantingMonth: state.plantingMonth, enabled: stageIndex >= GAME_STAGES.indexOf('setup') });
  const simulation = useMemo(() => {
    if (season.status !== 'ready' || !crop || !region) return null;
    return simulateSeason({ crop, latitude: region.latitude, startYear: state.startYear, plantingMonth: state.plantingMonth, decisions: state.decisions, observations: season.data.months });
  }, [season.status, season.data, crop, region, state.startYear, state.plantingMonth, state.decisions]);

  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [state.stage]);

  if (!state.hydrated) return <StageLoading />;
  if (state.stage === 'home') return <div className="mobile-scroll h-full overflow-y-auto overscroll-contain"><GameHome /></div>;
  if (state.stage === 'compare') return <div className="mobile-scroll h-full overflow-y-auto overscroll-contain"><div className="mx-auto w-full max-w-5xl p-3 sm:p-6"><CompareView standalone /></div></div>;

  const scriptLength = country?.script.length || 0;
  const lastMonth = simulation?.ok ? simulation.months.length - 1 : 0;
  const gate = {
    country: { ok: Boolean(country), hintEn: 'Select a country on the map.', hintAr: 'اختر بلدًا من الخريطة.' },
    farmer: { ok: state.conversation.step >= scriptLength - 1, hintEn: 'Finish the consultation (or skip it) to continue.', hintAr: 'أكمل الاستشارة (أو تخطَّها) للمتابعة.' },
    setup: { ok: Boolean(simulation?.ok), hintEn: 'Choose a crop and a period with available NASA data.', hintAr: 'اختر محصولًا وفترة تتوافر لهما بيانات من ناسا.' },
    decisions: { ok: Boolean(simulation?.ok), hintEn: '', hintAr: '' },
    simulation: { ok: Boolean(simulation?.ok) && state.simMonth >= lastMonth, hintEn: 'Step through every month to open the report.', hintAr: 'استعرض جميع الأشهر لفتح التقرير.' },
    report: { ok: false, hintEn: '', hintAr: '' },
  }[state.stage];

  const goto = (stage) => dispatch({ type: 'goto', stage });
  const canOpen = (index) => index <= state.reached;
  const PrevIcon = isRtl ? ArrowRight : ArrowLeft;
  const NextIcon = isRtl ? ArrowLeft : ArrowRight;
  const info = STAGE_INFO[state.stage];
  const num = (value) => (ar ? value.toLocaleString('ar-EG') : String(value));
  const props = { country, region, crop, mission, season, simulation };
  const fullBleed = state.stage === 'country';
  const isPerfectScore = Boolean(simulation?.ok) && Math.round(simulation.totals.relativeYield * 100) >= 100;

  const renderStages = (align, wide) => (
    <ol className={`flex items-center gap-1 ${align}`}>
      {GAME_STAGES.map((stage, index) => {
        const active = index === stageIndex;
        const done = !active && index <= state.reached;
        return (
          <li key={stage} className={`flex flex-1 items-center gap-1 md:flex-initial ${active ? 'shrink-0' : 'min-w-0'}`}>
            <button type="button" disabled={!canOpen(index)} aria-current={active ? 'step' : undefined} onClick={() => goto(stage)}
              title={ar ? STAGE_INFO[stage].titleAr : STAGE_INFO[stage].titleEn} className="step-pill flex-1 justify-center md:flex-initial">
              <span className="step-pill-number" data-done={done ? 'true' : undefined}>{done ? <Check aria-hidden="true" className="h-3 w-3" /> : num(index + 1)}</span>
              <span className={active ? 'hidden whitespace-nowrap sm:inline' : (wide ? 'hidden min-w-0 truncate 2xl:inline' : 'hidden min-w-0 truncate lg:inline')}>{ar ? STAGE_INFO[stage].ar : STAGE_INFO[stage].en}</span>
              <span className={active ? 'sr-only sm:hidden' : (wide ? 'sr-only 2xl:hidden' : 'sr-only lg:hidden')}>{ar ? STAGE_INFO[stage].titleAr : STAGE_INFO[stage].titleEn}</span>
            </button>
            {index < GAME_STAGES.length - 1 && <span aria-hidden="true" className={`hidden h-px w-2.5 shrink-0 xl:block ${done ? 'bg-emerald-600' : 'bg-[#1f3b6a]'}`} />}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#040915] text-slate-100">
      {headerSlot && createPortal(
        <div data-header-steps="" className="hidden min-w-0 flex-1 items-center gap-4 xl:flex">
          <div className="min-w-0 shrink-0 max-w-[15rem] 2xl:max-w-[20rem]">
            <h1 className="truncate text-base font-semibold leading-tight text-white">{ar ? info.titleAr : info.titleEn}</h1>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-cyan-300">{mission ? (ar ? mission.titleAr : mission.titleEn) : (ar ? 'المهام التعليمية · محاكاة حرة' : 'Educational missions · Open simulation')}</p>
          </div>
          <nav aria-label={ar ? 'مراحل المحاكاة' : 'Game stages'} className="min-w-0 flex-1">{renderStages('justify-center', true)}</nav>
          <button type="button" onClick={() => dispatch({ type: 'home' })} title={ar ? 'قائمة المهام' : 'Missions menu'} className="btn-secondary h-10 min-h-0 shrink-0 px-3 text-sm">
            <Gamepad2 aria-hidden="true" className="h-4 w-4" /><span className="sr-only 2xl:not-sr-only">{ar ? 'قائمة المهام' : 'Missions menu'}</span>
          </button>
        </div>, headerSlot)}
      <header className={`relative z-30 shrink-0 border-b border-[#162b4f] bg-[#060d1d] px-3 py-1.5 sm:px-5 ${headerSlot ? 'xl:hidden' : ''}`}>
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-x-3 gap-y-1.5 md:flex-nowrap">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-full border border-[#1f3b6a] bg-[#0a1528] px-2 py-0.5 text-xs font-bold text-cyan-300">
              {ar ? `${num(stageIndex + 1)}/${num(GAME_STAGES.length)}` : `${stageIndex + 1}/${GAME_STAGES.length}`}
            </span>
            <h1 className="truncate text-sm font-semibold leading-tight text-white sm:text-base">{ar ? info.titleAr : info.titleEn}</h1>
            <span className="hidden truncate text-xs text-slate-400 xl:inline">
              · {mission ? (ar ? mission.titleAr : mission.titleEn) : (ar ? 'محاكاة حرة' : 'Open simulation')}
            </span>
          </div>

          <nav aria-label={ar ? 'مراحل المحاكاة' : 'Game stages'} className="order-3 w-full md:order-2 md:w-auto md:flex-1">{renderStages('justify-between md:justify-end', false)}</nav>

          <button type="button" onClick={() => dispatch({ type: 'home' })} className="order-2 flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#1f3b6a] px-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 md:order-3">
            <Gamepad2 aria-hidden="true" className="h-3.5 w-3.5" /><span className="max-sm:sr-only">{ar ? 'قائمة المهام' : 'Missions menu'}</span>
          </button>
        </div>
      </header>

      <div id="game-content" ref={mainRef} className={`min-h-0 flex-1 ${fullBleed ? 'overflow-hidden' : 'mobile-scroll overflow-y-auto overscroll-contain'}`}>
        {state.stage === 'country' && <CountryStage {...props} />}
        {state.stage !== 'country' && (
          <div key={state.stage} className="game-stage mx-auto w-full max-w-5xl p-3 sm:p-6">
            {state.stage === 'farmer' && <FarmerStage {...props} />}
            {state.stage === 'setup' && <SetupStage {...props} />}
            {state.stage === 'decisions' && <DecisionsStage {...props} />}
            {state.stage === 'simulation' && <SimulationStage {...props} />}
            {state.stage === 'report' && <ReportStage {...props} />}
          </div>
        )}
      </div>

      <footer className="z-20 shrink-0 border-t border-[#162b4f] bg-[#060d1d] px-3 py-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] sm:px-5">
        {!gate.ok && gate.hintEn && <p className="mx-auto mb-2 w-full max-w-[1500px] text-center text-xs text-amber-200 sm:hidden">{ar ? gate.hintAr : gate.hintEn}</p>}
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3">
          <button type="button" onClick={() => (stageIndex === 0 ? dispatch({ type: 'home' }) : goto(GAME_STAGES[stageIndex - 1]))} className="btn-secondary text-sm">
            <PrevIcon aria-hidden="true" className="h-4 w-4" />{stageIndex === 0 ? (ar ? 'قائمة المهام' : 'Missions menu') : (ar ? 'السابق' : 'Previous')}
          </button>
          <div className="hidden min-w-0 flex-col items-center gap-1.5 text-center sm:flex">
            <span className="min-w-0 text-sm text-slate-300">
              {!gate.ok && gate.hintEn ? <span className="text-amber-200">{ar ? gate.hintAr : gate.hintEn}</span>
                : stageIndex < GAME_STAGES.length - 1 ? <>{ar ? 'التالي: ' : 'Next: '}<span className="font-semibold text-white">{ar ? STAGE_INFO[GAME_STAGES[stageIndex + 1]].titleAr : STAGE_INFO[GAME_STAGES[stageIndex + 1]].titleEn}</span></>
                  : (ar ? 'اكتملت التجربة' : 'Experiment complete')}
            </span>
            <div aria-hidden="true" className="flex gap-1">{GAME_STAGES.map((stage, index) => <span key={stage} className={`h-1 w-7 rounded-full ${index <= stageIndex ? 'bg-cyan-400' : 'bg-[#162b4f]'}`} />)}</div>
            <span className="hidden text-2xs text-slate-400 lg:block">Team Space Hunters · Field Shift: Adapting Farms with NASA Data</span>
          </div>
          {stageIndex < GAME_STAGES.length - 1 ? (
            <button type="button" disabled={!gate.ok} onClick={() => goto(GAME_STAGES[stageIndex + 1])} className="btn-primary text-sm">
              {ar ? 'التالي' : 'Next'}<NextIcon aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => dispatch({ type: 'again' })} className="btn-primary px-3 text-xs sm:px-4 sm:text-sm">
                <RotateCcw aria-hidden="true" className="h-4 w-4" />{ar ? 'تعديل وإعادة التجربة' : 'Try a variation'}
              </button>
              {isPerfectScore && (
                <button type="button" onClick={() => dispatch({ type: 'finishMission' })} className="app-nav-button flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20">
                  <Check aria-hidden="true" className="h-4 w-4" />{ar ? 'إنهاء المهمة' : 'Finish mission'}
                </button>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default function GameShell() {
  return <GameProvider><GameInner /></GameProvider>;
}
