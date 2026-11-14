'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Target, ChevronRight, ChevronLeft } from 'lucide-react';
import { mapControlsData } from '../../data/worldMapData';

// Two-letter country code from a flag emoji (two regional-indicator symbols), e.g. 🇪🇸 → ES.
function countryCodeFromFlag(flag = '') {
  return [...flag].map((ch) => ch.codePointAt(0) - 0x1F1E6).filter((n) => n >= 0 && n < 26).map((n) => String.fromCharCode(65 + n)).join('');
}

export default function MissionsCarousel({
  missions,
  selectedMission,
  setSelectedMission,
  onPrevMission,
  onNextMission,
  className = '',
  isMobile = false,
}) {
  const { t, lang } = useLanguage();

  const containerClasses = className || "absolute bottom-3 left-[252px] right-[364px] z-20 hidden lg:block pointer-events-auto";

  return (
    <div className={containerClasses}>
      <div className={`${isMobile ? 'p-3' : 'px-3 py-2.5'} rounded-2xl border border-[#162b4f] bg-[#0a1528]/95 shadow-2xl backdrop-blur-xl`}>
        {/* Carousel Header */}
        <div className={`flex items-center justify-between ${isMobile ? 'mb-2.5 px-1' : 'mb-1.5 px-0.5'}`}>
          <div className="flex items-center gap-1.5">
            <Target aria-hidden="true" className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-bold text-white">{t.suggestedMissions}</h3>
            <span className="text-xs text-slate-400">· {lang === 'ar' ? `${missions.length.toLocaleString('ar-EG')} دول` : `${missions.length} countries`}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              type="button"
              onClick={onPrevMission}
              title={lang === 'ar' ? mapControlsData.prevMissionTooltipAr : mapControlsData.prevMissionTooltipEn}
              aria-label={lang === 'ar' ? mapControlsData.prevMissionTooltipAr : mapControlsData.prevMissionTooltipEn}
              className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} bg-[#060d1d] hover:bg-[#0e1e38] border border-[#1f3b6a] rounded-lg flex items-center justify-center text-slate-200 hover:text-white transition-colors cursor-pointer`}
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={onNextMission}
              title={lang === 'ar' ? mapControlsData.nextMissionTooltipAr : mapControlsData.nextMissionTooltipEn}
              aria-label={lang === 'ar' ? mapControlsData.nextMissionTooltipAr : mapControlsData.nextMissionTooltipEn}
              className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} bg-[#060d1d] hover:bg-[#0e1e38] border border-[#1f3b6a] rounded-lg flex items-center justify-center text-slate-200 hover:text-white transition-colors cursor-pointer`}
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Mission Cards Grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 ${isMobile ? 'gap-2.5' : 'gap-2'}`}>
          {missions.map(m => {
            const isSel = selectedMission.id === m.id;
            const countryCode = countryCodeFromFlag(m.flag);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMission(m)}
                aria-pressed={isSel}
                className={`group relative w-full overflow-hidden rounded-xl text-start transition-colors duration-150 ${isSel
                    ? 'border-2 border-cyan-400 bg-[#0e1e38]'
                    : 'border border-[#162b4f] bg-[#060d1d] hover:border-cyan-400/50 hover:bg-[#0a1528]'
                  }`}
              >
                {/* Image Thumbnail */}
                <div className={`relative w-full overflow-hidden ${isMobile ? 'h-20' : 'h-11'}`}>
                  <img loading="lazy" decoding="async"
                    src={m.heroImage}
                    alt={m.countryEn}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Country code on the photo */}
                  <span className="absolute start-1 top-1 rounded-md bg-[#030712]/80 px-1.5 py-0.5 text-xs font-bold leading-none text-white">{countryCode}</span>
                </div>

                {/* Text Content */}
                <div className={isMobile ? 'px-2.5 py-2' : 'px-2 py-1.5'}>
                  <div className="flex items-center justify-between gap-1">
                    <p title={lang === 'ar' ? m.countryAr : m.countryEn} className={`${isMobile ? 'text-sm' : 'text-xs'} font-bold text-white truncate leading-tight`}>
                      {lang === 'ar' ? m.countryAr : m.countryEn}
                    </p>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">#{m.code}</span>
                  </div>
                  <p title={lang === 'ar' ? m.titleAr : m.titleEn} className={`${isMobile ? 'text-xs mt-1' : 'text-xs mt-0.5'} truncate leading-tight ${isSel ? 'text-cyan-300' : 'text-slate-400'}`}>
                    {lang === 'ar' ? m.titleAr : m.titleEn}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
