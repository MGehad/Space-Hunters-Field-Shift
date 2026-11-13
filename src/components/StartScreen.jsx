'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Rocket, Sprout, BookOpen, Languages, ArrowLeft, ArrowRight, Scan } from 'lucide-react';
import { startScreenData } from '../data/startScreenData';
import { missionsData } from '../data/missionsData';

const topButtonClass = 'app-nav-button flex min-w-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#061530] px-3 text-sm font-medium text-slate-100 hover:bg-[#0c2858]';

export default function StartScreen({
  onStartGame,
  onOpenFarmPro,
  onOpenAgriBank,
  onOpenGameGuide,
}) {
  const { lang, isRtl, toggleLanguage } = useLanguage();
  const ar = lang === 'ar';
  const ForwardIcon = isRtl ? ArrowLeft : ArrowRight;
  const missionCount = missionsData.length;

  return (
    <div className="relative isolate flex min-h-full w-full flex-col items-center">

      {/* Static backdrop: one composited layer, no blur filters or animation. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 select-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "radial-gradient(ellipse at center, rgba(1,5,16,0.35) 20%, #010510 92%), linear-gradient(to bottom, rgba(2,10,26,0.85), rgba(5,12,27,0.6), rgba(2,5,12,0.95)), url('/start_screen_bg.jpg')",
        }}
      />

      {/* ── TOP STRIP ── */}
      <div className="z-20 flex w-full shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-4">
        <span className="min-w-0 rounded-full border border-cyan-400/30 bg-[#061530] px-3 py-1 text-xs font-medium text-cyan-200">
          {ar ? startScreenData.badgeAr : startScreenData.badgeEn}
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label={ar ? 'فتح دليل المحاصيل والتربة' : 'Open the crop and soil guide'}
            onClick={onOpenAgriBank}
            className={topButtonClass}
          >
            <Sprout aria-hidden="true" className="h-4 w-4 text-emerald-300" />
            <span className="hidden md:inline">{ar ? 'دليل المحاصيل والتربة' : 'Crop & Soil Guide'}</span>
          </button>

          <button
            type="button"
            aria-label={ar ? 'فتح دليل المهام التعليمية' : 'Open the missions guide'}
            onClick={onOpenGameGuide}
            className={topButtonClass}
          >
            <BookOpen aria-hidden="true" className="h-4 w-4 text-cyan-300" />
            <span className="hidden md:inline">{ar ? startScreenData.guideBtnAr : startScreenData.guideBtnEn}</span>
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={ar ? 'Switch language to English' : 'تغيير اللغة إلى العربية'}
            className="app-nav-button flex min-w-11 items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-[#092244] px-3 text-sm font-semibold text-cyan-100 hover:bg-[#10305e]"
          >
            <Languages aria-hidden="true" className="h-4 w-4" />
            <span>{ar ? 'EN' : 'عربي'}</span>
          </button>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-4 sm:px-6">

        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="relative mb-4 sm:mb-5">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-[#041026] shadow-[0_0_24px_rgba(0,180,216,0.35)] sm:h-28 sm:w-28">
              <img
                src="/space_hunters_badge.jpg"
                alt="Space Hunters"
                width="112"
                height="112"
                decoding="async"
                className="h-full w-full scale-[2.1] object-cover object-center"
              />
            </div>
            <div className="absolute -bottom-1 -end-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-cyan-300/50 bg-[#0b3d91]">
              <span aria-hidden="true" className="text-[0.5625rem] font-bold leading-none text-white">NASA</span>
            </div>
          </div>

          <h1 dir="ltr" className="mb-2 text-[clamp(1.75rem,6vw,2.5rem)] font-bold leading-tight tracking-wide text-white">
            <span>{startScreenData.titlePrefix}</span>{' '}
            <span className="text-[#22c3e6]">{startScreenData.titleSuffix}</span>
          </h1>
          <p className="max-w-md text-sm font-semibold text-slate-100 sm:text-base">
            {ar ? startScreenData.taglineAr : startScreenData.taglineEn}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
            {ar ? startScreenData.descAr : startScreenData.descEn}
          </p>
        </div>

        {/* ── PRIMARY ACTIONS ── */}
        <div className="w-full space-y-3">

          <button
            type="button"
            onClick={onOpenFarmPro}
            className="flex min-h-24 w-full items-center justify-between gap-3 rounded-2xl border border-cyan-500/60 bg-cyan-800 px-4 py-4 text-white transition-colors hover:bg-cyan-700 sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <Scan aria-hidden="true" className="h-6 w-6 text-cyan-200" />
              </div>
              <div className="min-w-0 text-start">
                <div className="text-card-title font-semibold text-white">
                  {ar ? 'تحليل المزرعة والتخطيط' : 'Farm Analysis & Planning'}
                </div>
                <div className="mt-1 text-sm text-cyan-50/90">
                  {ar ? 'حدِّد الموقع والحدود، وحلّل الظروف البيئية، وقارن السيناريوهات، وأنشئ تقريرًا فنيًا' : 'Define the site and boundary, analyze environmental conditions, compare scenarios and export a technical report'}
                </div>
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <ForwardIcon aria-hidden="true" className="h-5 w-5" />
            </div>
          </button>

          <button
            type="button"
            onClick={onStartGame}
            className="flex min-h-24 w-full items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#07152b] px-4 py-4 text-slate-100 transition-colors hover:bg-[#0b2040] sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <Rocket aria-hidden="true" className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 text-start">
                <div className="text-card-title font-semibold text-white">
                  {ar ? 'المهام التعليمية' : 'Educational Missions'}
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  {ar
                    ? `${missionCount.toLocaleString('en-GB')} مهام محاكاة تعليمية لمواسم زراعية حقيقية — تجربة مستقلة عن التحليل`
                    : `${missionCount} educational simulations of real crop seasons — separate from the analysis workflow`}
                </div>
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <ForwardIcon aria-hidden="true" className="h-5 w-5" />
            </div>
          </button>

        </div>
      </div>

      {/* ── SIGNATURE ── */}
      <div className="z-10 flex w-full shrink-0 items-center justify-center gap-2 pb-2">
        <div className="h-px max-w-[60px] flex-1 bg-white/10" />
        <span className="text-2xs text-slate-400">{startScreenData.teamSignature}</span>
        <div className="h-px max-w-[60px] flex-1 bg-white/10" />
      </div>

    </div>
  );
}
