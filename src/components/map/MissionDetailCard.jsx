'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
 
  ArrowRight, ArrowLeft, Satellite 
} from 'lucide-react';

export default function MissionDetailCard({ selectedMission, onStartMission, onOpenFarmData, className = '', isMobile = false, onCloseMobile, detail = null }) {
  const { t, lang, isRtl } = useLanguage();

  const containerClasses = className || "hidden lg:flex lg:absolute lg:top-11 lg:right-3 z-20 w-[360px] max-h-[calc(100%-3.5rem)] overflow-y-auto pointer-events-auto flex-col gap-3.5 p-4 bg-[#061633]/96 border border-cyan-400/50 shadow-2xl backdrop-blur-md custom-scrollbar rounded-2xl";

  return (
    <div
      className={containerClasses}
      style={{
        clipPath: isMobile ? 'none' : 'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)',
      }}
    >
      {/* ROW 1: Flag + Country Name & Mission Code */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl sm:text-3xl leading-none drop-shadow">{selectedMission.flag}</span>
          <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
            {lang === 'ar' ? selectedMission.countryAr : selectedMission.countryEn}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mission Code Pill */}
          <div className="shrink-0 bg-[#0c2147] border border-cyan-400/50 rounded-lg px-2.5 sm:px-3 py-1 text-xs font-bold text-cyan-300 shadow-sm">
            {t.missionNumber}{selectedMission.code}
          </div>
          {isMobile && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 text-slate-400 hover:text-white rounded-lg bg-white/5 border border-white/10 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ROW 2: Title + Difficulty */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white leading-snug flex-1">
          {detail?.title || (lang === 'ar' ? selectedMission.titleAr : selectedMission.titleEn)}
        </h3>
      </div>

      {/* HERO IMAGE */}
      <div
        className="w-full overflow-hidden border border-cyan-400/40 shadow-md h-36 relative"
        style={{
          clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)',
        }}
      >
        <img loading="lazy" decoding="async"
          src={selectedMission.heroImage}
          alt={selectedMission.countryEn}
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* DESCRIPTION */}
      <p className="text-xs text-slate-200 leading-relaxed font-medium">
        {detail?.intro}
      </p>


      {/* BUTTONS */}
      <div className="flex flex-col gap-2 mt-1">
        <button
          type="button"
          onClick={onStartMission}
          className="w-full py-3 px-4 font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-lg rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-blue-500/40"
        >
          {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          <span>{detail?.startLabel || t.startMission}</span>
        </button>

        {onOpenFarmData && (<button
          type="button"
          onClick={onOpenFarmData}
          className="w-full min-h-11 py-2 px-3 font-semibold text-sm text-slate-200 flex items-center justify-center gap-1.5 border border-cyan-500/35 hover:border-cyan-400 hover:text-white bg-white/[0.04] transition-all cursor-pointer rounded-xl"
        >
          <Satellite className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'ar' ? 'فتح التحليل البيئي' : 'Open environmental analysis'}</span>
        </button>)}
      </div>
    </div>
  );
}
