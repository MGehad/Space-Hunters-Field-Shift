/**
 * NASA POWER monthly point data, shared by the simulation game (historical
 * seasons) and the farm workflow (the most recent twelve months).
 *
 * Endpoint: /api/temporal/monthly/point (start and end are calendar years).
 * POWER meteorology comes from NASA GMAO MERRA-2, a model-based reanalysis on
 * a grid of roughly half a degree; POWER documents its monthly record as
 * running from January 1981 to the previous calendar year. Values describe a
 * grid cell, not an individual field.
 */
export const POWER_MONTHLY_URL = 'https://power.larc.nasa.gov/api/temporal/monthly/point';
export const POWER_MONTHLY_DOCS_URL = 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/';
export const POWER_FIRST_YEAR = 1981;

export const POWER_VARIABLES = Object.freeze({
  T2M: { field: 'tMean', required: true, nameEn: 'Mean air temperature at 2 m', nameAr: 'متوسط حرارة الهواء' },
  PRECTOTCORR: { field: 'rainMm', required: true, nameEn: 'Precipitation (bias-corrected)', nameAr: 'الهطول' },
  T2M_MAX: { field: 'tMax', required: false, nameEn: 'Highest air temperature at 2 m in the month', nameAr: 'أعلى درجة حرارة في الشهر' },
  GWETROOT: { field: 'soilWetness', required: false, nameEn: 'Root-zone soil wetness (0–1, modeled)', nameAr: 'رطوبة منطقة الجذور (من 0 إلى 1)' },
});

const REQUIRED = Object.keys(POWER_VARIABLES).filter((name) => POWER_VARIABLES[name].required);
const OPTIONAL = Object.keys(POWER_VARIABLES).filter((name) => !POWER_VARIABLES[name].required);
const cache = new Map();

/** Last calendar year POWER documents as complete for monthly data. */
export function lastAvailableYear(now = new Date()) {
  return now.getUTCFullYear() - 1;
}

export class PowerDataError extends Error {
  constructor(code, message) { super(message); this.name = 'PowerDataError'; this.code = code; }
}

function clean(value, fillValue) {
  const number = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) return null;
  if (number === -999 || number === Number(fillValue)) return null;
  return number;
}

function monthLength(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Convert a POWER monthly JSON payload into { "YYYY-MM": {tMean, rainMm, tMax, soilWetness} }. */
export function normalizePowerMonthly(json) {
  const parameters = json?.properties?.parameter;
  if (!parameters || typeof parameters !== 'object') throw new PowerDataError('bad-response', 'NASA POWER response did not include parameter values');
  const missingRequired = REQUIRED.filter((name) => !parameters[name] || typeof parameters[name] !== 'object');
  if (missingRequired.length) throw new PowerDataError('bad-response', `NASA POWER response omitted: ${missingRequired.join(', ')}`);

  const fillValue = json?.header?.fill_value;
  const rainUnit = String(json?.parameters?.PRECTOTCORR?.units || 'mm/day').toLowerCase();
  const rainIsDailyRate = rainUnit.includes('day');
  const months = {};
  const unavailable = [];
  Object.entries(POWER_VARIABLES).forEach(([name, info]) => {
    const series = parameters[name];
    if (!series || typeof series !== 'object') { unavailable.push(name); return; }
    let any = false;
    Object.entries(series).forEach(([stamp, raw]) => {
      if (!/^\d{6}$/.test(stamp)) return;
      const year = Number(stamp.slice(0, 4));
      const month = Number(stamp.slice(4));
      if (month < 1 || month > 12) return; // "13" is the annual value
      let value = clean(raw, fillValue);
      if (value !== null) {
        any = true;
        if (name === 'PRECTOTCORR' && rainIsDailyRate) value *= monthLength(year, month);
      }
      const key = `${year}-${String(month).padStart(2, '0')}`;
      months[key] = months[key] || { tMean: null, rainMm: null, tMax: null, soilWetness: null };
      months[key][info.field] = value;
    });
    if (!any) unavailable.push(name);
  });
  return {
    months,
    unavailable,
    units: Object.fromEntries(Object.keys(POWER_VARIABLES).map((name) => [name, json?.parameters?.[name]?.units || null])),
    sourceTitle: json?.header?.title || null,
    modelSources: Array.isArray(json?.header?.sources) ? json.header.sources : [],
    apiVersion: json?.header?.api?.version || null,
  };
}

/**
 * Fetch monthly POWER values for a point and a span of calendar years.
 * Results are cached in memory per point and span for the browser session.
 */
export async function getPowerMonthly({ latitude, longitude, startYear, endYear, signal, fetchImpl = fetch }) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new PowerDataError('bad-request', 'Invalid coordinates');
  if (startYear < POWER_FIRST_YEAR || endYear < startYear) throw new PowerDataError('out-of-range', 'Requested years are outside the NASA POWER monthly record');
  const key = `${latitude},${longitude},${startYear},${endYear}`;
  if (fetchImpl === fetch && cache.has(key)) return Object.freeze({ ...cache.get(key), fromCache: true });

  const request = async (names) => {
    const url = new URL(POWER_MONTHLY_URL);
    url.search = new URLSearchParams({
      parameters: names.join(','), community: 'AG', longitude: String(longitude), latitude: String(latitude),
      start: String(startYear), end: String(endYear), format: 'JSON',
    }).toString();
    let response;
    try { response = await fetchImpl(url.toString(), { signal }); }
    catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw new PowerDataError('network', 'Could not reach NASA POWER');
    }
    return response;
  };

  let response = await request([...REQUIRED, ...OPTIONAL]);
  // A rejected optional parameter must not block the required ones.
  if (response.status === 422 || response.status === 400) response = await request(REQUIRED);
  if (response.status === 422 || response.status === 400) throw new PowerDataError('out-of-range', 'NASA POWER rejected the requested period or location');
  if (response.status === 429) throw new PowerDataError('rate-limited', 'NASA POWER is limiting requests; try again shortly');
  if (!response.ok) throw new PowerDataError('http', `NASA POWER request failed with HTTP ${response.status}`);

  let json;
  try { json = await response.json(); } catch { throw new PowerDataError('bad-response', 'NASA POWER returned an unreadable response'); }
  const result = Object.freeze({
    ...normalizePowerMonthly(json),
    request: { latitude, longitude, startYear, endYear },
    retrievedAt: new Date().toISOString(),
    fromCache: false,
  });
  if (fetchImpl === fetch) {
    if (cache.size >= 40) cache.delete(cache.keys().next().value);
    cache.set(key, result);
  }
  return result;
}

/**
 * The most recent months POWER has published for a point (up to `count`),
 * newest last. Months POWER marks with its fill value are left out, so the
 * list can be shorter than `count`; nothing is filled in.
 */
export async function getPowerRecentMonths({ latitude, longitude, count = 12, now = new Date(), signal, fetchImpl }) {
  const year = now.getUTCFullYear();
  const result = await getPowerMonthly({ latitude, longitude, startYear: year - 1, endYear: year, signal, ...(fetchImpl ? { fetchImpl } : {}) });
  const months = Object.entries(result.months)
    .filter(([, value]) => value.tMean !== null || value.rainMm !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-count)
    .map(([key, value]) => ({ key, ...value }));
  return { ...result, recent: months };
}
