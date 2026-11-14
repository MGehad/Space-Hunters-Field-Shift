/**
 * Country, region and conversation content for the simulation game.
 *
 * Conversation text is fixed, reviewed educational content. It describes
 * general, widely documented farming conditions and deliberately contains no
 * measurements: every number the player sees later comes either from the NASA
 * POWER request for their experiment or from the labelled educational model.
 * Planting months are typical calendar months, not local recommendations.
 */
export const ASSISTANT = Object.freeze({
  id: 'assistant',
  nameEn: 'Sarah', nameAr: 'سارة',
  roleEn: 'Data guide', roleAr: 'مساعدة البيانات',
  avatar: '/images/nasa_expert.jpg',
});

const region = (r) => Object.freeze(r);

export const GAME_COUNTRIES = Object.freeze({
  egypt: {
    id: 'egypt',
    introEn: 'Egypt receives very little rain, so almost all of its farmland depends on irrigation water from the Nile.',
    introAr: 'الأمطار في مصر قليلة جدًا، ولذلك تعتمد الأراضي الزراعية تقريبًا كلها على مياه النيل والري.',
    challengeEn: 'Water scarcity', challengeAr: 'ندرة المياه',
    regions: [
      region({ id: 'nile-delta', nameEn: 'Nile Delta', nameAr: 'دلتا النيل', latitude: 30.8, longitude: 31.0,
        suggestions: [{ cropId: 'wheat', plantingMonth: 11 }, { cropId: 'maize', plantingMonth: 5 }, { cropId: 'rice', plantingMonth: 5 }] }),
      region({ id: 'upper-egypt', nameEn: 'Upper Egypt (Luxor area)', nameAr: 'صعيد مصر (الأقصر)', latitude: 25.7, longitude: 32.6,
        suggestions: [{ cropId: 'wheat', plantingMonth: 11 }, { cropId: 'maize', plantingMonth: 5 }, { cropId: 'sorghum', plantingMonth: 5 }] }),
    ],
    script: [
      { speaker: 'farmer', textEn: 'Welcome. I am an agricultural engineer working with farms in the Nile Delta. A typical holding here grows wheat in winter, then maize or rice in summer.', textAr: 'أهلًا بك. أنا مهندس زراعي أعمل مع مزارع دلتا النيل. تزرع المزرعة النموذجية هنا القمح شتاءً، ثم الذرة أو الأرز صيفًا.' },
      { speaker: 'farmer', textEn: 'The main constraint is clear: it almost never rains here. Every crop depends on canal water, and each farm\'s share of the irrigation rotation is limited.', textAr: 'القيد الأساسي هنا واضح: الأمطار شبه معدومة، وتعتمد المحاصيل كلها على مياه الترع، وحصة كل مزرعة من مناوبات الري محدودة.' },
      { speaker: 'assistant', textEn: 'That is the key idea for this experiment. When rain is close to zero, nearly all of the water a crop needs has to be supplied by irrigation — so how much you apply, and how efficiently, decides the outcome.', textAr: 'هذه هي الفكرة الأساسية في التجربة. عندما تكون الأمطار شبه معدومة، يجب أن يعوّض الري معظم احتياج المحصول؛ فتحدد كمية المياه وكفاءة طريقة الري النتيجة.' },
      { speaker: 'assistant', textEn: 'We will load monthly temperature and rainfall for the season you choose from NASA POWER, then estimate the crop\'s water need from it. I will always tell you which numbers are data and which are estimates.', textAr: 'سنحمّل بيانات الحرارة والأمطار لكل شهر في الموسم الذي تختاره من NASA POWER، ونحسب منهما الاحتياج المائي للمحصول. وسأوضح دائمًا ما هو بيانات فعلية وما هو تقدير.' },
      { speaker: 'farmer', textEn: 'The question for this case: how can the farm get a good crop with as little canal water as possible? Ask me anything before we start.', textAr: 'السؤال في هذه الحالة: كيف تحقق المزرعة إنتاجًا جيدًا بأقل كمية ممكنة من مياه الري؟ اطرح ما تشاء من أسئلة قبل أن نبدأ.' },
    ],
    farmerQuestions: [
      { id: 'grow', qEn: 'Which crops are typical here, and when are they planted?', qAr: 'ما المحاصيل الشائعة هنا، ومتى تُزرع؟', aEn: 'Winter crops such as wheat are sown around November. Summer crops such as maize and rice go in around May. Rice gives a good income but keeps the field flooded.', aAr: 'تُزرع المحاصيل الشتوية كالقمح في نوفمبر تقريبًا، والصيفية كالذرة والأرز في مايو. الأرز مجزٍ لكنه يتطلب بقاء الحقل مغمورًا.' },
      { id: 'worry', qEn: 'What is the main risk you see here?', qAr: 'ما أبرز المخاطر التي تراها هنا؟', aEn: 'Summer. Heat is high, crop water demand peaks, and every farm along the canal needs water at the same time.', aAr: 'فصل الصيف: ترتفع الحرارة ويبلغ احتياج المحاصيل للمياه ذروته، وتحتاج كل المزارع على الترعة إلى الري في الوقت نفسه.' },
    ],
  },
  india: {
    id: 'india',
    introEn: 'Much of India\'s farming follows the summer monsoon: most of the year\'s rain arrives in a few months.',
    introAr: 'تعتمد معظم الزراعة في الهند على الأمطار الموسمية الصيفية: يهطل أغلب مطر العام في أشهر قليلة.',
    challengeEn: 'Monsoon variability', challengeAr: 'تقلبات مطر الموسم',
    regions: [
      region({ id: 'maharashtra', nameEn: 'Maharashtra (Marathwada)', nameAr: 'ماهاراشترا (ماراثوادا)', latitude: 19.9, longitude: 75.3,
        suggestions: [{ cropId: 'sorghum', plantingMonth: 6 }, { cropId: 'soybean', plantingMonth: 6 }, { cropId: 'wheat', plantingMonth: 11 }] }),
      region({ id: 'punjab', nameEn: 'Punjab (Ludhiana area)', nameAr: 'البنجاب (منطقة لوديانا)', latitude: 30.9, longitude: 75.85,
        suggestions: [{ cropId: 'wheat', plantingMonth: 11 }, { cropId: 'rice', plantingMonth: 6 }, { cropId: 'maize', plantingMonth: 6 }] }),
    ],
    script: [
      { speaker: 'farmer', textEn: 'Namaste. I am an agricultural engineer advising rainfed farms in this area. Sowing starts when the monsoon arrives in June: sorghum, soybean and cotton all wait for the first good rain.', textAr: 'مرحبًا. أنا مهندس زراعي أقدّم الاستشارات للمزارع المطرية في هذه المنطقة. تبدأ الزراعة مع وصول الأمطار الموسمية في يونيو، فالذرة الرفيعة وفول الصويا والقطن كلها تنتظر أول مطر جيد.' },
      { speaker: 'farmer', textEn: 'In some years the rain is generous. In others it comes late or stops for weeks mid-season, and most farms here have no well to fall back on.', textAr: 'في بعض الأعوام تكون الأمطار وفيرة، وفي أعوام أخرى تتأخر أو تنقطع أسابيع في منتصف الموسم، ومعظم المزارع هنا لا تملك بئرًا للري.' },
      { speaker: 'assistant', textEn: 'So the same crop, planted in the same month, can face very different seasons. In this game you can run one year, then another, and compare what the rainfall record shows.', textAr: 'أي أن المحصول نفسه في الشهر نفسه قد يمر بأعوام مختلفة تمامًا. يمكنك هنا تجربة عام ثم عام آخر ومقارنة الأمطار.' },
      { speaker: 'assistant', textEn: 'Monthly totals hide dry spells inside a month, so treat the result as a broad picture rather than a day-by-day account.', textAr: 'المجاميع الشهرية لا تُظهر فترات الجفاف داخل الشهر، فاعتبر النتيجة صورة عامة لا تفصيلًا يوميًا.' },
      { speaker: 'farmer', textEn: 'The question for this case: which crop and plan can cope with both a good monsoon and a weak one?', textAr: 'السؤال في هذه الحالة: ما المحصول والخطة اللذان يتحمّلان عامًا جيد الأمطار وعامًا ضعيفها؟' },
    ],
    farmerQuestions: [
      { id: 'grow', qEn: 'Which crops are typical here, and when are they planted?', qAr: 'ما المحاصيل الشائعة هنا، ومتى تُزرع؟', aEn: 'The rainy-season crops go in around June. Where there is stored water or a well, a cool-season crop such as wheat follows around November.', aAr: 'تُزرع المحاصيل المطرية في يونيو تقريبًا. ومن يملك مياهًا مخزَّنة أو بئرًا يزرع القمح شتاءً في نوفمبر.' },
      { id: 'worry', qEn: 'What is the main risk you see here?', qAr: 'ما أبرز المخاطر التي تراها هنا؟', aEn: 'A break in the rain when the crop is flowering. A few dry weeks then can undo a good start.', aAr: 'انقطاع الأمطار أثناء التزهير؛ فبضعة أسابيع جافة حينها قد تُفسد موسمًا بدأ جيدًا.' },
    ],
  },
  usa: {
    id: 'usa',
    introEn: 'The US Midwest grows maize and soybean mostly on summer rain and water stored in deep soils.',
    introAr: 'يزرع وسط الولايات المتحدة الذرة وفول الصويا اعتمادًا على أمطار الصيف والمياه المخزَّنة في التربة العميقة.',
    challengeEn: 'Summer drought', challengeAr: 'جفاف الصيف',
    regions: [
      region({ id: 'iowa', nameEn: 'Iowa (Corn Belt)', nameAr: 'آيوا (حزام الذرة)', latitude: 42.0, longitude: -93.5,
        suggestions: [{ cropId: 'maize', plantingMonth: 5 }, { cropId: 'soybean', plantingMonth: 5 }] }),
      region({ id: 'kansas', nameEn: 'Kansas (central plains)', nameAr: 'كانساس (السهول الوسطى)', latitude: 38.5, longitude: -98.5,
        suggestions: [{ cropId: 'sorghum', plantingMonth: 6 }, { cropId: 'maize', plantingMonth: 5 }, { cropId: 'sunflower', plantingMonth: 6 }] }),
    ],
    script: [
      { speaker: 'farmer', textEn: 'Hello. I am an agricultural engineer working with corn and soybean farms in the Midwest. They plant in May and rely on summer rain; most fields here are not irrigated.', textAr: 'مرحبًا. أنا مهندس زراعي أعمل مع مزارع الذرة وفول الصويا في الغرب الأوسط. تُزرع هذه المحاصيل في مايو وتعتمد على أمطار الصيف، ومعظم الحقول هنا غير مروية.' },
      { speaker: 'farmer', textEn: 'In a normal year that works well. But when July turns hot and dry just as the corn is flowering, there is little a rainfed farm can do.', textAr: 'في العام المعتاد تسير الأمور جيدًا. لكن إذا جاء يوليو حارًّا جافًّا وقت تزهير الذرة، فلا تملك المزرعة المطرية خيارات كثيرة.' },
      { speaker: 'assistant', textEn: 'This is a good place to see how timing matters. A crop uses the most water in mid-season, so a dry month then costs more than a dry month early on.', textAr: 'هنا تتضح أهمية التوقيت. يبلغ استهلاك المحصول للماء ذروته في منتصف الموسم، فإذا حلّ الجفاف حينها كانت الخسارة أكبر كثيرًا منها في بداية الموسم.' },
      { speaker: 'assistant', textEn: 'The model also carries soil water from month to month, so spring rain stored in the soil can help the crop through part of a dry spell.', textAr: 'ينقل الحساب كذلك مخزون ماء التربة من شهر إلى الذي يليه، فأمطار الربيع المخزَّنة قد تسند المحصول بعض الوقت إذا حلّ الجفاف فجأة.' },
      { speaker: 'farmer', textEn: 'The question for this case: compare a dry year with a wetter one and identify what the season itself changed.', textAr: 'السؤال في هذه الحالة: قارن عامًا جافًّا بعام أوفر أمطارًا، وحدّد الفرق الذي أحدثه الموسم نفسه.' },
    ],
    farmerQuestions: [
      { id: 'grow', qEn: 'Which crops are typical here, and when are they planted?', qAr: 'ما المحاصيل الشائعة هنا، ومتى تُزرع؟', aEn: 'Corn and soybeans, planted in spring and harvested in autumn. Further west, where it is drier, sorghum and sunflower are common.', aAr: 'تُزرع الذرة وفول الصويا في الربيع وتُحصدان في الخريف. وفي الغرب الأكثر جفافًا تُزرع الذرة الرفيعة ودوّار الشمس.' },
      { id: 'worry', qEn: 'What is the main risk you see here?', qAr: 'ما أبرز المخاطر التي تراها هنا؟', aEn: 'A hot, dry stretch in July. That is when corn sets its kernels.', aAr: 'موجة حر وجفاف في يوليو، لأنه وقت تكوين الحبوب في كيزان الذرة.' },
    ],
  },
  brazil: {
    id: 'brazil',
    introEn: 'Central Brazil has a long rainy season and a marked dry season, and many farms fit two crops into the rains.',
    introAr: 'في وسط البرازيل موسم أمطار طويل وموسم جفاف، وكثير من المزارع تزرع محصولين متتاليين خلال موسم الأمطار.',
    challengeEn: 'Fitting crops into the rainy season', challengeAr: 'مواءمة الزراعة مع موسم الأمطار',
    regions: [
      region({ id: 'mato-grosso', nameEn: 'Mato Grosso (Sorriso area)', nameAr: 'ماتو غروسو (سوريسو)', latitude: -12.5, longitude: -55.7,
        suggestions: [{ cropId: 'soybean', plantingMonth: 10 }, { cropId: 'maize', plantingMonth: 2 }] }),
      region({ id: 'parana', nameEn: 'Paraná (Londrina area)', nameAr: 'بارانا (لوندرينا)', latitude: -23.3, longitude: -51.2,
        suggestions: [{ cropId: 'soybean', plantingMonth: 10 }, { cropId: 'wheat', plantingMonth: 5 }, { cropId: 'beans', plantingMonth: 9 }] }),
    ],
    script: [
      { speaker: 'farmer', textEn: 'Olá. I am an agricultural engineer advising farms in central Brazil. Soybean is sown when the rains return around October, and maize goes in straight after harvest as a second crop.', textAr: 'مرحبًا. أنا مهندس زراعي أقدّم الاستشارات لمزارع وسط البرازيل. يُزرع فول الصويا مع عودة الأمطار في أكتوبر تقريبًا، ثم تُزرع الذرة مباشرة بعد حصاده محصولًا ثانيًا.' },
      { speaker: 'farmer', textEn: 'The second crop is a race against time. If it is planted late, the rains end before the maize has finished and it runs short of water.', textAr: 'المحصول الثاني سباق مع الوقت. إذا تأخرت زراعته انتهت الأمطار قبل نضج الذرة فتعرّضت للإجهاد المائي.' },
      { speaker: 'assistant', textEn: 'So here the planting month is the big decision. You can move it and watch how the crop\'s thirstiest months line up with the rainy months in the record.', textAr: 'أي أن شهر الزراعة هو القرار الأهم هنا. يمكنك تغييره وملاحظة هل تتوافق أشهر ذروة الاحتياج مع أشهر الأمطار.' },
      { speaker: 'assistant', textEn: 'We are south of the equator, so the seasons are reversed: the warm, rainy months are roughly October to April.', textAr: 'نحن هنا جنوب خط الاستواء فالفصول معكوسة: يمتد الموسم الدافئ الممطر من أكتوبر إلى أبريل تقريبًا.' },
      { speaker: 'farmer', textEn: 'The question for this case: which planting month keeps the whole crop season inside the rains?', textAr: 'السؤال في هذه الحالة: ما شهر الزراعة الذي يجعل الموسم كله ضمن فترة الأمطار؟' },
    ],
    farmerQuestions: [
      { id: 'grow', qEn: 'Which crops are typical here, and when are they planted?', qAr: 'ما المحاصيل الشائعة هنا، ومتى تُزرع؟', aEn: 'Soybean from about October, then second-crop maize from about February. Further south, wheat is grown in the cooler months.', aAr: 'فول الصويا من أكتوبر تقريبًا، ثم الذرة من فبراير. وفي الجنوب يُزرع القمح في الأشهر الأبرد.' },
      { id: 'worry', qEn: 'What is the main risk you see here?', qAr: 'ما أبرز المخاطر التي تراها هنا؟', aEn: 'Rains that start late. Everything after that is squeezed.', aAr: 'تأخّر الأمطار في بداية الموسم؛ فحينها يضيق الوقت على كل ما يليه.' },
    ],
  },
  australia: {
    id: 'australia',
    introEn: 'Eastern Australia grows wheat through the cooler months on rainfall that varies strongly from year to year.',
    introAr: 'يزرع شرق أستراليا القمح مطريًا في الأشهر الباردة، والأمطار هناك شديدة التذبذب من عام إلى آخر.',
    challengeEn: 'Unreliable rainfall', challengeAr: 'أمطار غير مضمونة',
    regions: [
      region({ id: 'riverina', nameEn: 'New South Wales (Wagga Wagga area)', nameAr: 'نيو ساوث ويلز (واغا واغا)', latitude: -35.1, longitude: 147.4,
        suggestions: [{ cropId: 'wheat', plantingMonth: 5 }] }),
      region({ id: 'darling-downs', nameEn: 'Queensland (Darling Downs)', nameAr: 'كوينزلاند (دارلينغ داونز)', latitude: -27.5, longitude: 151.5,
        suggestions: [{ cropId: 'sorghum', plantingMonth: 11 }, { cropId: 'wheat', plantingMonth: 5 }, { cropId: 'sunflower', plantingMonth: 11 }] }),
    ],
    script: [
      { speaker: 'farmer', textEn: 'G\'day. I am an agricultural engineer working with wheat farms in eastern Australia. Wheat is sown in autumn, around May, and grows through winter on whatever rain falls.', textAr: 'مرحبًا. أنا مهندس زراعي أعمل مع مزارع القمح في شرق أستراليا. يُزرع القمح في الخريف، في مايو تقريبًا، وينمو خلال الشتاء معتمدًا على ما يهطل من أمطار.' },
      { speaker: 'farmer', textEn: 'No two years are alike here. One season fills the silos, the next barely covers the seed cost, and very few farms can irrigate wheat.', textAr: 'لا يتشابه هنا عامان: موسم تمتلئ فيه الصوامع، وموسم لا يكاد يغطي تكلفة التقاوي، وقلة من المزارع تستطيع ري القمح.' },
      { speaker: 'assistant', textEn: 'This is a rainfed challenge. Try the same crop and month in several years and you will see how much the season itself changes the modeled result.', textAr: 'هذا هو تحدي الزراعة المطرية. جرّب المحصول نفسه والشهر نفسه في عدة أعوام، وسترى كيف يغيّر المناخ وحده النتيجة.' },
      { speaker: 'assistant', textEn: 'We are south of the equator, so winter is June to August and the crop ripens as spring warms up.', textAr: 'نحن جنوب خط الاستواء، فالشتاء من يونيو إلى أغسطس، وينضج القمح مع دفء الربيع.' },
      { speaker: 'farmer', textEn: 'The question for this case: what does a dry year look like in the record, and could anything have been done differently?', textAr: 'السؤال في هذه الحالة: كيف يظهر العام الجاف في البيانات، وهل كان من الممكن اتخاذ قرار مختلف؟' },
    ],
    farmerQuestions: [
      { id: 'grow', qEn: 'Which crops are typical here, and when are they planted?', qAr: 'ما المحاصيل الشائعة هنا، ومتى تُزرع؟', aEn: 'Wheat, barley and canola sown in autumn. Further north, summer crops such as sorghum are sown around November.', aAr: 'القمح والشعير والكانولا في الخريف. وفي الشمال تُزرع محاصيل صيفية كالذرة الرفيعة في نوفمبر.' },
      { id: 'worry', qEn: 'What is the main risk you see here?', qAr: 'ما أبرز المخاطر التي تراها هنا؟', aEn: 'A dry spring. The crop is at its thirstiest just when the rain often tails off.', aAr: 'أن يكون الربيع جافًّا؛ فهو وقت ذروة احتياج المحصول للماء مع تراجع الأمطار.' },
    ],
  },
  spain: {
    id: 'spain',
    introEn: 'Southern Spain has a Mediterranean climate: most of the rain falls from autumn to spring, and summers are hot and dry.',
    introAr: 'مناخ جنوب إسبانيا متوسطي: يهطل معظم المطر بين الخريف والربيع، والصيف حار جاف.',
    challengeEn: 'Drought and irrigation limits', challengeAr: 'الجفاف وقيود مياه الري',
    regions: [
      region({ id: 'andalusia', nameEn: 'Andalusia (Guadalquivir valley, Seville)', nameAr: 'الأندلس (وادي الوادي الكبير، إشبيلية)', latitude: 37.4, longitude: -5.9,
        suggestions: [{ cropId: 'wheat', plantingMonth: 11 }, { cropId: 'sunflower', plantingMonth: 3 }, { cropId: 'rice', plantingMonth: 5 }] }),
      region({ id: 'castile', nameEn: 'Castile and León (Valladolid area)', nameAr: 'قشتالة وليون (منطقة بلد الوليد)', latitude: 41.65, longitude: -4.72,
        suggestions: [{ cropId: 'sunflower', plantingMonth: 4 }, { cropId: 'maize', plantingMonth: 5 }] }),
    ],
    script: [
      { speaker: 'farmer', textEn: 'Hola. I am an agricultural engineer working with farms in the Guadalquivir valley in Andalusia. Wheat is sown in autumn on the winter rains, sunflower goes in at the end of winter, and rice is grown in the marshes near Seville with irrigation water.', textAr: 'مرحبًا. أنا مهندس زراعي أعمل مع مزارع وادي الوادي الكبير في الأندلس. يُزرع القمح في الخريف معتمدًا على أمطار الشتاء، ودوّار الشمس في أواخر الشتاء، أما الأرز فيُزرع في المستنقعات القريبة من إشبيلية بمياه الري.' },
      { speaker: 'farmer', textEn: 'Almost no rain falls here in summer. Summer crops depend on water stored in the reservoirs, and in drought years the irrigation allocation is cut.', textAr: 'لا يكاد المطر يهطل هنا صيفًا، فتعتمد المحاصيل الصيفية على المياه المخزَّنة في الخزانات، وفي سنوات الجفاف تُخفَّض حصص الري.' },
      { speaker: 'assistant', textEn: 'This is almost the opposite of a monsoon climate: the wet months are autumn to spring. Compare a crop that grows through the rainy months with one that grows through the dry summer.', textAr: 'هذا المناخ يكاد يكون عكس مناخ الأمطار الموسمية: الأشهر الممطرة هنا من الخريف إلى الربيع. قارن محصولًا ينمو في أشهر المطر بمحصول ينمو في الصيف الجاف.' },
      { speaker: 'assistant', textEn: 'Keep in mind that this model has no data on reservoirs or water allocations. It shows how much water the crop needs and how much the rain supplies; the gap is what irrigation would have to provide.', textAr: 'تذكّر أن هذا الحساب لا يتضمن بيانات عن الخزانات أو حصص المياه؛ فهو يبيّن احتياج المحصول من الماء وما توفره الأمطار منه، والفرق بينهما هو ما يجب أن يوفره الري.' },
      { speaker: 'farmer', textEn: 'The question for this case: in a dry year, which crops can still make use of the little rain, and which depend entirely on irrigation?', textAr: 'السؤال في هذه الحالة: في عام جاف، ما المحاصيل التي تستفيد من القليل من المطر، وما المحاصيل التي تعتمد كليًّا على الري؟' },
    ],
    farmerQuestions: [
      { id: 'grow', qEn: 'Which crops are typical here, and when are they planted?', qAr: 'ما المحاصيل الشائعة هنا، ومتى تُزرع؟', aEn: 'Wheat is sown around November and sunflower around March. Rice goes into the marshes around May. Maize and other summer crops are grown only where there is irrigation.', aAr: 'يُزرع القمح في نوفمبر تقريبًا، ودوّار الشمس في مارس، والأرز في المستنقعات في مايو. أما الذرة وغيرها من المحاصيل الصيفية فلا تُزرع إلا حيث يتوفر الري.' },
      { id: 'worry', qEn: 'What is the main risk you see here?', qAr: 'ما أبرز المخاطر التي تراها هنا؟', aEn: 'A dry winter and spring. When those rains fail, rainfed crops suffer and the reservoirs that supply summer irrigation do not refill.', aAr: 'أن يكون الشتاء والربيع جافَّين؛ فإذا شحّت أمطارهما تضررت المحاصيل المطرية، ولم تمتلئ الخزانات التي تمدّ ري الصيف بالمياه.' },
    ],
  },
});

/** Questions the assistant answers the same way in every country. */
export const ASSISTANT_QUESTIONS = Object.freeze([
  { id: 'source', qEn: 'Where does the data come from?', qAr: 'ما مصدر هذه البيانات؟',
    aEn: 'From NASA POWER, a free NASA service. Its weather values come from MERRA-2, a NASA model that blends many observations into a consistent global record. Each value describes a grid cell roughly 50 km across, month by month — not one particular field.',
    aAr: 'من NASA POWER، وهي خدمة مجانية من ناسا. القيم المناخية من سجل عالمي (MERRA-2) يغطي شهريًا خلايا عرضها نحو 50 كم؛ أي أنها ليست قياسًا لحقل بعينه.' },
  { id: 'need', qEn: 'What is "crop water need"?', qAr: 'ما المقصود بـ«الاحتياج المائي للمحصول»؟',
    aEn: 'It is the water a healthy crop would use in a month through evaporation and transpiration. We estimate it with a method taught by the FAO: a reference value based on temperature and day length, multiplied by a crop factor that rises as the plant grows.',
    aAr: 'هو كمية الماء التي يستهلكها المحصول السليم بالنتح والتبخر في الشهر. تُحسب بطريقة الفاو بحسب الحرارة وطول النهار ومرحلة نمو المحصول.' },
  { id: 'stress', qEn: 'How is the final result estimated?', qAr: 'كيف تُحسب النتيجة النهائية؟',
    aEn: 'Each month we compare the water the crop needs with what rain, stored soil water and your irrigation supply. The season\'s shortfall is turned into a "relative yield" using an FAO formula. It is a percentage of what the crop could do with enough water — not tonnes, and not a forecast.',
    aAr: 'يُقارَن في كل شهر احتياج المحصول بالأمطار ومخزون التربة والري الذي اخترته. ويُحوَّل العجز إلى نسبة مئوية تسمى «الإنتاجية النسبية» تبيّن ما حققه المحصول من طاقته الإنتاجية؛ وليست غلة بالأطنان ولا تنبؤًا.' },
  { id: 'limits', qEn: 'What can this simulation not tell me?', qAr: 'ما الذي لا تحسبه المحاكاة؟',
    aEn: 'Quite a lot. It ignores fertilizer, pests, diseases, salinity, crop varieties and day-to-day weather inside a month, and it assumes one typical soil. Use it to understand how water and timing interact, not to plan a real farm.',
    aAr: 'أمور كثيرة: لا تحسب التسميد ولا الآفات والأمراض ولا الملوحة ولا الصنف ولا الطقس اليومي، وتفترض تربة قياسية واحدة. استخدمها لفهم أثر الماء والتوقيت، لا لتخطيط حقل فعلي.' },
]);

export const getGameCountry = (id) => GAME_COUNTRIES[id] || null;
export const getRegion = (countryId, regionId) => GAME_COUNTRIES[countryId]?.regions.find((r) => r.id === regionId) || null;
