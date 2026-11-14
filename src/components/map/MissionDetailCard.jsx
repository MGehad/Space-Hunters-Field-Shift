'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight, ArrowLeft, Satellite, X } from 'lucide-react';

// Colour of the challenge label; the same colours as the map legend.
const CRISIS_COLORS = {
  temp: { dot: 'bg-[#ef4444]', chip: 'border-[#ef4444]/40 bg-[#ef4444]/15 text-red-100' },
  water: { dot: 'bg-[#3b82f6]', chip: 'border-[#3b82f6]/40 bg-[#3b82f6]/15 text-blue-100' },
  drought: { dot: 'bg-[#f59e0b]', chip: 'border-[#f59e0b]/40 bg-[#f59e0b]/15 text-amber-100' },
  soil: { dot: 'bg-[#10b981]', chip: 'border-[#10b981]/40 bg-[#10b981]/15 text-emerald-100' },
  extreme: { dot: 'bg-[#8b5cf6]', chip: 'border-[#8b5cf6]/40 bg-[#8b5cf6]/15 text-violet-100' },
};

export default function MissionDetailCard({ selectedMission, onStartMission, onOpenFarmData, className = '', isMobile = false, onCloseMobile, detail = null }) {
  const { t, lang, isRtl } = useLanguage();
  const colors = CRISIS_COLORS[selectedMission.crisisType] || CRISIS_COLORS.water;

  const containerClasses = className || 'hidden lg:flex lg:absolute lg:top-3 lg:right-3 z-20 w-[340px] max-h-[calc(100%-1.5rem)] overflow-y-auto overflow-x-hidden pointer-events-auto flex-col bg-[#0a1528]/96 border border-[#1f3b6a] shadow-2xl backdrop-blur-md custom-scrollbar rounded-2xl';

  return (
    <div className={containerClasses}>
      {/* Photo with the country name and mission number on it */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden">
        <img loading="lazy" decoding="async"
          src={selectedMission.heroImage}
          alt={selectedMission.countryEn}
          className="h-full w-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a1528] via-[#0a1528]/20 to-transparent" />
        <span className="absolute end-3 top-3 rounded-full border border-[#1f3b6a] bg-[#030712]/80 px-2.5 py-1 text-xs font-bold text-cyan-300">
          {t.missionNumber}{selectedMission.code}
        </span>
        {isMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="absolute start-3 top-3 flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#1f3b6a] bg-[#030712]/80 text-slate-100 hover:bg-[#0e1e38]"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
        <div className="absolute bottom-3 start-4 end-4 flex items-center gap-2.5">
          <span className="text-2xl leading-none drop-shadow">{selectedMission.flag}</span>
          <h2 className="truncate text-2xl font-bold leading-tight text-white drop-shadow">
            {lang === 'ar' ? selectedMission.countryAr : selectedMission.countryEn}
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <h3 className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-sm font-semibold ${colors.chip}`}>
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
          {detail?.title || (lang === 'ar' ? selectedMission.titleAr : selectedMission.titleEn)}
        </h3>

        <p className="text-sm leading-relaxed text-slate-200">
          {detail?.intro}
        </p>

        <div className="mt-1 flex flex-col gap-2">
          <button type="button" onClick={onStartMission} className="btn-primary w-full text-sm">
            <span>{detail?.startLabel || t.startMission}</span>
            {isRtl ? <ArrowLeft aria-hidden="true" className="h-4 w-4" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}
          </button>

          {onOpenFarmData && (
            <button type="button" onClick={onOpenFarmData} className="btn-secondary w-full text-sm">
              <Satellite aria-hidden="true" className="h-4 w-4 text-cyan-300" />
              <span>{lang === 'ar' ? 'فتح التحليل البيئي' : 'Open environmental analysis'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
