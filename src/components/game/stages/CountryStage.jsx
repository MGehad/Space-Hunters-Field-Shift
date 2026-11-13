'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import WorldMapScreen from '../../WorldMapScreen';
import { missionsData } from '../../../data/missionsData';
import { useLanguage } from '../../../context/LanguageContext';
import { useGame } from '../../../game/state/GameContext';
import { getGameCountry } from '../../../game/data/gameCountries.js';
import { getGameMissionByCountry } from '../../../game/data/gameMissions.js';

/**
 * Stage 1 reuses the existing interactive world map as-is. Only the detail
 * card text and its action are supplied by the game.
 */
export default function CountryStage({ mission }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const { state, dispatch } = useGame();

  // Always show all available countries/missions so players can browse and switch on the map.
  const countries = useMemo(() => {
    // Card titles: the game mission's title in mission mode, the country's learning challenge otherwise.
    if (!mission) return missionsData.map((item) => {
      const game = getGameCountry(item.id);
      return game ? { ...item, titleAr: game.challengeAr, titleEn: game.challengeEn } : item;
    });
    return missionsData.map((item) => {
      const gameMission = getGameMissionByCountry(item.id);
      return gameMission
        ? { ...item, titleAr: gameMission.titleAr, titleEn: gameMission.titleEn }
        : item;
    });
  }, [mission]);
  const selected = countries.find((item) => item.id === state.countryId) || countries[0];

  useEffect(() => {
    if (!state.countryId) dispatch({ type: 'selectCountry', countryId: countries[0].id });
  }, [state.countryId, countries, dispatch]);

  const handleSelect = useCallback((item) => dispatch({ type: 'selectCountry', countryId: item.id }), [dispatch]);
  const handleContinue = useCallback(() => dispatch({ type: 'goto', stage: 'farmer' }), [dispatch]);

  const game = getGameCountry(selected.id);
  const detail = useMemo(() => ({
    hideMetrics: true,
    title: mission ? (ar ? mission.titleAr : mission.titleEn) : (ar ? `التحدي: ${game.challengeAr}` : `Challenge: ${game.challengeEn}`),
    intro: mission ? `${ar ? game.introAr : game.introEn} ${ar ? mission.problemAr : mission.problemEn}` : (ar ? game.introAr : game.introEn),
    startLabel: ar ? 'بدء الاستشارة' : 'Start the consultation',
  }), [mission, game, ar]);

  return (
    <WorldMapScreen
      missions={countries}
      selectedMission={selected}
      setSelectedMission={handleSelect}
      onStartMission={handleContinue}
      detail={detail}
    />
  );
}
