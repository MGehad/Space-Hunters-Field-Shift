/**
 * Australia: identity used by the world map and the Educational Missions game
 * (name, flag, images, farmer character, map position and marker category).
 *
 * The earlier telemetry, soil figures, yields, rotations, results and scripted
 * NASA dialogue were invented sample values and have been removed. Real
 * environmental values come only from NASA POWER at run time.
 */
export const australiaMission = {
  id: "australia",
  code: "05",
  countryAr: "أستراليا",
  countryEn: "Australia",
  regionAr: "أوقيانوسيا",
  regionEn: "Oceania",
  flag: "🇦🇺",
  difficulty: "hard",
  titleAr: "الجفاف وملوحة الأرض في حوض موراي-دارلينج",
  titleEn: "Drought & Soil Salinity in Murray-Darling",
  heroImage: "/images/australia_drought.jpg",
  farmerImage: "/images/farmer_australia.jpg",
  farmerNameAr: "المهندس ماثيو",
  farmerNameEn: "Mathew",
  mapCoords: {
    x: 82,
    y: 78
  },
  crisisType: "extreme"
};
