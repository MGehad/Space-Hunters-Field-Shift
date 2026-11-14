import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces, reversePlace, parseCoordinateQuery, shortPlaceLabel, normalizeSearchResults } from '../src/services/geocoding/nominatim.js';

// Real Nominatim answers, captured 2026-11-14 (search "Mit Ghamr"; reverse at 30.825, 31.31 in Arabic).
const SEARCH_MIT_GHAMR = [{ place_id: 48807502, lat: '30.7169001', lon: '31.2577644', name: 'Mit Ghamr City', display_name: 'Mit Ghamr City, Dakahlia Governorate, 35611, Egypt', addresstype: 'town', type: 'town' }];
const REVERSE_AGA_AR = { display_name: 'اتميدة, الدقهلية, مصر' };

const json = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });

test('geocoding: typed coordinates are recognised, place names are not', () => {
  assert.deepEqual(parseCoordinateQuery('30.825, 31.31'), { latitude: 30.825, longitude: 31.31 });
  assert.deepEqual(parseCoordinateQuery('-12.68 -55.72'), { latitude: -12.68, longitude: -55.72 });
  assert.deepEqual(parseCoordinateQuery('30.8، 31.3'), { latitude: 30.8, longitude: 31.3 });
  assert.equal(parseCoordinateQuery('Mit Ghamr'), null);
  assert.equal(parseCoordinateQuery('95, 31'), null);
  assert.equal(parseCoordinateQuery('30, 190'), null);
});

test('geocoding: search builds a Nominatim request and normalises the answer', async () => {
  let requested = '';
  const results = await searchPlaces('Mit Ghamr', { lang: 'ar', fetchImpl: async (url) => { requested = url; return json(SEARCH_MIT_GHAMR); } });
  const url = new URL(requested);
  assert.equal(url.origin + url.pathname, 'https://nominatim.openstreetmap.org/search');
  assert.equal(url.searchParams.get('q'), 'Mit Ghamr');
  assert.equal(url.searchParams.get('format'), 'jsonv2');
  assert.equal(url.searchParams.get('accept-language'), 'ar,en');
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Mit Ghamr City');
  assert.equal(results[0].latitude, 30.7169001);
  assert.equal(results[0].longitude, 31.2577644);
  assert.equal(shortPlaceLabel(results[0].displayName), 'Mit Ghamr City, Dakahlia Governorate, 35611');
});

test('geocoding: too-short queries make no request; bad rows are dropped', async () => {
  let calls = 0;
  assert.deepEqual(await searchPlaces(' a ', { fetchImpl: async () => { calls += 1; return json([]); } }), []);
  assert.equal(calls, 0);
  assert.deepEqual(normalizeSearchResults([{ lat: 'x', lon: '1' }]), []);
  assert.deepEqual(normalizeSearchResults({ error: 'x' }), []);
});

test('geocoding: reverse lookup returns a short place name, or null', async () => {
  assert.equal(await reversePlace(30.825, 31.31, { lang: 'ar', fetchImpl: async () => json(REVERSE_AGA_AR) }), 'اتميدة, الدقهلية, مصر');
  assert.equal(await reversePlace(0, -150, { fetchImpl: async () => json({ error: 'Unable to geocode' }) }), null);
});
