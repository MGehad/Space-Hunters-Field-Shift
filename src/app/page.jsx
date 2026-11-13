'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import AppNavigation from '../components/AppNavigation';
import StartScreen from '../components/StartScreen';
// Experience B — the Educational Missions simulation game — is a self-contained
// module with its own state; it is loaded only when the player opens it.
const GameShell = dynamic(() => import('../components/game/GameShell'), { ssr: false });
const MissionTerminal = dynamic(() => import('../components/MissionTerminal'));
const AgriBankModal = dynamic(() => import('../components/AgriBankModal'));
const GameGuideModal = dynamic(() => import('../components/GameGuideModal'));
import { useLanguage } from '../context/LanguageContext';

const VALID_SCREENS = ['start', 'map', 'universalBuilder', 'farmPro'];
// Links from the earlier mission flow now open the game.
const LEGACY_GAME_SCREENS = ['briefing', 'decision', 'results', 'game'];

/**
 * Keep Next.js's own history fields (__NA and the router tree) on every entry
 * this page writes. Without them the app router treats the entry as foreign
 * and reloads the whole page on Back, which wipes the in-memory farm session.
 */
function withRouterState(state) {
  return { ...(typeof window !== 'undefined' ? window.history.state || {} : {}), ...state };
}

export default function Home() {
  const { lang } = useLanguage();
  const [activeNavTab, setActiveNavTab] = useState(null); // 'agriBank' | 'gameGuide' | null
  const [currentScreen, setCurrentScreen] = useState('start'); // 'start' | 'map' (game) | 'universalBuilder' | 'farmPro'
  const [terminalStartStep, setTerminalStartStep] = useState(0);
  const currentScreenRef = useRef('start');
  const navigationIndexRef = useRef(0);
  const navigationScreensRef = useRef(['start']);

  // Navigate to screen with full Browser History & URL Hash support
  const navigateToScreen = useCallback((screenName, replace = false) => {
    const previousScreen = currentScreenRef.current;
    setCurrentScreen(screenName);
    currentScreenRef.current = screenName;
    setActiveNavTab(null);
    if (typeof window !== 'undefined') {
      const hash = `#${screenName}`;
      if (replace) {
        const navIndex = navigationIndexRef.current;
        navigationScreensRef.current[navIndex] = screenName;
        window.history.replaceState(withRouterState({ screen: screenName, modal: null, navIndex }), '', hash);
      } else if (previousScreen !== screenName || window.location.hash !== hash) {
        const navIndex = navigationIndexRef.current + 1;
        navigationScreensRef.current = navigationScreensRef.current.slice(0, navIndex);
        navigationScreensRef.current[navIndex] = screenName;
        navigationIndexRef.current = navIndex;
        window.history.pushState(withRouterState({ screen: screenName, modal: null, navIndex }), '', hash);
      }
    }
  }, []);

  // Modal open with history push so browser back closes modal first
  const handleOpenModal = useCallback((modalName) => {
    setActiveNavTab(modalName);
    if (typeof window !== 'undefined') {
      const current = window.location.hash.split('?')[0] || `#${currentScreen}`;
      window.history.pushState(withRouterState({ screen: currentScreen, modal: modalName, navIndex: navigationIndexRef.current }), '', `${current}?modal=${modalName}`);
    }
  }, [currentScreen]);

  const handleCloseModal = useCallback(() => {
    setActiveNavTab(null);
    if (typeof window !== 'undefined' && window.location.hash.includes('?modal=')) {
      window.history.back();
    }
  }, []);

  // Sync with Browser History Back/Forward (popstate)
  useEffect(() => {
    const parseUrl = () => {
      const raw = window.location.hash.replace('#', '') || 'start';
      const [screenPart, queryPart] = raw.split('?');
      const screen = VALID_SCREENS.includes(screenPart) ? screenPart : LEGACY_GAME_SCREENS.includes(screenPart) ? 'map' : 'start';
      
      let modal = null;
      if (queryPart && queryPart.includes('modal=')) {
        const m = queryPart.replace('modal=', '');
        if (['agriBank', 'gameGuide'].includes(m)) modal = m;
      }
      return { screen, modal };
    };

    const initial = parseUrl();
    setCurrentScreen(initial.screen);
    currentScreenRef.current = initial.screen;
    if (initial.modal) setActiveNavTab(initial.modal);

    // A direct workflow link gets a safe in-app Back destination instead of
    // relying on whatever external page happened to open it.
    if (initial.screen === 'start') {
      navigationIndexRef.current = 0;
      navigationScreensRef.current = ['start'];
      window.history.replaceState(withRouterState({ screen: 'start', modal: initial.modal, navIndex: 0 }), '', initial.modal ? '#start?modal=' + initial.modal : '#start');
    } else {
      navigationIndexRef.current = 1;
      navigationScreensRef.current = ['start', initial.screen];
      window.history.replaceState(withRouterState({ screen: 'start', modal: null, navIndex: 0 }), '', '#start');
      window.history.pushState(withRouterState({ screen: initial.screen, modal: initial.modal, navIndex: 1 }), '', initial.modal ? `#${initial.screen}?modal=${initial.modal}` : `#${initial.screen}`);
    }

    const onPopState = (e) => {
      if (e.state && e.state.screen && VALID_SCREENS.includes(e.state.screen)) {
        setCurrentScreen(e.state.screen);
        currentScreenRef.current = e.state.screen;
        setActiveNavTab(e.state.modal || null);
        if (Number.isInteger(e.state.navIndex)) navigationIndexRef.current = e.state.navIndex;
      } else {
        const parsed = parseUrl();
        setCurrentScreen(parsed.screen);
        currentScreenRef.current = parsed.screen;
        setActiveNavTab(parsed.modal);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Transitions from Start Screen
  const handleStartGame = () => {
    navigateToScreen('map');
  };

  // The guide is a history entry of its own (#screen?modal=gameGuide). Starting
  // the game from it replaces that entry with the game, so Back returns to the
  // screen the guide was opened from instead of reopening the guide.
  const handleStartGameFromGuide = () => {
    setActiveNavTab(null);
    setCurrentScreen('map');
    const openedFrom = currentScreenRef.current;
    currentScreenRef.current = 'map';
    if (typeof window === 'undefined') return;
    if (window.location.hash.includes('?modal=') && openedFrom !== 'map') {
      const navIndex = navigationIndexRef.current + 1;
      navigationScreensRef.current = navigationScreensRef.current.slice(0, navIndex);
      navigationScreensRef.current[navIndex] = 'map';
      navigationIndexRef.current = navIndex;
      window.history.replaceState(withRouterState({ screen: 'map', modal: null, navIndex }), '', '#map');
    } else if (window.location.hash.includes('?modal=')) {
      window.history.back();
    } else {
      navigateToScreen('map');
    }
  };

  const handleOpenFarmPro = () => {
    setTerminalStartStep(0);
    navigateToScreen('farmPro');
  };

  const handleOpenAgriBank = () => {
    handleOpenModal('agriBank');
  };

  const handleOpenSequenceBuilder = () => {
    setTerminalStartStep(3);
    navigateToScreen('farmPro');
  };

  const handleOpenGameGuide = () => {
    handleOpenModal('gameGuide');
  };

  const handleBack = () => {
    if (activeNavTab) {
      handleCloseModal();
      return;
    }
    if (navigationIndexRef.current > 0 && typeof window !== 'undefined') window.history.back();
    else navigateToScreen('start', true);
  };

  const handleGoHome = () => navigateToScreen('start');

  return (
    <main className="relative flex h-full flex-col overflow-hidden bg-[#040915] bg-[radial-gradient(ellipse_at_top,_#0b1a36_0%,_#050c1b_55%,_#02050c_100%)]">

      {currentScreen !== 'start' && <AppNavigation
        currentScreen={currentScreen}
        onBack={handleBack}
        onHome={handleGoHome}
        onOpenMap={() => navigateToScreen('map')}
        onOpenFarm={() => { setTerminalStartStep(0); navigateToScreen('farmPro'); }}
        onOpenAgriBank={handleOpenAgriBank}
        onOpenGameGuide={handleOpenGameGuide}
      />}

      {/* Dynamic Screen View - Takes full remaining vertical space */}
      <div className={`flex-1 min-h-0 flex flex-col relative z-10 w-full ${
        currentScreen === 'start' ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'
      }`}>
        
        {/* 🌟 1. START / LANDING SCREEN 🌟 */}
        {currentScreen === 'start' && (
          <StartScreen
            onStartGame={handleStartGame}
            onOpenFarmPro={handleOpenFarmPro}
            onOpenAgriBank={handleOpenAgriBank}
            onOpenSequenceBuilder={handleOpenSequenceBuilder}
            onOpenGameGuide={handleOpenGameGuide}
          />
        )}

        {/* 🛰️ 2. FARM PRO DECISION STUDIO & FIELD BOUNDARY DETECTOR 🛰️ */}
        {currentScreen === 'farmPro' && (
          <MissionTerminal
            onOpenGame={handleStartGame}
            onWorkflowStepChange={setTerminalStartStep}
            initialStep={terminalStartStep}
          />
        )}

        {/* 🔬 3. UNIVERSAL CROP ROTATION SANDBOX (ALL CROPS DATABASE) 🔬 */}
        {currentScreen === 'universalBuilder' && (
          <MissionTerminal onOpenGame={handleStartGame} onWorkflowStepChange={setTerminalStartStep} initialStep={3} />
        )}

        {/* 🎮 4. EDUCATIONAL MISSIONS — SIMULATION GAME (independent of the farm workflow) */}
        {currentScreen === 'map' && <GameShell />}
      </div>

      {/* Project and mission identification; challenge branding appears on the landing screen. */}
      <footer className={`z-20 w-full shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-white/5 bg-[#030712] px-3 py-1.5 text-2xs text-slate-400 sm:px-4 ${
        currentScreen === 'start' ? 'flex' : 'hidden lg:flex'
      }`}>
        <span>Team Space Hunters</span>
        <span className="min-w-0 truncate">
          {lang === 'ar' ? 'تحدي Field Shift: Adapting Farms with NASA Data' : 'Field Shift: Adapting Farms with NASA Data'}
        </span>
      </footer>

      {/* Modal chunks are only requested the first time a modal is opened. */}
      {activeNavTab === 'agriBank' && <AgriBankModal isOpen onClose={handleCloseModal} />}
      {activeNavTab === 'gameGuide' && <GameGuideModal isOpen onClose={handleCloseModal} onStartGame={handleStartGameFromGuide} />}

    </main>
  );
}
