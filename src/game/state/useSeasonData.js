'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPowerMonthly, lastAvailableYear, POWER_FIRST_YEAR } from '../services/powerMonthly.js';
import { seasonMonths, ASSUMPTIONS } from '../engine/simulate.js';

/** Calendar years needed for a season, including the pre-season months. */
export function seasonYearSpan(startYear, plantingMonth, crop) {
  const months = seasonMonths(startYear, plantingMonth, crop);
  const first = plantingMonth - ASSUMPTIONS.preSeasonMonths < 1 ? startYear - 1 : startYear;
  return { firstYear: Math.max(POWER_FIRST_YEAR, first), lastYear: months[months.length - 1].year };
}

/** Start years for which the whole season lies inside the POWER monthly record. */
export function availableStartYears(plantingMonth, crop, now = new Date()) {
  const last = lastAvailableYear(now);
  const years = [];
  for (let year = last; year >= POWER_FIRST_YEAR + 1; year -= 1) {
    if (!crop || !plantingMonth || seasonYearSpan(year, plantingMonth, crop).lastYear <= last) years.push(year);
  }
  return years;
}

/**
 * Loads NASA POWER monthly data for the current experiment.
 * status: 'idle' | 'loading' | 'ready' | 'error'
 */
export function useSeasonData({ region, crop, startYear, plantingMonth, enabled = true }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, status: 'idle', data: null, error: null });
  const span = useMemo(() => (region && crop && startYear && plantingMonth ? seasonYearSpan(startYear, plantingMonth, crop) : null), [region, crop, startYear, plantingMonth]);
  const key = span && enabled ? `${region.id}:${span.firstYear}-${span.lastYear}` : null;

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    let active = true;
    setResult((current) => (current.key === key && current.status === 'ready' ? current : { key, status: 'loading', data: null, error: null }));
    getPowerMonthly({ latitude: region.latitude, longitude: region.longitude, startYear: span.firstYear, endYear: span.lastYear, signal: controller.signal })
      .then((data) => { if (active) setResult({ key, status: 'ready', data, error: null }); })
      .catch((error) => { if (active && error?.name !== 'AbortError') setResult({ key, status: 'error', data: null, error: { code: error?.code || 'unknown', message: error?.message || 'Request failed' } }); });
    return () => { active = false; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  if (!key) return { status: 'idle', data: null, error: null, retry, span };
  if (result.key !== key) return { status: 'loading', data: null, error: null, retry, span };
  return { ...result, retry, span };
}
