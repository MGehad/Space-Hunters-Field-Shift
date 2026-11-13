/**
 * Risk screening must not infer a hazard level from climatology without crop,
 * local, and validated thresholds. This function reports evidence and gaps.
 */
export function assessEnvironmentalRisk({ observations = [], farmLocation = null, farmInputs = {}, strategies = [] } = {}) {
  const reference = observations.filter((item) => item?.source?.dataKind === 'reference' && Number.isFinite(item.value));
  const monthlyReference = reference.filter((item) => String(item.referenceDate || '').startsWith('climatology:'));
  const rangeFor = (variable) => {
    const values = monthlyReference.filter((item) => item.variable === variable);
    if (values.length < 2) return null;
    const numbers = values.map((item) => item.value);
    return { min: Math.min(...numbers), max: Math.max(...numbers), unit: values[0].unit, coverage: values[0].temporalCoverage, source: values[0].source };
  };
  const risks = [
    { id: 'water-stress', label: 'Water stress', labelAr: 'الإجهاد المائي', level: 'unassessed', evidence: rangeFor('PRECTOTCORR'), reason: 'Rainfall climatology alone cannot establish crop or farm water stress; soil moisture, crop stage, irrigation, and thresholds are unavailable.', reasonAr: 'المتوسطات المناخية للأمطار لا تكفي وحدها لتحديد الإجهاد المائي؛ يلزم توافر رطوبة التربة ومرحلة نمو المحصول ونظام الري وحدود معتمدة.' },
    { id: 'heat-stress', label: 'Heat stress', labelAr: 'الإجهاد الحراري', level: 'unassessed', evidence: rangeFor('T2M'), reason: 'Air-temperature climatology is exposure context, not crop heat stress; crop-specific thresholds and planting dates are unavailable.', reasonAr: 'متوسط حرارة الهواء يصف التعرّض العام ولا يكفي لتحديد الإجهاد الحراري؛ يلزم معرفة مواعيد الزراعة وحدود تحمّل كل محصول.' },
    { id: 'rainfall-variability', label: 'Rainfall variability', labelAr: 'تذبذب الأمطار', level: 'unassessed', evidence: rangeFor('PRECTOTCORR'), reason: 'Monthly climatological seasonality is not year-to-year rainfall variability; this requires analysis of a multi-year time series.', reasonAr: 'المتوسط الشهري لا يبيّن تذبذب الأمطار من عام إلى آخر؛ يتطلب ذلك تحليل سلسلة زمنية متعددة السنوات.' },
    { id: 'vegetation-stress', label: 'Vegetation stress', labelAr: 'إجهاد الغطاء النباتي', level: 'unassessed', evidence: null, reason: 'MODIS NDVI is available in the environmental step as context only; no validated thresholds are available to classify stress.', reasonAr: 'يتوافر مؤشر NDVI في خطوة الظروف البيئية للسياق فقط، ولا تتوافر حدود معتمدة لتصنيف الإجهاد.' },
    { id: 'erosion', label: 'Soil erosion potential', labelAr: 'انجراف التربة', level: 'unassessed', evidence: null, reason: 'Slope, soil erodibility, ground cover, and rainfall intensity inputs are unavailable.', reasonAr: 'بيانات ميل الأرض وقابلية التربة للانجراف والغطاء الأرضي وشدة الأمطار غير متاحة.' },
    { id: 'crop-suitability', label: 'Crop suitability risk', labelAr: 'مخاطر ملاءمة المحصول', level: 'unassessed', evidence: null, reason: 'Local crop calendar, soil response, and validated crop-specific heat/water limits are unavailable.', reasonAr: 'لا تتوافر مواعيد زراعة محلية ولا استجابة التربة ولا حدود معتمدة خاصة بكل محصول.' },
    { id: 'seasonal-vulnerability', label: 'Seasonal vulnerability', labelAr: 'الحساسية الموسمية', level: 'unassessed', evidence: rangeFor('T2M'), reason: 'The reference shows month-of-year climate patterns, but no verified planting/harvest dates connect them to crop stages.', reasonAr: 'البيانات تبيّن النمط المناخي الشهري، ولا تتوافر مواعيد زراعة وحصاد مؤكَّدة لربطه بمراحل نمو المحصول.' },
  ];
  const source = monthlyReference[0]?.source || null;
  return {
    risks,
    classification: 'unassessed',
    method: 'Evidence screening only. Risk classes require local thresholds and compatible observations; no forecast or probability is produced.',
    source,
    spatial: {
      status: 'point-reference-only',
      farmGeometry: farmLocation?.geometry || null,
      location: farmLocation ? { latitude: farmLocation.latitude, longitude: farmLocation.longitude } : null,
      explanation: farmLocation?.selectionMethod === 'polygon-boundary'
        ? 'Farm polygon is retained as geometry; POWER values are centroid-point reference only. No spatial aggregation or zone layer is supported.'
        : 'Selected coordinate is a reference point only. POWER climatology is not a field-scale risk surface; no colored risk zones are supported.',
    },
    dataKind: source ? 'historical-climatological-reference' : 'unavailable',
    temporalCoverage: source?.temporalCoverage || null,
    spatialResolution: source?.spatialResolution || null,
    strategyCount: strategies.length,
    farmInputs,
  };
}
