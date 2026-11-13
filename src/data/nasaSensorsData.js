/**
 * Informational sensor references. These are not integrated observation data.
 */

export const nasaSensorsHeader = {
  titleAr: "معلومات عن أقمار رصد الأرض",
  titleEn: "Earth-observation sensor references",
  subAr: "دي معلومات عامة عن أقمار ممكن تتابع الأرض؛ بس البيانات دي مش متوصلة جوا التطبيق.",
  subEn: "General information about possible sensors; these products are not integrated in this application.",
  accuracyStampAr: "دقة التحليل الزراعي:",
  accuracyStampEn: "Agronomic analysis accuracy:",
  accuracyScoreAr: "مش متقيمة هنا",
  accuracyScoreEn: "Not evaluated"
};

export const nasaSensorCards = [
  {
    id: "smap",
    satellite: "🛰️ NASA SMAP",
    badge: "Soil Moisture",
    borderColor: "border-sky-500/40",
    titleColor: "text-sky-300",
    badgeBg: "bg-sky-950 text-sky-400 border-sky-500/30",
    descAr: "بيانات SMAP مش متوصلة هنا؛ ومفيش قراية لرطوبة التربة في الشاشة دي.",
    descEn: "SMAP observations are not integrated here; no soil-moisture reading is available."
  },
  {
    id: "landsat",
    satellite: "🛰️ Landsat-9 (LST)",
    badge: "Surface Temp",
    borderColor: "border-red-500/40",
    titleColor: "text-red-300",
    badgeBg: "bg-red-950 text-red-400 border-red-500/30",
    descAr: "بيانات Landsat مش متوصلة هنا؛ ومفيش قراية لحرارة سطح الأرض.",
    descEn: "Landsat data are not integrated here; no surface-temperature reading is available."
  },
  {
    id: "modis",
    satellite: "🛰️ MODIS / NDVI",
    badge: "Vegetation Index",
    borderColor: "border-emerald-500/40",
    titleColor: "text-emerald-300",
    badgeBg: "bg-emerald-950 text-emerald-400 border-emerald-500/30",
    descAr: "بيانات MODIS مش متوصلة هنا؛ ومفيش قراية لمؤشر الخضرة والنبات.",
    descEn: "MODIS data are not integrated here; no vegetation-index reading is available."
  },
  {
    id: "gpm",
    satellite: "🛰️ NASA GPM",
    badge: "Precipitation",
    borderColor: "border-cyan-500/40",
    titleColor: "text-cyan-300",
    badgeBg: "bg-cyan-950 text-cyan-400 border-cyan-500/30",
    descAr: "بيانات GPM مش متوصلة هنا؛ أرقام المطر اللي بتشوفها جاية من مرجع NASA POWER المناخي.",
    descEn: "GPM data are not integrated; rainfall shown elsewhere comes from NASA POWER climatology."
  }
];
