/**
 * ECMWF ERA5 reanalysis, read through the Open-Meteo Historical Weather API.
 *
 * Verified on 2026-11-13:
 * - endpoint https://archive-api.open-meteo.com/v1/archive, no key, answers browser requests
 * - `models=era5` must be set: the default "best_match" fills the latest days with
 *   ECMWF IFS forecast-model output, which is not ERA5
 * - ERA5 grid 0.25° (~25 km), record from 1940, published with about a 5-day delay
 * - units returned: °C, mm, mm (ET₀), m³/m³ (soil moisture by layer)
 * - free API terms: non-commercial use, fewer than 10,000 calls a day, data under CC BY 4.0
 * Values are model output for a ~25 km cell. The model does not know about irrigation,
 * so in irrigated areas real soil moisture is usually higher than shown.
 */
import { requestData, DataSourceError } from '../data/http.js';
import { isValidPoint } from '../data/coverage.js';

export const ERA5_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
export const ERA5_DOCS_URL = 'https://open-meteo.com/en/docs/historical-weather-api';
export const ERA5_DATASET_URL = 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels';
export const ERA5_TERMS_URL = 'https://open-meteo.com/en/terms';

export const ERA5_DAILY = Object.freeze({
  temperature_2m_mean: { field: 'tMean', how: 'mean' },
  precipitation_sum: { field: 'rainMm', how: 'sum' },
  et0_fao_evapotranspiration: { field: 'et0Mm', how: 'sum' },
  soil_moisture_0_to_7cm_mean: { field: 'soil0to7', how: 'mean' },
  soil_moisture_7_to_28cm_mean: { field: 'soil7to28', how: 'mean' },
});

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Aggregate the daily ERA5 arrays (real Open-Meteo shape) into calendar months. */
export function aggregateEra5Monthly(json) {
  const daily = json?.daily;
  if (!daily || !Array.isArray(daily.time)) throw new DataSourceError('bad-response', 'ERA5 response did not include daily values', { source: 'ERA5' });
  const months = new Map();
  daily.time.forEach((day, index) => {
    const key = day.slice(0, 7);
    if (!months.has(key)) months.set(key, { key, days: 0, values: Object.fromEntries(Object.keys(ERA5_DAILY).map((name) => [name, []])) });
    const month = months.get(key);
    month.days += 1;
    Object.keys(ERA5_DAILY).forEach((name) => {
      const value = daily[name]?.[index];
      if (value !== null && value !== undefined && Number.isFinite(Number(value))) month.values[name].push(Number(value));
    });
  });
  return [...months.values()].map((month) => {
    const [year, mon] = month.key.split('-').map(Number);
    const expected = daysInMonth(year, mon);
    const out = { key: month.key, daysWithData: {}, expectedDays: expected };
    Object.entries(ERA5_DAILY).forEach(([name, info]) => {
      const values = month.values[name];
      out.daysWithData[info.field] = values.length;
      // A monthly total or mean is only reported when every day of the month is present.
      if (values.length !== expected) { out[info.field] = null; return; }
      const total = values.reduce((sum, value) => sum + value, 0);
      out[info.field] = info.how === 'sum' ? total : total / values.length;
    });
    out.complete = Object.values(out.daysWithData).every((count) => count === expected);
    return out;
  });
}

export async function getEra5Monthly({ latitude, longitude, startDate, endDate, signal, fetchImpl }) {
  if (!isValidPoint(latitude, longitude)) throw new DataSourceError('bad-request', 'Invalid coordinates', { source: 'ERA5' });
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4), longitude: longitude.toFixed(4),
    start_date: startDate, end_date: endDate,
    daily: Object.keys(ERA5_DAILY).join(','),
    models: 'era5', timezone: 'UTC',
  });
  const answer = await requestData(`${ERA5_ARCHIVE_URL}?${params}`, { signal, timeoutMs: 20000, retries: 1, ttlMs: 6 * 60 * 60 * 1000, source: 'ERA5', fetchImpl });
  const json = answer.data;
  if (json?.error) throw new DataSourceError('http', json.reason || 'ERA5 request rejected', { source: 'ERA5' });
  return {
    months: aggregateEra5Monthly(json),
    units: json.daily_units || {},
    grid: { latitude: json.latitude, longitude: json.longitude, elevationM: json.elevation },
    request: { latitude, longitude, startDate, endDate },
    retrievedAt: answer.retrievedAt,
    fromCache: answer.fromCache,
  };
}
