'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Target, ChevronRight, ChevronLeft } from 'lucide-react';
import { mapControlsData } from '../../data/worldMapData';

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

  const containerClasses = className || "absolute bottom-2.5 left-[245px] right-[375px] z-20 hidden lg:block pointer-events-auto";

  return (
    <div className={containerClasses}>
      <div
        className={`${isMobile ? 'p-3 rounded-2xl' : 'px-2.5 py-2 rounded-xl'} bg-[#051329]/92 border border-cyan-400/50 backdrop-blur-xl shadow-2xl`}
        style={{
          clipPath: isMobile
            ? 'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)'
            : 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)',
        }}
      >
        {/* Carousel Header */}
        <div className={`flex items-center justify-between ${isMobile ? 'mb-2.5 px-1' : 'mb-1.5 px-0.5'}`}>
          <div className="flex items-center gap-1.5">
            <div className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} rounded-md bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center shadow-sm`}>
              <Target className={`${isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-cyan-400`} />
            </div>
            <h3 className={`${isMobile ? 'text-xs sm:text-sm' : 'text-xs'} font-bold text-white tracking-wide`}>{t.suggestedMissions}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              type="button"
              onClick={onPrevMission}
              title={lang === 'ar' ? mapControlsData.prevMissionTooltipAr : mapControlsData.prevMissionTooltipEn}
              aria-label={lang === 'ar' ? mapControlsData.prevMissionTooltipAr : mapControlsData.prevMissionTooltipEn}
              className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} bg-[#0a1e3f] hover:bg-[#153f7e] border border-cyan-400/50 rounded-md flex items-center justify-center text-cyan-300 hover:text-white transition-all active:scale-90 shadow-sm cursor-pointer`}
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={onNextMission}
              title={lang === 'ar' ? mapControlsData.nextMissionTooltipAr : mapControlsData.nextMissionTooltipEn}
              aria-label={lang === 'ar' ? mapControlsData.nextMissionTooltipAr : mapControlsData.nextMissionTooltipEn}
              className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} bg-[#0a1e3f] hover:bg-[#153f7e] border border-cyan-400/50 rounded-md flex items-center justify-center text-cyan-300 hover:text-white transition-all active:scale-90 shadow-sm cursor-pointer`}
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Mission Cards Grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 ${isMobile ? 'gap-2.5' : 'gap-1.5'}`}>
          {missions.map(m => {
            const isSel = selectedMission.id === m.id;
            const countryCode = m.id === 'egypt' ? 'EG' : m.id === 'brazil' ? 'BR' : m.id === 'india' ? 'IN' : m.id === 'usa' ? 'US' : 'AU';
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMission(m)}
                aria-pressed={isSel}
                className={`w-full text-start ${isMobile ? 'p-2' : 'p-1.5'} cursor-pointer transition-all duration-200 border relative group ${isSel
                    ? 'bg-gradient-to-b from-[#13407e]/90 via-[#0a2752]/95 to-[#04142d] border-2 border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.45)] ring-1 ring-cyan-300/60 z-10'
                    : 'bg-[#071730]/90 hover:bg-[#0c244c] border-cyan-500/25 hover:border-cyan-400/60'
                  }`}
                style={{
                  clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                }}
              >
                {/* Image Thumbnail */}
                <div
                  className={`w-full ${isMobile ? 'h-16' : 'h-9'} overflow-hidden relative border border-white/10 shadow-inner`}
                  style={{
                    clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
                  }}
                >
                  <img loading="lazy" decoding="async"
                    src={m.heroImage}
                    alt={m.countryEn}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                  {/* Country Code Badge */}
                  <div className="absolute bottom-0.5 end-0.5 bg-black/75 backdrop-blur-sm border border-white/20 px-1 py-0.5 rounded leading-none shadow">
                    <span className="text-[9px] font-mono font-bold text-cyan-300">{countryCode}</span>
                  </div>
                </div>

                {/* Text Content */}
                <div className={isMobile ? 'mt-1.5' : 'mt-1'}>
                  <div className="flex items-center justify-between gap-1">
                    <p className={`${isMobile ? 'text-sm' : 'text-xs'} font-bold text-white truncate leading-tight`}>
                      {lang === 'ar' ? m.countryAr : m.countryEn}
                    </p>
                    <span className="text-[9.5px] font-mono text-cyan-400/90 font-bold shrink-0">#{m.code}</span>
                  </div>
                  <p className={`${isMobile ? 'text-xs mt-1' : 'text-[10px] mt-0.5'} text-cyan-300/90 truncate leading-tight font-medium`}>
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
