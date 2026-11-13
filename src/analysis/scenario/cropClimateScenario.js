/**
 * Crop–climate scenario indicators for the comparison stage.
 *
 * Everything here is a documented calculation on data the workflow already
 * holds. Nothing is a yield prediction.
 *
 *  - Season: starts on day 1 of the planting month and lasts `seasonDays`.
 *  - Rain P: NASA POWER precipitation for each month of the season (mm/month).
 *  - Effective rain Pe (FAO Irrigation Water Needs, Chapter 4; slope ≤ 4–5%):
 *        Pe = 0.8 P − 25  if P > 75 mm/month
 *        Pe = 0.6 P − 10  if P ≤ 75 mm/month      (never below 0)
 *    A partly used month takes the same fraction of that month's Pe.
 *  - Irrigation need IN = crop water need − Pe (never below 0), calculated
 *    for both ends of the FAO indicative crop-water-need range.
 *  - Temperature: day-weighted mean air temperature of the season, compared
 *    with the FAO optimum range for the crop group when one is published.
 */

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const daysInMonth = (monthIndex, year = null) => (monthIndex === 1 && year !== null && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 29 : DAYS[monthIndex]);

export function effectiveRainMm(monthlyRainMm) {
  if (!Number.isFinite(monthlyRainMm)) return null;
  const value = monthlyRainMm > 75 ? 0.8 * monthlyRainMm - 25 : 0.6 * monthlyRainMm - 10;
  return Math.max(0, value);
}

/** Month provider from POWER climatology observations (long-term averages; rain in mm/day). */
export function climatologyMonths(observations = []) {
  const codes = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const value = (variable, index) => {
    const item = observations.find((obs) => obs.variable === variable && obs.referenceDate === `climatology:${codes[index]}`);
    return Number.isFinite(item?.value) ? item.value : null;
  };
  const months = codes.map((_, index) => {
    const rate = value('PRECTOTCORR', index);
    return { tMean: value('T2M', index), rainMm: rate === null ? null : rate * DAYS[index] };
  });
  const available = months.some((month) => month.tMean !== null || month.rainMm !== null);
  return { available, period: observations.find((obs) => obs.variable === 'T2M')?.temporalCoverage || null, get: (offsetYear, monthIndex) => ({ ...months[monthIndex], days: DAYS[monthIndex] }) };
}

/** Month provider for one calendar year from POWER monthly data ({ 'YYYY-MM': { tMean, rainMm } }). */
export function yearMonths(monthly = {}, year) {
  return {
    available: Object.keys(monthly).some((key) => key.startsWith(`${year}-`)),
    period: String(year),
    get: (offsetYear, monthIndex) => {
      const y = year + offsetYear;
      const entry = monthly[`${y}-${String(monthIndex + 1).padStart(2, '0')}`];
      return { tMean: entry?.tMean ?? null, rainMm: entry?.rainMm ?? null, days: daysInMonth(monthIndex, y) };
    },
  };
}

export function evaluateCropSeason({ crop, plantingMonth, seasonDays, months }) {
  const base = {
    cropId: crop?.id || null, plantingMonth, seasonDays,
    waterNeedMm: crop?.cropWaterNeed?.rangeMmPerGrowingPeriod || null,
    optimumTemperatureC: crop?.optimumTemperatureC?.range || null,
    droughtSensitivity: crop?.droughtSensitivity || null,
  };
  if (!crop) return { ...base, status: 'no-crop' };
  if (!Number.isInteger(plantingMonth) || plantingMonth < 0 || plantingMonth > 11) return { ...base, status: 'no-planting-month' };
  if (!Number.isFinite(seasonDays) || seasonDays < 30 || seasonDays > 365) return { ...base, status: 'no-season-length' };
  if (!months?.available) return { ...base, status: 'no-climate-data' };

  let remaining = seasonDays; let monthIndex = plantingMonth; let offsetYear = 0;
  let rain = 0; let effective = 0; let tempDays = 0; let tempSum = 0; const used = [];
  while (remaining > 0) {
    const month = months.get(offsetYear, monthIndex);
    const take = Math.min(remaining, month.days);
    if (month.rainMm === null || month.tMean === null) return { ...base, status: 'missing-months', missingMonth: { offsetYear, monthIndex } };
    const fraction = take / month.days;
    rain += month.rainMm * fraction;
    effective += effectiveRainMm(month.rainMm) * fraction;
    tempSum += month.tMean * take; tempDays += take;
    used.push({ offsetYear, monthIndex, days: take });
    remaining -= take; monthIndex += 1;
    if (monthIndex > 11) { monthIndex = 0; offsetYear += 1; }
  }
  const tMean = tempSum / tempDays;
  const need = base.waterNeedMm;
  const irrigationNeedMm = need ? [Math.max(0, need[0] - effective), Math.max(0, need[1] - effective)] : null;
  const rainCoveragePct = need ? [Math.min(100, 100 * effective / need[1]), Math.min(100, 100 * effective / need[0])] : null;
  const optimum = base.optimumTemperatureC;
  const temperatureStatus = !optimum ? 'unavailable' : tMean < optimum[0] ? 'below' : tMean > optimum[1] ? 'above' : 'within';
  return { ...base, status: 'ok', monthsUsed: used, seasonRainMm: rain, effectiveRainMm: effective, seasonMeanTempC: tMean, irrigationNeedMm, rainCoveragePct, temperatureStatus };
}

/** Evaluate a whole scenario (a sequence of crop seasons on one climate basis). */
export function evaluateScenario({ id, name, crops, seasons, months, basis }) {
  const results = crops.map((crop, index) => evaluateCropSeason({ crop, plantingMonth: seasons[index]?.plantingMonth, seasonDays: seasons[index]?.seasonDays, months }));
  const complete = results.every((item) => item.status === 'ok');
  const waterComplete = complete && results.every((item) => item.waterNeedMm);
  const sum = (pick) => results.reduce((total, item) => total + pick(item), 0);
  const tempKnown = results.filter((item) => item.status === 'ok' && item.temperatureStatus !== 'unavailable');
  return {
    id, name, basis, results, complete,
    totals: {
      waterNeedMm: waterComplete ? [sum((i) => i.waterNeedMm[0]), sum((i) => i.waterNeedMm[1])] : null,
      effectiveRainMm: complete ? sum((i) => i.effectiveRainMm) : null,
      seasonRainMm: complete ? sum((i) => i.seasonRainMm) : null,
      irrigationNeedMm: waterComplete ? [sum((i) => i.irrigationNeedMm[0]), sum((i) => i.irrigationNeedMm[1])] : null,
      // 1 mm of water over 1 hectare = 10 m³.
      irrigationNeedM3PerHa: waterComplete ? [sum((i) => i.irrigationNeedMm[0]) * 10, sum((i) => i.irrigationNeedMm[1]) * 10] : null,
      temperatureWithin: tempKnown.filter((i) => i.temperatureStatus === 'within').length,
      temperatureAssessed: tempKnown.length,
    },
  };
}

/** Plain, supported differences between scenarios (no ranking is implied where data are missing). */
export function compareScenarios(scenarios = []) {
  // A ranking is only fair when every scenario being compared has a complete irrigation estimate.
  const withWater = scenarios.filter((s) => s.totals.irrigationNeedMm);
  const allComparable = scenarios.length > 1 && withWater.length === scenarios.length;
  const mid = (range) => (range[0] + range[1]) / 2;
  const lowestIrrigation = allComparable ? withWater.reduce((best, s) => (mid(s.totals.irrigationNeedMm) < mid(best.totals.irrigationNeedMm) ? s : best)) : null;
  const highestIrrigation = allComparable ? withWater.reduce((best, s) => (mid(s.totals.irrigationNeedMm) > mid(best.totals.irrigationNeedMm) ? s : best)) : null;
  const spreadMm = lowestIrrigation && highestIrrigation ? mid(highestIrrigation.totals.irrigationNeedMm) - mid(lowestIrrigation.totals.irrigationNeedMm) : null;
  return { lowestIrrigationId: spreadMm && spreadMm >= 1 ? lowestIrrigation.id : null, highestIrrigationId: spreadMm && spreadMm >= 1 ? highestIrrigation.id : null, spreadMm, comparable: withWater.length };
}
