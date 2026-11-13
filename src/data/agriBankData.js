import { Sprout, Layers, Satellite } from 'lucide-react';

/**
 * Crop, soil and satellite reference content for the Crops Guide.
 *
 * Every number below was read from the cited FAO page (checked 2026-11-12):
 *  - Water need, drought sensitivity: FAO Irrigation Water Management Training
 *    Manual No. 3 "Crop Water Needs", Chapter 3, Table 14.
 *  - Total growing period: the same chapter, Table 7.
 *  - Temperature group: FAO Soils Bulletin 55 "Guidelines: land evaluation for
 *    irrigated agriculture", Annex A, Table 33 (optimum temperature for
 *    photosynthesis by crop adaptability group).
 *  - Soil water behaviour: FAO Irrigation Water Management Training Manual
 *    No. 1 "Introduction to Irrigation", Chapter 2.
 * Fields that could not be checked against one of these sources are left out
 * instead of being filled with estimates.
 */
export const REFERENCE_SOURCES = Object.freeze({
  cropWaterNeeds: { id: 'fao-cwn', nameEn: 'FAO Training Manual No. 3 — Crop Water Needs, Chapter 3 (Tables 7 and 14)', nameAr: 'دليل الفاو التدريبي رقم 3 — الاحتياجات المائية للمحاصيل، الفصل 3 (الجدولان 7 و14)', url: 'https://www.fao.org/4/S2022E/s2022e07.htm' },
  landEvaluation: { id: 'fao-sb55', nameEn: 'FAO Soils Bulletin 55 — Land evaluation for irrigated agriculture, Annex A (Table 33)', nameAr: 'نشرة التربة 55 للفاو — تقييم الأراضي للزراعة المروية، الملحق أ (الجدول 33)', url: 'https://www.fao.org/4/x5648e/x5648e0e.htm' },
  soilAndWater: { id: 'fao-soil', nameEn: 'FAO Training Manual No. 1 — Introduction to Irrigation, Chapter 2: Soil and Water', nameAr: 'دليل الفاو التدريبي رقم 1 — مقدمة في الري، الفصل 2: التربة والماء', url: 'https://www.fao.org/4/r4082e/r4082e03.htm' },
});

export const agriBankHeader = {
  badge: 'Reference',
  subAr: 'معلومات مرجعية عامة عن المحاصيل والتربة وبعثات ناسا، من مصادر رسمية مذكورة',
  subEn: 'General reference on crops, soils and NASA missions, from the official sources listed',
  searchPlaceholderAr: 'ابحث عن محصول…',
  searchPlaceholderEn: 'Search crops...',
  footerNoteAr: 'قيم عامة من مراجع الفاو، وليست قياسات خاصة بالمزرعة. تختلف الاحتياجات بحسب الصنف والموقع والتربة والممارسات الزراعية.',
  footerNoteEn: 'General figures from FAO references, not measurements of your land. Requirements vary with variety, location, soil and farming practice.',
  closeBtnAr: 'إغلاق',
  closeBtnEn: 'Close',
};

export const agriBankTabs = [
  { id: 'crops', labelAr: 'المحاصيل', labelEn: 'Crops', icon: Sprout, iconColor: 'text-emerald-400' },
  { id: 'soil', labelAr: 'أنواع التربة', labelEn: 'Soil types', icon: Layers, iconColor: 'text-amber-400' },
  { id: 'satellites', labelAr: 'بعثات ناسا وبياناتها', labelEn: 'NASA missions & data', icon: Satellite, iconColor: 'text-cyan-400' },
];

export const agriBankLabels = {
  waterNeedAr: 'الاحتياج المائي الموسمي', waterNeedEn: 'Seasonal water need',
  growingAr: 'طول موسم النمو', growingEn: 'Total growing period',
  droughtAr: 'الحساسية للجفاف', droughtEn: 'Sensitivity to drought',
  temperatureAr: 'الحرارة المثلى للتمثيل الضوئي', temperatureEn: 'Optimum temperature for photosynthesis',
  notStatedAr: 'غير مذكورة في المصادر المستخدمة', notStatedEn: 'Not stated in the sources used',
  daysAr: 'يوم', daysEn: 'days', mmAr: 'مم', mmEn: 'mm',
};

export const DROUGHT_SENSITIVITY = Object.freeze({
  low: { en: 'Low', ar: 'منخفضة' },
  'low-medium': { en: 'Low to medium', ar: 'منخفضة إلى متوسطة' },
  'medium-high': { en: 'Medium to high', ar: 'متوسطة إلى عالية' },
  high: { en: 'High', ar: 'عالية' },
});

// FAO Soils Bulletin 55, Table 33.
const TEMP = Object.freeze({
  cool: { rangeC: '15–20', noteEn: 'FAO group I (cool-season C3 crops)', noteAr: 'مجموعة الفاو I (محاصيل الموسم البارد)' },
  warmC3: { rangeC: '25–30', noteEn: 'FAO group II (warm-season C3 crops)', noteAr: 'مجموعة الفاو II (محاصيل الموسم الدافئ)' },
  hotC4: { rangeC: '30–35', noteEn: 'FAO group III (tropical C4 crops)', noteAr: 'مجموعة الفاو III (محاصيل استوائية رباعية الكربون C4)' },
  c4Both: { rangeC: '20–30 / 30–35', noteEn: 'FAO group IV for temperate and highland cultivars, group III for tropical lowland cultivars', noteAr: 'مجموعة الفاو IV لأصناف المناطق المعتدلة والمرتفعات، والمجموعة III للأصناف الاستوائية' },
  beans: { rangeC: '15–20 / 25–30', noteEn: 'FAO group I for temperate cultivars, group II for tropical cultivars', noteAr: 'مجموعة الفاو I لأصناف المناطق المعتدلة، والمجموعة II للأصناف الاستوائية' },
});

export const cropDatabase = [
  { id: 'wheat', icon: '🌾', image: '/images/crop_wheat.jpg', nameAr: 'القمح', nameEn: 'Wheat', categoryAr: 'حبوب', categoryEn: 'Cereal',
    waterNeedMm: '450–650', growingDays: '120–150', drought: 'low-medium', temperature: TEMP.cool,
    descAr: 'محصول حبوب رئيس للمواسم الباردة، ويُزرع شتاءً في البلدان الدافئة.', descEn: 'A staple cereal of cool seasons; in warm countries it is grown as a winter crop.',
    notesAr: 'تجمع الفاو القمح والشعير والشوفان في القيم نفسها. موسم القمح الشتوي في المناطق الباردة أطول من المدة المذكورة.', notesEn: 'FAO lists wheat, barley and oats together. Winter wheat in cold regions has a longer season than shown.' },
  { id: 'barley', icon: '🌾', image: null, nameAr: 'الشعير', nameEn: 'Barley', categoryAr: 'حبوب', categoryEn: 'Cereal',
    waterNeedMm: '450–650', growingDays: '120–150', drought: 'low-medium', temperature: TEMP.cool,
    descAr: 'محصول حبوب للموسم البارد، احتياجاته قريبة من احتياجات القمح.', descEn: 'A cool-season cereal with needs close to those of wheat.',
    notesAr: 'القيم مشتركة مع القمح والشوفان في جداول الفاو.', notesEn: 'Figures are shared with wheat and oats in the FAO tables.' },
  { id: 'maize', icon: '🌽', image: '/images/crop_corn.jpg', nameAr: 'الذرة الشامية', nameEn: 'Maize (corn)', categoryAr: 'حبوب', categoryEn: 'Cereal',
    waterNeedMm: '500–800', growingDays: '125–180', drought: 'medium-high', temperature: TEMP.c4Both,
    descAr: 'محصول حبوب صيفي عالي الإنتاجية، يحتاج إلى إمداد مائي كافٍ ولا سيما في منتصف الموسم.', descEn: 'A productive warm-season cereal that needs enough water, especially in mid-season.',
    notesAr: 'طول الموسم المذكور لذرة الحبوب؛ موسم الذرة السكرية أقصر (80–110 أيام).', notesEn: 'Season length is for grain maize; sweet maize is shorter (80–110 days).' },
  { id: 'rice', icon: '🍚', image: '/images/crop_rice.jpg', nameAr: 'الأرز', nameEn: 'Rice (paddy)', categoryAr: 'حبوب', categoryEn: 'Cereal',
    waterNeedMm: '450–700', growingDays: '90–150', drought: 'high', temperature: TEMP.warmC3,
    descAr: 'محصول حبوب صيفي يُزرع غالبًا في حقول مغمورة.', descEn: 'A warm-season cereal usually grown in flooded fields.',
    notesAr: 'القيمة تمثّل احتياج المحصول نفسه؛ ويتطلب الأرز المغمور مياهًا إضافية للتشبّع وتعويض التسرّب.', notesEn: 'This is the crop\'s own need; flooded rice requires extra water for saturation and seepage.' },
  { id: 'beans', icon: '🫘', image: '/images/crop_legumes.jpg', nameAr: 'الفاصوليا', nameEn: 'Beans', categoryAr: 'بقوليات', categoryEn: 'Legume',
    waterNeedMm: '300–500', growingDays: '95–110', drought: 'medium-high', temperature: TEMP.beans,
    descAr: 'محصول بقولي قصير الموسم.', descEn: 'A short-season legume.',
    notesAr: 'طول الموسم المذكور للفاصوليا الجافة؛ موسم الفاصوليا الخضراء أقصر (75–90 يومًا).', notesEn: 'Season length is for dry beans; green beans are shorter (75–90 days).' },
  { id: 'soybean', icon: '🌱', image: null, nameAr: 'فول الصويا', nameEn: 'Soybean', categoryAr: 'بقوليات زيتية', categoryEn: 'Oilseed legume',
    waterNeedMm: '450–700', growingDays: '135–150', drought: 'low-medium', temperature: TEMP.warmC3,
    descAr: 'محصول بقولي صيفي يُزرع لإنتاج الزيت والبروتين.', descEn: 'A warm-season legume grown for oil and protein.',
    notesAr: 'النطاق الحراري المذكور هو ما تورده الفاو للأصناف الاستوائية.', notesEn: 'The temperature range shown is the one FAO lists for tropical cultivars.' },
  { id: 'groundnut', icon: '🥜', image: null, nameAr: 'الفول السوداني', nameEn: 'Groundnut (peanut)', categoryAr: 'بقوليات زيتية', categoryEn: 'Oilseed legume',
    waterNeedMm: '500–700', growingDays: '130–140', drought: 'low-medium', temperature: TEMP.warmC3,
    descAr: 'محصول بقولي صيفي تتكوّن قرونه تحت سطح التربة.', descEn: 'A warm-season legume whose pods form below the soil surface.', notesAr: '', notesEn: '' },
  { id: 'sunflower', icon: '🌻', image: null, nameAr: 'دوّار الشمس', nameEn: 'Sunflower', categoryAr: 'محصول زيتي', categoryEn: 'Oilseed',
    waterNeedMm: '600–1000', growingDays: '125–130', drought: 'low-medium', temperature: null,
    descAr: 'محصول زيتي صيفي.', descEn: 'A warm-season oilseed.', notesAr: '', notesEn: '' },
  { id: 'sorghum', icon: '🌿', image: null, nameAr: 'الذرة الرفيعة', nameEn: 'Sorghum', categoryAr: 'حبوب', categoryEn: 'Cereal',
    waterNeedMm: '450–650', growingDays: '120–130', drought: 'low', temperature: TEMP.c4Both,
    descAr: 'محصول حبوب محبّ للحرارة، واسع الانتشار في المناطق الجافة.', descEn: 'A heat-loving cereal widely grown in dry regions.',
    notesAr: 'تورد الفاو قيمة الاحتياج المائي نفسها للذرة الرفيعة والدخن.', notesEn: 'FAO gives sorghum and millet the same water-need figure.' },
  { id: 'millet', icon: '🌾', image: null, nameAr: 'الدخن', nameEn: 'Millet', categoryAr: 'حبوب', categoryEn: 'Cereal',
    waterNeedMm: '450–650', growingDays: '105–140', drought: 'low', temperature: TEMP.c4Both,
    descAr: 'حبوب صغيرة تُزرع في المناطق الحارة والجافة.', descEn: 'Small-grained cereals grown in hot, dry regions.',
    notesAr: 'يشمل «الدخن» عدة أنواع تختلف قيمها.', notesEn: '"Millet" covers several species, and figures differ between them.' },
  { id: 'cotton', icon: '☁️', image: null, nameAr: 'القطن', nameEn: 'Cotton', categoryAr: 'محصول ألياف', categoryEn: 'Fibre crop',
    waterNeedMm: '700–1300', growingDays: '180–195', drought: 'low', temperature: TEMP.warmC3,
    descAr: 'محصول ألياف صيفي طويل الموسم.', descEn: 'A long-season, warm-season fibre crop.', notesAr: '', notesEn: '' },
  { id: 'sugarcane', icon: '🎋', image: null, nameAr: 'قصب السكر', nameEn: 'Sugarcane', categoryAr: 'محصول سكري', categoryEn: 'Sugar crop',
    waterNeedMm: '1500–2500', growingDays: '270–365', drought: 'high', temperature: TEMP.hotC4,
    descAr: 'محصول استوائي يشغل الحقل معظم العام واحتياجه المائي مرتفع.', descEn: 'A tropical crop that occupies the field for most of the year and needs a lot of water.', notesAr: '', notesEn: '' },
];

/**
 * Soil texture classes (names follow the USDA texture classification).
 * FAO Training Manual No. 1 groups soils as coarse (sandy), medium (loamy) and
 * fine (clayey) and gives available water of 25–100, 100–175 and 175–250 mm
 * per metre for sand, loam and clay. Classes in between are described
 * relative to those three; no numbers are given for them.
 */
export const SOIL_GROUPS = Object.freeze({
  coarse: { en: 'Coarse (light)', ar: 'خشنة (خفيفة)' },
  medium: { en: 'Medium', ar: 'متوسطة' },
  fine: { en: 'Fine (heavy)', ar: 'ناعمة (ثقيلة)' },
});

export const soilDatabase = [
  { id: 'sand', nameEn: 'Sandy soil', nameAr: 'تربة رملية', group: 'coarse', availableWaterMm: '25–100',
    descEn: 'Mostly large sand particles; feels gritty and is easy to work.', descAr: 'تغلب عليها حبيبات الرمل الكبيرة؛ خشنة الملمس وسهلة الخدمة.',
    waterEn: 'Holds little water.', waterAr: 'قدرتها على الاحتفاظ بالماء منخفضة.',
    drainageEn: 'Water infiltrates fast and drains within hours.', drainageAr: 'يتسرّب الماء فيها سريعًا ويكتمل الصرف خلال ساعات.',
    aerationEn: 'Well aerated.', aerationAr: 'جيدة التهوية.',
    limitsEn: 'Dries out quickly, so it needs small, frequent irrigations; nutrients leach easily.', limitsAr: 'تجفّ سريعًا، فتحتاج إلى ريّات خفيفة متقاربة؛ وتُغسل منها العناصر الغذائية بسهولة.',
    cropsEn: 'Often used for groundnut and root crops where water is available.', cropsAr: 'يشيع استخدامها للفول السوداني والمحاصيل الجذرية عند توافر الماء.' },
  { id: 'sandy-loam', nameEn: 'Sandy loam', nameAr: 'تربة طميية رملية', group: 'coarse', availableWaterMm: null,
    descEn: 'Sand with enough silt and clay to hold together slightly.', descAr: 'رمل مع نسبة من السلت والطين تكفي لتماسك محدود.',
    waterEn: 'Holds more water than sand, less than loam.', waterAr: 'تحتفظ بماء أكثر من الرملية وأقل من الطميية.',
    drainageEn: 'Drains freely.', drainageAr: 'صرفها حر.',
    aerationEn: 'Well aerated.', aerationAr: 'جيدة التهوية.',
    limitsEn: 'Still needs fairly frequent irrigation in dry weather.', limitsAr: 'تحتاج كذلك إلى ري متقارب نسبيًا في الطقس الجاف.',
    cropsEn: 'Suits a wide range of field and vegetable crops with regular watering.', cropsAr: 'تلائم مجموعة واسعة من المحاصيل الحقلية والخضر مع ري منتظم.' },
  { id: 'loam', nameEn: 'Loam', nameAr: 'تربة طميية', group: 'medium', availableWaterMm: '100–175',
    descEn: 'A balanced mix of sand, silt and clay.', descAr: 'خليط متوازن من الرمل والسلت والطين.',
    waterEn: 'Holds a good amount of water that plants can use.', waterAr: 'تحتفظ بكمية جيدة من الماء المتاح للنبات.',
    drainageEn: 'Moderate infiltration and drainage.', drainageAr: 'معدلات التسرّب والصرف متوسطة.',
    aerationEn: 'Good balance of air and water.', aerationAr: 'توازن جيد بين الهواء والماء.',
    limitsEn: 'Few built-in limits; structure can still be damaged by working it when wet.', limitsAr: 'قيودها قليلة، لكن بناءها قد يتضرر إذا خُدمت وهي رطبة.',
    cropsEn: 'Suits most field crops under good management.', cropsAr: 'تلائم معظم المحاصيل الحقلية مع إدارة جيدة.' },
  { id: 'silt-loam', nameEn: 'Silt loam (silty soil)', nameAr: 'تربة طميية سلتية', group: 'medium', availableWaterMm: null,
    descEn: 'Dominated by silt; feels soft, like flour, when dry.', descAr: 'يغلب عليها السلت؛ ناعمة الملمس كالدقيق عند الجفاف.',
    waterEn: 'Holds water well.', waterAr: 'احتفاظها بالماء جيد.',
    drainageEn: 'Moderate; slower than sandy soils.', drainageAr: 'متوسط، وأبطأ من التربة الرملية.',
    aerationEn: 'Moderate.', aerationAr: 'متوسطة.',
    limitsEn: 'The surface can seal into a crust after rain or irrigation, which slows infiltration and seedling emergence.', limitsAr: 'قد يتصلّب سطحها مكوِّنًا قشرة بعد المطر أو الري، فيبطئ ذلك تسرّب الماء وبزوغ البادرات.',
    cropsEn: 'Suits cereals and many field crops when crusting is managed.', cropsAr: 'تلائم الحبوب وكثيرًا من المحاصيل الحقلية عند معالجة مشكلة القشرة السطحية.' },
  { id: 'clay-loam', nameEn: 'Clay loam', nameAr: 'تربة طميية طينية', group: 'fine', availableWaterMm: null,
    descEn: 'Loam with a noticeable share of clay; somewhat sticky when wet.', descAr: 'تربة طميية ذات نسبة طين ملحوظة؛ تلتصق قليلًا عند البلل.',
    waterEn: 'Holds more water than loam.', waterAr: 'تحتفظ بماء أكثر من الطميية.',
    drainageEn: 'Slower infiltration and drainage than loam.', drainageAr: 'التسرّب والصرف أبطأ من الطميية.',
    aerationEn: 'Moderate; drops when the soil stays wet.', aerationAr: 'متوسطة، وتنخفض إذا بقيت التربة رطبة.',
    limitsEn: 'Harder to work; needs less frequent but larger irrigations and care with drainage.', limitsAr: 'خدمتها أصعب؛ وتحتاج إلى ريّات أقل عددًا وأكبر كمية مع العناية بالصرف.',
    cropsEn: 'Widely used for cereals, cotton and other field crops where drainage is adequate.', cropsAr: 'يشيع استخدامها للحبوب والقطن ومحاصيل حقلية أخرى عند كفاية الصرف.' },
  { id: 'silty-clay', nameEn: 'Silty clay', nameAr: 'تربة طينية سلتية', group: 'fine', availableWaterMm: null,
    descEn: 'Mostly clay and silt with very little sand.', descAr: 'يغلب عليها الطين والسلت مع نسبة ضئيلة من الرمل.',
    waterEn: 'Holds a lot of water.', waterAr: 'تحتفظ بكمية كبيرة من الماء.',
    drainageEn: 'Slow.', drainageAr: 'بطيء.',
    aerationEn: 'Limited when wet.', aerationAr: 'محدودة عند البلل.',
    limitsEn: 'Sticky when wet and hard when dry; prone to waterlogging without drainage.', limitsAr: 'لزجة عند البلل وصلبة عند الجفاف؛ ومعرَّضة للتغدّق في غياب الصرف.',
    cropsEn: 'Can suit paddy rice, and other crops where drainage is provided.', cropsAr: 'قد تلائم الأرز المغمور، ومحاصيل أخرى عند توفير الصرف.' },
  { id: 'clay', nameEn: 'Clay soil', nameAr: 'تربة طينية', group: 'fine', availableWaterMm: '175–250',
    descEn: 'Mostly very small clay particles; sticks to the fingers when wet and is hard to work.', descAr: 'يغلب عليها حبيبات الطين الدقيقة جدًا؛ تلتصق بالأصابع عند البلل وخدمتها صعبة.',
    waterEn: 'Holds the most water.', waterAr: 'الأعلى احتفاظًا بالماء.',
    drainageEn: 'Water infiltrates slowly; drainage can take two to three days.', drainageAr: 'يتسرّب الماء فيها ببطء، وقد يستغرق الصرف يومين إلى ثلاثة أيام.',
    aerationEn: 'Poor when wet.', aerationAr: 'ضعيفة عند البلل.',
    limitsEn: 'Risk of ponding and waterlogging; a narrow window when it is workable.', limitsAr: 'معرَّضة لتجمّع الماء على السطح والتغدّق؛ والفترة الملائمة لخدمتها قصيرة.',
    cropsEn: 'Often used for paddy rice because it holds standing water.', cropsAr: 'يشيع استخدامها للأرز المغمور لقدرتها على حجز الماء.' },
];

/**
 * NASA data and missions. `usedHere` is true only for the service this site
 * actually calls. "direct" is what the instrument senses; "derived" is what
 * scientists compute from it. Status lines say when they were last checked.
 */
export const satellitesData = [
  { id: 'power', usedHere: true, kindEn: 'Data service (not a satellite)', kindAr: 'خدمة بيانات (ليست قمرًا صناعيًا)',
    name: 'NASA POWER', url: 'https://power.larc.nasa.gov/',
    statusEn: 'Online; both API endpoints this site uses returned data on 12 Nov 2026.', statusAr: 'متاحة؛ نقطتا الوصول اللتان تستخدمهما المنصة أرجعتا بيانات في 12 نوفمبر 2026.',
    directEn: 'Nothing directly: POWER repackages other NASA products.', directAr: 'لا تقيس شيئًا مباشرة: تعيد تجهيز منتجات أخرى من ناسا.',
    derivedEn: 'Temperature, precipitation, humidity and root-zone wetness from the MERRA-2 reanalysis model; solar radiation from the CERES SYN1deg satellite product.', derivedAr: 'الحرارة والهطول والرطوبة ورطوبة منطقة الجذور من نموذج إعادة التحليل MERRA-2، والإشعاع الشمسي من منتج الأقمار الصناعية CERES SYN1deg.',
    useEn: 'Long-term monthly averages, the latest published months and the scenario comparison in "Farm analysis", and monthly history (from 1981) in the educational missions.', useAr: 'المتوسطات الشهرية طويلة الأجل وأحدث الأشهر المنشورة ومقارنة السيناريوهات في «تحليل المزرعة»، والسجل الشهري (منذ 1981) في المهام التعليمية.' },
  { id: 'landsat', usedHere: false, kindEn: 'Satellites (NASA / USGS)', kindAr: 'قمران صناعيان (ناسا / USGS)',
    name: 'Landsat 8 & Landsat 9', url: 'https://landsat.gsfc.nasa.gov/',
    statusEn: 'Launched 2013 and 2021. See the mission page for current status.', statusAr: 'أُطلقا في 2013 و2021. راجع صفحة البعثة لمعرفة الحالة الراهنة.',
    directEn: 'Reflected sunlight and emitted heat from the land surface (OLI and TIRS instruments), at about 30 m detail.', directAr: 'ضوء الشمس المنعكس والحرارة المنبعثة من سطح الأرض (المستشعران OLI وTIRS) بدقة نحو 30 مترًا.',
    derivedEn: 'Vegetation indices such as NDVI, land-surface temperature, crop and land-cover maps.', derivedAr: 'مؤشرات الغطاء النباتي مثل NDVI، وحرارة سطح الأرض، وخرائط المحاصيل والغطاء الأرضي.',
    useEn: 'Following crop condition field by field over the years.', useAr: 'متابعة حالة المحاصيل على مستوى الحقل عبر السنوات.' },
  { id: 'modis', usedHere: true, kindEn: 'Instrument on two satellites', kindAr: 'مستشعر على قمرين صناعيين',
    name: 'MODIS on Terra and Aqua', url: 'https://modis.gsfc.nasa.gov/',
    statusEn: 'Terra launched 1999, Aqua 2002. Both are at the end of their missions; NASA has projected science operations ending in 2026–2027.', statusAr: 'أُطلق Terra في 1999 وAqua في 2002. كلاهما في نهاية عمره التشغيلي؛ وتتوقع ناسا انتهاء التشغيل العلمي في 2026–2027.',
    directEn: 'Reflected light and emitted heat in 36 bands, covering most of the globe every one to two days at 250 m to 1 km detail.', directAr: 'الضوء المنعكس والحرارة المنبعثة في 36 نطاقًا طيفيًا، مع تغطية معظم الكرة الأرضية كل يوم إلى يومين بدقة من 250 مترًا إلى كيلومتر.',
    derivedEn: 'Vegetation indices, land-surface temperature, evapotranspiration estimates.', derivedAr: 'مؤشرات الغطاء النباتي، وحرارة سطح الأرض، وتقديرات التبخر والنتح.',
    useEn: 'Used in "Farm analysis": 16-day NDVI (MOD13Q1, 250 m) for the farm point over the last 12 months, read from NASA ORNL DAAC. If Terra stops, new values will stop too and the site will say so.', useAr: 'مستخدم في «تحليل المزرعة»: مؤشر NDVI كل 16 يومًا (المنتج MOD13Q1 بدقة 250 مترًا) لنقطة المزرعة خلال آخر 12 شهرًا، من مركز ORNL DAAC التابع لناسا. عند توقف Terra ستتوقف القيم الجديدة، وستوضح المنصة ذلك.' },
  { id: 'smap', usedHere: false, kindEn: 'Satellite', kindAr: 'قمر صناعي',
    name: 'SMAP (Soil Moisture Active Passive)', url: 'https://smap.jpl.nasa.gov/',
    statusEn: 'Launched January 2015. Its radar failed in July 2015; the radiometer continues to collect data.', statusAr: 'أُطلق في يناير 2015. تعطّل راداره في يوليو 2015، ويواصل مقياس الإشعاع (الراديومتر) جمع البيانات.',
    directEn: 'Natural microwave emission from the land surface (L-band radiometer).', directAr: 'الانبعاث الميكروويفي الطبيعي من سطح الأرض (راديومتر النطاق L).',
    derivedEn: 'Moisture in roughly the top 5 cm of soil. Root-zone soil moisture is a modeled product, not a direct measurement.', derivedAr: 'رطوبة الطبقة العليا من التربة (نحو 5 سم). أما رطوبة منطقة الجذور فمنتج نموذجي وليست قياسًا مباشرًا.',
    useEn: 'Drought monitoring over large areas. Not used here: point data need a NASA Earthdata login, so the farm page shows ERA5 model soil moisture instead and says so.', useAr: 'رصد الجفاف على مساحات واسعة. غير مستخدم هنا: البيانات النقطية تتطلب تسجيل دخول في Earthdata، ولذلك تعرض صفحة المزرعة رطوبة التربة من نموذج ERA5 مع توضيح ذلك.' },
  { id: 'gpm', usedHere: false, kindEn: 'Satellite (NASA / JAXA)', kindAr: 'قمر صناعي (ناسا / JAXA)',
    name: 'GPM Core Observatory', url: 'https://gpm.nasa.gov/',
    statusEn: 'Launched February 2014. See the mission page for current status.', statusAr: 'أُطلق في فبراير 2014. راجع صفحة البعثة لمعرفة الحالة الراهنة.',
    directEn: 'Rain and snow in the atmosphere, using a radar and a microwave imager.', directAr: 'المطر والثلج في الغلاف الجوي باستخدام رادار ومصوِّر ميكروويفي.',
    derivedEn: 'IMERG, a global precipitation estimate that merges many satellites.', derivedAr: 'IMERG: تقدير عالمي للهطول يدمج بيانات أقمار صناعية عديدة.',
    useEn: 'Rainfall estimates where rain gauges are sparse.', useAr: 'تقدير الهطول في المناطق قليلة محطات القياس.' },
  { id: 'ecostress', usedHere: false, kindEn: 'Instrument on the International Space Station', kindAr: 'مستشعر على محطة الفضاء الدولية',
    name: 'ECOSTRESS', url: 'https://ecostress.jpl.nasa.gov/',
    statusEn: 'Launched June 2018; in an extended mission (checked November 2026).', statusAr: 'أُطلق في يونيو 2018، ويعمل ضمن مهمة ممتدة (تاريخ التحقق: نوفمبر 2026).',
    directEn: 'Thermal infrared radiation, giving land-surface temperature at about 70 m detail.', directAr: 'الأشعة تحت الحمراء الحرارية، ومنها تُستخلص حرارة سطح الأرض بدقة نحو 70 مترًا.',
    derivedEn: 'Evapotranspiration and plant water-stress indices, computed with models.', derivedAr: 'التبخر والنتح ومؤشرات الإجهاد المائي للنبات، وتُحسب بالنماذج.',
    useEn: 'Spotting crop water stress at field scale.', useAr: 'رصد الإجهاد المائي للمحاصيل على مستوى الحقل.' },
  { id: 'gracefo', usedHere: false, kindEn: 'Twin satellites (NASA / GFZ)', kindAr: 'قمران توأمان (ناسا / GFZ)',
    name: 'GRACE-FO', url: 'https://gracefo.jpl.nasa.gov/',
    statusEn: 'Launched May 2018. See the mission page for current status.', statusAr: 'أُطلقا في مايو 2018. راجع صفحة البعثة لمعرفة الحالة الراهنة.',
    directEn: 'Tiny changes in the distance between the two satellites, caused by changes in Earth\'s gravity.', directAr: 'تغيّرات دقيقة جدًا في المسافة بين القمرين ناتجة عن تغيّر جاذبية الأرض.',
    derivedEn: 'Changes in total water stored on land over regions hundreds of kilometres across; groundwater change is estimated by removing other components with models.', derivedAr: 'تغيّر إجمالي المياه المخزَّنة على اليابسة في مناطق تمتد مئات الكيلومترات؛ ويُقدَّر تغيّر المياه الجوفية بطرح المكوّنات الأخرى باستخدام النماذج.',
    useEn: 'Tracking long-term depletion of large aquifers; too coarse for a single farm.', useAr: 'تتبّع استنزاف الخزانات الجوفية الكبرى على المدى الطويل؛ ودقته المكانية لا تناسب مزرعة واحدة.' },
];
