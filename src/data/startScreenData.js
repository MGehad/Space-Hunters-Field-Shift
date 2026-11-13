/**
 * Start Screen (Landing / Hero Page) Data Layer
 * Completely separated for database / CMS configuration
 */

export const startScreenData = {
  badgeAr: "NASA SPACE APPS CHALLENGE 2026",
  badgeEn: "NASA SPACE APPS CHALLENGE 2026",
  editionBadgeAr: "الإصدار 2.0",
  editionBadgeEn: "Version 2.0",
  
  titlePrefix: "SPACE",
  titleSuffix: "HUNTERS",
  taglineAr: "Field Shift — منصة التحليل ودعم القرارات الزراعية",
  taglineEn: "Field Shift — Agricultural Intelligence & Decision Support",

  descAr: "حلّل الظروف البيئية والزراعية، وقيّم ملاءمة المحاصيل، وقارن بين السيناريوهات الزراعية، وأنشئ تقارير فنية بالاعتماد على البيانات البيئية وبيانات رصد الأرض.",
  descEn: "Analyze agricultural conditions, evaluate crop suitability, compare farming scenarios, and generate data-driven reports using environmental and Earth observation data.",

  buttons: {
    startGame: {
      id: "start",
      labelAr: "المهام التعليمية",
      labelEn: "Educational Missions",
      subAr: "محاكاة تعليمية لمواسم زراعية حول العالم",
      subEn: "Educational simulation of crop seasons around the world",
      icon: "Rocket",
      glowColor: "cyan"
    },
    cropBank: {
      id: "agriBank",
      labelAr: "دليل المحاصيل والتربة",
      labelEn: "Crop & Soil Guide",
      subAr: "خصائص المحاصيل والتربة ومصادر البيانات",
      subEn: "Crop and soil characteristics and data sources",
      icon: "Sprout",
      glowColor: "emerald"
    },
    sequenceBuilder: {
      id: "builder",
      labelAr: "مقارنة الدورات الزراعية",
      labelEn: "Rotation Comparison",
      subAr: "قارن بين استراتيجيات الدورة الزراعية",
      subEn: "Compare crop rotation strategies",
      icon: "RotateCcw",
      glowColor: "purple"
    }
  },

  stats: [
    {
      id: "missions",
      value: "5",
      labelAr: "مهام تعليمية",
      labelEn: "Educational missions"
    },
    {
      id: "satellites",
      value: "1",
      labelAr: "مصادر البيانات: NASA POWER وMODIS وERA5",
      labelEn: "Data sources: NASA POWER, MODIS, ERA5"
    },
    {
      id: "accuracy",
      value: "—",
      labelAr: "نتائج تقديرية لدعم القرار",
      labelEn: "Estimated results for decision support"
    }
  ],

  guideBtnAr: "دليل المهام التعليمية",
  guideBtnEn: "Missions Guide",
  teamSignature: "Space Hunters"
};
