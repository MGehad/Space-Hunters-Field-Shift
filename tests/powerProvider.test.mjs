import test from 'node:test';
import assert from 'node:assert/strict';
import { getPowerClimatology, climatologyPeriod, POWER_REQUEST_EXAMPLE } from '../src/services/nasa/powerProvider.js';

const monthValues = (value) => Object.fromEntries(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((month) => [month, value]));
const fixture = {
  header: { start: '1991', end: '2020', fill_value: -999 },
  properties: { parameter: {
    T2M: monthValues(20.5),
    PRECTOTCORR: monthValues(0.2),
    RH2M: { ...monthValues(55), FEB: 0 },
    ALLSKY_SFC_SW_DWN: { ...monthValues(18), JAN: -999 },
  } },
};

test('POWER request uses verified point climatology query and returns attributed monthly records', async () => {
  let requestedUrl;
  const observations = await getPowerClimatology({
    latitude: 30.825,
    longitude: 31.31,
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return { ok: true, json: async () => fixture };
    },
  });

  assert.equal(requestedUrl.pathname, '/api/temporal/climatology/point');
  assert.equal(requestedUrl.searchParams.get('community'), 'AG');
  assert.equal(requestedUrl.searchParams.get('format'), 'JSON');
  assert.equal(requestedUrl.searchParams.get('parameters'), 'T2M,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN');
  assert.equal(observations.length, 48);
  const rain = observations.find((item) => item.variable === 'PRECTOTCORR' && item.referenceDate === 'climatology:FEB');
  assert.equal(rain.value, 0.2);
  assert.equal(rain.unit, 'mm/day');
  assert.equal(rain.temporalResolution, 'Monthly climatological average');
  assert.equal(rain.temporalCoverage, '1991–2020');
  assert.equal(rain.source.dataKind, 'reference');
  assert.equal(rain.source.dataset, 'NASA POWER Agroclimatology (AG) monthly climatology');
  assert.ok(rain.source.retrievedAt);
  assert.equal(observations.find((item) => item.variable === 'ALLSKY_SFC_SW_DWN').unit, 'MJ/m²/day');
  assert.equal(observations.find((item) => item.variable === 'ALLSKY_SFC_SW_DWN').value, null);
  assert.equal(observations.find((item) => item.variable === 'RH2M' && item.referenceDate === 'climatology:FEB').value, 0);
  assert.match(POWER_REQUEST_EXAMPLE, /temporal\/climatology\/point/);
});

test('POWER rejects invalid coordinates, HTTP errors, and malformed responses', async () => {
  await assert.rejects(() => getPowerClimatology({ latitude: 91, longitude: 0, fetchImpl: async () => ({}) }), RangeError);
  await assert.rejects(() => getPowerClimatology({ latitude: 0, longitude: 0, fetchImpl: async () => ({ ok: false, status: 503 }) }), /HTTP 503/);
  await assert.rejects(() => getPowerClimatology({ latitude: 0, longitude: 0, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }), /did not include parameter values/);
});

// Header, units and key layout follow the real response for 30.825 N, 31.31 E fetched on
// 2026-11-12; T2M JAN/JUL and PRECTOTCORR JAN are the real values, the rest are placeholders.
const realClimatology = {
  header: {
    title: 'NASA/POWER Source Native Resolution Climatology Climatologies',
    api: { version: 'v2.10.0', name: 'POWER Climatology API' },
    sources: ['SYN1DEG', 'MERRA2', 'POWER'],
    fill_value: -999.0,
    range: '25-year Meteorological and Solar Monthly & Annual Climatologies (January 2001 - December 2025)',
  },
  parameters: {
    ALLSKY_SFC_SW_DWN: { units: 'MJ/m^2/day' }, PRECTOTCORR: { units: 'mm/day' }, RH2M: { units: '%' }, T2M: { units: 'C' },
  },
  properties: { parameter: {
    T2M: { ...monthValues(20), JAN: 13.17, JUL: 29.59, ANN: 21.9 },
    PRECTOTCORR: { ...monthValues(0.1), JAN: 0.45, ANN: 0.12 },
    RH2M: { ...monthValues(55), ANN: 55 },
    ALLSKY_SFC_SW_DWN: { ...monthValues(20), ANN: 20 },
  } },
};

test('climatology period and metadata are read from the real POWER response shape', async () => {
  const observations = await getPowerClimatology({ latitude: 30.825, longitude: 31.31, fetchImpl: async () => ({ ok: true, json: async () => realClimatology }) });
  assert.equal(observations.length, 48); // the ANN key is not turned into a month
  const jan = observations.find((item) => item.variable === 'T2M' && item.referenceDate === 'climatology:JAN');
  assert.equal(jan.value, 13.17);
  assert.equal(jan.temporalCoverage, '2001–2025');
  assert.deepEqual(jan.source.modelSources, ['SYN1DEG', 'MERRA2', 'POWER']);
  assert.equal(jan.source.apiUnit, 'C');
  assert.equal(jan.source.servedFromCache, false);
  assert.equal(climatologyPeriod({}), null);
});
