'use client';

import React, { useEffect, useMemo, useRef } from 'react';
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
    farmer: { ok: state.conversation.step >= scriptLength - 1, hintEn: 'Finish the conversation (or skip it) to continue.', hintAr: 'أكمل الحوار مع المزارع (أو تخطَّه) للمتابعة.' },
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

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#040915] text-slate-100">
      <header className="relative z-30 shrink-0 border-b border-white/10 bg-[#061327] px-3 py-1.5 sm:px-5">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-x-3 gap-y-1.5 md:flex-nowrap">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-md border border-cyan-500/30 bg-cyan-950/80 px-1.5 py-0.5 text-[11px] font-bold text-cyan-300">
              {ar ? `${num(stageIndex + 1)}/${num(GAME_STAGES.length)}` : `${stageIndex + 1}/${GAME_STAGES.length}`}
            </span>
            <h1 className="truncate text-sm font-semibold leading-tight text-white sm:text-base">{ar ? info.titleAr : info.titleEn}</h1>
            <span className="hidden truncate text-xs text-slate-400 xl:inline">
              · {mission ? (ar ? mission.titleAr : mission.titleEn) : (ar ? 'محاكاة حرة' : 'Open simulation')}
            </span>
          </div>

          <nav aria-label={ar ? 'مراحل المحاكاة' : 'Game stages'} className="order-3 w-full md:order-2 md:w-auto md:flex-1">
            <ol className="flex items-center justify-between gap-1 md:justify-end">
              {GAME_STAGES.map((stage, index) => {
                const active = index === stageIndex;
                const done = index < stageIndex || (index <= state.reached && !active);
                return (
                  <li key={stage} className="flex min-w-0 flex-1 items-center gap-1 md:flex-initial">
                    <button type="button" disabled={!canOpen(index)} aria-current={active ? 'step' : undefined} onClick={() => goto(stage)}
                      title={ar ? STAGE_INFO[stage].titleAr : STAGE_INFO[stage].titleEn}
                      className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 text-xs transition-colors md:flex-initial md:px-2 ${active ? 'bg-cyan-900/70 font-semibold text-white ring-1 ring-cyan-400/40' : 'text-slate-300 hover:bg-white/10'} disabled:opacity-40`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-cyan-500 text-slate-950' : done ? 'border border-emerald-400/60 bg-emerald-950/70 text-emerald-200' : 'border border-slate-500 text-slate-300'}`}>
                        {num(index + 1)}
                      </span>
                      {done && (
                        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950" aria-hidden="true">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                      <span className="hidden min-w-0 truncate lg:inline">{ar ? STAGE_INFO[stage].ar : STAGE_INFO[stage].en}</span>
                      <span className="sr-only lg:hidden">{ar ? STAGE_INFO[stage].titleAr : STAGE_INFO[stage].titleEn}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <button type="button" onClick={() => dispatch({ type: 'home' })} className="order-2 flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 md:order-3">
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

      <footer className="z-20 shrink-0 border-t border-white/10 bg-[#061327] px-3 py-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] sm:px-5">
        {!gate.ok && gate.hintEn && <p className="mx-auto mb-2 w-full max-w-[1500px] text-center text-xs text-amber-200 sm:hidden">{ar ? gate.hintAr : gate.hintEn}</p>}
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3">
          <button type="button" onClick={() => (stageIndex === 0 ? dispatch({ type: 'home' }) : goto(GAME_STAGES[stageIndex - 1]))} className="app-nav-button flex items-center gap-2 rounded-lg border border-white/15 px-3 text-sm text-slate-100 hover:bg-white/10">
            <PrevIcon aria-hidden="true" className="h-4 w-4" />{stageIndex === 0 ? (ar ? 'قائمة المهام' : 'Missions menu') : (ar ? 'السابق' : 'Previous')}
          </button>
          <span className="hidden min-w-0 text-center text-xs text-slate-300 sm:inline">
            {!gate.ok && gate.hintEn ? <span className="text-amber-200">{ar ? gate.hintAr : gate.hintEn}</span>
              : stageIndex < GAME_STAGES.length - 1 ? (ar ? `التالي: ${STAGE_INFO[GAME_STAGES[stageIndex + 1]].titleAr}` : `Next: ${STAGE_INFO[GAME_STAGES[stageIndex + 1]].titleEn}`)
                : (ar ? 'اكتملت التجربة' : 'Experiment complete')}
          </span>
          {stageIndex < GAME_STAGES.length - 1 ? (
            <button type="button" disabled={!gate.ok} onClick={() => goto(GAME_STAGES[stageIndex + 1])} className="app-nav-button flex items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-40">
              {ar ? 'التالي' : 'Next'}<NextIcon aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => dispatch({ type: 'again' })} className="app-nav-button flex items-center gap-1.5 rounded-lg bg-cyan-700 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white hover:bg-cyan-600">
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
