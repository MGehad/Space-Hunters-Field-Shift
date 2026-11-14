/**
 * Ready-made missions. A mission only fixes the setup (place, year, crop
 * choices) and states a learning goal. It contains no environmental values:
 * conditions are loaded from NASA POWER when the mission is played.
 * Where a year is described, the description refers to widely reported events
 * and the player is asked to check it against the loaded record.
 */
export const GAME_MISSIONS = Object.freeze([
  {
    id: 'egypt-water', countryId: 'egypt', regionId: 'nile-delta', difficulty: 'easy',
    startYear: 2019, cropIds: ['wheat', 'maize', 'rice'], defaultCropId: 'wheat',
    titleEn: 'Water scarcity in Egypt', titleAr: 'ندرة المياه في مصر',
    problemEn: 'With almost no rain, how much water does a crop need from irrigation — and how much can a better method save?',
    problemAr: 'الأمطار هنا شبه معدومة؛ فكم يحتاج المحصول من مياه الري؟ وكم توفّر طريقة الري الأعلى كفاءة؟',
    goalEn: 'See that irrigation method changes the water delivered, not the crop\'s need.',
    goalAr: 'تتبيّن أن طريقة الري تغيّر كمية المياه المضافة، لا الاحتياج المائي للمحصول نفسه.',
  },
  {
    id: 'usa-drought', countryId: 'usa', regionId: 'iowa', difficulty: 'medium',
    startYear: 2012, cropIds: ['maize', 'soybean'], defaultCropId: 'maize',
    titleEn: 'A drought summer in the Corn Belt', titleAr: 'صيف جاف في حزام الذرة',
    problemEn: '2012 is widely reported as a severe drought year in the US Midwest. What does the monthly record show, and when did the crop run short?',
    problemAr: 'كان عام 2012 عام جفاف شديد في وسط الولايات المتحدة. ماذا تُظهر البيانات الشهرية، ومتى تعرّض المحصول للإجهاد المائي؟',
    goalEn: 'Learn why a dry month in mid-season costs more than one early on.',
    goalAr: 'تتعرّف إلى سبب كون الجفاف في منتصف الموسم أشد أثرًا منه في بدايته.',
  },
  {
    id: 'india-monsoon', countryId: 'india', regionId: 'maharashtra', difficulty: 'medium',
    startYear: 2015, cropIds: ['sorghum', 'soybean'], defaultCropId: 'sorghum',
    titleEn: 'Changing monsoon rainfall', titleAr: 'تذبذب أمطار الموسم',
    problemEn: '2015 is widely reported as a weak monsoon in this region. Run it, then run another year and compare the rainfall each crop received.',
    problemAr: 'كانت أمطار عام 2015 ضعيفة جدًا في هذه المنطقة. جرّب هذا العام ثم عامًا آخر، وقارن الأمطار التي حصل عليها المحصول.',
    goalEn: 'Compare the same crop under two different rainy seasons.',
    goalAr: 'تقارن المحصول نفسه في عامين مختلفي الأمطار.',
  },
  {
    id: 'australia-heat', countryId: 'australia', regionId: 'riverina', difficulty: 'hard',
    startYear: 2018, cropIds: ['wheat'], defaultCropId: 'wheat',
    titleEn: 'A dry year for rainfed wheat', titleAr: 'عام جاف للقمح المطري',
    problemEn: '2018 is widely reported as a drought year in eastern Australia. Wheat here is rarely irrigated — what does the season look like without it?',
    problemAr: 'كان عام 2018 عام جفاف في شرق أستراليا، والقمح هناك يُزرع مطريًا. تابع الموسم دون ري.',
    goalEn: 'Understand rainfed risk and what planting time can and cannot change.',
    goalAr: 'تدرك مخاطر الزراعة المطرية، وما يمكن لموعد الزراعة أن يغيّره وما لا يمكن.',
  },
  {
    id: 'brazil-crops', countryId: 'brazil', regionId: 'mato-grosso', difficulty: 'easy',
    startYear: 2019, cropIds: ['soybean', 'maize', 'sorghum'], defaultCropId: 'soybean',
    titleEn: 'Comparing crops under the same conditions', titleAr: 'مقارنة المحاصيل في المناخ نفسه',
    problemEn: 'Different crops ask for water at different times. Which fits this rainy season best?',
    problemAr: 'يختلف توقيت الاحتياج المائي من محصول إلى آخر. أيّها أكثر ملاءمة لموسم الأمطار هذا؟',
    goalEn: 'Run two crops in the same place and year and compare their water need and stress.',
    goalAr: 'تزرع محصولين في الموقع نفسه والعام نفسه، وتقارن احتياجهما المائي ومقدار الإجهاد.',
  },
  {
    id: 'spain-drought', countryId: 'spain', regionId: 'andalusia', difficulty: 'medium',
    startYear: 2022, cropIds: ['wheat', 'sunflower', 'rice'], defaultCropId: 'wheat',
    titleEn: 'A dry year in Andalusia', titleAr: 'عام جاف في الأندلس',
    problemEn: 'The 2022–2023 season is widely reported as a severe drought in southern Spain, with low reservoirs and cuts to irrigation water. What does the monthly record show, and how much would each crop need from irrigation?',
    problemAr: 'كان موسم 2022–2023 موسم جفاف شديد في جنوب إسبانيا، انخفضت فيه مياه الخزانات وخُفِّضت حصص الري. ماذا تُظهر البيانات الشهرية؟ وكم يحتاج كل محصول من مياه الري؟',
    goalEn: 'Compare a winter crop that uses the rainy season with a summer crop that relies on irrigation.',
    goalAr: 'تقارن محصولًا شتويًّا يستفيد من موسم المطر بمحصول صيفي يعتمد على الري.',
  },
]);

export const getGameMission = (id) => GAME_MISSIONS.find((m) => m.id === id) || null;
export const getGameMissionByCountry = (countryId) => GAME_MISSIONS.find((m) => m.countryId === countryId) || null;
export const DIFFICULTY = Object.freeze({
  easy: { en: 'Easy', ar: 'سهلة', dots: 1 },
  medium: { en: 'Medium', ar: 'متوسطة', dots: 2 },
  hard: { en: 'Hard', ar: 'صعبة', dots: 3 },
});
