/**
 * World Map Continents, Controls, and Telemetry Reference Data
 */

export const continentLabels = [
  { textAr: 'أمريكا الشمالية', textEn: 'North America', lon: -105, lat: 56, size: 10.5, key: 'northAmerica' },
  { textAr: 'أمريكا الجنوبية', textEn: 'South America', lon: -66, lat: -25, size: 10.5, key: 'southAmerica' },
  { textAr: 'أوروبا', textEn: 'Europe', lon: 18, lat: 56, size: 10.5, key: 'europe' },
  { textAr: 'أفريقيا', textEn: 'Africa', lon: 16, lat: -8, size: 11.5, key: 'africa' },
  { textAr: 'آسيا', textEn: 'Asia', lon: 88, lat: 54, size: 13.5, key: 'asia' },
  { textAr: 'أستراليا', textEn: 'Australia', lon: 134, lat: -36, size: 10.5, key: 'oceania' }
];

export const mapControlsData = {
  recenterTooltipAr: "توسيط الخريطة على البلد المحدد",
  recenterTooltipEn: "Recenter Map on Selected Mission",
  recenterBtnAr: "تركيز الخريطة",
  recenterBtnEn: "Recenter map",
  prevMissionTooltipAr: "المهمة السابقة",
  prevMissionTooltipEn: "Previous Mission",
  nextMissionTooltipAr: "المهمة التالية",
  nextMissionTooltipEn: "Next Mission",
  missionNumberPrefixAr: "المهمة رقم ",
  missionNumberPrefixEn: "Mission #",
  previousPerformanceCompareAr: "مقارنة باللي فات",
  previousPerformanceCompareEn: "Compared to Previous Baseline",
  switchLangTooltip: "تبديل اللغة / Switch Language",
  langLabelAr: "عربي",
  langLabelEn: "English"
};

export const briefingRolesData = {
  nasaScienceTeamAr: "فريق علماء ناسا",
  nasaScienceTeamEn: "NASA Science Team",
  agriCoopAr: "الجمعية الزراعية",
  agriCoopEn: "Agricultural Coop",
  nasaDialogFallbackAr: "قراءات الأقمار الصناعية بتوضح إننا محتاجين نختار محاصيل تستحمل الحر وتوفر في المية.",
  nasaDialogFallbackEn: "Satellite observations underscore adopting heat-tolerant and water-efficient crops.",
  agriCoopDialogFallbackAr: "لازم نوازن بين طلب السوق وتوفير المية عشان دخل الفلاح يفضل ثابت.",
  agriCoopDialogFallbackEn: "We must balance market demand with water savings to preserve farm income stability.",
  farmerDefaultNameAr: "المزارع",
  farmerDefaultNameEn: "Local Farmer",
  farmerRolePrefixAr: "مزارع محلي • ",
  farmerRolePrefixEn: "Local Farmer • ",
  farmerDefaultDialogueAr: "الزرع عندنا بيعاني من قلة المية وتغير الجو، ومحتاجين حلول سريعة.",
  farmerDefaultDialogueEn: "Our crops are suffering from severe climate water stress, and we urgently need solutions.",
  farmerQuestionFallbackAr: "إيه أحسن محصول يحمي أرضنا ويدينا إنتاج كويس لينا ولعيالنا؟",
  farmerQuestionFallbackEn: "Which crop choice will best shield our land and secure a reliable yield for my family?",
  nasaDefaultNameAr: "سارة",
  nasaDefaultNameEn: "Sarah",
  nasaDefaultRoleAr: "خبيرة رصد الأرض • NASA",
  nasaDefaultRoleEn: "Lead Earth Observation Scientist • NASA",
  nasaSolutionDialogueAr: "عندنا حلول زراعية مبنية على بيانات الأقمار الصناعية. يلا نروح نختار أنسب دورة زراعية!",
  nasaSolutionDialogueEn: "We have space-calibrated options ready. Let's step into the Decision Matrix now to select the optimal crop rotation!",
  nasaTelemetryDialogueAr: (temp, soil) => `بيانات ناسا بتأكد إن الحرارة زادت ${temp} ورطوبة التربة قلت بنسبة ${soil}.`,
  nasaTelemetryDialogueEn: (temp, soil) => `NASA satellite observations confirm a ${temp} thermal anomaly and a ${soil} decline in soil moisture.`
};

export const briefingDialogueUiData = {
  missionPrefixAr: "المهمة رقم ",
  missionPrefixEn: "Mission #",
  diagnosisTitlePrefixAr: "تشخيص مشكلة الأرض: ",
  diagnosisTitlePrefixEn: "Crisis Diagnosis: ",
  resetTooltipAr: "عيد الكلام من الأول",
  resetTooltipEn: "Restart Dialogue",
  revealAllTooltipAr: "اعرض كل الرسايل",
  revealAllTooltipEn: "Show All Messages",
  skipBtnAr: "تخطي",
  skipBtnEn: "Skip",
  fieldChallengeTagAr: "المشكلة في الأرض:",
  fieldChallengeTagEn: "Challenge:",
  speakingAr: "بيتكلم...",
  speakingEn: "Speaking...",
  speakingFemaleAr: "بتتكلم...",
  speakingFemaleEn: "Speaking...",
  receivingCommsAr: "بنجيب البيانات من القمر الصناعي...",
  receivingCommsEn: "Receiving comms...",
  completeBtnAr: "كمّل ⚡",
  completeBtnEn: "Complete ⚡",
  nextBtnAr: "التالي 💬",
  nextBtnEn: "Next 💬",
  doneBtnAr: "تمام ✔️",
  doneBtnEn: "Done ✔️",
  proceedToDecisionBtnAr: "روح خد القرار 🌾",
  proceedToDecisionBtnEn: "Proceed to Decision 🌾",
  farmerRoleAr: "مزارع محلي",
  farmerRoleEn: "Local Farmer",
  nasaRoleAr: "خبيرة رصد الأرض",
  nasaRoleEn: "Earth Science Lead"
};
