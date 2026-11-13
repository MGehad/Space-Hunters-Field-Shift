/**
 * India: identity used by the world map and the Educational Missions game
 * (name, flag, images, farmer character, map position and marker category).
 *
 * The earlier telemetry, soil figures, yields, rotations, results and scripted
 * NASA dialogue were invented sample values and have been removed. Real
 * environmental values come only from NASA POWER at run time.
 */
export const indiaMission = {
  id: "india",
  code: "03",
  countryAr: "الهند",
  countryEn: "India",
  regionAr: "جنوب آسيا",
  regionEn: "South Asia",
  flag: "🇮🇳",
  difficulty: "medium",
  titleAr: "الحر الشديد وتبخر المياه في البنجاب",
  titleEn: "Extreme Heat & Evaporative Stress in Punjab",
  heroImage: "/images/india_farm.jpg",
  farmerImage: "/images/farmer_india.jpg",
  farmerNameAr: "راميش",
  farmerNameEn: "Ramesh",
  mapCoords: {
    x: 69,
    y: 48
  },
  crisisType: "temp"
};
