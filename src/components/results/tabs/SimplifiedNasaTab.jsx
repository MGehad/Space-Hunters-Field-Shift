'use client';

import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { Satellite, Droplets, Thermometer, Sprout, CloudRain } from 'lucide-react';
import { nasaTelemetrySensors } from '../../../data/nasaSensorsData';

export default function SimplifiedNasaTab() {
  const { t, lang } = useLanguage();

  const sensors = [
    {
      id: 'smap',
      name: 'SMAP',
      icon: Droplets,
      color: 'text-sky-400',
      border: 'border-sky-500/40',
      bg: 'bg-sky-950/30',
      title: lang === 'ar' ? 'رطوبة التربة' : 'Soil Moisture',
      val: lang === 'ar' ? 'مش متاح' : 'Unavailable',
      status: lang === 'ar' ? 'المصدر ده مش متوصل هنا' : 'Provider not integrated',
    },
    {
      id: 'lst',
      name: 'LST / MODIS',
      icon: Thermometer,
      color: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/30',
      title: lang === 'ar' ? 'حرارة سطح الأرض' : 'Land Surface Temp',
      val: lang === 'ar' ? 'مش متاح' : 'Unavailable',
      status: lang === 'ar' ? 'المصدر ده مش متوصل هنا' : 'Provider not integrated',
    },
    {
      id: 'ndvi',
      name: 'NDVI / Landsat',
      icon: Sprout,
      color: 'text-emerald-400',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/30',
      title: lang === 'ar' ? 'كثافة الغطاء النباتي' : 'Vegetation Index',
      val: lang === 'ar' ? 'مش متاح' : 'Unavailable',
      status: lang === 'ar' ? 'المصدر ده مش متوصل هنا' : 'Provider not integrated',
    },
    {
      id: 'gpm',
      name: 'GPM',
      icon: CloudRain,
      color: 'text-cyan-400',
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-950/30',
      title: lang === 'ar' ? 'رصد الأمطار العالمي' : 'Precipitation',
      val: lang === 'ar' ? 'مش متاح' : 'Unavailable',
      status: lang === 'ar' ? 'المصدر ده مش متوصل هنا' : 'Provider not integrated',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      
      {/* 🛰️ 1. SATELLITE HEADER */}
      <div className="p-3 bg-gradient-to-r from-[#061c42] to-[#041228] border border-cyan-500/35 rounded-xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Satellite className="w-5 h-5 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white">{t.tabNasaData}</h3>
        </div>
        <span className="text-2xs font-mono text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
          {lang === 'ar' ? 'مراجع مش متوصلة هنا' : 'References not integrated'}
        </span>
      </div>

      <p role="note" className="rounded border border-amber-500/30 bg-amber-950/30 px-2 py-1 text-2xs text-amber-100">
        {lang === 'ar' ? 'الشاشة دي مش بتعرض قرايات أقمار صناعية حقيقية؛ وأي رقم مش موجود مش بنحط مكانه أرقام تجريبية.' : 'This screen does not show satellite measurements; unavailable values are not replaced with demo measurements.'}
      </p>

      {/* 🛰️ 2. 4 SATELLITE SENSOR CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {sensors.map((sensor) => {
          const Icon = sensor.icon;
          return (
            <div
              key={sensor.id}
              className={`p-3 bg-[#071733] border ${sensor.border} rounded-xl shadow-sm flex items-center justify-between`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg ${sensor.bg} flex items-center justify-center ${sensor.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{sensor.name}</span>
                    <span className="text-2xs text-slate-400">({sensor.title})</span>
                  </div>
                  <span className={`text-2xs font-bold ${sensor.color}`}>{sensor.status}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-white font-mono">{sensor.val}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 📊 3. BEFORE VS AFTER COMPARISON */}
      <div className="p-3 bg-[#061633] border border-cyan-500/30 rounded-xl shadow-sm">
        <h4 className="text-xs font-bold text-white mb-2">{t.comparisonBeforeAfter}</h4>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Traditional Monoculture */}
          <div className="p-2.5 bg-red-950/20 border border-red-500/30 rounded-lg">
            <span className="text-red-400 font-bold block mb-1 text-2xs">❌ {t.before}:</span>
              <p className="text-slate-300 text-2xs leading-relaxed">
              {lang === 'ar' ? 'مفيش بيانات أساسية متاحة عن الإنتاج والمياه للأرض دي قبل كده.' : 'No farm-specific baseline for production or water use is available.'}
            </p>
          </div>

          {/* Adapted Rotation */}
          <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
            <span className="text-emerald-400 font-bold block mb-1 text-2xs">✔️ {t.after}:</span>
            <p className="text-slate-300 text-2xs leading-relaxed">
              {lang === 'ar' ? 'مفيش قراية بعد كده أو رقم موثق للوفر في المياه.' : 'No measured outcome or sourced savings estimate is available.'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
