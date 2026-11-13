/**
 * Educational crop-water simulation.
 *
 * Inputs are kept separate on purpose:
 *   1. observations  — monthly NASA POWER values (never altered here)
 *   2. crop          — published planning parameters (data/gameCrops.js)
 *   3. decisions     — the player's choices
 *   4. ASSUMPTIONS   — fixed modelling assumptions listed below
 * Outputs are derived estimates. They are not measurements and not a yield
 * forecast; the same inputs always give the same outputs.
 *
 * Monthly steps:
 *   ETo   = Blaney-Criddle reference evapotranspiration (see evapotranspiration.js)
 *   ETc   = Kc × ETo × days                      crop water need (FAO Kc method)
 *   Pe    = effective rainfall, USDA Soil Conservation Service method as used by
 *           default in FAO CROPWAT: P(125 − 0.2P)/125 for P ≤ 250 mm, else 125 + 0.1P
 *   gap   = ETc − Pe − soil store                unmet need before irrigation
 *   I     = irrigation level × gap               net irrigation reaching the roots
 *   gross = I ÷ application efficiency           water that must be delivered
 *   ETa   = min(ETc, Pe + store + I)             water the crop actually gets
 *   store = leftover water carried to next month (capped; surplus drains away)
 * Before planting, the soil store is pre-filled from the three preceding months
 * of observed rain, less an assumed bare-soil loss of 0.3 × ETo.
 * Season:
 *   relative yield = 1 − Ky × (1 − ΣETa ÷ ΣETc)  (FAO-33 water production function)
 */
import { GROWTH_STAGES } from '../data/gameCrops.js';
import { daysInMonth, referenceEtMmPerDay } from './evapotranspiration.js';

export const ASSUMPTIONS = Object.freeze({
  // Medium-textured soil, about 140 mm of plant-available water per metre
  // (FAO-56, Table 19) over a 1 m root zone.
  soilStoreCapacityMm: 140,
  initialStoreFraction: 0.5,
  preSeasonMonths: 3,
  bareSoilFactor: 0.3,
  daysPerSimMonth: 30,
});

export const IRRIGATION_LEVELS = Object.freeze([
  { id: 'rainfed', fraction: 0, nameEn: 'Rainfed (no irrigation)', nameAr: 'زراعة مطرية (دون ري)',
    proEn: 'Uses no irrigation water or pumping.', proAr: 'لا تستهلك مياه ري ولا طاقة للضخ.',
    conEn: 'The crop depends entirely on rain and stored soil water.', conAr: 'يعتمد المحصول كليًا على الأمطار ومخزون التربة.' },
  { id: 'deficit', fraction: 0.6, nameEn: 'Deficit irrigation (60% of the gap)', nameAr: 'ري ناقص (60% من العجز)',
    proEn: 'Saves water while covering most of the shortfall.', proAr: 'يوفّر المياه ويغطي معظم احتياج المحصول.',
    conEn: 'Some water stress remains in dry months.', conAr: 'قد يتعرّض المحصول لإجهاد مائي محدود في الأشهر الجافة.' },
  { id: 'full', fraction: 1, nameEn: 'Full irrigation (100% of the gap)', nameAr: 'ري كامل (100% من العجز)',
    proEn: 'Removes modeled water stress.', proAr: 'يمنع الإجهاد المائي في الحساب.',
    conEn: 'Highest water use; only possible where water is available.', conAr: 'الأعلى استهلاكًا للمياه، ولا يصلح إلا عند توافرها.' },
]);

// Indicative field application efficiencies, FAO Irrigation Water Management
// Training Manual No. 4 (Irrigation Scheduling), Annex I.
export const IRRIGATION_METHODS = Object.freeze([
  { id: 'surface', efficiency: 0.6, nameEn: 'Surface (furrow or basin)', nameAr: 'ري سطحي (أحواض أو خطوط)',
    proEn: 'Low equipment cost.', proAr: 'منخفض التكلفة وقليل المعدات.',
    conEn: 'About 40% of delivered water does not reach the roots.', conAr: 'نحو 40% من المياه المضافة لا يصل إلى الجذور.' },
  { id: 'sprinkler', efficiency: 0.75, nameEn: 'Sprinkler', nameAr: 'ري بالرش',
    proEn: 'More even application than surface irrigation.', proAr: 'توزيع أفضل للمياه من الري السطحي.',
    conEn: 'Needs pressure and equipment; wind and evaporation losses.', conAr: 'يتطلب مواسير ومضخة، ويُفقد جزء من المياه بالرياح والتبخر.' },
  { id: 'drip', efficiency: 0.9, nameEn: 'Drip', nameAr: 'ري بالتنقيط',
    proEn: 'Delivers water close to the roots with small losses.', proAr: 'يوصل المياه إلى منطقة الجذور مباشرة بأقل فاقد.',
    conEn: 'Highest installation cost and maintenance.', conAr: 'الأعلى تكلفة في الإنشاء والصيانة.' },
]);

export const DEFAULT_DECISIONS = Object.freeze({ irrigationLevel: 'rainfed', irrigationMethod: 'surface' });

const round1 = (value) => Math.round(value * 10) / 10;

/** USDA-SCS effective rainfall (mm/month), the default method in FAO CROPWAT. */
export function effectiveRainfallMm(rainMm) {
  if (!Number.isFinite(rainMm)) return null;
  const rain = Math.max(0, rainMm);
  return rain <= 250 ? (rain * (125 - 0.2 * rain)) / 125 : 125 + 0.1 * rain;
}

/** Soil water at planting, pre-filled from observed pre-season months. */
export function preSeasonStore({ latitude, startYear, plantingMonth, observations }) {
  const capacity = ASSUMPTIONS.soilStoreCapacityMm;
  let store = capacity * ASSUMPTIONS.initialStoreFraction;
  for (let back = ASSUMPTIONS.preSeasonMonths; back >= 1; back -= 1) {
    const zero = plantingMonth - 1 - back;
    const year = startYear + Math.floor(zero / 12);
    const month = ((zero % 12) + 12) % 12 + 1;
    const obs = observations?.[`${year}-${String(month).padStart(2, '0')}`];
    if (!Number.isFinite(obs?.tMean) || !Number.isFinite(obs?.rainMm)) {
      return { storeMm: capacity * ASSUMPTIONS.initialStoreFraction, basis: 'assumed' };
    }
    const loss = ASSUMPTIONS.bareSoilFactor * referenceEtMmPerDay(latitude, month, obs.tMean) * daysInMonth(year, month);
    store = Math.max(0, Math.min(capacity, store + effectiveRainfallMm(obs.rainMm) - loss));
  }
  return { storeMm: store, basis: 'observed-rain' };
}

/** Day-weighted crop factor and dominant growth stage for each 30-day month. */
export function monthlyCropFactors(crop) {
  const months = Math.ceil(crop.seasonDays / ASSUMPTIONS.daysPerSimMonth);
  const stageOfDay = [];
  crop.stageDays.forEach((length, stage) => { for (let d = 0; d < length; d += 1) stageOfDay.push(stage); });
  return Array.from({ length: months }, (_, m) => {
    const days = stageOfDay.slice(m * 30, m * 30 + 30);
    const counts = [0, 0, 0, 0];
    days.forEach((stage) => { counts[stage] += 1; });
    const kc = days.reduce((sum, stage) => sum + crop.kc[stage], 0) / days.length;
    const dominant = counts.indexOf(Math.max(...counts));
    return { kc, stageId: GROWTH_STAGES[dominant].id, cropDays: days.length };
  });
}

/** Calendar months covered by a season. */
export function seasonMonths(startYear, plantingMonth, crop) {
  const count = Math.ceil(crop.seasonDays / ASSUMPTIONS.daysPerSimMonth);
  return Array.from({ length: count }, (_, index) => {
    const zero = plantingMonth - 1 + index;
    return { year: startYear + Math.floor(zero / 12), month: (zero % 12) + 1 };
  });
}

/**
 * @param {object} input
 * @param {object} input.crop        entry from GAME_CROPS
 * @param {number} input.latitude
 * @param {number} input.startYear
 * @param {number} input.plantingMonth 1–12
 * @param {object} input.decisions   { irrigationLevel, irrigationMethod }
 * @param {Record<string, {tMean:number|null, tMax:number|null, rainMm:number|null, soilWetness:number|null}>} input.observations keyed "YYYY-MM"
 * @returns {{ok:true, months:object[], totals:object}|{ok:false, reason:string, missing:string[]}}
 */
export function simulateSeason({ crop, latitude, startYear, plantingMonth, decisions, observations }) {
  const level = IRRIGATION_LEVELS.find((item) => item.id === decisions?.irrigationLevel) || IRRIGATION_LEVELS[0];
  const method = IRRIGATION_METHODS.find((item) => item.id === decisions?.irrigationMethod) || IRRIGATION_METHODS[0];
  const calendar = seasonMonths(startYear, plantingMonth, crop);
  const factors = monthlyCropFactors(crop);

  const missing = calendar
    .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`)
    .filter((key) => !Number.isFinite(observations?.[key]?.tMean) || !Number.isFinite(observations?.[key]?.rainMm));
  if (missing.length) return { ok: false, reason: 'missing-observations', missing };

  const initial = preSeasonStore({ latitude, startYear, plantingMonth, observations });
  let store = initial.storeMm;
  const months = calendar.map(({ year, month }, index) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const obs = observations[key];
    const { kc, stageId, cropDays } = factors[index];
    const etoPerDay = referenceEtMmPerDay(latitude, month, obs.tMean);
    const cropNeed = kc * etoPerDay * cropDays;
    const effectiveRain = effectiveRainfallMm(obs.rainMm);
    const storeStart = store;
    const gap = Math.max(0, cropNeed - effectiveRain - storeStart);
    const irrigationNet = level.fraction * gap;
    const irrigationGross = irrigationNet / method.efficiency;
    const available = effectiveRain + storeStart + irrigationNet;
    const cropUse = Math.min(cropNeed, available);
    const leftover = available - cropUse;
    store = Math.min(ASSUMPTIONS.soilStoreCapacityMm, leftover);
    const stress = cropNeed > 0 ? 1 - cropUse / cropNeed : 0;
    // No verified per-crop temperature thresholds exist in the crop data, so months are never flagged.
    const temperatureFlag = 'ok';
    return {
      key, year, month, index, stageId,
      // observed (NASA POWER)
      tMean: obs.tMean, tMax: Number.isFinite(obs.tMax) ? obs.tMax : null, rainMm: round1(obs.rainMm),
      soilWetness: Number.isFinite(obs.soilWetness) ? obs.soilWetness : null,
      daysInMonth: daysInMonth(year, month),
      // derived (educational model)
      kc: Math.round(kc * 100) / 100,
      etoMmPerDay: round1(etoPerDay),
      cropNeedMm: round1(cropNeed),
      effectiveRainMm: round1(effectiveRain),
      soilStoreStartMm: round1(storeStart),
      soilStoreEndMm: round1(store),
      drainageMm: round1(Math.max(0, leftover - ASSUMPTIONS.soilStoreCapacityMm)),
      irrigationNetMm: round1(irrigationNet),
      irrigationGrossMm: round1(irrigationGross),
      cropUseMm: round1(cropUse),
      unmetNeedMm: round1(cropNeed - cropUse),
      stress: Math.round(stress * 1000) / 1000,
      temperatureFlag,
    };
  });

  const sum = (field) => round1(months.reduce((total, item) => total + item[field], 0));
  const cropNeedMm = sum('cropNeedMm');
  const cropUseMm = sum('cropUseMm');
  const supplyRatio = cropNeedMm > 0 ? Math.min(1, cropUseMm / cropNeedMm) : 1;
  const relativeYield = Math.max(0, Math.min(1, 1 - crop.ky * (1 - supplyRatio)));
  const irrigationGrossMm = sum('irrigationGrossMm');
  return {
    ok: true,
    months,
    totals: {
      rainMm: sum('rainMm'),
      effectiveRainMm: sum('effectiveRainMm'),
      cropNeedMm,
      cropUseMm,
      unmetNeedMm: round1(cropNeedMm - cropUseMm),
      irrigationNetMm: sum('irrigationNetMm'),
      irrigationGrossMm,
      // 1 mm over 1 hectare = 10 m³
      irrigationM3PerHa: Math.round(irrigationGrossMm * 10),
      supplyRatio: Math.round(supplyRatio * 1000) / 1000,
      relativeYield: Math.round(relativeYield * 1000) / 1000,
      stressedMonths: months.filter((item) => item.stress >= 0.2).length,
      meanTempC: round1(months.reduce((total, item) => total + item.tMean, 0) / months.length),
      irrigationLevel: level.id,
      irrigationMethod: method.id,
      initialStoreMm: round1(initial.storeMm),
      initialStoreBasis: initial.basis,
    },
  };
}

export function stressLevel(stress) {
  if (stress < 0.1) return 'none';
  if (stress < 0.3) return 'mild';
  if (stress < 0.6) return 'moderate';
  return 'severe';
}
