'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Droplets, Layers, Leaf, RefreshCw } from 'lucide-react';
import SourceDetails from '../common/SourceDetails';
import { getPowerRecentMonths, POWER_MONTHLY_DOCS_URL } from '../../services/nasa/powerMonthly.js';
import { getModisNdvi, MODIS_SUBSET_DOCS_URL, MOD13Q1_PRODUCT_URL, RELIABILITY } from '../../services/nasa/modisNdvi.js';
import { getEra5Monthly, ERA5_DOCS_URL } from '../../services/era5/openMeteoEra5.js';
import { getSsurgoAtPoint, SDA_DOCS_URL, WSS_URL } from '../../services/usda/ssurgo.js';
import { isPossiblyInUnitedStates } from '../../services/data/coverage.js';
import { useWorkingSession } from '../../context/WorkingSessionContext';

/**
 * "Recent conditions" for the selected farm point. Every block loads on its
 * own, so one failing provider never hides the others, and every request is
 * cancelled when the farm point changes or the step closes.
 */

const MONTH_CODES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const iso = (date) => date.toISOString().slice(0, 10);
const daysIn = (key) => { const [y, m] = key.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

function useProvider(load, deps, enabled = true) {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) { setState({ status: 'idle', data: null, error: null }); return undefined; }
    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: null });
    load(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ status: 'ready', data, error: null }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ status: 'error', data: null, error }); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}

function errorText(error, ar) {
  const code = error?.code;
  if (code === 'timeout') return ar ? 'لم تستجب الخدمة خلال المهلة المحددة.' : 'The service did not answer in time.';
  if (code === 'rate-limited') return ar ? 'الخدمة تحدّ من عدد الطلبات حاليًا؛ يُرجى المحاولة بعد قليل.' : 'The service is limiting requests right now; try again shortly.';
  if (code === 'no-data') return ar ? 'لم تُرجع الخدمة بيانات لهذه النقطة والفترة.' : 'The service returned no data for this point and period.';
  if (code === 'network') return ar ? 'تعذّر الاتصال بالخدمة (تحقق من الاتصال بالإنترنت).' : 'The service could not be reached (check the connection).';
  return ar ? `تعذّر تنفيذ الطلب${error?.status ? ` (HTTP ${error.status})` : ''}.` : `The request failed${error?.status ? ` (HTTP ${error.status})` : ''}.`;
}

function Status({ state, ar, loadingText }) {
  if (state.status === 'loading') return <p role="status" className="rounded-md bg-cyan-950/40 px-3 py-2 text-sm text-cyan-100">{loadingText}</p>;
  if (state.status === 'error') {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
        <span>{errorText(state.error, ar)} {ar ? 'لا تُعرض قيم بديلة.' : 'No substitute values are shown.'}</span>
        <button type="button" onClick={state.retry} className="app-nav-button inline-flex items-center gap-1.5 rounded-md border border-rose-300/40 px-3 text-sm"><RefreshCw aria-hidden="true" className="h-4 w-4" />{ar ? 'إعادة المحاولة' : 'Retry'}</button>
      </div>
    );
  }
  return null;
}

function Block({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="min-w-0 space-y-3 rounded-lg border border-white/10 bg-[#07152b] p-3">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-white"><Icon aria-hidden="true" className="h-4 w-4 text-cyan-300" />{title}</h3>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Table({ head, rows, caption }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="text-xs text-slate-400"><tr>{head.map((cell) => <th key={cell} scope="col" className="px-2 py-1.5 text-start font-medium">{cell}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/5 text-slate-100">{rows}</tbody>
      </table>
    </div>
  );
}

function NdviChart({ series, ar }) {
  const width = 380; const height = 190; const pad = { l: 34, r: 8, t: 10, b: 26 };
  const times = series.map((item) => Date.parse(item.date));
  const t0 = Math.min(...times); const t1 = Math.max(...times);
  const x = (t) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v + 0.2) / 1.2) * (height - pad.t - pad.b);
  const usable = series.filter((item) => item.ndvi !== null);
  const path = usable.map((item, index) => `${index ? 'L' : 'M'}${x(Date.parse(item.date)).toFixed(1)},${y(item.ndvi).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ar ? 'منحنى مؤشر NDVI خلال الفترة' : 'NDVI over the period'} className="h-auto w-full max-w-2xl" dir="ltr">
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(148,163,184,0.18)" />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#94a3b8">{v.toFixed(2)}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#34d399" strokeWidth="2" />
      {series.map((item) => (item.ndvi === null
        ? <line key={item.date} x1={x(Date.parse(item.date))} x2={x(Date.parse(item.date))} y1={height - pad.b - 8} y2={height - pad.b} stroke="#f59e0b" strokeWidth="2"><title>{item.date}: {ar ? RELIABILITY[item.reliability]?.ar || 'لا توجد قيمة' : RELIABILITY[item.reliability]?.en || 'No value'}</title></line>
        : <circle key={item.date} cx={x(Date.parse(item.date))} cy={y(item.ndvi)} r="4" fill={item.reliability === 0 ? '#34d399' : '#0b1626'} stroke="#34d399" strokeWidth="1.5"><title>{item.date}: NDVI {item.ndvi.toFixed(2)} ({ar ? RELIABILITY[item.reliability]?.ar : RELIABILITY[item.reliability]?.en})</title></circle>))}
      <text x={pad.l} y={height - 6} fontSize="12" fill="#94a3b8">{series[0]?.date}</text>
      <text x={width - pad.r} y={height - 6} textAnchor="end" fontSize="12" fill="#94a3b8">{series[series.length - 1]?.date}</text>
    </svg>
  );
}

export default function FarmRecentConditions({ farmLocation, climatology = [], lang = 'en' }) {
  const ar = lang === 'ar';
  const latitude = farmLocation?.latitude;
  const longitude = farmLocation?.longitude;
  const hasPoint = Number.isFinite(latitude) && Number.isFinite(longitude);
  const pointKey = hasPoint ? `${latitude.toFixed(5)},${longitude.toFixed(5)}` : 'none';
  const isPolygon = farmLocation?.selectionMethod === 'polygon-boundary';
  const locationText = hasPoint ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}${isPolygon ? (ar ? ' (نقطة مركز الحدود)' : ' (boundary centre point)') : ''}` : null;
  const number = (value, digits = 1) => (value === null || value === undefined || !Number.isFinite(value) ? '—' : value.toLocaleString(ar ? 'ar-EG' : 'en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const signed = (value, digits = 1) => (value === null || !Number.isFinite(value) ? '—' : `${value > 0 ? '+' : ''}${number(value, digits)}`);
  const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

  // Period definitions (computed once per farm point).
  const periods = useMemo(() => {
    const now = new Date();
    const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const era5Start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, 1));
    const era5End = new Date(firstOfThisMonth.getTime() - 86400000);
    const ndviStart = new Date(now.getTime() - 365 * 86400000);
    return { now, era5: { start: iso(era5Start), end: iso(era5End) }, ndvi: { start: iso(ndviStart), end: iso(now) } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointKey]);

  const power = useProvider((signal) => getPowerRecentMonths({ latitude, longitude, now: periods.now, signal }), [pointKey], hasPoint);
  const era5 = useProvider((signal) => getEra5Monthly({ latitude, longitude, startDate: periods.era5.start, endDate: periods.era5.end, signal }), [pointKey], hasPoint);
  const inUs = hasPoint && isPossiblyInUnitedStates(latitude, longitude);
  const soil = useProvider((signal) => getSsurgoAtPoint({ latitude, longitude, signal }), [pointKey], inUs);
  const [ndviRequested, setNdviRequested] = useState(false);
  useEffect(() => { setNdviRequested(false); }, [pointKey]);
  const ndvi = useProvider((signal) => getModisNdvi({ latitude, longitude, startDate: periods.ndvi.start, endDate: periods.ndvi.end, signal }), [pointKey], hasPoint && ndviRequested);

  // Keep what was actually retrieved in the working session so the technical report can include it.
  const { updateSession } = useWorkingSession();
  useEffect(() => {
    if (!hasPoint) return;
    updateSession({ recentConditions: { pointKey, power: power.data, era5: era5.data, ndvi: ndvi.data, soil: soil.data } });
  }, [hasPoint, pointKey, power.data, era5.data, ndvi.data, soil.data, updateSession]);

  const climatologyValue = (variable, monthIndex) => climatology.find((item) => item.variable === variable && item.referenceDate === `climatology:${MONTH_CODES[monthIndex]}`)?.value ?? null;
  const climatologyPeriod = climatology[0]?.temporalCoverage || null;

  if (!hasPoint) return null;

  const ndviUsable = ndvi.data?.series.filter((item) => item.ndvi !== null) || [];
  const ndviLatest = ndviUsable[ndviUsable.length - 1];
  const ndviMax = ndviUsable.reduce((best, item) => (!best || item.ndvi > best.ndvi ? item : best), null);
  const ndviMin = ndviUsable.reduce((best, item) => (!best || item.ndvi < best.ndvi ? item : best), null);
  const ndviMissing = (ndvi.data?.series.length || 0) - ndviUsable.length;

  return (
    <section aria-labelledby="recent-conditions-title" className="min-w-0 space-y-3">
      <div>
        <h2 id="recent-conditions-title" className="flex items-center gap-2 text-lg font-bold text-white"><CalendarClock aria-hidden="true" className="h-5 w-5 text-cyan-300" />{ar ? 'الظروف الحديثة عند موقع المزرعة' : 'Recent conditions at the farm'}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{ar ? 'بيانات فعلية من عدة مصادر، لكل منها جهته ووحداته ودقته المكانية. جميعها تخص نقطة واحدة وليست متوسطًا للمزرعة، ولا يقيس أيٌّ منها الإنتاجية.' : 'Real data from several providers, each with its own source, units and grid size. All refer to one point, not a whole-farm average, and none of them measures yield.'}</p>
      </div>

      {/* 1. NASA POWER: last months compared with the long-term average */}
      <Block icon={CalendarClock} title={ar ? 'الأشهر الأخيرة مقارنةً بالمتوسط طويل الأجل (NASA POWER)' : 'Latest months against the long-term average (NASA POWER)'}
        subtitle={ar ? `الفرق = قيمة الشهر ناقص متوسط الشهر نفسه${climatologyPeriod ? ` (${climatologyPeriod})` : ''}. الهطول الشهري = المعدل اليومي × عدد أيام الشهر.` : `Difference = the month's value minus the average for the same month${climatologyPeriod ? ` (${climatologyPeriod})` : ''}. Monthly rain = daily rate × days in the month.`}>
        <Status state={power} ar={ar} loadingText={ar ? 'جارٍ تحميل الأشهر الأخيرة من NASA POWER…' : 'Loading recent months from NASA POWER...'} />
        {power.status === 'ready' && (power.data.recent.length === 0
          ? <p role="status" className="text-sm text-amber-200">{ar ? 'لم تنشر NASA POWER أشهرًا حديثة لهذه النقطة.' : 'NASA POWER has not published recent months for this point.'}</p>
          : <>
            <Table caption={ar ? 'الأشهر الأخيرة' : 'Recent months'} head={ar ? ['الشهر', 'الحرارة °م', 'الفرق', 'الهطول مم', 'متوسط الهطول مم', 'الفرق'] : ['Month', 'Temp °C', 'vs avg', 'Rain mm', 'Avg rain mm', 'vs avg']}
              rows={power.data.recent.map((month) => {
                const monthIndex = Number(month.key.slice(5)) - 1;
                const normalT = climatologyValue('T2M', monthIndex);
                const normalRainRate = climatologyValue('PRECTOTCORR', monthIndex);
                const normalRain = normalRainRate === null ? null : normalRainRate * daysIn(month.key);
                return (
                  <tr key={month.key}>
                    <td className="px-2 py-1.5">{monthLabel(month.key)}</td>
                    <td className="px-2 py-1.5 ltr-numeric">{number(month.tMean)}</td>
                    <td className="px-2 py-1.5 ltr-numeric">{month.tMean === null || normalT === null ? '—' : signed(month.tMean - normalT)}</td>
                    <td className="px-2 py-1.5 ltr-numeric">{number(month.rainMm)}</td>
                    <td className="px-2 py-1.5 ltr-numeric">{number(normalRain)}</td>
                    <td className="px-2 py-1.5 ltr-numeric">{month.rainMm === null || normalRain === null ? '—' : signed(month.rainMm - normalRain)}</td>
                  </tr>
                );
              })} />
            {power.data.recent.length < 12 && <p className="text-xs text-slate-400">{ar ? `المعروض ${power.data.recent.length} أشهر فقط: الأشهر التالية لم تنشرها NASA POWER بعد.` : `Only ${power.data.recent.length} months are shown: later months are not yet published by NASA POWER.`}</p>}
            <SourceDetails lang={lang} source="NASA POWER" dataset={`${power.data.sourceTitle || 'Monthly'}${power.data.modelSources?.length ? ` (${power.data.modelSources.join(', ')})` : ''}`}
              endpoint="/api/temporal/monthly/point · community=AG" location={locationText}
              period={`${power.data.recent[0].key} → ${power.data.recent[power.data.recent.length - 1].key} (${ar ? 'شهري' : 'monthly'})`}
              retrievedAt={power.data.retrievedAt} fromCache={power.data.fromCache} url={POWER_MONTHLY_DOCS_URL}
              parameters={[
                { code: 'T2M', name: ar ? 'متوسط حرارة الهواء' : 'Mean air temperature at 2 m', unit: power.data.units?.T2M, kind: 'modeled' },
                { code: 'PRECTOTCORR', name: ar ? 'الهطول (مصحَّح)' : 'Precipitation (corrected)', unit: power.data.units?.PRECTOTCORR, kind: 'modeled' },
                { code: '—', name: ar ? 'الهطول الشهري والفروق' : 'Monthly rain totals and differences', unit: 'mm, °C', kind: 'derived' },
              ]}
              notes={[ar ? 'شبكة بدقة نصف درجة تقريبًا (عشرات الكيلومترات). الفرق عن المتوسط لا يفسّر بذاته سببًا معيّنًا.' : 'Grid of about half a degree (tens of kilometres). A difference from the average does not by itself explain a cause.']} />
          </>)}
      </Block>

      {/* 2. ERA5: water balance and soil moisture */}
      <Block icon={Droplets} title={ar ? 'الميزان المائي ورطوبة التربة (ERA5)' : 'Water balance and soil moisture (ERA5)'}
        subtitle={ar ? 'ET₀ هو التبخر والنتح المرجعي (طريقة الفاو بنمان–مونتيث). الفرق «الهطول − ET₀» يبيّن مدى تغطية الأمطار وحدها لهذا الطلب قبل الري. رطوبة التربة مخرجات نموذج لا يمثّل الري.' : 'ET₀ is reference evapotranspiration (FAO Penman–Monteith). Rain − ET₀ shows how far rain alone covers that demand, before irrigation. Soil moisture is model output that knows nothing about irrigation.'}>
        <Status state={era5} ar={ar} loadingText={ar ? 'جارٍ تحميل بيانات ERA5…' : 'Loading ERA5 data...'} />
        {era5.status === 'ready' && <>
          <Table caption="ERA5" head={ar ? ['الشهر', 'الهطول مم', 'ET₀ مم', 'الهطول − ET₀', 'رطوبة التربة 0–7 سم', 'رطوبة التربة 7–28 سم'] : ['Month', 'Rain mm', 'ET₀ mm', 'Rain − ET₀', 'Soil 0–7 cm', 'Soil 7–28 cm']}
            rows={era5.data.months.map((month) => (
              <tr key={month.key} className={month.complete ? '' : 'text-slate-400'}>
                <td className="px-2 py-1.5">{monthLabel(month.key)}{!month.complete && <span className="block text-xs">{ar ? 'شهر غير مكتمل' : 'incomplete month'}</span>}</td>
                <td className="px-2 py-1.5 ltr-numeric">{number(month.rainMm)}</td>
                <td className="px-2 py-1.5 ltr-numeric">{number(month.et0Mm)}</td>
                <td className="px-2 py-1.5 ltr-numeric">{month.rainMm === null || month.et0Mm === null ? '—' : signed(month.rainMm - month.et0Mm)}</td>
                <td className="px-2 py-1.5 ltr-numeric">{number(month.soil0to7, 3)}</td>
                <td className="px-2 py-1.5 ltr-numeric">{number(month.soil7to28, 3)}</td>
              </tr>
            ))} />
          <p className="text-xs text-slate-400">{ar ? 'رطوبة التربة بوحدة م³ ماء لكل م³ تربة. لا يُحسب مجموع أو متوسط للشهر غير المكتمل الأيام.' : 'Soil moisture is in m³ of water per m³ of soil. A month with missing days gets no total or mean.'}</p>
          <SourceDetails lang={lang} source={ar ? 'ERA5 من ECMWF / كوبرنيكوس، عبر Open-Meteo (ليس من ناسا)' : 'ECMWF / Copernicus ERA5, via Open-Meteo (not NASA)'}
            dataset={ar ? 'إعادة التحليل ERA5، شبكة 0.25° (نحو 25 كم)' : 'ERA5 reanalysis, 0.25° grid (about 25 km)'}
            endpoint="archive-api.open-meteo.com/v1/archive · models=era5"
            location={`${locationText} → ${ar ? 'الخلية الشبكية' : 'grid cell'} ${era5.data.grid.latitude?.toFixed(2)}, ${era5.data.grid.longitude?.toFixed(2)}`}
            period={`${era5.data.request.startDate} → ${era5.data.request.endDate} (${ar ? 'يومي، مجمَّع شهريًا' : 'daily, totalled by month'})`}
            retrievedAt={era5.data.retrievedAt} fromCache={era5.data.fromCache} url={ERA5_DOCS_URL}
            parameters={[
              { code: 'precipitation_sum', name: ar ? 'الهطول' : 'Precipitation', unit: era5.data.units.precipitation_sum, kind: 'modeled' },
              { code: 'et0_fao_evapotranspiration', name: ar ? 'ET₀ (محسوب لدى Open-Meteo من بيانات ERA5)' : 'ET₀ (computed by Open-Meteo from ERA5)', unit: era5.data.units.et0_fao_evapotranspiration, kind: 'providerDerived' },
              { code: 'soil_moisture_0_to_7cm_mean', name: ar ? 'رطوبة التربة 0–7 سم' : 'Soil moisture 0–7 cm', unit: era5.data.units.soil_moisture_0_to_7cm_mean, kind: 'modeled' },
              { code: 'soil_moisture_7_to_28cm_mean', name: ar ? 'رطوبة التربة 7–28 سم' : 'Soil moisture 7–28 cm', unit: era5.data.units.soil_moisture_7_to_28cm_mean, kind: 'modeled' },
              { code: '—', name: ar ? 'المجاميع الشهرية والهطول − ET₀' : 'Monthly totals and Rain − ET₀', unit: 'mm', kind: 'derived' },
            ]}
            notes={[
              ar ? 'تُنشر بيانات ERA5 بتأخير نحو 5 أيام. الواجهة المجانية لـOpen-Meteo مخصصة للاستخدام غير التجاري، والبيانات مرخَّصة وفق CC BY 4.0.' : 'ERA5 is published about 5 days behind real time. Open-Meteo’s free API is for non-commercial use; the data are licensed CC BY 4.0.',
              ar ? 'يُستخدم ERA5 بدلًا من SMAP لأن بيانات SMAP النقطية غير متاحة دون تسجيل دخول في Earthdata.' : 'ERA5 is used instead of SMAP because point SMAP data are not available without a NASA Earthdata login.',
            ]} />
        </>}
      </Block>

      {/* 3. MODIS NDVI, on demand */}
      <Block icon={Leaf} title={ar ? 'اخضرار الغطاء النباتي من الأقمار الصناعية (MODIS NDVI)' : 'Vegetation greenness from satellite (MODIS NDVI)'}
        subtitle={ar ? 'يقيس NDVI اخضرار الغطاء النباتي في خلية 250 م حول النقطة كل 16 يومًا. القيمة الأعلى تعني غطاءً أكثر اخضرارًا؛ والتربة العارية والمياه قيمها منخفضة. لا يقيس المؤشر الإنتاجية، وقد تشمل الخلية حقولًا مجاورة.' : 'NDVI measures greenness in the 250 m pixel around the point, every 16 days. Higher means greener vegetation; bare soil and water score low. It does not measure yield, and the pixel may include neighbouring fields.'}>
        {!ndviRequested && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setNdviRequested(true)} className="app-nav-button inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-600"><Leaf aria-hidden="true" className="h-4 w-4" />{ar ? 'تحميل بيانات آخر 12 شهرًا' : 'Load the last 12 months'}</button>
            <span className="text-xs text-slate-400">{ar ? 'قد يستغرق التحميل حتى دقيقة: الخدمة تُرجع 10 صور مركّبة فقط في كل طلب.' : 'Can take up to a minute: the service returns only 10 composites per request.'}</span>
          </div>
        )}
        {ndviRequested && <Status state={ndvi} ar={ar} loadingText={ar ? 'جارٍ تحميل بيانات MODIS من ORNL DAAC (قد يستغرق حتى دقيقة)…' : 'Loading MODIS data from ORNL DAAC (can take up to a minute)...'} />}
        {ndvi.status === 'ready' && <>
          <NdviChart series={ndvi.data.series} ar={ar} />
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-slate-400">{ar ? 'أحدث قيمة صالحة' : 'Latest usable value'}</dt><dd className="ltr-numeric text-slate-100">{ndviLatest ? `${number(ndviLatest.ndvi, 2)} · ${ndviLatest.date}` : '—'}</dd></div>
            <div><dt className="text-xs text-slate-400">{ar ? 'أعلى قيمة' : 'Highest'}</dt><dd className="ltr-numeric text-slate-100">{ndviMax ? `${number(ndviMax.ndvi, 2)} · ${ndviMax.date}` : '—'}</dd></div>
            <div><dt className="text-xs text-slate-400">{ar ? 'أدنى قيمة' : 'Lowest'}</dt><dd className="ltr-numeric text-slate-100">{ndviMin ? `${number(ndviMin.ndvi, 2)} · ${ndviMin.date}` : '—'}</dd></div>
          </dl>
          <p className="text-xs text-slate-400">{ar ? `● جودة جيدة · ○ جودة مقبولة · الشرطة البرتقالية = صورة مستبعدة (سحب أو ثلج أو لا بيانات): ${ndviMissing}.` : `● good quality · ○ marginal quality · orange tick = composite left out (cloud, snow or no data): ${ndviMissing}.`}</p>
          <SourceDetails lang={lang} source={ar ? 'ناسا — MODIS على القمر Terra، عبر ORNL DAAC' : 'NASA — MODIS on Terra, via ORNL DAAC'}
            dataset={`MOD13Q1 v6.1 · 250m_16_days_NDVI${ndvi.data.tile ? ` · tile ${ndvi.data.tile}` : ''}`}
            endpoint="modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
            location={`${locationText}${ndvi.data.cellsizeM ? ` · ${ar ? 'خلية' : 'pixel'} ${Math.round(ndvi.data.cellsizeM)} m` : ''}`}
            period={`${ndvi.data.series[0]?.date} → ${ndvi.data.series[ndvi.data.series.length - 1]?.date} (${ar ? 'كل 16 يومًا' : '16-day composites'})`}
            retrievedAt={ndvi.data.retrievedAt} fromCache={ndvi.data.fromCache} url={MODIS_SUBSET_DOCS_URL}
            parameters={[
              { code: '250m_16_days_NDVI', name: 'NDVI', unit: ar ? 'بلا وحدة (من −0.2 إلى 1)' : 'unitless (−0.2 to 1)', kind: 'satellite' },
              { code: '250m_16_days_pixel_reliability', name: ar ? 'موثوقية الخلية' : 'Pixel reliability', unit: '0–3', kind: 'satellite' },
            ]}
            notes={[
              ar ? 'القيم الخام مضروبة في 0.0001. الصور المصنَّفة «سحب» أو «ثلج» لا تُرسم.' : 'Raw values are scaled by 0.0001. Composites flagged cloudy or snow/ice are not plotted.',
              <a key="doi" className="text-cyan-300 underline" href={MOD13Q1_PRODUCT_URL} target="_blank" rel="noreferrer">{ar ? 'صفحة المنتج (DOI)' : 'Product record (DOI)'}</a>,
            ]} />
        </>}
      </Block>

      {/* 4. Soil survey: US only */}
      <Block icon={Layers} title={ar ? 'مسح التربة (USDA SSURGO)' : 'Soil survey (USDA SSURGO)'}>
        {!inUs && <p role="status" className="text-sm leading-relaxed text-slate-300">{ar ? 'يغطي مسح التربة الأمريكي الولايات المتحدة فقط، ولذلك لا يُطلب لهذا الموقع. لا يتوافر حاليًا مصدر عالمي لخصائص التربة في المنصة؛ ويبقى التحليل المخبري للتربة الخيار الموثوق.' : 'The USDA soil survey covers the United States only, so it is not requested for this location. No global soil-property source is connected yet; a soil test of the field is the reliable option.'}</p>}
        {inUs && <Status state={soil} ar={ar} loadingText={ar ? 'جارٍ تحميل بيانات مسح التربة…' : 'Loading the soil survey...'} />}
        {inUs && soil.status === 'ready' && (soil.data.status !== 'ok'
          ? <p role="status" className="text-sm text-amber-200">{ar ? 'لم يُعثر على وحدة مسح تربة عند هذه النقطة (قد تكون خارج الولايات المتحدة أو في منطقة غير ممسوحة).' : 'No soil-survey map unit was found at this point (it may be outside the US or in an unsurveyed area).'}</p>
          : <>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className="text-xs text-slate-400">{ar ? 'وحدة الخريطة' : 'Map unit'}</dt><dd className="text-slate-100">{soil.data.mapUnit.name}</dd></div>
              <div><dt className="text-xs text-slate-400">{ar ? 'المكوّن الرئيس' : 'Main component'}</dt><dd className="text-slate-100">{soil.data.component.name || '—'}{soil.data.component.percent !== null && <span className="ltr-numeric"> ({number(soil.data.component.percent, 0)}%)</span>}</dd></div>
              <div><dt className="text-xs text-slate-400">{ar ? 'قوام الطبقة السطحية' : 'Surface texture'}</dt><dd className="text-slate-100">{soil.data.surface.textureName || soil.data.surface.textureCode || '—'}{soil.data.surface.bottomCm !== null && <span className="ltr-numeric"> (0–{number(soil.data.surface.bottomCm, 0)} cm)</span>}</dd></div>
              <div><dt className="text-xs text-slate-400">{ar ? 'الرمل / السلت / الطين' : 'Sand / silt / clay'}</dt><dd className="ltr-numeric text-slate-100">{[soil.data.surface.sandPct, soil.data.surface.siltPct, soil.data.surface.clayPct].map((value) => number(value, 0)).join(' / ')} %</dd></div>
              <div><dt className="text-xs text-slate-400">{ar ? 'المادة العضوية' : 'Organic matter'}</dt><dd className="ltr-numeric text-slate-100">{number(soil.data.surface.organicMatterPct, 1)} %</dd></div>
              <div><dt className="text-xs text-slate-400">{ar ? 'الماء المتاح في المتر الأول' : 'Available water, top 100 cm'}</dt><dd className="ltr-numeric text-slate-100">{number(soil.data.availableWaterStorageCm, 1)} cm</dd></div>
              <div><dt className="text-xs text-slate-400">{ar ? 'فئة الصرف' : 'Drainage class'}</dt><dd className="text-slate-100">{soil.data.drainageClass || '—'}</dd></div>
              <div><dt className="text-xs text-slate-400">{ar ? 'المجموعة الهيدرولوجية' : 'Hydrologic group'}</dt><dd className="text-slate-100">{soil.data.hydrologicGroup || '—'}</dd></div>
              <div><dt className="text-xs text-slate-400">{ar ? 'الميل' : 'Slope'}</dt><dd className="ltr-numeric text-slate-100">{number(soil.data.slopePercent, 1)} %</dd></div>
            </dl>
            <SourceDetails lang={lang} source="USDA NRCS — Soil Data Access (SSURGO)" dataset={ar ? 'وحدة خريطة مسح التربة ومكوّنها الرئيس' : 'Soil survey map unit and its main component'}
              endpoint="sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest" location={`${locationText} · mukey ${soil.data.mapUnit.key}`}
              period={ar ? 'المسح الحالي (يُحدَّث ليلًا)' : 'Current survey (refreshed nightly)'} retrievedAt={soil.data.retrievedAt} fromCache={soil.data.fromCache} url={SDA_DOCS_URL}
              parameters={[
                { code: 'muaggatt', name: ar ? 'الصرف، والماء المتاح، والمجموعة الهيدرولوجية، والميل' : 'Drainage, available water, hydrologic group, slope', unit: 'cm, %', kind: 'survey' },
                { code: 'chorizon', name: ar ? 'الأفق السطحي للمكوّن الرئيس' : 'Surface horizon of the main component', unit: '%, cm/cm', kind: 'survey' },
              ]}
              notes={[
                ar ? 'خصائص وحدة مسح على الخريطة، وليست تحليلًا مخبريًا لتربة الحقل؛ وتتباين التربة داخل الوحدة الواحدة.' : 'These describe a mapped survey unit, not a laboratory test of your field; soils vary within a unit.',
                <a key="wss" className="text-cyan-300 underline" href={WSS_URL} target="_blank" rel="noreferrer">Web Soil Survey</a>,
              ]} />
          </>)}
      </Block>
    </section>
  );
}
