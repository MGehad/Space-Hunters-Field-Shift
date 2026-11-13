/**
 * USDA NRCS soil survey (SSURGO) for one point, through the Soil Data Access
 * web service. United States and territories only.
 *
 * Verified on 2026-11-13: POST https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest,
 * no key, answers browser requests from other sites. A point in Iowa returned
 * "Harps clay loam" (poorly drained, 18.93 cm available water storage in 0–100 cm);
 * a point in the Nile Delta returned an empty answer.
 *
 * Values are survey map-unit attributes (mapped at roughly 1:12,000–1:63,360), not
 * a laboratory test of the field. Points outside the US are never sent.
 */
import { requestData, DataSourceError } from '../data/http.js';
import { isPossiblyInUnitedStates, isValidPoint } from '../data/coverage.js';

export const SDA_URL = 'https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest';
export const SDA_DOCS_URL = 'https://sdmdataaccess.nrcs.usda.gov/WebServiceHelp.aspx';
export const WSS_URL = 'https://websoilsurvey.nrcs.usda.gov/';

export const TEXTURE_NAMES = Object.freeze({
  S: 'Sand', LS: 'Loamy sand', SL: 'Sandy loam', L: 'Loam', SIL: 'Silt loam', SI: 'Silt',
  SCL: 'Sandy clay loam', CL: 'Clay loam', SICL: 'Silty clay loam', SC: 'Sandy clay', SIC: 'Silty clay', C: 'Clay',
  COS: 'Coarse sand', FS: 'Fine sand', VFS: 'Very fine sand', LCOS: 'Loamy coarse sand', LFS: 'Loamy fine sand',
  COSL: 'Coarse sandy loam', FSL: 'Fine sandy loam', VFSL: 'Very fine sandy loam', MUCK: 'Muck', PEAT: 'Peat',
});

export function ssurgoQuery(latitude, longitude) {
  const lon = Number(longitude).toFixed(6);
  const lat = Number(latitude).toFixed(6);
  return `SELECT mu.mukey, mu.muname, ma.drclassdcd, ma.aws0100wta, ma.hydgrpdcd, ma.slopegraddcp,
 c.compname, c.comppct_r, h.hzdept_r, h.hzdepb_r, h.sandtotal_r, h.silttotal_r, h.claytotal_r, h.om_r, h.awc_r, tg.texture
FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point(${lon} ${lat})') AS p
INNER JOIN mapunit mu ON mu.mukey = p.mukey
LEFT JOIN muaggatt ma ON ma.mukey = mu.mukey
LEFT JOIN component c ON c.mukey = mu.mukey AND c.cokey = (SELECT TOP 1 c2.cokey FROM component c2 WHERE c2.mukey = mu.mukey ORDER BY c2.comppct_r DESC)
LEFT JOIN chorizon h ON h.cokey = c.cokey AND h.hzdept_r = 0
LEFT JOIN chtexturegrp tg ON tg.chkey = h.chkey AND tg.rvindicator = 'Yes'`;
}

const num = (value) => (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));

/** Parse a "JSON+COLUMNNAME" answer (first row = column names). */
export function parseSsurgo(json) {
  const table = json?.Table;
  if (!Array.isArray(table) || table.length < 2) return { status: 'no-map-unit' };
  const [header, row] = table;
  const get = (name) => row[header.indexOf(name)];
  const texture = get('texture') || null;
  return {
    status: 'ok',
    mapUnit: { key: get('mukey'), name: get('muname') || null },
    drainageClass: get('drclassdcd') || null,
    availableWaterStorageCm: num(get('aws0100wta')),
    hydrologicGroup: get('hydgrpdcd') || null,
    slopePercent: num(get('slopegraddcp')),
    component: { name: get('compname') || null, percent: num(get('comppct_r')) },
    surface: {
      topCm: num(get('hzdept_r')), bottomCm: num(get('hzdepb_r')),
      sandPct: num(get('sandtotal_r')), siltPct: num(get('silttotal_r')), clayPct: num(get('claytotal_r')),
      organicMatterPct: num(get('om_r')), awcCmPerCm: num(get('awc_r')),
      textureCode: texture, textureName: texture ? TEXTURE_NAMES[texture.toUpperCase()] || null : null,
    },
  };
}

export async function getSsurgoAtPoint({ latitude, longitude, signal, fetchImpl }) {
  if (!isValidPoint(latitude, longitude)) throw new DataSourceError('bad-request', 'Invalid coordinates', { source: 'SSURGO' });
  if (!isPossiblyInUnitedStates(latitude, longitude)) return { status: 'not-covered' };
  const answer = await requestData(SDA_URL, {
    init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: 'JSON+COLUMNNAME', query: ssurgoQuery(latitude, longitude) }) },
    signal, timeoutMs: 25000, retries: 1, ttlMs: 24 * 60 * 60 * 1000, source: 'SSURGO', fetchImpl,
  });
  return { ...parseSsurgo(answer.data), request: { latitude, longitude }, retrievedAt: answer.retrievedAt, fromCache: answer.fromCache };
}
