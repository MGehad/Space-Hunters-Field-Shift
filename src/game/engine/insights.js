/**
 * Turns simulation numbers into short bilingual explanations. Every sentence
 * is selected by a rule on the experiment's own values, so the characters
 * only say what the data and the model actually show.
 */
import { stressLevel, IRRIGATION_LEVELS, IRRIGATION_METHODS, ASSUMPTIONS } from './simulate.js';

export const MONTH_NAMES = Object.freeze({
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  enShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
});
export const monthLabel = (lang, month, year) => `${MONTH_NAMES[lang === 'ar' ? 'ar' : 'en'][month - 1]}${year ? ` ${year}` : ''}`;
const n = (value) => (Math.round(value * 10) / 10).toString();
const pct = (value) => `${Math.round(value * 100)}%`;
const line = (speaker, en, ar) => ({ speaker, en, ar });

export const STRESS_LABELS = Object.freeze({
  none: { en: 'No water stress', ar: 'لا إجهاد مائي' },
  mild: { en: 'Mild water stress', ar: 'إجهاد مائي خفيف' },
  moderate: { en: 'Moderate water stress', ar: 'إجهاد مائي متوسط' },
  severe: { en: 'Severe water stress', ar: 'إجهاد مائي شديد' },
});

/** Comments for one simulated month. */
export function monthComments(month, previous, crop, isLast) {
  const out = [];
  const level = stressLevel(month.stress);
  const rainShare = month.cropNeedMm > 0 ? month.effectiveRainMm / month.cropNeedMm : 1;

  // Assistant: what the observations and the water balance show.
  if (month.rainMm < 5) {
    out.push(line('assistant',
      `POWER shows almost no precipitation this month (${n(month.rainMm)} mm). The crop's estimated need was ${n(month.cropNeedMm)} mm, so it had to come from stored soil water or irrigation.`,
      `تُظهر بيانات POWER أن الهطول شبه معدوم هذا الشهر (${n(month.rainMm)} مم). واحتاج المحصول إلى نحو ${n(month.cropNeedMm)} مم، فلزم تأمينها من مخزون التربة أو الري.`));
  } else if (rainShare >= 1) {
    out.push(line('assistant',
      `Rain was enough this month: about ${n(month.effectiveRainMm)} mm of the ${n(month.rainMm)} mm recorded is counted as usable, against an estimated need of ${n(month.cropNeedMm)} mm.`,
      `الأمطار كانت كافية هذا الشهر: استفاد المحصول من نحو ${n(month.effectiveRainMm)} مم من أصل ${n(month.rainMm)} مم، واحتياجه ${n(month.cropNeedMm)} مم.`));
  } else {
    out.push(line('assistant',
      `Usable rain covered about ${pct(rainShare)} of the crop's estimated need (${n(month.effectiveRainMm)} of ${n(month.cropNeedMm)} mm). The rest depends on soil water and irrigation.`,
      `غطّت الأمطار الفعّالة نحو ${pct(rainShare)} من احتياج المحصول (${n(month.effectiveRainMm)} من ${n(month.cropNeedMm)} مم). ويلزم تعويض الباقي من مخزون التربة أو الري.`));
  }

  if (previous && month.cropNeedMm > previous.cropNeedMm * 1.25 && month.stageId !== previous.stageId) {
    out.push(line('assistant',
      `Water need rose from ${n(previous.cropNeedMm)} to ${n(month.cropNeedMm)} mm because the crop entered a new growth stage with more leaf area.`,
      `ارتفع الاحتياج المائي للمحصول من ${n(previous.cropNeedMm)} إلى ${n(month.cropNeedMm)} مم لدخوله مرحلة نمو جديدة واتساع غطائه الورقي.`));
  }

  if (month.irrigationNetMm > 0) {
    out.push(line('assistant',
      `Your irrigation plan supplied ${n(month.irrigationNetMm)} mm to the roots. With your method, about ${n(month.irrigationGrossMm)} mm had to be delivered to achieve that.`,
      `أوصلت خطة الري ${n(month.irrigationNetMm)} مم إلى جذور المحصول، وبسبب كفاءة طريقة الري لزمت إضافة نحو ${n(month.irrigationGrossMm)} مم.`));
  } else if (month.soilStoreStartMm - month.soilStoreEndMm > 20) {
    out.push(line('assistant',
      `The crop drew down stored soil water, from about ${n(month.soilStoreStartMm)} to ${n(month.soilStoreEndMm)} mm in the model.`,
      `سحب المحصول من مخزون ماء التربة فانخفض من ${n(month.soilStoreStartMm)} إلى ${n(month.soilStoreEndMm)} مم في الحساب.`));
  }

  // Farmer: what it means in the field.
  const sensitive = month.stageId === 'mid';
  if (level === 'severe') {
    out.push(line('farmer',
      sensitive ? 'This is the worst time to be short of water — the crop is flowering and filling grain. I would expect to see it wilting by midday.' : 'The plants are badly short of water. Leaves roll up and growth stalls in a month like this.',
      sensitive ? 'هذا أسوأ توقيت للإجهاد المائي: مرحلة التزهير وامتلاء الحبوب. سيذبل المحصول في ساعات الظهيرة.' : 'المحصول يعاني إجهادًا مائيًا شديدًا: تلتف الأوراق ويتوقف النمو في شهر جاف كهذا.'));
  } else if (level === 'moderate') {
    out.push(line('farmer',
      sensitive ? 'The crop is thirsty right when it matters. If I had water, this is the month I would use it.' : 'The field is drier than I would like. It can recover if next month is kinder.',
      sensitive ? 'المحصول يعاني نقص الماء في أهم مرحلة. لو توافر الماء لكان هذا الشهر أولى الأشهر بالري.' : 'التربة جافة نسبيًا، لكن المحصول قد يتعافى إذا كان الشهر التالي أفضل.'));
  } else if (level === 'mild') {
    out.push(line('farmer', 'A little short of water, but nothing I would lose sleep over yet.', 'إجهاد مائي خفيف لا يدعو إلى القلق بعد.'));
  } else if (isLast) {
    out.push(line('farmer', 'The crop is drying down and nearly ready. Time to look back at the whole season.', 'المحصول يجفّ ويقترب من الحصاد. لنراجع حصيلة الموسم.'));
  } else if (month.irrigationNetMm > 0) {
    out.push(line('farmer', 'The irrigation kept the field in good shape this month.', 'أبقى الري الحقل في حالة جيدة هذا الشهر.'));
  } else {
    out.push(line('farmer', 'The field had the water it needed this month without any help from me.', 'نالت التربة كفايتها من الماء هذا الشهر دون ري.'));
  }
  return out;
}

/** Lessons and suggestions for the final report. */
export function seasonLessons(result, crop) {
  const { totals, months } = result;
  const lessons = [];
  const next = [];
  const peak = months.reduce((a, b) => (b.cropNeedMm > a.cropNeedMm ? b : a));
  const worst = months.reduce((a, b) => (b.stress > a.stress ? b : a));
  const rainShare = totals.cropNeedMm > 0 ? totals.effectiveRainMm / totals.cropNeedMm : 1;

  lessons.push(line('assistant',
    `Usable rain equalled about ${pct(Math.min(1, rainShare))} of the crop's estimated seasonal need (${n(totals.effectiveRainMm)} of ${n(totals.cropNeedMm)} mm).`,
    `غطّت الأمطار الفعّالة نحو ${pct(Math.min(1, rainShare))} من احتياج المحصول خلال الموسم (${n(totals.effectiveRainMm)} من أصل ${n(totals.cropNeedMm)} مم).`));
  lessons.push(line('assistant',
    `Water need peaked in ${monthLabel('en', peak.month)} at ${n(peak.cropNeedMm)} mm, during the crop's most demanding stage.`,
    `بلغ الاحتياج المائي للمحصول ذروته في شهر ${monthLabel('ar', peak.month)} (${n(peak.cropNeedMm)} مم).`));
  if (worst.stress >= 0.1) {
    lessons.push(line('assistant',
      `The largest shortfall was in ${monthLabel('en', worst.month)}: the crop received about ${pct(1 - worst.stress)} of its estimated need.`,
      `كان ${monthLabel('ar', worst.month)} أشد الأشهر إجهادًا مائيًا: حصل المحصول على نحو ${pct(1 - worst.stress)} فقط من احتياجه.`));
  } else {
    lessons.push(line('assistant', 'The modeled crop was never meaningfully short of water this season.', 'لم يتعرّض المحصول لإجهاد مائي يُذكر خلال هذا الموسم.'));
  }
  if (totals.irrigationGrossMm > 0) {
    const method = IRRIGATION_METHODS.find((item) => item.id === totals.irrigationMethod);
    lessons.push(line('assistant',
      `Irrigation delivered ${n(totals.irrigationGrossMm)} mm (about ${totals.irrigationM3PerHa.toLocaleString('en')} m³ per hectare) to put ${n(totals.irrigationNetMm)} mm at the roots, at an assumed efficiency of ${pct(method.efficiency)}.`,
      `أضاف الري ${n(totals.irrigationGrossMm)} مم (نحو ${totals.irrigationM3PerHa.toLocaleString('en')} م³ للهكتار) لإيصال ${n(totals.irrigationNetMm)} مم إلى الجذور بكفاءة ${pct(method.efficiency)}.`));
  }

  // Suggestions are framed as experiments to try, not advice.
  if (totals.irrigationLevel === 'rainfed' && totals.relativeYield < 0.85) {
    next.push(line('assistant', 'Try deficit irrigation and see how much water it takes to close most of the gap.', 'جرّب الري الناقص، ولاحظ كمية المياه اللازمة لتعويض معظم الإجهاد.'));
  }
  if (totals.irrigationLevel !== 'rainfed' && totals.irrigationMethod !== 'drip') {
    next.push(line('assistant', 'Repeat with a more efficient irrigation method and compare the water delivered.', 'أعد التجربة بطريقة ري أعلى كفاءة (كالتنقيط) وقارن كمية المياه المضافة.'));
  }
  if (totals.irrigationLevel === 'full') {
    next.push(line('assistant', 'Try deficit irrigation: how much water is saved, and what does the model say it costs?', 'جرّب الري الناقص: كم يوفّر من المياه، وهل تنخفض الإنتاجية؟'));
  }
  if (worst.stress >= 0.3 && worst.stageId === 'mid') {
    next.push(line('assistant', 'Shift the planting month by one and check whether the thirstiest stage lines up with wetter months.', 'قدّم شهر الزراعة أو أخّره شهرًا واحدًا، ولاحظ هل تتوافق فترة ذروة الاحتياج مع أشهر الأمطار.'));
  }
  next.push(line('assistant', 'Run the same setup in a different year to see how much the season itself matters.', 'جرّب الاختيارات نفسها في سنة أخرى لمعرفة أثر المناخ وحده.'));
  next.push(line('assistant', `Try another crop in the same place and year and compare it with ${crop.nameEn.toLowerCase()}.`, `جرّب محصولًا آخر في الموقع نفسه والسنة نفسها، وقارنه بمحصول ${crop.nameAr}.`));
  return { lessons, next: next.slice(0, 4) };
}

/** Structured comparison of two saved experiments. */
export function compareExperiments(a, b) {
  const sameRegion = a.countryId === b.countryId && a.regionId === b.regionId;
  const samePeriod = a.startYear === b.startYear && a.plantingMonth === b.plantingMonth;
  const sameCrop = a.cropId === b.cropId;
  const sameDecisions = a.decisions.irrigationLevel === b.decisions.irrigationLevel && a.decisions.irrigationMethod === b.decisions.irrigationMethod;
  const changed = [];
  if (!sameRegion) changed.push({ en: 'location', ar: 'الموقع' });
  if (!samePeriod) changed.push({ en: 'period', ar: 'الفترة' });
  if (!sameCrop) changed.push({ en: 'crop', ar: 'المحصول' });
  if (!sameDecisions) changed.push({ en: 'irrigation decisions', ar: 'قرارات الري' });

  const notes = [];
  if (changed.length === 0) {
    notes.push({ tone: 'info', en: 'These two experiments use identical inputs, so their results are identical.', ar: 'التجربتان متطابقتا الاختيارات، ولذلك تطابقت النتيجة.' });
  } else if (changed.length === 1) {
    notes.push({ tone: 'good', en: `Only the ${changed[0].en} differs, so differences in the results can be attributed to it within this model.`, ar: `الفرق الوحيد هو ${changed[0].ar}، ولذلك يُعزى أي اختلاف في النتيجة إلى هذا التغيير.` });
  } else {
    notes.push({ tone: 'warn', en: `Several things differ (${changed.map((c) => c.en).join(', ')}), so the results cannot be attributed to any single one of them.`, ar: `تغيّر أكثر من عامل (${changed.map((c) => c.ar).join('، ')})، ولذلك لا يمكن عزو الفرق إلى عامل بعينه.` });
  }
  if (!sameRegion) notes.push({ tone: 'warn', en: 'The locations differ: climate, day length and real soils are different, while the model assumes the same soil for both.', ar: 'الموقعان مختلفان في المناخ وطول النهار والتربة الفعلية، لكن الحساب يفترض التربة نفسها لهما.' });
  if (!sameCrop) notes.push({ tone: 'info', en: 'Relative yield is measured against each crop\'s own potential, so it compares how well each crop was supplied with water — not which produces more.', ar: 'الإنتاجية النسبية تقيس مدى تلبية الاحتياج المائي لكل محصول، ولا تدل على أي المحصولين أعلى غلة.' });
  if (a.months.length !== b.months.length) notes.push({ tone: 'info', en: 'The seasons have different lengths, so monthly charts are aligned by month since planting.', ar: 'يختلف طول الموسمين، ولذلك رُتّبت الرسوم البيانية من شهر الزراعة.' });
  notes.push({ tone: 'info', en: `Both use NASA POWER monthly data and the same educational model (soil store ${ASSUMPTIONS.soilStoreCapacityMm} mm).`, ar: `التجربتان مبنيتان على بيانات NASA POWER الشهرية وعلى الحساب التعليمي نفسه (سعة مخزون التربة ${ASSUMPTIONS.soilStoreCapacityMm} مم).` });

  const d = (field) => Math.round((b.totals[field] - a.totals[field]) * 10) / 10;
  const differences = [];
  const rain = d('rainMm');
  if (Math.abs(rain) >= 10) differences.push({ en: `Experiment B's season had ${n(Math.abs(rain))} mm ${rain > 0 ? 'more' : 'less'} precipitation in the POWER record.`, ar: `كان الهطول في التجربة (ب) ${rain > 0 ? 'أعلى' : 'أقل'} بمقدار ${n(Math.abs(rain))} مم في سجل POWER.` });
  const need = d('cropNeedMm');
  if (Math.abs(need) >= 10) differences.push({ en: `Estimated crop water need was ${n(Math.abs(need))} mm ${need > 0 ? 'higher' : 'lower'} in B.`, ar: `كان الاحتياج المائي للمحصول ${need > 0 ? 'أعلى' : 'أقل'} بمقدار ${n(Math.abs(need))} مم في التجربة (ب).` });
  const irrigation = d('irrigationGrossMm');
  if (Math.abs(irrigation) >= 5) differences.push({ en: `B delivered ${n(Math.abs(irrigation))} mm ${irrigation > 0 ? 'more' : 'less'} irrigation water (${Math.abs(Math.round(irrigation * 10)).toLocaleString('en')} m³/ha).`, ar: `استهلكت التجربة (ب) مياه ري ${irrigation > 0 ? 'أكثر' : 'أقل'} بمقدار ${n(Math.abs(irrigation))} مم (${Math.abs(Math.round(irrigation * 10)).toLocaleString('en')} م³/هكتار).` });
  const yieldDiff = Math.round((b.totals.relativeYield - a.totals.relativeYield) * 100);
  if (Math.abs(yieldDiff) >= 1) differences.push({ en: `Estimated relative yield was ${Math.abs(yieldDiff)} percentage points ${yieldDiff > 0 ? 'higher' : 'lower'} in B.`, ar: `كانت الإنتاجية النسبية ${yieldDiff > 0 ? 'أعلى' : 'أقل'} بمقدار ${Math.abs(yieldDiff)}% في التجربة (ب).` });
  if (sameRegion && samePeriod && sameCrop && !sameDecisions && Math.abs(irrigation) >= 5 && Math.abs(yieldDiff) < 1) {
    differences.push({ en: 'The crop received the same water at the roots in both; only the amount delivered changed. That is the effect of irrigation efficiency.', ar: 'حصل المحصول على كمية الماء نفسها عند الجذور في التجربتين، وإنما تغيّرت كمية المياه المضافة بسبب كفاءة طريقة الري.' });
  }
  if (!differences.length) differences.push({ en: 'No meaningful differences in the main indicators.', ar: 'لا توجد فروق واضحة في النتائج الرئيسة.' });
  return { notes, differences, changed };
}

export const decisionLabel = (lang, decisions) => {
  const level = IRRIGATION_LEVELS.find((item) => item.id === decisions.irrigationLevel) || IRRIGATION_LEVELS[0];
  const method = IRRIGATION_METHODS.find((item) => item.id === decisions.irrigationMethod) || IRRIGATION_METHODS[0];
  const ar = lang === 'ar';
  if (level.id === 'rainfed') return ar ? level.nameAr : level.nameEn;
  return `${ar ? level.nameAr : level.nameEn} · ${ar ? method.nameAr : method.nameEn}`;
};
