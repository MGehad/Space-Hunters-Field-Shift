'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { geoNaturalEarth1 } from 'd3-geo';
import { useLanguage } from '../context/LanguageContext';
import { Compass, Globe, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';
import WorldMapSvg from './map/WorldMapSvg';
import MapLegendSidebar from './map/MapLegendSidebar';
import MissionDetailCard from './map/MissionDetailCard';
import MissionsCarousel from './map/MissionsCarousel';
import { mapControlsData } from '../data/worldMapData';

/* MISSION GEOGRAPHIC COORDINATES */
const MISSION_GEO = {
  egypt: [30.8, 26.8],
  brazil: [-52.0, -10.5],
  india: [79.5, 22.5],
  usa: [-98.5, 38.5],
  australia: [134.0, -26.5],
  spain: [-4.5, 39.8],
};

/* SVG VIEWBOX DIMENSIONS */
const W = 960, H = 520;

/* `detail` lets the simulation game reuse this map unchanged while supplying its
   own intro text and action label: { title, intro, startLabel, hideMetrics }. */
export default function WorldMapScreen({ missions, selectedMission, setSelectedMission, onStartMission, onOpenFarmData, detail = null }) {
  const { lang, isRtl } = useLanguage();

  /* ── Responsive Screen Width Detection ── */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // A media-query listener fires only when the breakpoint is crossed,
    // instead of on every resize event.
    const query = window.matchMedia('(max-width: 1023px)');
    const checkMobile = () => setIsMobile(query.matches);
    checkMobile();
    query.addEventListener('change', checkMobile);
    return () => query.removeEventListener('change', checkMobile);
  }, []);

  /* ── Mobile View State: 'map' | 'details' | 'missions' | 'legend' ── */
  const [mobileView, setMobileView] = useState('map');

  /* ── Interactive Map Drag / Panning State ── */
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  /* ── build projection (dynamic scale for mobile) ── */
  const project = useMemo(() => {
    const scale = isMobile ? 155 : 118;
    const tx = isMobile ? W / 2 + 25 : W / 2 + 55;
    const ty = isMobile ? H / 2 - 30 : H / 2 - 95;
    return geoNaturalEarth1()
      .scale(scale)
      .translate([tx, ty]);
  }, [isMobile]);

  /* ── mission beacon projected pixel positions ── */
  const beaconPositions = useMemo(() =>
    Object.fromEntries(
      missions.map(m => {
        const coords = MISSION_GEO[m.id] || [0, 0];
        const [bx, by] = project(coords);
        return [m.id, { x: bx, y: by }];
      })
    ),
    [missions, project]);

  /* ── Calculate Pan offset to center map perfectly on selected mission ── */
  const recenterMap = (targetMission) => {
    const m = targetMission || selectedMission;
    const cx = isMobile ? W / 2 + 25 : W / 2 + 55;
    const cy = isMobile ? H / 2 - 30 : H / 2 - 95;
    if (m && beaconPositions[m.id]) {
      const pos = beaconPositions[m.id];
      if (pos && !isNaN(pos.x) && !isNaN(pos.y)) {
        const targetX = cx - pos.x;
        const targetY = cy - pos.y;
        const clampedX = Math.max(-360, Math.min(360, targetX));
        const clampedY = Math.max(-260, Math.min(180, targetY));
        setPan({ x: clampedX, y: clampedY });
      }
    } else {
      setPan({ x: 0, y: 0 });
    }
  };

  /* Auto-recenter when selectedMission changes */
  useEffect(() => {
    const cx = isMobile ? W / 2 + 25 : W / 2 + 55;
    const cy = isMobile ? H / 2 - 30 : H / 2 - 95;
    if (selectedMission?.id && beaconPositions[selectedMission.id]) {
      const pos = beaconPositions[selectedMission.id];
      if (pos && !isNaN(pos.x)) {
        const targetX = Math.max(-360, Math.min(360, cx - pos.x));
        const targetY = Math.max(-260, Math.min(180, cy - pos.y));
        setPan({ x: targetX, y: targetY });
      }
    }
  }, [selectedMission, beaconPositions, isMobile]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const nextX = Math.max(-280, Math.min(280, dragStartRef.current.panX + dx));
    const nextY = Math.max(-140, Math.min(140, dragStartRef.current.panY + dy));
    setPan({ x: nextX, y: nextY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  /* ── Touch Drag Panning for Mobile ── */
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    const nextX = Math.max(-280, Math.min(280, dragStartRef.current.panX + dx));
    const nextY = Math.max(-140, Math.min(140, dragStartRef.current.panY + dy));
    setPan({ x: nextX, y: nextY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  /* ── Carousel Navigation Handlers ── */
  const handlePrevMission = () => {
    const currentIndex = missions.findIndex(m => m.id === selectedMission.id);
    const prevIndex = (currentIndex - 1 + missions.length) % missions.length;
    setSelectedMission(missions[prevIndex]);
  };

  const handleNextMission = () => {
    const currentIndex = missions.findIndex(m => m.id === selectedMission.id);
    const nextIndex = (currentIndex + 1) % missions.length;
    setSelectedMission(missions[nextIndex]);
  };

  return (
    <div
      className="relative w-full max-w-[1600px] mx-auto h-full overflow-hidden bg-[#040c1a] shadow-2xl flex flex-col"
      style={{
        clipPath: isMobile ? 'none' : 'polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 12px), 0 16px)',
      }}
    >
      {/* ═══════════════════════════════════════════════════════════
          MOBILE TOP SUB-BAR (Visible on < lg screens)
          ═══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden z-30 flex shrink-0 items-center justify-between gap-1.5 border-b border-white/10 bg-[#051329] px-2 py-1.5">
        <div className="flex-1 grid grid-cols-3 gap-1">
          {[
            { id: 'map', label: lang === 'ar' ? '🗺️ الخريطة' : '🗺️ Map' },
            { id: 'details', label: lang === 'ar' ? '📋 التفاصيل' : '📋 Details' },
            { id: 'missions', label: lang === 'ar' ? '🎯 المهمات' : '🎯 Missions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileView(tab.id)}
              type="button"
              aria-pressed={mobileView === tab.id}
              className={`min-h-11 truncate rounded-lg px-1 text-center text-sm transition-colors ${
                mobileView === tab.id
                  ? 'bg-cyan-700 font-semibold text-white'
                  : 'border border-white/10 bg-[#081838] text-slate-200 hover:bg-[#0c2242]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Recenter Button as Part of Top Bar */}
        <button
          onClick={() => recenterMap()}
          type="button"
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-[#081d3d] px-3 text-sm text-cyan-100 hover:bg-[#0c2a57]"
          aria-label={lang === 'ar' ? 'تركيز الخريطة' : 'Recenter Map'}
        >
          <Compass aria-hidden="true" className="h-4 w-4 text-cyan-300" />
          <span className="sr-only min-[420px]:not-sr-only">{lang === 'ar' ? 'تركيز' : 'Center'}</span>
        </button>
      </div>


      {/* ═══════════════════════════════════════════════════════════
          BACKGROUND WORLD MAP
          ═══════════════════════════════════════════════════════════ */}
      <div
        className={`absolute inset-0 w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: 'radial-gradient(ellipse 130% 100% at 50% 45%, #071c3d 0%, #040e21 60%, #020712 100%)',
          touchAction: 'none',
        }}
      >
        {/* Desktop Compass Widget */}
        <div
          onClick={(e) => { e.stopPropagation(); recenterMap(); }}
          className="hidden lg:flex absolute top-11 left-[250px] z-30 items-center gap-1.5 px-3 py-1.5 bg-[#061633]/95 border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 hover:text-white rounded-lg backdrop-blur-md shadow-xl pointer-events-auto cursor-pointer transition-all active:scale-95 group"
          title={lang === 'ar' ? mapControlsData.recenterTooltipAr : mapControlsData.recenterTooltipEn}
        >
          <Compass className={`w-4 h-4 text-cyan-300 transition-transform group-hover:rotate-45 ${isDragging ? 'animate-spin' : ''}`} />
          <span className="text-2xs font-mono font-bold tracking-wider">
            {lang === 'ar' ? mapControlsData.recenterBtnAr : mapControlsData.recenterBtnEn}
          </span>
        </div>

        {/* ══ SVG MAP COMPONENT ══ */}
        <WorldMapSvg
          width={W}
          height={H}
          pan={pan}
          isDragging={isDragging}
          missions={missions}
          selectedMission={selectedMission}
          setSelectedMission={(m) => {
            setSelectedMission(m);
          }}
          beaconPositions={beaconPositions}
          project={project}
          isMobile={isMobile}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE FLOATING BOTTOM HUD BAR — No overlap, spacious & clean
          ═══════════════════════════════════════════════════════════ */}
      <div className={`lg:hidden absolute inset-x-0 bottom-0 z-30 pointer-events-auto transition-transform duration-300 ${mobileView !== 'map' ? 'translate-y-full pointer-events-none' : 'translate-y-0'}`}>
        <div className="flex flex-col gap-2 border-t border-white/15 bg-[#051329] p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          
          {/* Row 1: Selected Mission Info + Prev/Next Controls */}
          <div className="flex items-center justify-between gap-2">
            {/* Mission Flag & Name */}
            <div
              onClick={() => setMobileView('details')}
              className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 active:scale-98 transition-transform"
            >
              <span className="text-2xl shrink-0 p-1 bg-[#091b38] rounded-xl border border-cyan-500/30 shadow-sm">{selectedMission.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-base font-semibold text-white">
                    {lang === 'ar' ? selectedMission.countryAr : selectedMission.countryEn}
                  </h3>
                  <span className="text-2xs font-mono font-bold text-cyan-300 bg-blue-950/90 px-1.5 py-0.5 rounded border border-cyan-500/30 shrink-0">
                    #{selectedMission.code}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-cyan-200">
                  {detail?.title || (lang === 'ar' ? selectedMission.titleAr : selectedMission.titleEn)}
                </p>
              </div>
            </div>

            {/* Prev / Next Mission Arrows */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePrevMission}
                className="min-h-11 min-w-11 bg-[#0a1e3f] hover:bg-[#122e5e] border border-cyan-400/40 rounded-xl flex items-center justify-center text-cyan-300 font-bold transition-colors cursor-pointer"
                type="button"
                aria-label={lang === 'ar' ? 'المهمة السابقة' : 'Previous Mission'}
              >
                {isRtl ? <ArrowRight aria-hidden="true" className="h-5 w-5" /> : <ArrowLeft aria-hidden="true" className="h-5 w-5" />}
              </button>
              <button
                onClick={handleNextMission}
                className="min-h-11 min-w-11 bg-[#0a1e3f] hover:bg-[#122e5e] border border-cyan-400/40 rounded-xl flex items-center justify-center text-cyan-300 font-bold transition-colors cursor-pointer"
                type="button"
                aria-label={lang === 'ar' ? 'المهمة التالية' : 'Next Mission'}
              >
                {isRtl ? <ArrowLeft aria-hidden="true" className="h-5 w-5" /> : <ArrowRight aria-hidden="true" className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Details are available in the map tabs; keep the mission action here. */}
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={onStartMission}
              className="min-h-11 px-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-sm font-bold border border-cyan-300/30 transition-colors text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🚀</span>
              <span>{detail?.startLabel || (lang === 'ar' ? 'ابدأ المهمة' : 'Start Mission')}</span>
            </button>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE OVERLAY MODALS (Details / Missions / Legend on Mobile)
          ═══════════════════════════════════════════════════════════ */}
      {mobileView === 'details' && (
        <div className="lg:hidden absolute inset-0 z-30 p-2.5 bg-[#020713]/95 overflow-y-auto overscroll-contain flex flex-col justify-start">
          <MissionDetailCard
            selectedMission={selectedMission}
            onStartMission={onStartMission}
            onOpenFarmData={onOpenFarmData}
            detail={detail}
            className="w-full max-w-lg mx-auto p-3.5 bg-[#061633]/98 border border-cyan-400/60 shadow-2xl backdrop-blur-xl flex flex-col gap-3 rounded-2xl"
            isMobile={true}
            onCloseMobile={() => setMobileView('map')}
          />
        </div>
      )}

      {mobileView === 'missions' && (
        <div className="lg:hidden absolute inset-0 z-30 p-2.5 bg-[#020713]/95 overflow-y-auto overscroll-contain flex flex-col justify-start">
          <div className="w-full max-w-lg mx-auto">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setMobileView('map')}
                type="button"
                className="min-h-11 rounded-lg border border-white/15 bg-[#061633] px-4 text-sm text-slate-100"
              >
                ✕ {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
            <MissionsCarousel
              missions={missions}
              selectedMission={selectedMission}
              setSelectedMission={(m) => {
                setSelectedMission(m);
                setMobileView('details');
              }}
              onPrevMission={handlePrevMission}
              onNextMission={handleNextMission}
              className="w-full block"
              isMobile={true}
            />
          </div>
        </div>
      )}

      {mobileView === 'legend' && (
        <div className="lg:hidden absolute inset-0 z-30 p-2.5 bg-[#020713]/95 overflow-y-auto overscroll-contain flex flex-col justify-start">
          <div className="w-full max-w-lg mx-auto">
            <MapLegendSidebar
              missionCount={missions.length}
              className="w-full flex flex-col gap-2 p-1"
              isMobile={true}
              onCloseMobile={() => setMobileView('map')}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          DESKTOP FLOATING HUD OVERLAYS (Shown on lg:block)
          ═══════════════════════════════════════════════════════════ */}
      <MapLegendSidebar missionCount={missions.length} />

      <MissionDetailCard
        selectedMission={selectedMission}
        onStartMission={onStartMission}
        onOpenFarmData={onOpenFarmData}
        detail={detail}
      />

      <MissionsCarousel
        missions={missions}
        selectedMission={selectedMission}
        setSelectedMission={setSelectedMission}
        onPrevMission={handlePrevMission}
        onNextMission={handleNextMission}
      />

    </div>
  );
}
