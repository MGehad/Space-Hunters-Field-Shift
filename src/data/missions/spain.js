/**
 * Spain: identity used by the world map and the Educational Missions game
 * (name, flag, images, engineer character, map position and marker category).
 *
 * Environmental values come only from NASA POWER at run time.
 * Images: spain_guadalquivir.jpg is Esri World Imagery of the Guadalquivir
 * marshes near Isla Mayor (Seville), credited on the image; engineer_spain.jpg
 * is an illustration made for this project, not a photograph.
 */
export const spainMission = {
  id: "spain",
  code: "06",
  countryAr: "إسبانيا",
  countryEn: "Spain",
  regionAr: "أوروبا",
  regionEn: "Europe",
  flag: "🇪🇸",
  difficulty: "medium",
  titleAr: "الجفاف في الأندلس",
  titleEn: "Drought in Andalusia",
  heroImage: "/images/spain_guadalquivir.jpg",
  farmerImage: "/images/engineer_spain.jpg",
  farmerNameAr: "المهندس خافيير",
  farmerNameEn: "Javier",
  mapCoords: {
    x: 47,
    y: 33
  },
  crisisType: "drought"
};
