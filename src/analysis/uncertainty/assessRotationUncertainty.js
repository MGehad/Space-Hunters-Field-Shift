const CORE_CROP_EVIDENCE = ['cropWaterNeed', 'family', 'droughtSensitivity', 'nitrogenFixationPotential'];

/** Qualitative data-completeness assessment; deliberately does not output confidence percentages. */
export function assessRotationUncertainty({ strategy = null, evaluation = null, farmLocation = null, environmentalObservations = [] } = {}) {
  const crops = strategy?.crops || [];
  const knownCropEvidence = crops.reduce((total, crop) => total + CORE_CROP_EVIDENCE.filter((key) => {
    if (key === 'cropWaterNeed') return Boolean(crop?.cropWaterNeed?.source);
    if (key === 'family') return Boolean(crop?.family && crop?.familyEvidence?.url);
    if (key === 'droughtSensitivity') return Boolean(crop?.droughtSensitivity && crop?.droughtSensitivitySource?.url);
    return Boolean(crop?.nitrogenFixationSource?.url && crop?.nitrogenFixationPotential);
  }).length, 0);
  const requiredCropEvidence = crops.length * CORE_CROP_EVIDENCE.length;
  const climatology = environmentalObservations.filter((item) => item?.source?.dataKind === 'reference');
  const source = climatology[0]?.source || null;
  const temporalCoverage = source?.temporalCoverage || null;
  const yearRange = String(temporalCoverage || '').match(/^(\d{4})[–-](\d{4})$/);
  const spatialResolution = climatology[0]?.spatialResolution || source?.spatialResolution || null;
  const quality = climatology[0]?.quality || null;
  const sourceLimitations = source?.limitations || ['Environmental source data is unavailable.'];
  const scored = evaluation?.scoredCriteria || [];
  const completeness = requiredCropEvidence && knownCropEvidence === requiredCropEvidence && scored.length >= 4 ? 'Moderate data completeness' : 'Limited evidence';
  const missing = [
    ...(!farmLocation ? ['Farm coordinate or boundary is not selected.'] : []),
    ...(!evaluation?.farmInputs?.baselineConfirmed ? ['Existing baseline rotation may be an unconfirmed template.'] : []),
    'Local planting and harvest dates are not verified.',
    'Soil-specific crop response, ground cover, erosion, and market data are unavailable.',
    'Crop-specific heat and water stress thresholds are not calibrated for this farm.',
    'No integrated dated multi-year observation series or forecast is available.',
    ...(farmLocation?.selectionMethod === 'polygon-boundary' ? ['Environmental data is a representative-point/centroid sample; no area aggregation is performed.'] : ['A point reference does not describe field-wide variability.']),
  ];
  const missingAr = [
    ...(!farmLocation ? ['لم يُحدَّد موقع المزرعة أو حدودها.'] : []),
    ...(!evaluation?.farmInputs?.baselineConfirmed ? ['الدورة الحالية قد تكون نموذجًا افتراضيًا لم يُؤكَّد أنه الدورة الفعلية للمزرعة.'] : []),
    'مواعيد الزراعة والحصاد المحلية غير مسجَّلة.',
    'بيانات التربة والغطاء الأرضي والسوق غير متاحة.',
    'حدود تحمّل المحاصيل للحرارة ونقص المياه غير معايَرة على ظروف المزرعة.',
    'لا تتوافر سلسلة زمنية يومية أو تنبؤات جوية.',
    ...(farmLocation?.selectionMethod === 'polygon-boundary' ? ['القيم البيئية مأخوذة من نقطة مركز الحدود، وليست متوسطًا للمساحة كلها.'] : ['النقطة المرجعية الواحدة لا تمثّل تباين الظروف داخل المزرعة.']),
  ];
  return {
    overall: completeness,
    overallAr: completeness === 'Moderate data completeness' ? 'اكتمال متوسط للبيانات' : 'اكتمال محدود للبيانات',
    basis: 'Qualitative completeness rubric: moderate means sourced evidence supports the displayed crop-trait comparison, while important farm-specific inputs remain absent; limited means core evidence is missing. This is not a statistical confidence estimate.',
    basisAr: 'تقييم نوعي لاكتمال البيانات: «متوسط» يعني أن الأدلة الموثَّقة تدعم المقارنة المعروضة لخصائص المحاصيل مع غياب مدخلات مهمة خاصة بالمزرعة. وليس هذا مقياسًا إحصائيًا للثقة.',
    cropEvidence: { status: completeness, sourcedTraitCount: knownCropEvidence, expectedTraitCount: requiredCropEvidence, traits: CORE_CROP_EVIDENCE },
    environmentalEvidence: {
      status: climatology.length ? 'Limited evidence' : 'Unavailable',
      observationCount: climatology.length,
      kind: climatology.length ? 'Monthly climatological reference, not a dated observation or forecast' : 'No environmental source records available',
      kindAr: climatology.length ? 'مرجع مناخي شهري طويل الأجل، وليس رصدًا مؤرَّخًا ولا تنبؤًا' : 'لا تتوافر بيانات بيئية',
      dataset: source?.dataset || null,
      provider: source?.provider || null,
      sourceUrl: source?.url || null,
      temporalCoverage: source?.temporalCoverage || null,
      temporalCoverageAr: temporalCoverage ? (yearRange ? `الفترة: ${yearRange[1]}–${yearRange[2]}` : 'الفترة المناخية الافتراضية من المصدر') : null,
      temporalResolution: climatology[0]?.temporalResolution || null,
      temporalResolutionAr: climatology.length ? 'متوسط مناخي شهري' : null,
      spatialResolution,
      spatialResolutionAr: spatialResolution ? 'تختلف بحسب المتغيّر، وتمثّل خلية شبكية واسعة لا الحقل نفسه.' : null,
      retrievalDate: source?.retrievedAt || null,
      quality,
      qualityAr: quality ? (quality.startsWith('Missing') ? 'قيمة ناقصة في بيانات NASA POWER' : 'قيمة جاهزة من NASA POWER دون فحص إضافي للجودة') : null,
      limitations: sourceLimitations,
      limitationsAr: climatology.length ? [
        'مرجع مناخي طويل الأجل، وليس طقسًا آنيًا ولا قياسًا حقليًا ولا تنبؤًا.',
        'القيم تخص خلية شبكية واسعة، وليست متوسطًا لحدود المزرعة.',
        'القيم مأخوذة من المصدر مباشرة دون مراجعة إضافية.',
      ] : ['البيانات البيئية غير متاحة حاليًا.'],
    },
    missingInputs: missing,
    missingInputsAr: missingAr,
    assumptions: strategy?.assumptions || [],
    improvementNeeds: ['Confirm and document the existing rotation.', 'Provide local planting/harvest calendar, soil test and irrigation availability.', 'Add compatible dated historical rainfall/temperature and field-scale soil-moisture/vegetation products.', 'Provide crop-specific locally validated heat, water and soil response thresholds.', 'Add verified market, equipment and ground-cover constraints.'],
    improvementNeedsAr: ['تأكيد الدورة الزراعية الفعلية الحالية.', 'إضافة مواعيد الزراعة والحصاد المحلية وتحليل التربة وحالة مصادر المياه.', 'إضافة سلاسل زمنية مؤرَّخة للحرارة والأمطار وبيانات أقمار صناعية أعلى دقة للمزرعة.', 'تحديد حدود تحمّل كل محصول للحرارة ونقص المياه في ظروف الموقع.', 'تحديد ظروف السوق والمعدات المتاحة.'],
    confidence: null,
  };
}
