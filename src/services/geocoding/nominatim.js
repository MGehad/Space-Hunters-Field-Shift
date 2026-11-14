/**
 * Place search for the Location step, using the OpenStreetMap Nominatim API
 * (worldwide, no API key). Usage policy: at most one request per second, no
 * search-as-you-type, and visible "© OpenStreetMap contributors" attribution.
 * The interface therefore searches only when the user submits the query.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
import { requestData } from '../data/http.js';

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
export const GEOCODER_SOURCE = 'OpenStreetMap Nominatim';

const acceptLanguage = (lang) => (lang === 'ar' ? 'ar,en' : 'en');

/** "30.82, 31.31" or "30.82 31.31" → { latitude, longitude }; anything else → null. */
export function parseCoordinateQuery(query) {
  const match = String(query || '').trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,،\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/** Shorten "Village, District, Governorate, Region, Country" to its first three parts. */
export function shortPlaceLabel(displayName, parts = 3) {
  return String(displayName || '').split(/[,،]/).map((part) => part.trim()).filter(Boolean).slice(0, parts).join(', ');
}

export function normalizeSearchResults(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => ({
      id: String(item.place_id ?? `${item.lat},${item.lon}`),
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      name: item.name || shortPlaceLabel(item.display_name, 1),
      displayName: item.display_name || '',
      type: item.addresstype || item.type || '',
    }))
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

/** Search any place name worldwide. Returns up to `limit` results, nearest match first. */
export async function searchPlaces(query, { lang = 'en', limit = 6, signal, fetchImpl } = {}) {
  const text = String(query || '').trim();
  if (text.length < 2) return [];
  const params = new URLSearchParams({ q: text, format: 'jsonv2', limit: String(limit), 'accept-language': acceptLanguage(lang) });
  const { data } = await requestData(`${SEARCH_URL}?${params}`, {
    signal, fetchImpl, timeoutMs: 12000, retries: 1, ttlMs: 24 * 60 * 60 * 1000, source: GEOCODER_SOURCE,
  });
  return normalizeSearchResults(data);
}

/** Name of the place at a point (used after "My location"). Returns null when none is known. */
export async function reversePlace(latitude, longitude, { lang = 'en', signal, fetchImpl } = {}) {
  const params = new URLSearchParams({
    lat: String(latitude), lon: String(longitude), format: 'jsonv2', zoom: '12', 'accept-language': acceptLanguage(lang),
  });
  const { data } = await requestData(`${REVERSE_URL}?${params}`, {
    signal, fetchImpl, timeoutMs: 12000, retries: 0, ttlMs: 24 * 60 * 60 * 1000, source: GEOCODER_SOURCE,
  });
  if (!data || data.error || !data.display_name) return null;
  return shortPlaceLabel(data.display_name);
}
