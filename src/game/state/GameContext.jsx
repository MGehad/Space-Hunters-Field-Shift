'use client';

/**
 * Game state for the Educational Missions experience. It is deliberately
 * independent of WorkingSessionContext (the decision-support workflow): the
 * two experiences share no state and use different storage keys.
 */
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { DEFAULT_DECISIONS } from '../engine/simulate.js';
import { getGameMission, getGameMissionByCountry } from '../data/gameMissions.js';
import { getGameCountry } from '../data/gameCountries.js';

export const GAME_STORAGE_KEY = 'space-hunters-game-v1';
export const GAME_STAGES = Object.freeze(['country', 'farmer', 'setup', 'decisions', 'simulation', 'report']);
const MAX_SAVED = 12;

const initialState = Object.freeze({
  stage: 'home',
  mode: null,            // 'mission' | 'open'
  missionId: null,
  countryId: null,
  regionId: null,
  conversation: { step: 0, asked: [] },
  cropId: null,
  startYear: null,
  plantingMonth: null,
  decisions: DEFAULT_DECISIONS,
  simMonth: 0,
  reached: 0,            // furthest stage index visited in this experiment
  experiments: [],
  compareIds: [],
  hydrated: false,
});

const freshExperiment = { missionId: null, countryId: null, regionId: null, conversation: { step: 0, asked: [] }, cropId: null, startYear: null, plantingMonth: null, decisions: DEFAULT_DECISIONS, simMonth: 0, reached: 0 };

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.saved, hydrated: true };
    case 'home':
      return { ...state, stage: 'home' };
    case 'finishMission':
      return { ...state, ...freshExperiment, mode: null, stage: 'home' };
    case 'goto-compare':
      return { ...state, stage: 'compare' };
    case 'startOpen':
      return { ...state, ...freshExperiment, mode: 'open', stage: 'country' };
    case 'startMission': {
      const mission = getGameMission(action.missionId);
      if (!mission) return state;
      return { ...state, ...freshExperiment, mode: 'mission', missionId: mission.id, countryId: mission.countryId, regionId: mission.regionId, cropId: mission.defaultCropId, startYear: mission.startYear, stage: 'country' };
    }
    case 'resume':
      return state.mode ? { ...state, stage: GAME_STAGES[Math.min(state.reached, GAME_STAGES.length - 1)] } : state;
    case 'goto': {
      const index = GAME_STAGES.indexOf(action.stage);
      if (index < 0) return state;
      return { ...state, stage: action.stage, reached: Math.max(state.reached, index) };
    }
    case 'selectCountry': {
      if (action.countryId === state.countryId) return state;
      if (state.mode === 'mission') {
        const nextMission = getGameMissionByCountry(action.countryId);
        if (!nextMission) return state;
        return {
          ...state,
          ...freshExperiment,
          mode: 'mission',
          missionId: nextMission.id,
          countryId: nextMission.countryId,
          regionId: nextMission.regionId,
          cropId: nextMission.defaultCropId,
          startYear: nextMission.startYear,
          stage: 'country',
        };
      }
      const country = getGameCountry(action.countryId);
      if (!country) return state;
      // A new country starts a new conversation and clears place-specific choices.
      return { ...state, countryId: country.id, regionId: country.regions[0].id, conversation: { step: 0, asked: [] }, plantingMonth: null, simMonth: 0, reached: Math.min(state.reached, 0) };
    }
    case 'conversation':
      return { ...state, conversation: { ...state.conversation, ...action.patch } };
    case 'setup':
      // Changing the experiment definition restarts the monthly walk-through.
      return { ...state, ...action.patch, simMonth: 0, reached: Math.min(state.reached, GAME_STAGES.indexOf('setup')) };
    case 'decisions':
      return { ...state, decisions: { ...state.decisions, ...action.patch }, simMonth: 0, reached: Math.min(state.reached, GAME_STAGES.indexOf('decisions')) };
    case 'planting':
      return { ...state, plantingMonth: action.month, simMonth: 0, reached: Math.min(state.reached, GAME_STAGES.indexOf('decisions')) };
    case 'simMonth':
      return { ...state, simMonth: action.index };
    case 'saveExperiment': {
      const without = state.experiments.filter((item) => item.id !== action.experiment.id);
      return { ...state, experiments: [action.experiment, ...without].slice(0, MAX_SAVED) };
    }
    case 'deleteExperiment':
      return { ...state, experiments: state.experiments.filter((item) => item.id !== action.id), compareIds: state.compareIds.filter((id) => id !== action.id) };
    case 'compare':
      return { ...state, compareIds: action.ids.slice(0, 2) };
    case 'again':
      // Keep place, crop and period; return to the decisions to try a variation.
      return { ...state, simMonth: 0, stage: action.stage || 'decisions', reached: GAME_STAGES.indexOf(action.stage || 'decisions') };
    default:
      return state;
  }
}

function loadSaved() {
  try {
    const raw = window.localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || saved.version !== 1) return {};
    const { version, ...rest } = saved;
    return { ...rest, experiments: Array.isArray(rest.experiments) ? rest.experiments.slice(0, MAX_SAVED) : [] };
  } catch {
    return {};
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimer = useRef(null);

  useEffect(() => { dispatch({ type: 'hydrate', saved: loadSaved() }); }, []);

  // Only choices and compact results are stored — never raw NASA datasets.
  useEffect(() => {
    if (!state.hydrated) return undefined;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const { hydrated, ...persist } = state;
        window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({ version: 1, ...persist }));
      } catch { /* storage unavailable or full: the game still works for this visit */ }
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used inside GameProvider');
  return context;
}
