'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Notice, secondaryButton } from './ui';
import { monthLabel } from '../../game/engine/insights.js';

const ERROR_TEXT = {
  network: { en: 'Could not reach NASA POWER. Check your connection and try again.', ar: 'تعذّر الاتصال بخدمة NASA POWER. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.' },
  'out-of-range': { en: 'NASA POWER has no monthly data for this period at this location. Choose another year.', ar: 'لا تتوافر لدى NASA POWER بيانات شهرية لهذه الفترة في هذا الموقع. اختر سنة أخرى.' },
  'rate-limited': { en: 'NASA POWER is limiting requests right now. Wait a moment and try again.', ar: 'خدمة NASA POWER تحدّ من عدد الطلبات حاليًا. انتظر قليلًا ثم أعد المحاولة.' },
  default: { en: 'NASA POWER did not return usable data for this request.', ar: 'لم تُرجع NASA POWER بيانات صالحة لهذا الطلب.' },
};

/** Loading, failure and missing-data states for the experiment's NASA request. No values are ever substituted. */
export default function DataStatus({ season, simulation, lang }) {
  const ar = lang === 'ar';
  if (season.status === 'loading') {
    return <Notice><span role="status" className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />{ar ? 'جارٍ تحميل البيانات الشهرية من NASA POWER…' : 'Loading monthly data from NASA POWER…'}</span></Notice>;
  }
  if (season.status === 'error') {
    const text = ERROR_TEXT[season.error.code] || ERROR_TEXT.default;
    return (
      <Notice tone="error" action={<button type="button" onClick={season.retry} className={secondaryButton}><RefreshCw aria-hidden="true" className="h-4 w-4" />{ar ? 'إعادة المحاولة' : 'Try again'}</button>}>
        <p className="font-medium">{ar ? text.ar : text.en}</p>
        <p className="mt-0.5 text-xs opacity-80">{ar ? 'لا تُستخدم قيم بديلة: تعمل المحاكاة بالبيانات الفعلية المسترجعة فقط.' : 'No substitute values are shown: the simulation only runs on data that was actually retrieved.'}</p>
      </Notice>
    );
  }
  if (season.status === 'ready' && simulation && !simulation.ok) {
    const list = simulation.missing.map((key) => { const [y, m] = key.split('-').map(Number); return monthLabel(lang, m, y); }).join(ar ? '، ' : ', ');
    return (
      <Notice tone="warn">
        <p className="font-medium">{ar ? 'هذه الفترة غير مكتملة في بيانات NASA POWER.' : 'This period is not complete in the NASA POWER record.'}</p>
        <p className="mt-0.5 text-xs">{ar ? `توجد أشهر تنقصها بيانات الحرارة أو الهطول: ${list}. اختر سنة أخرى أو شهر زراعة آخر.` : `Months without temperature or precipitation: ${list}. Choose another year or planting month.`}</p>
      </Notice>
    );
  }
  return null;
}
