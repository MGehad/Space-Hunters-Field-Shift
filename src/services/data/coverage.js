/**
 * Geographic coverage checks, used before a request is sent.
 *
 * USDA SSURGO covers the United States and its territories only. These boxes
 * are deliberately generous approximations; a point inside a box but outside
 * the survey (for example in Canada or Mexico) is still answered honestly,
 * because Soil Data Access then returns no map unit and the interface says so.
 * A point outside every box is never sent to the US-only service.
 */
const US_BOXES = [
  { name: 'Contiguous United States', south: 24.3, north: 49.5, west: -125.0, east: -66.8 },
  { name: 'Alaska', south: 51.0, north: 71.6, west: -180.0, east: -129.9 },
  { name: 'Alaska (Aleutians west of 180°)', south: 51.0, north: 53.1, west: 172.4, east: 180.0 },
  { name: 'Hawaii', south: 18.8, north: 22.4, west: -160.4, east: -154.7 },
  { name: 'Puerto Rico and US Virgin Islands', south: 17.6, north: 18.6, west: -67.4, east: -64.5 },
  { name: 'Guam and Northern Mariana Islands', south: 13.2, north: 20.6, west: 144.6, east: 146.1 },
  { name: 'American Samoa', south: -14.6, north: -14.1, west: -171.1, east: -168.1 },
];

export function isPossiblyInUnitedStates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return US_BOXES.some((box) => latitude >= box.south && latitude <= box.north && longitude >= box.west && longitude <= box.east);
}

export function isValidPoint(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}
