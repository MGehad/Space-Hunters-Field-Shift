/**
 * United States: identity used by the world map and the Educational Missions game
 * (name, flag, images, farmer character, map position and marker category).
 *
 * The earlier telemetry, soil figures, yields, rotations, results and scripted
 * NASA dialogue were invented sample values and have been removed. Real
 * environmental values come only from NASA POWER at run time.
 */
export const usaMission = {
  id: "usa",
  code: "04",
  countryAr: "الولايات المتحدة",
  countryEn: "United States",
  regionAr: "أمريكا الشمالية",
  regionEn: "North America",
  flag: "🇺🇸",
  difficulty: "medium",
  titleAr: "جفاف حوض أوغالالا وحماية التربة",
  titleEn: "Ogallala Aquifer Drought & Soil Conservation",
  heroImage: "/images/usa_midwest.jpg",
  farmerImage: "/images/farmer_usa.jpg",
  farmerNameAr: "المهندس جاك",
  farmerNameEn: "Jack",
  mapCoords: {
    x: 23,
    y: 36
  },
  crisisType: "drought"
};
