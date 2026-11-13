'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Database, Search } from 'lucide-react';
import {
  agriBankHeader,
  agriBankTabs,
  agriBankLabels as L,
  cropDatabase,
  soilDatabase,
  satellitesData,
  REFERENCE_SOURCES,
  DROUGHT_SENSITIVITY,
  SOIL_GROUPS,
} from '../data/agriBankData';

function SourceList({ ids, lang }) {
  const ar = lang === 'ar';
  return (
    <div className="surface-inset p-3 text-xs text-slate-300">
      <p className="font-semibold text-slate-100">{ar ? 'المصادر' : 'Sources'}</p>
      <ul className="mt-1 space-y-1">
        {ids.map((id) => <li key={id}><a className="text-cyan-300 underline" href={REFERENCE_SOURCES[id].url} target="_blank" rel="noreferrer">{ar ? REFERENCE_SOURCES[id].nameAr : REFERENCE_SOURCES[id].nameEn}</a></li>)}
      </ul>
    </div>
  );
}

function Fact({ label, children }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-400">{label}</dt><dd className="text-sm text-slate-100">{children}</dd></div>;
}

export default function AgriBankModal({ isOpen, onClose }) {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('crops'); // 'crops' | 'soil' | 'satellites'
  const [searchQuery, setSearchQuery] = useState('');
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

  const ar = lang === 'ar';
  const filteredCrops = cropDatabase.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.nameAr.includes(searchQuery) || c.nameEn.toLowerCase().includes(q);
  });

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="agri-bank-title" className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md duration-200">
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
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 id="agri-bank-title" className="text-xs sm:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2">
                <span>{t.navAgriBank}</span>
                <span className="text-xs text-cyan-300 font-mono px-1.5 sm:px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 rounded-lg">
                  {agriBankHeader.badge}
                </span>
              </h2>
              <p className="text-xs text-slate-300 truncate max-w-[200px] sm:max-w-none">
                {lang === 'ar' ? agriBankHeader.subAr : agriBankHeader.subEn}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            ref={closeButtonRef}
            aria-label={lang === 'ar' ? 'إغلاق دليل المحاصيل والتربة' : 'Close crops guide'}
            className="w-7 h-7 sm:w-8 sm:h-8 bg-white/5 hover:bg-white/15 border border-cyan-500/30 rounded-lg flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector & Search */}
        <div className="flex shrink-0 flex-col items-stretch justify-between gap-2 border-b border-white/10 bg-[#040e21] p-2.5 sm:flex-row sm:items-center sm:p-3">
          <div role="tablist" aria-label={ar ? 'أقسام الدليل' : 'Guide sections'} className="grid grid-cols-3 gap-1.5 sm:flex">
            {agriBankTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-center text-xs sm:px-3.5 sm:text-sm ${isActive ? 'bg-cyan-700 font-semibold text-white' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  <Icon aria-hidden="true" className={`hidden h-4 w-4 shrink-0 sm:block ${isActive ? 'text-white' : tab.iconColor}`} />
                  <span>{ar ? tab.labelAr : tab.labelEn}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'crops' && (
            <div className="relative w-full sm:w-64">
              <label htmlFor="crop-guide-search" className="sr-only">{ar ? agriBankHeader.searchPlaceholderAr : agriBankHeader.searchPlaceholderEn}</label>
              <input
                id="crop-guide-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ar ? agriBankHeader.searchPlaceholderAr : agriBankHeader.searchPlaceholderEn}
                className="field-control pe-9"
              />
              <Search aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mobile-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4">

          {activeTab === 'crops' && (
            <>
              <p className="text-sm text-slate-300">{ar ? 'هذه القيم نطاقات عامة من جداول الفاو لمحصول سليم في ظروف جيدة، وليست متطلبات ثابتة لكل موقع.' : 'These figures are general ranges from FAO tables for a healthy crop in good conditions, not fixed requirements for every place.'}</p>
              {filteredCrops.length === 0 && <p role="status" className="text-sm text-amber-200">{ar ? 'لا يوجد في الدليل محصول بهذا الاسم.' : 'No crop with that name in the guide.'}</p>}
              <ul className="grid gap-3 md:grid-cols-2">
                {filteredCrops.map((crop) => (
                  <li key={crop.id} className="surface-card flex min-w-0 flex-col gap-2.5 p-3.5">
                    <div className="flex items-center gap-3">
                      {crop.image
                        ? <img src={crop.image} alt="" width="48" height="48" loading="lazy" decoding="async" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                        : <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-2xl">{crop.icon}</span>}
                      <div className="min-w-0">
                        <h3 className="text-card-title font-semibold text-white">{ar ? crop.nameAr : crop.nameEn}</h3>
                        <p className="text-xs text-slate-400">{ar ? crop.categoryAr : crop.categoryEn}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-200">{ar ? crop.descAr : crop.descEn}</p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <Fact label={ar ? L.waterNeedAr : L.waterNeedEn}><span className="ltr-numeric">{crop.waterNeedMm}</span> {ar ? L.mmAr : L.mmEn}</Fact>
                      <Fact label={ar ? L.growingAr : L.growingEn}><span className="ltr-numeric">{crop.growingDays}</span> {ar ? L.daysAr : L.daysEn}</Fact>
                      <Fact label={ar ? L.droughtAr : L.droughtEn}>{ar ? DROUGHT_SENSITIVITY[crop.drought].ar : DROUGHT_SENSITIVITY[crop.drought].en}</Fact>
                      <Fact label={ar ? L.temperatureAr : L.temperatureEn}>
                        {crop.temperature
                          ? <><span dir="ltr" className="ltr-numeric">{crop.temperature.rangeC} °C</span><span className="block text-xs text-slate-400">{ar ? crop.temperature.noteAr : crop.temperature.noteEn}</span></>
                          : <span className="text-slate-400">{ar ? L.notStatedAr : L.notStatedEn}</span>}
                      </Fact>
                    </dl>
                    {(ar ? crop.notesAr : crop.notesEn) && <p className="text-xs text-slate-400">{ar ? crop.notesAr : crop.notesEn}</p>}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400">{ar ? 'لا تُعرض التربة المفضَّلة لكل محصول ولا الحساسية للحرارة، لعدم توافر قيم يمكن التحقق منها في هذه المصادر. راجع تبويب «أنواع التربة» للخصائص العامة.' : 'Preferred soils and heat sensitivity per crop are not shown because we found no values we could check in these sources. See the "Soil types" tab for general soil behaviour.'}</p>
              <SourceList ids={['cropWaterNeeds', 'landEvaluation']} lang={lang} />
            </>
          )}

          {activeTab === 'soil' && (
            <>
              <p className="text-sm text-slate-300">{ar ? 'يؤثر نوع التربة في الاحتفاظ بالماء والصرف والتهوية، لكنه لا يضمن وحده نجاح المحصول؛ فالإدارة والمياه والمناخ عوامل لا تقل أهمية. يُحدَّد نوع التربة الفعلي بالتحليل المخبري.' : 'Soil type affects water holding, drainage and aeration, but it does not guarantee a good crop on its own: management, water and climate matter as much. A soil test tells you what your land actually is.'}</p>
              <ul className="grid gap-3 md:grid-cols-2">
                {soilDatabase.map((soil) => (
                  <li key={soil.id} className="surface-card flex min-w-0 flex-col gap-2.5 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 text-card-title font-semibold text-white">{ar ? soil.nameAr : soil.nameEn}</h3>
                      <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-slate-200">{ar ? SOIL_GROUPS[soil.group].ar : SOIL_GROUPS[soil.group].en}</span>
                    </div>
                    <p className="text-sm text-slate-200">{ar ? soil.descAr : soil.descEn}</p>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <Fact label={ar ? 'الاحتفاظ بالماء' : 'Water retention'}>{ar ? soil.waterAr : soil.waterEn}{soil.availableWaterMm && <span className="block text-xs text-slate-400">{ar ? 'الماء المتاح للنبات' : 'Available water'}: <span className="ltr-numeric">{soil.availableWaterMm}</span> {ar ? 'مم لكل متر عمق' : 'mm per metre depth'}</span>}</Fact>
                      <Fact label={ar ? 'الصرف' : 'Drainage'}>{ar ? soil.drainageAr : soil.drainageEn}</Fact>
                      <Fact label={ar ? 'التهوية' : 'Aeration'}>{ar ? soil.aerationAr : soil.aerationEn}</Fact>
                      <Fact label={ar ? 'القيود المحتملة' : 'Possible limitations'}>{ar ? soil.limitsAr : soil.limitsEn}</Fact>
                    </dl>
                    <p className="text-sm text-emerald-200">{ar ? soil.cropsAr : soil.cropsEn}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400">{ar ? 'ترد قيم الماء المتاح في مرجع الفاو للتربة الرملية والطميية والطينية فقط. وتوصف بقية الأنواع قياسًا إليها، وأسماؤها وفق تصنيف وزارة الزراعة الأمريكية لقوام التربة. أمثلة المحاصيل شائعة وليست ضمانًا.' : 'Available-water figures are given by the FAO reference for sand, loam and clay only. Other classes are described relative to those, with names following the USDA soil texture classification. Crop examples are common ones, not guarantees.'}</p>
              <SourceList ids={['soilAndWater']} lang={lang} />
            </>
          )}

          {activeTab === 'satellites' && (
            <>
              <p className="text-sm text-slate-300">{ar ? 'لا تقيس الأقمار الصناعية «الإنتاجية» أو «رطوبة منطقة الجذور» مباشرة؛ بل ترصد الضوء أو الحرارة أو الموجات الميكروويفية، ثم تُشتق منها منتجات مفيدة للزراعة. تستخدم المنصة مصدرين مما يلي (NASA POWER وMODIS)، إضافةً إلى مصدرين من خارج ناسا: ERA5 من ECMWF / كوبرنيكوس، ومسح التربة الأمريكي للمزارع الواقعة في الولايات المتحدة فقط.' : 'Satellites do not measure "yield" or "root-zone moisture" directly. They sense light, heat or microwaves, and scientists compute farm-relevant products from those. The platform uses two of the sources below (NASA POWER and MODIS), plus two that are not NASA: ERA5 from ECMWF/Copernicus, and the USDA soil survey for farms in the United States only.'}</p>
              <ul className="space-y-3">
                {satellitesData.map((sat) => (
                  <li key={sat.id} className={`surface-card min-w-0 space-y-2.5 p-3.5 ${sat.usedHere ? 'border-cyan-400/60' : ''}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 dir="ltr" className="text-card-title font-semibold text-white rtl:text-end">{sat.name}</h3>
                        <p className="text-xs text-slate-400">{ar ? sat.kindAr : sat.kindEn}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${sat.usedHere ? 'border-cyan-400/60 bg-cyan-950/50 text-cyan-100' : 'border-white/15 text-slate-300'}`}>{sat.usedHere ? (ar ? 'مستخدم في المنصة' : 'Used by this platform') : (ar ? 'غير مستخدم في المنصة' : 'Not used by this platform')}</span>
                    </div>
                    <dl className="grid gap-2 md:grid-cols-2">
                      <Fact label={ar ? 'ما يرصده مباشرة' : 'Senses directly'}>{ar ? sat.directAr : sat.directEn}</Fact>
                      <Fact label={ar ? 'المنتجات المشتقة منه' : 'Products derived from it'}>{ar ? sat.derivedAr : sat.derivedEn}</Fact>
                      <Fact label={ar ? 'الاستخدام الزراعي' : 'Use for agriculture'}>{ar ? sat.useAr : sat.useEn}</Fact>
                      <Fact label={ar ? 'الحالة' : 'Status'}>{ar ? sat.statusAr : sat.statusEn}</Fact>
                    </dl>
                    <a className="inline-block text-sm text-cyan-300 underline" href={sat.url} target="_blank" rel="noreferrer">{ar ? 'الصفحة الرسمية' : 'Official page'}</a>
                  </li>
                ))}
              </ul>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#071a38] p-3">
          <div className="min-w-0 text-xs text-slate-400">
            {lang === 'ar' ? agriBankHeader.footerNoteAr : agriBankHeader.footerNoteEn}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-nav-button shrink-0 rounded-lg bg-cyan-700 px-5 text-sm font-semibold text-white hover:bg-cyan-600"
          >
            {lang === 'ar' ? agriBankHeader.closeBtnAr : agriBankHeader.closeBtnEn}
          </button>
        </div>

      </div>
    </div>
  );
}
