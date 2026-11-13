/**
 * Reference evapotranspiration (ETo) by the Blaney-Criddle method as taught in
 * FAO Irrigation Water Management Training Manual No. 3 (Chapter 3):
 *
 *     ETo = p × (0.46 × Tmean + 8)        [mm/day]
 *
 * Tmean is the monthly mean air temperature (°C) and p is the mean daily
 * percentage of annual daytime hours for the month and latitude. FAO tabulates
 * p; here it is computed from the same astronomy (FAO-56 equations 24, 25, 34).
 *
 * FAO describes the method as rough: it tends to underestimate ETo in windy,
 * dry, sunny places and overestimate it in calm, humid, cloudy ones.
 */
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MID_MONTH_DOY = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];

export function daysInMonth(year, month) {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return MONTH_DAYS[month - 1];
}

/** Daylight hours for a latitude (degrees) and day of year. */
export function daylightHours(latitude, dayOfYear) {
  const phi = (Math.max(-66, Math.min(66, latitude)) * Math.PI) / 180;
  const declination = 0.409 * Math.sin(((2 * Math.PI) / 365) * dayOfYear - 1.39);
  const x = Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(declination)));
  return (24 / Math.PI) * Math.acos(x);
}

/** Mean daily percentage of annual daytime hours (Blaney-Criddle p). */
export function daytimePercentage(latitude, month) {
  const annual = MID_MONTH_DOY.reduce((sum, doy, index) => sum + daylightHours(latitude, doy) * MONTH_DAYS[index], 0);
  return (100 * daylightHours(latitude, MID_MONTH_DOY[month - 1])) / annual;
}

/** Reference evapotranspiration in mm/day; null when temperature is missing. */
export function referenceEtMmPerDay(latitude, month, meanTempC) {
  if (!Number.isFinite(meanTempC)) return null;
  return Math.max(0, daytimePercentage(latitude, month) * (0.46 * meanTempC + 8));
}
