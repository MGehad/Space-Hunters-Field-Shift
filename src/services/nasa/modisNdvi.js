/**
 * MODIS/Terra vegetation index (MOD13Q1, NDVI, 16-day composites, 250 m) for
 * one point, from the ORNL DAAC MODIS/VIIRS Land Product Subsets web service.
 *
 * Verified on 2026-11-13 with real requests:
 * - no login or key; the service answers browser requests from other sites
 * - at most 10 composites per request ("exceeds maximum subset tiles support of 10")
 * - NDVI band "250m_16_days_NDVI": scale 0.0001, fill -3000, valid -2000..10000
 * - "250m_16_days_pixel_reliability": 0 good, 1 marginal, 2 snow/ice, 3 cloudy, -1 fill
 * - Terra composites start on day-of-year 1, 17, 33 … 353 every year; record from 2000-02-18
 * NDVI describes how green the 250 m pixel is. It is not a yield measurement.
 */
import { requestData, mapLimit, DataSourceError } from '../data/http.js';
import { isValidPoint } from '../data/coverage.js';

export const MODIS_SUBSET_API = 'https://modis.ornl.gov/rst/api/v1';
export const MODIS_SUBSET_DOCS_URL = 'https://modis.ornl.gov/data/modis_webservice.html';
export const MOD13Q1_PRODUCT_URL = 'https://doi.org/10.5067/MODIS/MOD13Q1.061';
export const NDVI_BAND = '250m_16_days_NDVI';
export const RELIABILITY_BAND = '250m_16_days_pixel_reliability';
const MAX_COMPOSITES_PER_REQUEST = 10;
const FIRST_COMPOSITE = '2000-02-18';

export const RELIABILITY = Object.freeze({
  0: { id: 'good', en: 'Good', ar: 'جيدة' },
  1: { id: 'marginal', en: 'Marginal (usable, check)', ar: 'مقبولة (تُستخدم بحذر)' },
  2: { id: 'snow', en: 'Snow or ice', ar: 'ثلج أو جليد' },
  3: { id: 'cloudy', en: 'Cloudy', ar: 'سحب' },
  [-1]: { id: 'fill', en: 'No data', ar: 'لا بيانات' },
});

const pad = (value, size) => String(value).padStart(size, '0');
const toUtc = (iso) => new Date(`${iso}T00:00:00Z`);

/** Terra MOD13Q1 composite start dates between two ISO dates (inclusive), as MODIS "AYYYYDDD" codes. */
export function mod13q1Composites(startIso, endIso) {
  const start = toUtc(startIso < FIRST_COMPOSITE ? FIRST_COMPOSITE : startIso);
  const end = toUtc(endIso);
  const codes = [];
  for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year += 1) {
    for (let doy = 1; doy <= 353; doy += 16) {
      const date = new Date(Date.UTC(year, 0, doy));
      if (date >= start && date <= end) codes.push({ code: `A${year}${pad(doy, 3)}`, date: date.toISOString().slice(0, 10) });
    }
  }
  return codes;
}

export function chunk(list, size = MAX_COMPOSITES_PER_REQUEST) {
  const out = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
}

/** Combine the NDVI and reliability subsets (real ORNL response shape) into one clean series. */
export function normalizeNdviSubsets(ndviResponses, reliabilityResponses) {
  const reliabilityByDate = new Map();
  reliabilityResponses.forEach((response) => (response?.subset || []).forEach((entry) => reliabilityByDate.set(entry.calendar_date, Number(entry.data?.[0]))));
  const series = [];
  let cellsizeM = null;
  let tile = null;
  ndviResponses.forEach((response) => {
    if (!response) return;
    if (Number.isFinite(Number(response.cellsize))) cellsizeM = Number(response.cellsize);
    (response.subset || []).forEach((entry) => {
      const raw = Number(entry.data?.[0]);
      const reliability = reliabilityByDate.has(entry.calendar_date) ? reliabilityByDate.get(entry.calendar_date) : null;
      const validRaw = Number.isFinite(raw) && raw !== -3000 && raw >= -2000 && raw <= 10000;
      const usable = validRaw && (reliability === 0 || reliability === 1);
      tile = tile || entry.tile || null;
      series.push({
        date: entry.calendar_date,
        ndvi: usable ? Math.round(raw * 0.0001 * 10000) / 10000 : null,
        reliability,
        quality: RELIABILITY[reliability]?.id || 'unknown',
      });
    });
  });
  series.sort((a, b) => a.date.localeCompare(b.date));
  return { series, cellsizeM, tile };
}

function subsetUrl(band, latitude, longitude, first, last) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(5), longitude: longitude.toFixed(5), band,
    startDate: first, endDate: last, kmAboveBelow: '0', kmLeftRight: '0',
  });
  return `${MODIS_SUBSET_API}/MOD13Q1/subset?${params}`;
}

const isNoDataAnswer = (error) => error instanceof DataSourceError && error.code === 'http' && error.status === 400 && /no data available/i.test(error.message);

/**
 * @param {{latitude:number, longitude:number, startDate:string, endDate:string}} options ISO dates (YYYY-MM-DD)
 */
export async function getModisNdvi({ latitude, longitude, startDate, endDate, signal, fetchImpl }) {
  if (!isValidPoint(latitude, longitude)) throw new DataSourceError('bad-request', 'Invalid coordinates', { source: 'MOD13Q1' });
  const composites = mod13q1Composites(startDate, endDate);
  if (!composites.length) throw new DataSourceError('no-data', 'No MODIS composites in the requested period', { source: 'MOD13Q1' });
  const groups = chunk(composites);
  let allFromCache = true;
  let retrievedAt = null;
  const fetchBand = async (band, group) => {
    try {
      const answer = await requestData(subsetUrl(band, latitude, longitude, group[0].code, group[group.length - 1].code), {
        signal, timeoutMs: 45000, retries: 1, ttlMs: 6 * 60 * 60 * 1000, source: 'MOD13Q1', fetchImpl,
      });
      allFromCache = allFromCache && answer.fromCache;
      retrievedAt = retrievedAt && retrievedAt > answer.retrievedAt ? retrievedAt : answer.retrievedAt;
      return answer.data;
    } catch (error) {
      if (isNoDataAnswer(error)) return null; // composites not processed yet
      throw error;
    }
  };
  // Two date groups at a time, each fetching both bands: at most four requests in flight.
  const results = await mapLimit(groups, 2, (group) => Promise.all([fetchBand(NDVI_BAND, group), fetchBand(RELIABILITY_BAND, group)]));
  const { series, cellsizeM, tile } = normalizeNdviSubsets(results.map((pair) => pair[0]), results.map((pair) => pair[1]));
  if (!series.length) throw new DataSourceError('no-data', 'MODIS returned no composites for this point and period', { source: 'MOD13Q1' });
  return {
    product: 'MOD13Q1', band: NDVI_BAND, series, cellsizeM, tile,
    request: { latitude, longitude, startDate, endDate },
    retrievedAt, fromCache: allFromCache,
  };
}
