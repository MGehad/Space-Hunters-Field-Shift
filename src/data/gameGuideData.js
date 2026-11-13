import { Globe2, MessageSquare, Sprout, SlidersHorizontal, CalendarRange, FileBarChart } from 'lucide-react';

/**
 * "How to play" content. It describes the Educational Missions game exactly
 * as it is built (src/components/game): 6 stages in a fixed order and two modes.
 */

export const gameGuideHeader = {
  badge: 'Educational Missions',
  subAr: 'آلية المحاكاة التعليمية خطوة بخطوة',
  subEn: 'How the educational simulation works, step by step',
  startBtnAr: 'بدء المهام',
  startBtnEn: 'Start missions',
  closeBtnAr: 'إغلاق',
  closeBtnEn: 'Close',
  teamFooter: 'Team Space Hunters',
};

export const gameGuideHero = {
  titleAr: 'ما فكرة المهام التعليمية؟',
  titleEn: 'What are the educational missions?',
  descAr: 'تزرع محصولًا خلال موسم وقع فعلًا في بلد حقيقي، باستخدام حرارة وهطول كل شهر من سجل NASA POWER. تتخذ قرارات الري، وتتابع الموسم شهرًا بشهر، ثم تراجع تقريرًا يمكن مقارنته بتجارب أخرى. النتائج تقديرات تعليمية مبنية على طرائق الفاو، وليست تنبؤًا بالإنتاجية.',
  descEn: 'You grow a crop through a season that really happened in a real country, using each month\'s temperature and rain from the NASA POWER record. You make the irrigation decisions, follow the season month by month, and end with a report you can compare with other runs. Results are educational estimates from FAO methods, not yield forecasts.',
};

export const gameGuideModes = {
  titleAr: 'طريقتان للاستخدام',
  titleEn: 'Two ways to use it',
  items: [
    {
      titleAr: 'مهام جاهزة', titleEn: 'Ready-made missions',
      descAr: 'لكل مهمة بلد ومنطقة وسنة ومحاصيل محددة وهدف تعليمي واضح. اختيار بلد من الخريطة في هذا الوضع يبدأ مهمة ذلك البلد.',
      descEn: 'Each mission fixes the country, region, year and crop choices and has a clear learning goal. Choosing a country on the map in this mode starts that country\'s mission.',
    },
    {
      titleAr: 'محاكاة حرة', titleEn: 'Open simulation',
      descAr: 'تختار جميع المدخلات بنفسك: البلد والمنطقة والمحصول والسنة وشهر الزراعة.',
      descEn: 'You choose everything yourself: country, region, crop, year and planting month.',
    },
  ],
};

export const gameGuideSteps = [
  {
    num: '1', icon: Globe2,
    titleAr: 'اختيار البلد', titleEn: 'Choose a country',
    descAr: 'اختر أحد البلدان المتاحة من خريطة العالم أو من القائمة أسفلها.',
    descEn: 'Pick one of the available countries on the world map, or from the list below it.',
  },
  {
    num: '2', icon: MessageSquare,
    titleAr: 'لقاء المزارع', titleEn: 'Meet the farmer',
    descAr: 'اقرأ ما يعرضه المزارع ومساعد البيانات، واطرح الأسئلة المعدّة للتعرّف إلى الموقع ومواسمه. الحوار مكتوب لأغراض تعليمية وليس بيانًا صادرًا عن ناسا.',
    descEn: 'Read what the farmer and the data assistant say, and ask the prepared questions to learn about the place and its seasons. The dialogue is written for teaching and is not a NASA statement.',
  },
  {
    num: '3', icon: Sprout,
    titleAr: 'اختيار المحصول والموسم', titleEn: 'Choose the crop and season',
    descAr: 'اختر المنطقة والمحصول والسنة وشهر الزراعة. تُعرض فقط السنوات التي يقع موسمها كاملًا ضمن سجل POWER (من 1981 حتى العام الماضي). ثم تُحمَّل البيانات الشهرية؛ وعند نقص أي بيانات يُبلَّغ المستخدم دون استكمالها بقيم بديلة.',
    descEn: 'Pick the region, crop, year and planting month. Only years whose whole season falls inside the POWER record (1981 to last year) are offered. The monthly data is then loaded; if anything is missing you are told, and nothing is filled in.',
  },
  {
    num: '4', icon: SlidersHorizontal,
    titleAr: 'قرارات الري', titleEn: 'Make your decisions',
    descAr: 'راجع ما سيواجهه المحصول في هذا الموسم، ثم اختر: زراعة مطرية، أو ريًّا ناقصًا، أو ريًّا كاملًا؛ ومع الري اختر طريقته (سطحي، بالرش، بالتنقيط). ويمكن كذلك تغيير شهر الزراعة.',
    descEn: 'See what the crop will face this season, then choose rainfed, deficit or full irrigation and, if you irrigate, the method (surface, sprinkler or drip). You can also move the planting month.',
  },
  {
    num: '5', icon: CalendarRange,
    titleAr: 'متابعة الموسم شهرًا بشهر', titleEn: 'Follow the season month by month',
    descAr: 'تُعرض لكل شهر الحرارة والهطول من POWER، والاحتياج المائي للمحصول، والأمطار الفعّالة، والري، والإجهاد المائي إن وُجد، مع شرح من المزارع والمساعد.',
    descEn: 'For each month you see POWER temperature and rain, the crop\'s water need, useful rain, irrigation and any water stress, explained by the farmer and the assistant.',
  },
  {
    num: '6', icon: FileBarChart,
    titleAr: 'التقرير والمقارنة', titleEn: 'Report and comparison',
    descAr: 'يلخّص التقرير استخدام المياه والري والإنتاجية النسبية التقديرية، ويشرح طريقة حسابها. تُحفظ كل تجربة على هذا الجهاز لمقارنة تجربتين أو إعادة المحاولة بقرار مختلف.',
    descEn: 'The report sums up water use, irrigation and estimated relative yield, and explains how they were calculated. Every run is saved on this device so you can compare two runs or try again with a different decision.',
  },
];

export const gameGuideTips = {
  titleAr: 'إرشادات:',
  titleEn: 'Tips:',
  items: [
    { textAr: 'غيّر عاملًا واحدًا في كل مرة (الري أو السنة أو المحصول) لتكون المقارنة منصفة.', textEn: 'Change one thing at a time (irrigation, year or crop) so a comparison is fair.' },
    { textAr: 'القيم الموسومة «بيانات NASA POWER» مصدرها ناسا؛ والموسومة «تقدير تعليمي» محسوبة في المحاكاة.', textEn: 'Numbers tagged "NASA POWER data" come from NASA; numbers tagged "Educational estimate" are calculated by the simulation.' },
    { textAr: 'المهام التعليمية مستقلة عن «تحليل المزرعة»: لا تُنقل أي بيانات بينهما.', textEn: 'The missions are separate from "Farm analysis": no data is shared between them.' },
  ],
};
