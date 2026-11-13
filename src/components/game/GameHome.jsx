'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, FlaskConical, GitCompareArrows, Play, Target, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useGame } from '../../game/state/GameContext';
import { GAME_MISSIONS, DIFFICULTY } from '../../game/data/gameMissions.js';
import { getGameCountry, getRegion } from '../../game/data/gameCountries.js';
import { getGameCrop } from '../../game/data/gameCrops.js';
import { decisionLabel, monthLabel } from '../../game/engine/insights.js';
import { missionsData } from '../../data/missionsData';
import { primaryButton, secondaryButton, pct } from './ui';
import { STAGE_INFO } from './stageInfo';
import { GAME_STAGES } from '../../game/state/GameContext';

export function experimentTitle(experiment, lang) {
  const ar = lang === 'ar';
  const crop = getGameCrop(experiment.cropId);
  const region = getRegion(experiment.countryId, experiment.regionId);
  return `${crop ? (ar ? crop.nameAr : crop.nameEn) : experiment.cropId} · ${region ? (ar ? region.nameAr : region.nameEn) : experiment.regionId} · ${monthLabel(lang, experiment.plantingMonth, experiment.startYear)}`;
}

export default function GameHome() {
  const { lang, isRtl } = useLanguage();
  const ar = lang === 'ar';
  const { state, dispatch } = useGame();
  const Forward = isRtl ? ArrowLeft : ArrowRight;
  const flagOf = (countryId) => missionsData.find((item) => item.id === countryId)?.flag || '';
  const countryName = (countryId) => { const m = missionsData.find((item) => item.id === countryId); return m ? (ar ? m.countryAr : m.countryEn) : countryId; };
  const inProgress = state.mode && state.countryId;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto w-full max-w-5xl space-y-6 p-3 sm:p-6">
      <header>
        <p className="text-xs text-cyan-300">{ar ? 'محاكاة زراعية تعليمية' : 'Educational farming simulation'}</p>
        <h1 className="text-page-title font-semibold text-white">{ar ? 'المهام التعليمية' : 'Educational Missions'}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-300 sm:text-base">
          {ar ? 'اختر بلدًا والتقِ المزارع، ثم ازرع محصولًا خلال موسم حقيقي من بيانات NASA POWER، وتابع أثر قراراتك شهرًا بشهر.' : 'Pick a country, talk to a farmer, then grow a crop through a real historical season from the NASA POWER record and see what your decisions change, month by month.'}
        </p>
      </header>

      {inProgress && (
        <section className="surface-card flex flex-wrap items-center justify-between gap-3 border-cyan-500/40 p-4">
          <div className="min-w-0">
            <p className="text-xs text-cyan-300">{ar ? 'تجربة جارية' : 'Experiment in progress'}</p>
            <p className="text-sm font-semibold text-white sm:text-base">{flagOf(state.countryId)} {countryName(state.countryId)} · {ar ? STAGE_INFO[GAME_STAGES[state.reached]].titleAr : STAGE_INFO[GAME_STAGES[state.reached]].titleEn}</p>
          </div>
          <button type="button" onClick={() => dispatch({ type: 'resume' })} className={primaryButton}><Play aria-hidden="true" className="h-4 w-4" />{ar ? 'متابعة' : 'Continue'}</button>
        </section>
      )}

      <section aria-labelledby="mode-missions" className="space-y-3">
        <div className="flex items-center gap-2">
          <Target aria-hidden="true" className="h-5 w-5 text-cyan-300" />
          <h2 id="mode-missions" className="text-section-title font-semibold text-white">{ar ? 'مهام جاهزة' : 'Ready-made missions'}</h2>
        </div>
        <p className="max-w-3xl text-sm text-slate-300">{ar ? 'موقع وسنة ومحاصيل محددة بهدف تعليمي واضح. تُحمَّل بيانات الحرارة والهطول من NASA POWER أثناء التجربة.' : 'A preset place, year and crop choice with a clear learning goal. Environmental conditions are loaded from NASA POWER when you play.'}</p>
        <ul className="grid gap-3 md:grid-cols-2">
          {GAME_MISSIONS.map((mission) => {
            const region = getRegion(mission.countryId, mission.regionId);
            const difficulty = DIFFICULTY[mission.difficulty];
            return (
              <li key={mission.id} className="surface-card flex min-w-0 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 text-card-title font-semibold text-white"><span aria-hidden="true" className="me-1.5">{flagOf(mission.countryId)}</span>{ar ? mission.titleAr : mission.titleEn}</h3>
                  <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-slate-200" aria-label={`${ar ? 'الصعوبة' : 'Difficulty'}: ${ar ? difficulty.ar : difficulty.en}`}>{ar ? difficulty.ar : difficulty.en}</span>
                </div>
                <p className="text-sm text-slate-200">{ar ? mission.problemAr : mission.problemEn}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-slate-300">
                  <dt className="text-slate-400">{ar ? 'المكان' : 'Place'}</dt><dd>{countryName(mission.countryId)} · {ar ? region.nameAr : region.nameEn}</dd>
                  <dt className="text-slate-400">{ar ? 'الفترة' : 'Period'}</dt><dd>{ar ? `موسم يبدأ في ${mission.startYear}` : `Season starting in ${mission.startYear}`}</dd>
                  <dt className="text-slate-400">{ar ? 'المحاصيل' : 'Crops'}</dt><dd>{mission.cropIds.map((id) => { const c = getGameCrop(id); return ar ? c.nameAr : c.nameEn; }).join(ar ? '، ' : ', ')}</dd>
                  <dt className="text-slate-400">{ar ? 'الهدف' : 'Goal'}</dt><dd>{ar ? mission.goalAr : mission.goalEn}</dd>
                </dl>
                <button type="button" onClick={() => dispatch({ type: 'startMission', missionId: mission.id })} className={`${primaryButton} mt-auto self-start`}>{ar ? 'بدء المهمة' : 'Start mission'}<Forward aria-hidden="true" className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="mode-open" className="surface-card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <FlaskConical aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-cyan-300" />
          <div className="min-w-0">
            <h2 id="mode-open" className="text-section-title font-semibold text-white">{ar ? 'محاكاة حرة' : 'Open simulation'}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">{ar ? 'صمّم تجربتك: اختر البلد والمنطقة والمحصول والسنة واستراتيجية الري.' : 'Design your own experiment: choose the country, region, crop, historical year and your farming decisions.'}</p>
          </div>
        </div>
        <button type="button" onClick={() => dispatch({ type: 'startOpen' })} className={primaryButton}>{ar ? 'بدء محاكاة حرة' : 'Start open simulation'}<Forward aria-hidden="true" className="h-4 w-4" /></button>
      </section>

      <section aria-labelledby="saved-experiments" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="saved-experiments" className="text-section-title font-semibold text-white">{ar ? 'التجارب المحفوظة' : 'Your saved experiments'}</h2>
          <button type="button" disabled={state.experiments.length < 2} onClick={() => dispatch({ type: 'goto-compare' })} className={secondaryButton}><GitCompareArrows aria-hidden="true" className="h-4 w-4" />{ar ? 'مقارنة تجربتين' : 'Compare two'}</button>
        </div>
        {state.experiments.length === 0 ? (
          <p className="text-sm text-slate-400">{ar ? 'لا توجد تجارب محفوظة بعد. تُحفظ على هذا الجهاز كل تجربة تبلغ مرحلة التقرير.' : 'None yet. An experiment is saved on this device when you reach its final report.'}</p>
        ) : (
          <ul className="space-y-2">
            {state.experiments.map((experiment) => (
              <li key={experiment.id} className="surface-inset flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{flagOf(experiment.countryId)} {experimentTitle(experiment, lang)}</p>
                  <p className="text-xs text-slate-300">{decisionLabel(lang, experiment.decisions)} · {ar ? 'الإنتاجية النسبية التقديرية' : 'est. relative yield'} <span className="ltr-numeric">{pct(experiment.totals.relativeYield)}</span></p>
                </div>
                <button type="button" onClick={() => dispatch({ type: 'deleteExperiment', id: experiment.id })} aria-label={`${ar ? 'حذف' : 'Delete'}: ${experimentTitle(experiment, lang)}`} className="app-nav-button flex w-11 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-rose-200"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
