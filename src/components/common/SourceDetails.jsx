'use client';

import React from 'react';

/**
 * One consistent "where does this number come from" panel for both
 * experiences. It only prints what the caller passes; nothing is defaulted.
 *
 * kind: 'modeled'   — produced by a model or reanalysis (not a field measurement)
 *       'survey'    — attribute of a mapped soil-survey unit (not a test of this field)
 *       'satellite' — derived from satellite observations by NASA
 *       'derived'   — calculated by this site from the values above
 *       'estimate'  — educational estimate from a simplified method
 */
export const DATA_KIND_LABELS = Object.freeze({
  modeled: { en: 'Model output (reanalysis)', ar: 'مخرجات نموذج (إعادة تحليل)' },
  satellite: { en: 'Derived from satellite observations', ar: 'مشتق من أرصاد الأقمار الصناعية' },
  derived: { en: 'Calculated by this site', ar: 'مؤشر محسوب في المنصة' },
  providerDerived: { en: 'Calculated by the data provider', ar: 'محسوب لدى مزوِّد البيانات' },
  estimate: { en: 'Educational estimate', ar: 'تقدير تعليمي' },
  survey: { en: 'Soil survey map attribute', ar: 'خاصية من خريطة مسح التربة' },
});

export function formatRetrieved(iso, lang) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SourceDetails({ lang, source, dataset, endpoint, parameters = [], location, period, retrievedAt, fromCache = false, url, notes = [], defaultOpen = false }) {
  const ar = lang === 'ar';
  const missing = ar ? 'غير متاح' : 'not available';
  const retrieved = formatRetrieved(retrievedAt, lang);
  const Row = ({ label, children }) => (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 py-1 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-slate-100">{children}</dd>
    </div>
  );
  return (
    <details open={defaultOpen} className="surface-inset px-3 py-1 text-xs">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-cyan-200">{ar ? 'تفاصيل مصدر البيانات' : 'Data source details'}</summary>
      <dl className="divide-y divide-white/5 pb-2">
        <Row label={ar ? 'المصدر' : 'Source'}>{source || missing}</Row>
        <Row label={ar ? 'مجموعة البيانات' : 'Dataset'}>{dataset || missing}</Row>
        {endpoint && <Row label={ar ? 'نقطة الوصول' : 'Endpoint'}><span dir="ltr" className="ltr-numeric">{endpoint}</span></Row>}
        <Row label={ar ? 'الموقع' : 'Location'}>{location || missing}</Row>
        <Row label={ar ? 'الفترة' : 'Period'}>{period || missing}</Row>
        <Row label={ar ? 'تاريخ الاسترجاع' : 'Retrieved'}>
          {retrieved || missing}
          {retrieved && <span className="block text-slate-400">{fromCache ? (ar ? 'نسخة مخزَّنة من الجلسة نفسها (ليست طلبًا جديدًا)' : 'Reused from this session\'s cache (not a new request)') : (ar ? 'استجابة جديدة من الخدمة' : 'Fresh response from the service')}</span>}
        </Row>
      </dl>
      {parameters.length > 0 && (
        <div dir="ltr" className="overflow-x-auto pb-2">
          <table dir={ar ? 'rtl' : 'ltr'} className="w-full min-w-[24rem] text-xs">
            <thead className="text-slate-400"><tr><th className="py-1 pe-2 text-start font-medium">{ar ? 'المتغيّر' : 'Variable'}</th><th className="py-1 pe-2 text-start font-medium">{ar ? 'الرمز' : 'Parameter'}</th><th className="py-1 pe-2 text-start font-medium">{ar ? 'الوحدة' : 'Unit'}</th><th className="py-1 text-start font-medium">{ar ? 'النوع' : 'Type'}</th></tr></thead>
            <tbody className="divide-y divide-white/5 text-slate-100">
              {parameters.map((item) => (
                <tr key={item.code || item.name}>
                  <td className="py-1 pe-2">{item.name}</td>
                  <td className="py-1 pe-2"><span dir="ltr" className="ltr-numeric">{item.code || '—'}</span></td>
                  <td className="py-1 pe-2"><span dir="ltr" className="ltr-numeric">{item.unit || missing}</span></td>
                  <td className="py-1">{DATA_KIND_LABELS[item.kind] ? (ar ? DATA_KIND_LABELS[item.kind].ar : DATA_KIND_LABELS[item.kind].en) : missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {notes.filter(Boolean).map((note, index) => <p key={typeof note === 'string' ? note : `note-${index}`} className="pb-2 text-slate-400">{note}</p>)}
      {url && <a className="mb-2 inline-block text-cyan-300 underline" href={url} target="_blank" rel="noreferrer">{ar ? 'التوثيق الرسمي' : 'Official documentation'}</a>}
    </details>
  );
}
