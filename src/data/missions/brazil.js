/**
 * Brazil: identity used by the world map and the Educational Missions game
 * (name, flag, images, farmer character, map position and marker category).
 *
 * The earlier telemetry, soil figures, yields, rotations, results and scripted
 * NASA dialogue were invented sample values and have been removed. Real
 * environmental values come only from NASA POWER at run time.
 */
export const brazilMission = {
  id: "brazil",
  code: "02",
  countryAr: "البرازيل",
  countryEn: "Brazil",
  regionAr: "أمريكا الجنوبية",
  regionEn: "South America",
  flag: "🇧🇷",
  difficulty: "hard",
  titleAr: "تآكل التربة والزراعة مع الشجر",
  titleEn: "Soil Erosion & Agroforestry Rotations",
  heroImage: "/images/brazil_amazon.jpg",
  farmerImage: "/images/farmer_brazil.jpg",
  farmerNameAr: "المهندس خوسيه",
  farmerNameEn: "José",
  mapCoords: {
    x: 34,
    y: 64
  },
  crisisType: "soil"
};
