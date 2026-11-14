'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe2, X } from 'lucide-react';

// Challenge colours; the same as the mission markers and the details card.
const LEGEND = [
  { key: 'legendTemp', dot: 'bg-[#ef4444]' },
  { key: 'legendWater', dot: 'bg-[#3b82f6]' },
  { key: 'legendDrought', dot: 'bg-[#f59e0b]' },
  { key: 'legendSoil', dot: 'bg-[#10b981]' },
  { key: 'legendExtreme', dot: 'bg-[#8b5cf6]' },
];

export default function MapLegendSidebar({ className = '', isMobile = false, onCloseMobile, missionCount = 0 }) {
  const { t, lang } = useLanguage();

  const containerClasses = className || 'hidden lg:flex lg:absolute lg:top-3 lg:left-3 z-20 w-[230px] flex-col gap-2 max-h-[calc(100%-1.5rem)] overflow-y-auto pointer-events-auto custom-scrollbar';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-3 rounded-2xl border border-[#162b4f] bg-[#0a1528]/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold leading-tight text-white">{t.exploreWorld}</h2>
            <p className="mt-0.5 text-xs leading-snug text-slate-400">{t.exploreWorldSub}</p>
          </div>
          {isMobile && onCloseMobile && (
            <button type="button" onClick={onCloseMobile} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[#1f3b6a] bg-[#030712] text-slate-100 hover:bg-[#0e1e38]">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

        <ul className="flex flex-col gap-0.5">
          {LEGEND.map(({ key, dot }) => (
            <li key={key} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-200">
              <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
              {t[key]}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-[#162b4f] pt-3">
          <span className="text-sm text-slate-300">{lang === 'ar' ? 'مهام تعليمية' : 'Learning scenarios'}</span>
          <span className="flex h-6 min-w-[1.75rem] items-center justify-center rounded-full border border-[#1f3b6a] bg-[#0e1e38] px-2 text-sm font-bold text-cyan-300">{missionCount}</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">{lang === 'ar' ? 'لا تُحفظ النقاط أو التقدّم في هذه الصفحة.' : 'Player progress and scores are not stored.'}</p>
      </div>

      <div className="space-y-1 rounded-xl border border-[#162b4f] bg-[#060d1d]/90 p-3 backdrop-blur-md">
        <p className="text-xs font-bold leading-tight text-cyan-300">"{t.quote1}"</p>
        <p className="text-xs text-slate-400">{t.quote2}</p>
        <div className="mt-1 flex items-center gap-1.5 border-t border-[#162b4f] pt-1.5 text-xs uppercase tracking-wider text-slate-400">
          <Globe2 aria-hidden="true" className="h-3 w-3 shrink-0 text-cyan-400" />
          <span>{t.onePlanet}</span>
        </div>
      </div>
    </div>
  );
}
