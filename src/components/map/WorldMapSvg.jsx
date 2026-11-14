'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import worldData from 'world-atlas/countries-110m.json';
import { useLanguage } from '../../context/LanguageContext';

/* CONTINENT COLOR PALETTE */
const PALETTE = {
  northAmerica: { fill: '#0b4072', fillHover: '#135c9e', stroke: '#38bdf8', glow: '#38bdf8', label: '#bae6fd' },
  southAmerica: { fill: '#0a4a2e', fillHover: '#0f6e45', stroke: '#34d399', glow: '#34d399', label: '#6ee7b7' },
  europe: { fill: '#0d504b', fillHover: '#13756d', stroke: '#2dd4bf', glow: '#2dd4bf', label: '#5eead4' },
  africa: { fill: '#6e2b00', fillHover: '#963b00', stroke: '#fbbf24', glow: '#fbbf24', label: '#fde68a' },
  asia: { fill: '#6e1010', fillHover: '#941616', stroke: '#f87171', glow: '#f87171', label: '#fca5a5' },
  oceania: { fill: '#421682', fillHover: '#591cb3', stroke: '#c084fc', glow: '#c084fc', label: '#e9d5ff' },
};

/* ISO 3166-1 NUMERIC → CONTINENT MAPPING */
const AFRICA_IDS = new Set([
  12, 24, 72, 108, 120, 132, 140, 148, 174, 175, 178, 180, 204, 226, 231, 232,
  262, 266, 270, 288, 324, 384, 404, 426, 430, 434, 450, 454, 466, 478, 480,
  504, 508, 516, 562, 566, 624, 638, 646, 678, 694, 706, 710, 716, 728, 729,
  732, 788, 800, 818, 834, 854, 894,
]);
const EUROPE_IDS = new Set([
  8, 20, 40, 56, 70, 100, 112, 191, 196, 203, 208, 233, 246, 250, 276, 300,
  348, 352, 372, 380, 428, 438, 440, 442, 470, 492, 498, 499, 528, 578, 616,
  620, 642, 674, 688, 703, 705, 724, 752, 756, 804, 826, 807, 831, 832, 833,
]);
const NORTH_AMERICA_IDS = new Set([
  28, 44, 52, 60, 84, 124, 136, 188, 192, 212, 214, 218, 222, 308, 312, 316,
  320, 332, 340, 388, 474, 484, 500, 531, 533, 534, 535, 591, 630, 659, 660,
  662, 663, 666, 670, 780, 796, 840, 850,
]);
const SOUTH_AMERICA_IDS = new Set([
  32, 68, 76, 152, 170, 238, 254, 328, 600, 604, 740, 858, 862,
]);
const OCEANIA_IDS = new Set([
  36, 184, 242, 258, 296, 520, 540, 548, 570, 574, 580, 583, 584, 585,
  598, 612, 772, 776, 798, 882, 886,
]);

function getContinent(numericId) {
  const id = parseInt(numericId, 10);
  if (AFRICA_IDS.has(id)) return 'africa';
  if (EUROPE_IDS.has(id)) return 'europe';
  if (NORTH_AMERICA_IDS.has(id)) return 'northAmerica';
  if (SOUTH_AMERICA_IDS.has(id)) return 'southAmerica';
  if (OCEANIA_IDS.has(id)) return 'oceania';
  return 'asia';
}

import { continentLabels } from '../../data/worldMapData';

const OCEAN_LABELS = [
  { text: 'ARCTIC OCEAN',   lon:   0,   lat:  82 },
  { text: 'PACIFIC OCEAN',  lon: -140,  lat: -10 },
  { text: 'ATLANTIC OCEAN', lon:  -30,  lat:  18 },
  { text: 'INDIAN OCEAN',   lon:   75,  lat: -22 },
  { text: 'SOUTHERN OCEAN', lon:    0,  lat: -68 },
];

const CRISIS_COLOR = {
  water:   '#38bdf8',
  temp:    '#f87171',
  soil:    '#34d399',
  drought: '#fbbf24',
  extreme: '#c084fc',
};

const MISSION_CONTINENT = { egypt: 'africa', brazil: 'southAmerica', india: 'asia', usa: 'northAmerica', australia: 'oceania', spain: 'europe' };

/* Countries are drawn once per continent group. The glow filter is applied to
   six groups instead of ~180 individual paths, and the layer is memoised so
   panning the map (a transform on the parent group) never re-renders it. */
const CountryLayer = React.memo(function CountryLayer({ pathsByContinent, selectedContinent }) {
  return Object.entries(pathsByContinent).map(([continent, paths]) => {
    const pal = PALETTE[continent];
    const isSel = continent === selectedContinent;
    return (
      <g
        key={continent}
        fill={pal.fill}
        fillOpacity={isSel ? 0.95 : 0.78}
        stroke={pal.stroke}
        strokeWidth={isSel ? 1.25 : 0.5}
        strokeOpacity={isSel ? 1.0 : 0.55}
        filter={`url(#glow-${isSel ? 'sel-' : ''}${continent})`}
      >
        {paths.map(({ id, d }) => <path key={id} d={d} />)}
      </g>
    );
  });
});

export default function WorldMapSvg({
  width,
  height,
  pan,
  isDragging,
  missions,
  selectedMission,
  setSelectedMission,
  beaconPositions,
  project,
  isMobile = false
}) {
  const { lang } = useLanguage();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  /* Build projection + path generator */
  const { countries, pathGen } = useMemo(() => {
    const scale = isMobile ? 155 : 118;
    // On mobile use a vertically centered translate so map fills portrait view
    const tx = isMobile ? width / 2 + 25 : width / 2 + 55;
    const ty = isMobile ? height / 2 - 30 : height / 2 - 95;
    const proj = geoNaturalEarth1()
      .scale(scale)
      .translate([tx, ty]);
    const pg = geoPath(proj);
    const countries = feature(worldData, worldData.objects.countries);
    return { countries, pathGen: pg };
  }, [width, height, isMobile]);

  /* Pre-compute SVG paths per country */
  const pathsByContinent = useMemo(() => {
    const groups = Object.fromEntries(Object.keys(PALETTE).map((key) => [key, []]));
    countries.features.forEach((f, idx) => {
      const d = pathGen(f);
      if (!d) return;
      groups[getContinent(f.id)].push({ id: f.id != null ? f.id : `country-${idx}`, d });
    });
    return groups;
  }, [countries, pathGen]);
  const selectedContinent = MISSION_CONTINENT[selectedMission?.id] || null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={lang === 'ar' ? 'خريطة العالم للمهام التعليمية' : 'World map of learning missions'}
      className="w-full h-full select-none"
      preserveAspectRatio={isMobile ? "xMidYMid slice" : "xMidYMid meet"}
    >
      <defs>
        {Object.entries(PALETTE).map(([key, pal]) => (
          <React.Fragment key={key}>
            {/* Standard subtle glow filter */}
            <filter id={`glow-${key}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feFlood floodColor={pal.glow} floodOpacity="0.45" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Selected continent matching color glow */}
            <filter id={`glow-sel-${key}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.0" result="blur" />
              <feFlood floodColor={pal.glow} floodOpacity="0.75" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </React.Fragment>
        ))}
      </defs>

      {/* Map Group with Pan Transformation */}
      <g transform={`translate(${pan.x}, ${pan.y})`} style={{ transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* 1. Ocean Labels */}
        {OCEAN_LABELS.map(({ text, lon, lat }) => {
          const [ox, oy] = project([lon, lat]) || [0, 0];
          return (
            <text key={text} x={ox} y={oy} textAnchor="middle"
              fontSize="8" fill="rgba(103,232,249,0.3)" fontWeight="600"
              letterSpacing="2" aria-hidden="true"
              style={{ pointerEvents: 'none' }}>
              {text}
            </text>
          );
        })}

        {/* 2. Country Paths */}
        <CountryLayer pathsByContinent={pathsByContinent} selectedContinent={selectedContinent} />

        {/* 3. Mission Beacons */}
        {missions.map(m => {
          const pos = beaconPositions[m.id];
          if (!pos || isNaN(pos.x)) return null;
          const isSel = selectedMission.id === m.id;
          const mc = CRISIS_COLOR[m.crisisType] || CRISIS_COLOR.temp;
          const R = isSel ? (isMobile ? 13 : 11) : (isMobile ? 10.5 : 9);
          const P = isSel ? (isMobile ? 22 : 18) : (isMobile ? 17 : 14);
          return (
            <g key={m.id}
              transform={`translate(${pos.x},${pos.y})`}
              onClick={() => setSelectedMission(m)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedMission(m); } }}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              aria-label={lang === 'ar' ? `مهمة ${m.countryAr}` : `${m.countryEn} mission`}
              style={{ cursor: 'pointer' }}
            >
              {/* Invisible large touch target for mobile fingertips */}
              <circle r="28" fill="transparent" />

              {/* Outer animated pulse ring */}
              <circle r={P} fill={mc} fillOpacity="0.12" stroke={mc} strokeWidth="0.8">
{!reduceMotion && isSel && <>
                  <animate attributeName="r" values={`${P - 2};${P + 6};${P - 2}`} dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="fill-opacity" values="0.22;0.03;0.22" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.7;0.1;0.7" dur="2.4s" repeatCount="indefinite" />
                </>}
              </circle>
              {/* Mid ring */}
              <circle r={R + 3.5} fill={mc} fillOpacity="0.18" stroke={mc} strokeWidth="0.7" />
              {/* Inner circle */}
              <circle r={R} fill={isSel ? 'rgba(255,255,255,0.95)' : 'rgba(7, 22, 44, 0.75)'} stroke={mc} strokeWidth={isSel ? 2.6 : 1.7} fillOpacity={isSel ? 0.98 : 0.8} />
              {/* Flag emoji */}
              <text x="0" y={R * 0.35} textAnchor="middle" dominantBaseline="middle"
                fontSize={R * 1.05} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {m.flag}
              </text>
              {/* Country label */}
              <text x="0" y={R + 12} textAnchor="middle" fontSize={isMobile ? "10" : "9"}
                fontWeight="700" fill="#f1f5f9" stroke="#020712" strokeWidth="2.5" paintOrder="stroke"
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {lang === 'ar' ? m.countryAr : m.countryEn}
              </text>
            </g>
          );
        })}

        {/* 4. Continent Labels */}
        {continentLabels.map(({ textAr, textEn, lon, lat, size, key }) => {
          const [lx, ly] = project([lon, lat]) || [0, 0];
          return (
            <text key={key} x={lx} y={ly} textAnchor="middle"
              fontSize={size} fontWeight="700" fill={PALETTE[key].label}
              fillOpacity="0.95" stroke="#020712" strokeOpacity="0.7" strokeWidth="2.5" paintOrder="stroke"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {lang === 'ar' ? textAr : textEn}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
