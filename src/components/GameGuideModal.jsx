'use client';

import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  X, BookOpen, Sparkles, 
  CheckCircle2 
} from 'lucide-react';
import { 
  gameGuideHeader, 
  gameGuideHero, 
  gameGuideSteps, 
  gameGuideModes,
  gameGuideTips 
} from '../data/gameGuideData';

export default function GameGuideModal({ isOpen, onClose, onStartGame }) {
  const { t, lang } = useLanguage();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { onClose?.(); return; }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); previousFocus?.focus?.(); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="game-guide-title" className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md duration-200">
      <div 
        className="relative w-full max-w-4xl bg-[#051329]/98 border border-cyan-400/50 shadow-[0_0_50px_rgba(0,180,216,0.35)] flex flex-col max-h-[90vh] sm:max-h-[86vh] overflow-hidden rounded-2xl"
        style={{
          clipPath: 'polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-3.5 border-b border-cyan-500/25 bg-[#071a38] shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-sm shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 id="game-guide-title" className="text-xs sm:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2">
                <span>{t.navGameGuide}</span>
                <span className="text-xs text-emerald-300 font-mono px-1.5 sm:px-2 py-0.5 bg-emerald-950 border border-emerald-500/40 rounded-lg">
                  {gameGuideHeader.badge}
                </span>
              </h2>
              <p className="text-xs text-slate-300 truncate max-w-[200px] sm:max-w-none">
                {lang === 'ar' ? gameGuideHeader.subAr : gameGuideHeader.subEn}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            ref={closeButtonRef}
            aria-label={lang === 'ar' ? 'إغلاق دليل المهام التعليمية' : 'Close game guide'}
            className="w-7 h-7 sm:w-8 sm:h-8 bg-white/5 hover:bg-white/15 border border-cyan-500/30 rounded-lg flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3 sm:space-y-4">
          
          {/* Hero Concept Banner */}
          <div className="p-3 sm:p-3.5 bg-gradient-to-r from-blue-950/70 via-[#071e3d] to-[#041226] border border-cyan-400/40 rounded-xl flex items-center gap-3 sm:gap-3.5 shadow-md">
            <span className="text-3xl">🌾</span>
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {lang === 'ar' ? gameGuideHero.titleAr : gameGuideHero.titleEn}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                {lang === 'ar' ? gameGuideHero.descAr : gameGuideHero.descEn}
              </p>
            </div>
          </div>

          {/* Modes */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">{lang === 'ar' ? gameGuideModes.titleAr : gameGuideModes.titleEn}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {gameGuideModes.items.map((mode) => (
                <div key={mode.titleEn} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <h4 className="text-sm font-semibold text-cyan-200">{lang === 'ar' ? mode.titleAr : mode.titleEn}</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">{lang === 'ar' ? mode.descAr : mode.descEn}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stages */}
          <h3 className="text-sm font-bold text-white">{lang === 'ar' ? 'المراحل الست بالترتيب' : 'The six stages, in order'}</h3>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gameGuideSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <li key={idx} className="p-3.5 bg-[#081730] border border-cyan-500/35 rounded-xl space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                        <Icon aria-hidden="true" className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {lang === 'ar' ? step.titleAr : step.titleEn}
                      </h4>
                    </div>
                    <span aria-hidden="true" className="text-xs font-bold font-mono text-cyan-400 bg-black/50 px-2.5 py-0.5 rounded-lg border border-white/10">
                      {step.num}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {lang === 'ar' ? step.descAr : step.descEn}
                  </p>
                </li>
              );
            })}
          </ol>

          {/* Pro Tips Section */}
          <div className="p-3.5 bg-[#081f3d] border border-emerald-500/40 rounded-xl space-y-2 shadow-md">
            <h4 className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{lang === 'ar' ? gameGuideTips.titleAr : gameGuideTips.titleEn}</span>
            </h4>
            <div className="space-y-1.5 text-xs sm:text-sm text-slate-200">
              {gameGuideTips.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{lang === 'ar' ? item.textAr : item.textEn}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-cyan-500/20 bg-[#071a38] p-3.5">
          <div className="text-xs text-cyan-300 font-bold">
            {gameGuideHeader.teamFooter}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="app-nav-button rounded-lg border border-white/15 px-4 text-sm text-slate-100 hover:bg-white/10">
              {lang === 'ar' ? gameGuideHeader.closeBtnAr : gameGuideHeader.closeBtnEn}
            </button>
            <button type="button" data-testid="guide-start-game" onClick={onStartGame || onClose} className="app-nav-button rounded-lg bg-cyan-700 px-5 text-sm font-semibold text-white hover:bg-cyan-600">
              {lang === 'ar' ? gameGuideHeader.startBtnAr : gameGuideHeader.startBtnEn}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
