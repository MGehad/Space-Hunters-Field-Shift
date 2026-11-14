import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { GAME_COUNTRIES, ASSISTANT_QUESTIONS } from '../src/game/data/gameCountries.js';
import { GAME_MISSIONS, DIFFICULTY } from '../src/game/data/gameMissions.js';
import { GAME_CROPS } from '../src/game/data/gameCrops.js';
import { egyptMission } from '../src/data/missions/egypt.js';
import { brazilMission } from '../src/data/missions/brazil.js';
import { indiaMission } from '../src/data/missions/india.js';
import { usaMission } from '../src/data/missions/usa.js';
import { australiaMission } from '../src/data/missions/australia.js';
import { spainMission } from '../src/data/missions/spain.js';

const IDENTITIES = [egyptMission, brazilMission, indiaMission, usaMission, australiaMission, spainMission];
const cropIds = new Set(GAME_CROPS.map((crop) => crop.id));
const text = (value) => typeof value === 'string' && value.trim().length > 0;

test('missions index lists every country identity file', () => {
  const index = readFileSync(new URL('../src/data/missions/index.js', import.meta.url), 'utf8');
  for (const identity of IDENTITIES) assert.match(index, new RegExp(`${identity.id}Mission`), identity.id);
  assert.equal(new Set(IDENTITIES.map((m) => m.id)).size, IDENTITIES.length);
  assert.equal(new Set(IDENTITIES.map((m) => m.code)).size, IDENTITIES.length, 'mission numbers are unique');
});

test('every country identity has bilingual names, a flag code and existing images', () => {
  for (const m of IDENTITIES) {
    for (const key of ['countryAr', 'countryEn', 'regionAr', 'regionEn', 'titleAr', 'titleEn', 'farmerNameAr', 'farmerNameEn']) assert.ok(text(m[key]), `${m.id}.${key}`);
    assert.equal([...m.flag].length, 2, `${m.id} flag is two regional-indicator symbols`);
    assert.ok(DIFFICULTY[m.difficulty], `${m.id} difficulty`);
    for (const image of [m.heroImage, m.farmerImage]) assert.ok(existsSync(new URL(`../public${image}`, import.meta.url)), `${m.id}: ${image} exists`);
  }
});

test('every country has game content: regions, crop calendar and conversation', () => {
  for (const m of IDENTITIES) {
    const country = GAME_COUNTRIES[m.id];
    assert.ok(country, `${m.id} has game content`);
    for (const key of ['introEn', 'introAr', 'challengeEn', 'challengeAr']) assert.ok(text(country[key]), `${m.id}.${key}`);
    assert.ok(country.regions.length >= 1);
    assert.equal(new Set(country.regions.map((r) => r.id)).size, country.regions.length);
    for (const region of country.regions) {
      assert.ok(Math.abs(region.latitude) <= 90 && Math.abs(region.longitude) <= 180, `${m.id}/${region.id} coordinates`);
      assert.ok(text(region.nameEn) && text(region.nameAr));
      assert.ok(region.suggestions.length >= 1);
      for (const s of region.suggestions) {
        assert.ok(cropIds.has(s.cropId), `${m.id}/${region.id} crop ${s.cropId}`);
        assert.ok(Number.isInteger(s.plantingMonth) && s.plantingMonth >= 1 && s.plantingMonth <= 12);
      }
    }
    assert.ok(country.script.length >= 3);
    for (const line of country.script) {
      assert.ok(['farmer', 'assistant'].includes(line.speaker));
      assert.ok(text(line.textEn) && text(line.textAr));
    }
    assert.deepEqual(country.farmerQuestions.map((q) => q.id), ['grow', 'worry']);
    for (const q of country.farmerQuestions) for (const key of ['qEn', 'qAr', 'aEn', 'aAr']) assert.ok(text(q[key]), `${m.id}/${q.id}.${key}`);
  }
  assert.ok(ASSISTANT_QUESTIONS.length >= 1);
  assert.equal(Object.keys(GAME_COUNTRIES).length, IDENTITIES.length, 'no game content without a map identity');
});

test('every ready-made mission points to a real country, region and crops', () => {
  assert.equal(new Set(GAME_MISSIONS.map((m) => m.id)).size, GAME_MISSIONS.length);
  for (const mission of GAME_MISSIONS) {
    const country = GAME_COUNTRIES[mission.countryId];
    assert.ok(country, `${mission.id} country`);
    const region = country.regions.find((r) => r.id === mission.regionId);
    assert.ok(region, `${mission.id} region`);
    for (const id of mission.cropIds) assert.ok(cropIds.has(id), `${mission.id} crop ${id}`);
    assert.ok(mission.cropIds.includes(mission.defaultCropId), `${mission.id} default crop is offered`);
    assert.ok(region.suggestions.some((s) => s.cropId === mission.defaultCropId), `${mission.id} default crop has a planting month in its region`);
    assert.ok(DIFFICULTY[mission.difficulty]);
    assert.ok(Number.isInteger(mission.startYear) && mission.startYear >= 2001);
    for (const key of ['titleEn', 'titleAr', 'problemEn', 'problemAr', 'goalEn', 'goalAr']) assert.ok(text(mission[key]), `${mission.id}.${key}`);
  }
  for (const m of IDENTITIES) assert.ok(GAME_MISSIONS.some((mission) => mission.countryId === m.id), `${m.id} has a ready-made mission`);
});

test('Spain is placed in Europe on the map and the carousel derives its code', () => {
  const screen = readFileSync(new URL('../src/components/WorldMapScreen.jsx', import.meta.url), 'utf8');
  const svg = readFileSync(new URL('../src/components/map/WorldMapSvg.jsx', import.meta.url), 'utf8');
  for (const m of IDENTITIES) {
    assert.match(screen, new RegExp(`\\b${m.id}: \\[`), `${m.id} map coordinates`);
    assert.match(svg, new RegExp(`\\b${m.id}: '`), `${m.id} continent`);
  }
  assert.match(svg, /spain: 'europe'/);
  const carousel = readFileSync(new URL('../src/components/map/MissionsCarousel.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(carousel, /: 'AU'/, 'no hard-coded fallback country code');
});
