'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Database, Home, Languages, Map, Menu, Sprout, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const SCREEN_TITLES = {
  map: ['Educational Missions', 'المهام التعليمية'],
  farmPro: ['Farm analysis', 'تحليل المزرعة'],
  universalBuilder: ['Rotations', 'الدورات الزراعية'],
  briefing: ['Briefing', 'المقدمة'],
  decision: ['Rotation', 'الدورة الزراعية'],
  results: ['Results', 'النتائج'],
};

export default function AppNavigation({ currentScreen, onBack, onHome, onOpenMap, onOpenFarm, onOpenAgriBank, onOpenGameGuide }) {
  const { lang, isRtl, toggleLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleEn, titleAr] = SCREEN_TITLES[currentScreen] || SCREEN_TITLES.map;
  const title = lang === 'ar' ? titleAr : titleEn;
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  useEffect(() => setMenuOpen(false), [currentScreen]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="app-navigation relative z-[60] shrink-0 border-b border-[#162b4f] bg-[#060d1d]" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex min-h-[3.5rem] w-full max-w-[1850px] items-center gap-1.5 px-2 py-1.5 pt-[max(.375rem,env(safe-area-inset-top))] sm:gap-2.5 sm:px-4 lg:px-5">
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onBack} aria-label={lang === 'ar' ? 'العودة إلى الشاشة السابقة' : 'Go back to the previous screen'} title={lang === 'ar' ? 'رجوع' : 'Back'} className="app-header-icon">
            <BackIcon aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" onClick={onHome} aria-label={lang === 'ar' ? 'العودة إلى الصفحة الرئيسية' : 'Return to Home'} title={lang === 'ar' ? 'الرئيسية' : 'Home'} className="app-header-icon">
            <Home aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Default title; a screen can replace it on wide screens through the slot below. */}
        <div className="app-default-title min-w-0 flex-1 px-1 flex flex-col justify-center">
          <p className="truncate text-sm sm:text-base font-semibold leading-tight text-white max-[380px]:hidden">{title}</p>
          <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-cyan-300 hidden sm:block">Space Hunters · Field Shift</p>
        </div>
        {/* Screens with steps portal their title and step bar here (shown from 1280 px). */}
        <div id="app-header-slot" className="contents" />

        <nav aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Primary navigation'} className="hidden shrink-0 items-center rounded-xl border border-[#162b4f] bg-[#0a1528] p-[3px] lg:flex">
          <button type="button" onClick={onOpenMap} aria-current={currentScreen === 'map' ? 'page' : undefined} aria-label={lang === 'ar' ? 'المهام التعليمية' : 'Educational missions'} className="app-segment">
            <Map aria-hidden="true" className="h-4 w-4" />{lang === 'ar' ? 'المهام' : 'Missions'}
          </button>
          <button type="button" onClick={onOpenFarm} aria-current={['farmPro', 'universalBuilder'].includes(currentScreen) ? 'page' : undefined} aria-label={lang === 'ar' ? 'تحليل المزرعة' : 'Farm analysis'} className="app-segment">
            <Sprout aria-hidden="true" className="h-4 w-4" />{lang === 'ar' ? 'المزرعة' : 'Farm'}
          </button>
        </nav>

        <div className="relative shrink-0">
          <button type="button" className="app-header-icon" aria-label={lang === 'ar' ? 'فتح قائمة الأقسام' : 'Open navigation and resources'} aria-expanded={menuOpen} aria-controls="app-navigation-menu" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
          </button>
          {menuOpen && <div className="fixed inset-0 z-[65]" onClick={() => setMenuOpen(false)} />}
          {menuOpen && <div id="app-navigation-menu" className="absolute end-0 top-full z-[70] mt-2 grid w-[min(16rem,calc(100vw-1rem))] gap-1 rounded-xl border border-white/15 bg-[#061327] p-2 shadow-2xl" role="group" aria-label={lang === 'ar' ? 'الأقسام والأدلة' : 'Sections and resources'}>
            <button type="button" onClick={() => { setMenuOpen(false); onOpenMap(); }} className="app-nav-button flex items-center gap-2 rounded-xl px-3 text-start text-sm font-semibold text-slate-100 hover:bg-white/10 lg:hidden"><Map aria-hidden="true" className="h-4 w-4 text-cyan-300" />{lang === 'ar' ? 'المهام التعليمية' : 'Educational missions'}</button>
            <button type="button" onClick={() => { setMenuOpen(false); onOpenFarm(); }} className="app-nav-button flex items-center gap-2 rounded-xl px-3 text-start text-sm font-semibold text-slate-100 hover:bg-white/10 lg:hidden"><Sprout aria-hidden="true" className="h-4 w-4 text-emerald-300" />{lang === 'ar' ? 'تحليل المزرعة' : 'Farm analysis'}</button>
            <div className="my-1 border-t border-white/10 lg:hidden" />
            <button type="button" onClick={() => { setMenuOpen(false); onOpenAgriBank(); }} className="app-nav-button flex items-center gap-2 rounded-xl px-3 text-start text-sm font-semibold text-slate-100 hover:bg-white/10"><Database aria-hidden="true" className="h-4 w-4 text-cyan-300" />{lang === 'ar' ? 'دليل المحاصيل والتربة' : 'Crop library'}</button>
            <button type="button" onClick={() => { setMenuOpen(false); onOpenGameGuide(); }} className="app-nav-button flex items-center gap-2 rounded-xl px-3 text-start text-sm font-semibold text-slate-100 hover:bg-white/10"><BookOpen aria-hidden="true" className="h-4 w-4 text-amber-300" />{lang === 'ar' ? 'دليل المهام التعليمية' : 'Missions guide'}</button>
          </div>}
        </div>

        <button type="button" onClick={toggleLanguage} className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-[#1f3b6a] bg-[#0a1528] px-3 text-xs sm:text-sm font-semibold text-slate-50 hover:border-cyan-400/50 hover:bg-[#0e1e38]" aria-label={lang === 'ar' ? 'Switch language to English' : 'تغيير اللغة إلى العربية'}>
          <Languages aria-hidden="true" className="h-4 w-4" />
          <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
        </button>
      </div>
    </header>
  );
}
