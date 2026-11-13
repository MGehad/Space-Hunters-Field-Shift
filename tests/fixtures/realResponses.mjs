// Real responses captured on 2026-11-13 from the live services (trimmed to the fields the parsers read).

// ORNL DAAC MOD13Q1 subset, 30.82 N 31.31 E, A2025305–A2026049.
const dates = [
  ['A2025305', '2025-11-01', '2025322123641', 5397, 0], ['A2025321', '2025-11-17', '2025339121558', 6353, 0],
  ['A2025337', '2025-12-03', '2025353224145', 7184, 0], ['A2025353', '2025-12-19', '2026005202529', 7904, 1],
  ['A2026001', '2026-01-01', '2026019192025', 7115, 0], ['A2026017', '2026-01-17', '2026034005031', 7715, 0],
  ['A2026033', '2026-02-02', '2026051100633', 6037, 1], ['A2026049', '2026-02-18', '2026071115034', 7474, 1],
];
const subset = (band, index, units, scale) => ({
  cellsize: 231.656358264, units, scale, latitude: 30.82, longitude: 31.31, band,
  subset: dates.map((row) => ({ modis_date: row[0], calendar_date: row[1], band, tile: 'h20v05', proc_date: row[2], data: [row[index]] })),
});
export const MODIS_NDVI_EGYPT = subset('250m_16_days_NDVI', 3, 'NDVI ratio - No units', '0.0001');
export const MODIS_RELIABILITY_EGYPT = subset('250m_16_days_pixel_reliability', 4, 'rank', 'Not Available');
export const MODIS_TOO_MANY_DATES = '"Subset time period A2025305 to A2026113 exceeds maximum subset tiles support of 10."\n';

// Open-Meteo archive, models=era5, 30.82 N 31.31 E, 2026-01-30 → 2026-02-02.
export const ERA5_EGYPT = {
  latitude: 30.75, longitude: 31.25, generationtime_ms: 0.167, utc_offset_seconds: 0, timezone: 'GMT', timezone_abbreviation: 'GMT', elevation: 6,
  daily_units: { time: 'iso8601', temperature_2m_mean: '°C', precipitation_sum: 'mm', et0_fao_evapotranspiration: 'mm', soil_moisture_0_to_7cm_mean: 'm³/m³', soil_moisture_7_to_28cm_mean: 'm³/m³' },
  daily: {
    time: ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'],
    temperature_2m_mean: [17.9, 19.7, 21.1, 18], precipitation_sum: [0, 0, 0, 0], et0_fao_evapotranspiration: [4.62, 4.82, 5.2, 4.39],
    soil_moisture_0_to_7cm_mean: [0.143, 0.143, 0.144, 0.14], soil_moisture_7_to_28cm_mean: [0.149, 0.15, 0.15, 0.148],
  },
};

// Soil Data Access, point(-93.5 42.0) in Iowa, and point(31.31 30.82) in Egypt.
export const SDA_IOWA = { Table: [
  ['mukey', 'muname', 'drclassdcd', 'aws0100wta', 'hydgrpdcd', 'slopegraddcp', 'compname', 'comppct_r', 'hzdept_r', 'hzdepb_r', 'sandtotal_r', 'silttotal_r', 'claytotal_r', 'om_r', 'awc_r', 'texture'],
  ['2835194', 'Harps clay loam, Bemis moraine, 0 to 2 percent slopes', 'Poorly drained', '18.93', 'C/D', '1', 'Harps', '85', '0', '20', '30', '42', '28', '7', '0.18', 'CL'],
] };
export const SDA_EGYPT = {};
