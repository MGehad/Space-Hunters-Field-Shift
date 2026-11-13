/**
 * Egypt: identity used by the world map and the Educational Missions game
 * (name, flag, images, farmer character, map position and marker category).
 *
 * The earlier telemetry, soil figures, yields, rotations, results and scripted
 * NASA dialogue were invented sample values and have been removed. Real
 * environmental values come only from NASA POWER at run time.
 */
export const egyptMission = {
  id: "egypt",
  code: "01",
  countryAr: "مصر",
  countryEn: "Egypt",
  regionAr: "شمال أفريقيا",
  regionEn: "North Africa",
  flag: "🇪🇬",
  difficulty: "medium",
  titleAr: "نقص المياه والدورة الزراعية في الدلتا",
  titleEn: "Water Scarcity & Nile Delta Crop Rotation",
  heroImage: "/images/egypt_pyramids.jpg",
  farmerImage: "/images/farmer_egypt.jpg",
  farmerNameAr: "المهندس أحمد",
  farmerNameEn: "Ahmed",
  mapCoords: {
    x: 58,
    y: 44
  },
  crisisType: "water"
};
