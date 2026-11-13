/**
 * Crop parameters used by the educational simulation.
 *
 * Every number is a general, published planning value, not a local
 * calibration. Checked against the live FAO pages on 2026-11-12:
 *  - Growth-stage lengths and crop factors (Kc): FAO Irrigation Water
 *    Management Training Manual No. 3, "Crop Water Needs", Tables 6–8.
 *  - Rice stage lengths and Kc (1.05 initial, 1.20 mid, 0.90–0.60 end):
 *    FAO Irrigation and Drainage Paper 56, Tables 11 and 12. The development
 *    value 1.10 and the late value 0.75 are this game's interpolation/midpoint.
 *  - Indicative seasonal water need: "Crop Water Needs", Table 14.
 *  - Yield response factor (Ky): seasonal values of FAO Paper 33 as reprinted
 *    in FAO Paper 56, Table 24 (winter wheat 1.05, maize 1.25, beans 1.15,
 *    sunflower 0.95, sorghum 0.9, soybean 0.85). That table has no value for
 *    rice, so the rice Ky is an assumption of this game and is labelled so.
 * No temperature thresholds are stored: we found no per-crop values we could
 * verify, so the simulation does not flag months as too hot or too cool.
 */
export const GAME_CROP_SOURCES = Object.freeze([
  { id: 'fao-cwn', name: 'FAO Irrigation Water Management Training Manual No. 3 — Crop Water Needs', url: 'https://www.fao.org/4/S2022E/s2022e07.htm' },
  { id: 'fao-56-kc', name: 'FAO Irrigation and Drainage Paper 56 — Chapter 6, crop coefficients and stage lengths (Tables 11 and 12)', url: 'https://www.fao.org/4/X0490E/x0490e0b.htm' },
  { id: 'fao-56-ky', name: 'FAO Irrigation and Drainage Paper 56 — Chapter 8, Table 24: seasonal yield response factors (Ky) from FAO Paper 33', url: 'https://www.fao.org/4/X0490E/x0490e0e.htm' },
]);

export const GROWTH_STAGES = Object.freeze([
  { id: 'initial', nameEn: 'Establishment', nameAr: 'بداية الزراعة والإنبات', descEn: 'Seeds germinate and young plants cover little ground, so water use is low.', descAr: 'البادرات صغيرة ولا تغطي التربة، فاستهلاك الماء منخفض.' },
  { id: 'development', nameEn: 'Vegetative growth', nameAr: 'النمو الخضري', descEn: 'Leaves expand quickly and water use rises month by month.', descAr: 'يتسع الغطاء الورقي سريعًا ويزداد استهلاك الماء شهرًا بعد شهر.' },
  { id: 'mid', nameEn: 'Flowering and grain filling', nameAr: 'التزهير وامتلاء الحبوب', descEn: 'Full canopy: water use peaks and shortages matter most.', descAr: 'اكتمل نمو المحصول: هنا يبلغ استهلاك الماء ذروته، ويكون أثر الإجهاد المائي أشد ما يكون.' },
  { id: 'late', nameEn: 'Ripening', nameAr: 'النضج والحصاد', descEn: 'The crop dries down toward harvest and needs less water.', descAr: 'يجفّ المحصول استعدادًا للحصاد ويقل احتياجه للماء.' },
]);

const crop = (c) => Object.freeze({ ...c, seasonDays: c.stageDays.reduce((a, b) => a + b, 0) });

export const GAME_CROPS = Object.freeze([
  crop({
    id: 'wheat', icon: '🌾', image: '/images/crop_wheat.jpg',
    nameEn: 'Wheat', nameAr: 'القمح',
    stageDays: [15, 30, 65, 40], kc: [0.35, 0.75, 1.15, 0.45], ky: 1.05,
    waterNeedMm: [450, 650],
    climateEn: 'Cool-season cereal; grows through mild winters and ripens as it warms.',
    climateAr: 'محصول شتوي يلائمه الطقس المعتدل شتاءً وينضج مع بدء ارتفاع الحرارة.',
    descEn: 'A staple cereal. Heat during grain filling and water shortage at flowering are its classic risks.',
    descAr: 'محصول غذائي رئيس. أشد ما يضره الحرارة المرتفعة أثناء امتلاء الحبوب ونقص الماء أثناء التزهير.',
    noteEn: 'The model uses a 150-day spring-type season; it does not represent winter dormancy in cold regions.',
    noteAr: 'الحساب هنا لموسم مدته 150 يومًا، ولا يشمل فترة السكون الشتوي في المناطق شديدة البرودة.',
  }),
  crop({
    id: 'maize', icon: '🌽', image: '/images/crop_corn.jpg',
    nameEn: 'Maize (corn)', nameAr: 'الذرة الشامية',
    stageDays: [20, 35, 40, 30], kc: [0.40, 0.80, 1.15, 0.70], ky: 1.25,
    waterNeedMm: [500, 800],
    climateEn: 'Warm-season cereal; needs warm soil and plenty of water in mid-season.',
    climateAr: 'محصول صيفي يلائمه دفء التربة ويحتاج إلى ماء وفير في منتصف الموسم.',
    descEn: 'Very productive but sensitive: water shortage around flowering reduces yield more than in most cereals.',
    descAr: 'إنتاجيته عالية لكنه حساس: الإجهاد المائي أثناء التزهير يخفض محصوله أكثر من غيره.',
  }),
  crop({
    id: 'rice', icon: '🍚', image: '/images/crop_rice.jpg',
    nameEn: 'Rice (paddy)', nameAr: 'الأرز',
    stageDays: [30, 30, 60, 30], kc: [1.05, 1.10, 1.20, 0.75], ky: 1.2, kyAssumed: true,
    waterNeedMm: [450, 700],
    climateEn: 'Warm-season cereal usually grown in flooded fields.',
    climateAr: 'محصول صيفي يُزرع غالبًا في حقول مغمورة.',
    descEn: 'Uses water from the first day because the field is kept wet.',
    descAr: 'يستهلك الماء منذ اليوم الأول لبقاء التربة مشبعة.',
    noteEn: 'Water lost by seepage from flooded fields is not modeled, so real paddy water use is higher than shown. The yield factor (Ky 1.2) is this game\'s assumption: FAO\'s seasonal table has no value for rice.',
    noteAr: 'لا يُحتسب هنا الماء المتسرّب إلى الأعماق في الحقول المغمورة، ولذلك يزيد الاستهلاك الفعلي للأرز على القيمة المعروضة. ومعامل استجابة الغلة (Ky = 1.2) افتراض خاص بالمحاكاة، لأن الجدول الموسمي للفاو لا يتضمن قيمة للأرز.',
  }),
  crop({
    id: 'beans', icon: '🫘', image: '/images/crop_legumes.jpg',
    nameEn: 'Beans (dry)', nameAr: 'الفاصوليا الجافة',
    stageDays: [20, 30, 40, 20], kc: [0.35, 0.70, 1.10, 0.30], ky: 1.15,
    waterNeedMm: [300, 500],
    climateEn: 'Short-season legume that prefers mild temperatures.',
    climateAr: 'محصول بقولي قصير الموسم يلائمه الطقس المعتدل.',
    descEn: 'A short season means a lower total water need, but flowering is sensitive to heat and drought.',
    descAr: 'موسمه قصير فاحتياجه المائي الكلي أقل، لكنه سريع التأثر بالحرارة والإجهاد المائي أثناء التزهير.',
  }),
  crop({
    id: 'sunflower', icon: '🌻', image: null,
    nameEn: 'Sunflower', nameAr: 'دوّار الشمس',
    stageDays: [20, 35, 45, 25], kc: [0.35, 0.75, 1.15, 0.55], ky: 0.95,
    waterNeedMm: [600, 1000],
    climateEn: 'Warm-season oilseed with deep roots.',
    climateAr: 'محصول زيتي صيفي عميق الجذور.',
    descEn: 'Tolerates moderate water shortage better than maize, though its full water need is high.',
    descAr: 'يتحمّل نقص الماء المعتدل أفضل من الذرة، مع أن احتياجه المائي الكامل مرتفع.',
  }),
  crop({
    id: 'sorghum', icon: '🌿', image: null,
    nameEn: 'Sorghum', nameAr: 'الذرة الرفيعة',
    stageDays: [20, 35, 45, 30], kc: [0.35, 0.75, 1.10, 0.65], ky: 0.9,
    waterNeedMm: [450, 650],
    climateEn: 'Heat-loving cereal grown widely in dry regions.',
    climateAr: 'محصول محبّ للحرارة يكثر في المناطق الجافة.',
    descEn: 'Among the cereals least sensitive to water shortage.',
    descAr: 'من أكثر محاصيل الحبوب تحمّلًا للإجهاد المائي.',
  }),
  crop({
    id: 'soybean', icon: '🌱', image: null,
    nameEn: 'Soybean', nameAr: 'فول الصويا',
    stageDays: [20, 30, 70, 30], kc: [0.35, 0.75, 1.10, 0.60], ky: 0.85,
    waterNeedMm: [450, 700],
    climateEn: 'Warm-season legume with a long flowering and pod-filling period.',
    climateAr: 'محصول بقولي صيفي تطول فيه فترة التزهير وتكوين القرون.',
    descEn: 'A long mid-season makes steady water supply important.',
    descAr: 'لطول منتصف موسمه، يلزم إمداد مائي منتظم.',
  }),
]);

export const getGameCrop = (id) => GAME_CROPS.find((c) => c.id === id) || null;
