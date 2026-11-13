'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkingSession } from '../../context/WorkingSessionContext';
import { getPowerClimatology } from '../../services/nasa/powerProvider';
import { fuseEnvironmentalObservations } from '../../analysis/environmental/fusion';
import EnvironmentalAnalysisDashboard from './EnvironmentalAnalysisDashboard';
import {
  FARM_AREA_UNITS,
  convertArea,
  createFarmLocationSelection,
  formatArea,
  getPolygonCentroid,
  validateCoordinates,
  validateFarmPolygon,
} from '../../utils/farmGeometry';
import {
  RefreshCw,
  MapPin, X,
 
  Printer, ChevronDown, SlidersHorizontal
} from 'lucide-react';

// Leaflet (JS + CSS) is a separate client-only chunk that loads the first
// time the map step is shown.
function MapLoadingPlaceholder() {
  return (
    <div role="status" className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0b1626] text-cyan-200">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      <span className="text-sm">Loading map… · بنحمّل الخريطة…</span>
    </div>
  );
}

const RealSatelliteLeafletMap = dynamic(
  () => import('./RealSatelliteLeafletMap'),
  { ssr: false, loading: MapLoadingPlaceholder }
);

// Quick-pick farming areas: names and approximate centre coordinates only.
const PRESET_LOCATIONS = [
  { nameAr: 'المنصورة وأجا (الدقهلية)', nameEn: 'Mansoura & Aga (Dakahlia)', center: [30.825, 31.310], tag: 'مصر 🇪🇬' },
  { nameAr: 'كفر الشيخ (شمال الدلتا والبرلس)', nameEn: 'Kafr El-Sheikh (North Delta)', center: [31.110, 30.938], tag: 'مصر 🇪🇬' },
  { nameAr: 'طنطا وزفتى (الغربية)', nameEn: 'Tanta & Zefta (Gharbia)', center: [30.786, 31.000], tag: 'مصر 🇪🇬' },
  { nameAr: 'الزقازيق والصالحية (الشرقية)', nameEn: 'Zagazig & Salheya (Sharqia)', center: [30.587, 31.502], tag: 'مصر 🇪🇬' },
  { nameAr: 'دمنهور والنوبارية (البحيرة)', nameEn: 'Damanhur & Nubaria (Beheira)', center: [31.036, 30.470], tag: 'مصر 🇪🇬' },
  { nameAr: 'المنيا ووادي النيل (الصعيد)', nameEn: 'Minya & Nile Valley', center: [28.109, 30.750], tag: 'مصر 🇪🇬' },
  { nameAr: 'الوادي الجديد (الواحات)', nameEn: 'New Valley & Oases', center: [25.451, 30.547], tag: 'مصر 🇪🇬' },
  { nameAr: 'كانساس وحوض أوغالالا (أمريكا)', nameEn: 'Kansas & Ogallala (USA)', center: [38.526, -99.300], tag: 'أمريكا 🇺🇸' },
  { nameAr: 'تكساس وبانهاندل (أمريكا)', nameEn: 'Texas Panhandle (USA)', center: [35.221, -101.831], tag: 'أمريكا 🇺🇸' },
  { nameAr: 'لوديانا، البنجاب (الهند)', nameEn: 'Ludhiana, Punjab (India)', center: [30.901, 75.857], tag: 'الهند 🇮🇳' },
  { nameAr: 'ماتو غروسو (البرازيل)', nameEn: 'Mato Grosso & Cerrado (Brazil)', center: [-12.681, -55.721], tag: 'البرازيل 🇧🇷' },
  { nameAr: 'حوض موراي-دارلينغ (أستراليا)', nameEn: 'Murray-Darling Basin (Australia)', center: [-34.520, 145.480], tag: 'أستراليا 🇦🇺' },
];

function localizeGeometryError(error, lang) {
  if (lang !== 'ar') return error || '';
  const messages = {
    'Enter numeric latitude and longitude.': 'أدخل قيمًا رقمية لخط العرض وخط الطول.',
    'Latitude must be between -90° and 90°.': 'يجب أن يكون خط العرض بين ‎-90° و90°.',
    'Longitude must be between -180° and 180°.': 'يجب أن يكون خط الطول بين ‎-180° و180°.',
    'Add at least three boundary points.': 'أضف ثلاث نقاط على الأقل لحدود المزرعة.',
    'Boundary points must not be repeated.': 'لا يمكن تكرار النقطة نفسها.',
    'Boundary edges cross. Move a point to make a simple polygon.': 'أضلاع الحدود متقاطعة؛ حرّك إحدى النقاط لتصحيح الشكل.',
    'The boundary is too small or has no measurable area.': 'المساحة صغيرة جدًا أو غير قابلة للقياس.',
    'The boundary is too large to be a farm parcel.': 'المساحة أكبر من الحد المقبول لمزرعة.',
  };
  return messages[error] || error || '';
}

export default function FarmProStudio({ onEditFarm, validateRef, activeStep = 0 }) {
  const { lang, isRtl } = useLanguage();
  const { session, updateSession } = useWorkingSession();
  const farmDraft = session.farmInformation?.farmSelectionDraft || {};

  // Active Map Location (Default to Nile Delta: Aga / Mit Ghamr, Dakahlia)
  const [selectedLocation, setSelectedLocation] = useState(() => farmDraft.selectedLocation || (session.farmLocation
    ? [session.farmLocation.latitude, session.farmLocation.longitude]
    : [30.825, 31.310]));
  const [locationName, setLocationName] = useState(() => farmDraft.locationName || session.farmLocation?.label || (lang === 'ar' ? 'مركز أجا وميت غمر، محافظة الدقهلية' : 'Aga & Mit Ghamr, Dakahlia'));
  const [selectionMode, setSelectionMode] = useState(() => farmDraft.selectionMode || (session.farmLocation?.selectionMethod === 'polygon-boundary' ? 'boundary' : 'point-area'));
  const [areaUnit, setAreaUnit] = useState(() => farmDraft.areaUnit || session.farmLocation?.areaUnit || 'feddan');
  const [areaInput, setAreaInput] = useState(() => String(farmDraft.areaInput ?? (session.farmLocation?.selectionMethod === 'point-area' ? session.farmLocation.area ?? 1 : 1)));
  const [latitudeInput, setLatitudeInput] = useState(() => String(farmDraft.latitudeInput ?? session.farmLocation?.latitude ?? 30.825));
  const [longitudeInput, setLongitudeInput] = useState(() => String(farmDraft.longitudeInput ?? session.farmLocation?.longitude ?? 31.310));
  const [boundaryPoints, setBoundaryPoints] = useState(() => {
    if (Array.isArray(farmDraft.boundaryPoints)) return farmDraft.boundaryPoints;
    const coordinates = session.farmLocation?.geometry?.coordinates?.[0];
    return Array.isArray(coordinates) && coordinates.length > 1
      ? coordinates.slice(0, -1).map(([longitude, latitude]) => ({ latitude, longitude }))
      : [];
  });
  const [locationError, setLocationError] = useState('');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  // The map mounts the first time step 1 is visible and then stays mounted, so
  // moving between workflow steps never re-creates it or reloads its tiles.
  const [mapMounted, setMapMounted] = useState(activeStep === 0);
  const [powerRequestNonce, setPowerRequestNonce] = useState(0);

  // Next-button validation state
  const [presetValue, setPresetValue] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const latitudeRef = useRef(null);
  const areaRef = useRef(null);
  const boundaryRef = useRef(null);

  // NASA POWER product status and seasonal month selection.
  const [isNasaLoading, setIsNasaLoading] = useState(false);
  const [nasaError, setNasaError] = useState('');
  const [analysisMonth, setAnalysisMonth] = useState(() => session.analysisResults?.environmentalView?.month ?? new Date().getMonth());
  const [activeEnvironmentalLayers, setActiveEnvironmentalLayers] = useState(() => session.analysisResults?.environmentalView?.layers || { T2M: true, PRECTOTCORR: true, RH2M: false, ALLSKY_SFC_SW_DWN: false });

  useEffect(() => {
    if (activeStep === 0) setMapMounted(true);
  }, [activeStep]);


  useEffect(() => {
    updateSession({ farmInformation: { ...(session.farmInformation || {}), farmSelectionDraft: { selectedLocation, locationName, selectionMode, areaUnit, areaInput, latitudeInput, longitudeInput, boundaryPoints } } });
    // Save a temporary draft so screen navigation does not discard an in-progress point or polygon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, locationName, selectionMode, areaUnit, areaInput, latitudeInput, longitudeInput, boundaryPoints, updateSession]);

  useEffect(() => {
    updateSession({ analysisResults: { ...(session.analysisResults || {}), environmentalView: { month: analysisMonth, layers: activeEnvironmentalLayers } } });
    // Store display choices only when the choices change; preserve other analysis results.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisMonth, activeEnvironmentalLayers, updateSession]);

  const boundaryValidation = useMemo(() => validateFarmPolygon(boundaryPoints), [boundaryPoints]);
  const polygonCentroid = useMemo(() => boundaryValidation.valid ? getPolygonCentroid(boundaryPoints) : null, [boundaryPoints, boundaryValidation.valid]);
  const referenceCoordinates = selectionMode === 'boundary' && polygonCentroid ? polygonCentroid : selectedLocation;
  const areaValue = selectionMode === 'boundary'
    ? (boundaryValidation.valid ? convertArea(boundaryValidation.areaSquareMeters, 'squareMeter', areaUnit) : null)
    : Number(areaInput);
  const pointAreaSquareMeters = selectionMode === 'point-area' ? convertArea(areaValue, areaUnit, 'squareMeter') : null;
  const pointAreaIsValid = selectionMode !== 'point-area' || (Number.isFinite(areaValue) && areaValue > 0 && pointAreaSquareMeters <= 1e12);
  const displayedCoordinates = selectionMode === 'boundary' && polygonCentroid ? polygonCentroid : selectedLocation;
  const farmSelection = useMemo(() => createFarmLocationSelection({
    mode: selectionMode === 'boundary' ? 'boundary' : 'point-area',
    latitude: referenceCoordinates[0],
    longitude: referenceCoordinates[1],
    area: areaValue,
    areaUnit,
    boundaryPoints,
    label: selectionMode === 'boundary'
      ? (lang === 'ar' ? 'مركز حدود المزرعة' : 'Farm boundary centroid')
      : locationName,
  }), [selectionMode, referenceCoordinates[0], referenceCoordinates[1], areaValue, areaUnit, boundaryPoints, lang, locationName]);

  const powerObservations = useMemo(() => (session.environmentalObservations || []).filter((item) => (
    item.source?.id === 'nasa-power-climatology'
    && item.source?.dataKind === 'reference'
    && item.source?.requestCoordinates?.latitude === farmSelection.farmLocation?.latitude
    && item.source?.requestCoordinates?.longitude === farmSelection.farmLocation?.longitude
  )), [session.environmentalObservations, farmSelection.farmLocation?.latitude, farmSelection.farmLocation?.longitude]);
  const environmentalFusion = useMemo(() => fuseEnvironmentalObservations(powerObservations, farmSelection.valid ? farmSelection.farmLocation : null), [powerObservations, farmSelection.valid, farmSelection.farmLocation]);
  const environmentalPointLayers = useMemo(() => {
    const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][analysisMonth];
    return Object.entries(activeEnvironmentalLayers).filter(([, enabled]) => enabled).map(([variable]) => (
      powerObservations.find((item) => item.variable === variable && item.referenceDate === `climatology:${month}`)
    )).filter((item) => Number.isFinite(item?.value));
  }, [powerObservations, analysisMonth, activeEnvironmentalLayers]);

  useEffect(() => {
    updateSession({
      farmLocation: farmSelection.valid ? farmSelection.farmLocation : null,
      farmArea: farmSelection.valid ? farmSelection.farmArea : null,
    });
  }, [farmSelection.valid, farmSelection.farmLocation, updateSession]);

  // Load source-tagged NASA POWER climatology for the selected point.
  useEffect(() => {
    if (!farmSelection.valid) {
      updateSession({ environmentalObservations: [] });
      setNasaError('');
      setIsNasaLoading(false);
      return undefined;
    }

    let isCancelled = false;
    let timeoutId = null;
    const controller = new AbortController();

    setNasaError('');

    const fetchNasaData = async () => {
      timeoutId = setTimeout(() => controller.abort(), 7000);
      setIsNasaLoading(true);
      try {
        const observations = await getPowerClimatology({
          latitude: farmSelection.farmLocation.latitude,
          longitude: farmSelection.farmLocation.longitude,
          signal: controller.signal,
        });
        if (isCancelled) return;

        updateSession({ environmentalObservations: observations });
      } catch (err) {
        if (!isCancelled) {
          setNasaError(err?.name === 'AbortError' ? 'Request timed out or was cancelled.' : (err?.message || 'NASA POWER data request failed.'));
        }
      } finally {
        if (!isCancelled) setIsNasaLoading(false);
      }
    };

    // A short delay collapses bursts of coordinate changes (dragging or adding
    // boundary vertices) into a single request.
    const debounceId = setTimeout(fetchNasaData, 350);

    return () => {
      isCancelled = true;
      clearTimeout(debounceId);
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [farmSelection.valid, farmSelection.farmLocation?.latitude, farmSelection.farmLocation?.longitude, powerRequestNonce, updateSession]);


  const applyPointLocation = (latitude, longitude, label) => {
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.valid) {
      setLocationError(localizeGeometryError(validation.error, lang));
      return false;
    }
    setSelectedLocation([latitude, longitude]);
    setLatitudeInput(String(latitude));
    setLongitudeInput(String(longitude));
    setLocationName(label);
    setSelectionMode('point-area');
    setLocationError('');
    return true;
  };

  const handleApplyCoordinates = () => {
    if (!latitudeInput.trim() || !longitudeInput.trim()) {
      setLocationError(lang === 'ar' ? 'أدخل خط العرض وخط الطول.' : 'Enter both latitude and longitude.');
      return;
    }
    const latitude = Number(latitudeInput);
    const longitude = Number(longitudeInput);
    if (validateCoordinates(latitude, longitude).valid) {
      applyPointLocation(latitude, longitude, `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);
    } else {
      setLocationError(localizeGeometryError(validateCoordinates(latitude, longitude).error, lang));
    }
  };

  const handleAreaUnitChange = (nextUnit) => {
    if (selectionMode === 'point-area') {
      const converted = convertArea(Number(areaInput), areaUnit, nextUnit);
      if (converted !== null) setAreaInput(String(Number(converted.toFixed(6))));
    }
    setAreaUnit(nextUnit);
  };

  const handleSelectPreset = (value) => {
    setPresetValue(value);
    const loc = PRESET_LOCATIONS[Number(value)];
    if (loc) applyPointLocation(loc.center[0], loc.center[1], lang === 'ar' ? loc.nameAr : loc.nameEn);
  };

  // Click on map to place beacon
  const handleMapClick = (coords) => {
    const validation = validateCoordinates(coords[0], coords[1]);
    if (!validation.valid) {
      setLocationError(localizeGeometryError(validation.error, lang));
      return;
    }
    if (selectionMode === 'boundary') {
      setBoundaryPoints((points) => [...points, { latitude: coords[0], longitude: coords[1] }]);
      setLocationError('');
      return;
    }
    applyPointLocation(
      coords[0],
      coords[1],
      lang === 'ar' ? `الموقع المحدد (${coords[0].toFixed(3)}°، ${coords[1].toFixed(3)}°)` : `Coordinates (${coords[0].toFixed(3)}°, ${coords[1].toFixed(3)}°)`
    );
  };

  const handleMoveBoundaryPoint = (index, point) => {
    const validation = validateCoordinates(point.latitude, point.longitude);
    if (!validation.valid) {
      setLocationError(localizeGeometryError(validation.error, lang));
      return;
    }
    setBoundaryPoints((points) => points.map((current, pointIndex) => pointIndex === index ? point : current));
    setLocationError('');
  };

  const handleRemoveBoundaryPoint = (index) => {
    setBoundaryPoints((points) => points.filter((_, pointIndex) => pointIndex !== index));
    setLocationError('');
  };

  const handleClearBoundary = () => {
    setBoundaryPoints([]);
    setLocationError('');
  };

  // Re-request the NASA POWER reference for the current point (also retries
  // after a failed request).
  const handleReloadPower = () => setPowerRequestNonce((value) => value + 1);

  const handleToggleLayer = useCallback((variable) => {
    setActiveEnvironmentalLayers((current) => ({ ...current, [variable]: !current[variable] }));
  }, []);

  const ar = lang === 'ar';
  const selectedName = selectionMode === 'boundary' && polygonCentroid ? (ar ? 'مركز الحدود' : 'Polygon centroid') : locationName;
  const areaSummary = selectionMode === 'point-area'
    ? (pointAreaIsValid ? formatArea(areaValue, areaUnit, lang) : (ar ? 'المساحة غير صحيحة' : 'Invalid area'))
    : (boundaryValidation.valid ? formatArea(areaValue, areaUnit, lang) : (ar ? 'أكمل رسم الحدود' : 'Complete a valid boundary'));
  // Called by the workflow's Next button. Returns true when the farm can be saved.
  const validateForNext = () => {
    setShowValidation(true);
    setIsPanelCollapsed(false);
    if (selectionMode === 'point-area') {
      const latitude = Number(latitudeInput);
      const longitude = Number(longitudeInput);
      const typedDiffers = latitudeInput.trim() !== '' && longitudeInput.trim() !== '' && (latitude !== selectedLocation[0] || longitude !== selectedLocation[1]);
      if (!latitudeInput.trim() || !longitudeInput.trim() || !validateCoordinates(latitude, longitude).valid) {
        setLocationError(!latitudeInput.trim() || !longitudeInput.trim() ? (ar ? 'أدخل خط العرض وخط الطول.' : 'Enter both latitude and longitude.') : localizeGeometryError(validateCoordinates(latitude, longitude).error, lang));
        latitudeRef.current?.focus();
        return false;
      }
      if (!pointAreaIsValid) { areaRef.current?.focus(); return false; }
      if (typedDiffers) applyPointLocation(latitude, longitude, `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);
      setShowValidation(false);
      return true;
    }
    if (!boundaryValidation.valid) { boundaryRef.current?.focus(); return false; }
    setShowValidation(false);
    return true;
  };
  if (validateRef) validateRef.current = validateForNext;
  const modeButtonClass = (active) => `h-8 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${active ? 'border-cyan-400 bg-cyan-800/70 text-white' : 'border-white/10 bg-[#081730] text-slate-300 hover:bg-[#0c2242]'}`;
  const labelClass = 'block space-y-0.5 text-[11px] font-medium text-slate-200';

  return (
    <div className={`relative flex w-full shrink-0 flex-col bg-[#050c18] ${activeStep === 0 ? 'min-h-full' : ''}`}>
      <div id="workflow-section-0" className={activeStep === 0 ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>

      {/* Map imagery is a basemap; environmental data is added as point references only. */}
      <div className="relative w-full flex-1 bg-[#0b1626] sm:min-h-[24rem] sm:overflow-hidden">
        {/* Phones: map on top, tools below it. From sm up the tools float over the map. */}
        <div className="relative h-[50dvh] min-h-[18rem] overflow-hidden sm:absolute sm:inset-0 sm:h-auto sm:min-h-0">
          {mapMounted && (
            <RealSatelliteLeafletMap
              center={referenceCoordinates}
              zoom={15}
              selectedLocation={referenceCoordinates}
              onLocationSelect={handleMapClick}
              isScanning={isNasaLoading}
              drawingMode={selectionMode === 'boundary'}
              boundaryPoints={boundaryPoints}
              polygonIsValid={boundaryValidation.valid}
              onBoundaryPointMove={handleMoveBoundaryPoint}
              environmentalPointLayers={environmentalPointLayers}
              lang={lang}
            />
          )}
        </div>

        {/* Map hint: beside the zoom control, never under the farm tools. */}
        <p className={`pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-4.5rem)] items-center gap-2 rounded-lg border border-white/15 bg-[#07152b]/95 px-3 py-2 text-xs text-slate-100 shadow-md sm:left-auto sm:right-16 sm:top-3 sm:max-w-xs sm:text-sm ${isPanelCollapsed ? 'flex' : 'flex sm:hidden lg:flex'}`}>
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" />
          <span>{selectionMode === 'boundary'
            ? (ar ? 'اضغط لإضافة نقاط الحدود، واسحب النقاط لتعديلها' : 'Tap to add boundary points; drag a point to adjust it')
            : (ar ? 'اضغط على الخريطة لتحديد نقطة مرجعية للمزرعة' : 'Tap the map to set the farm reference point')}</span>
        </p>

        {isPanelCollapsed ? (
          /* Collapsed: the selected farm and its main action stay visible over the map. */
          <div className="relative z-20 m-2 flex items-center gap-2 rounded-xl border border-white/15 bg-[#07152b] p-2 shadow-lg sm:absolute sm:m-0 sm:left-4 sm:top-4 sm:w-[24rem] sm:max-w-[calc(100%-6rem)]">
            <MapPin aria-hidden="true" className="ms-1 h-5 w-5 shrink-0 text-cyan-300" />
            <div className="min-w-0 flex-1">
              <p dir="auto" className="truncate text-sm font-semibold text-white">{selectedName}</p>
              <p className="truncate text-xs text-slate-300"><span className="ltr-numeric">{displayedCoordinates[0].toFixed(3)}°, {displayedCoordinates[1].toFixed(3)}°</span> · {areaSummary}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPanelCollapsed(false)}
              aria-expanded={false}
              className="app-nav-button flex shrink-0 items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-900/60 px-3 text-sm font-semibold text-white hover:bg-cyan-800"
            >
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              <span>{ar ? 'تعديل' : 'Edit'}</span>
            </button>
          </div>
        ) : (
          <div className="relative z-20 m-2 flex flex-col gap-2 rounded-xl border border-white/15 bg-[#07152b] p-2.5 text-white shadow-2xl sm:absolute sm:m-0 sm:left-3 sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:w-[23.5rem] sm:max-w-[calc(100%-5rem)] sm:overflow-y-auto sm:overscroll-contain sm:p-3">

            {/* Selected farm + collapse */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" />
                <div className="min-w-0">
                  <div className="text-[11px] leading-tight text-slate-400">{ar ? 'المزرعة المحددة' : 'Selected farm'}</div>
                  <div dir="auto" className="truncate text-xs sm:text-sm font-semibold leading-tight text-white">{selectedName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPanelCollapsed(true)}
                aria-expanded
                aria-label={ar ? 'تصغير اللوحة لعرض الخريطة كاملة' : 'Collapse panel to view the full map'}
                title={ar ? 'تصغير اللوحة' : 'Collapse panel'}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-200 hover:bg-white/10"
              >
                <ChevronDown aria-hidden="true" className="h-4 w-4 rotate-180 sm:rotate-90" />
              </button>
            </div>

            <section className="space-y-2" aria-label={ar ? 'تحديد موقع ومساحة المزرعة' : 'Farm location and area selection'}>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  aria-pressed={selectionMode === 'point-area'}
                  onClick={() => { setSelectionMode('point-area'); setLocationError(''); }}
                  className={modeButtonClass(selectionMode === 'point-area')}
                >
                  {ar ? 'نقطة ومساحة' : 'Point + area'}
                </button>
                <button
                  type="button"
                  aria-pressed={selectionMode === 'boundary'}
                  onClick={() => { setSelectionMode('boundary'); setLocationError(''); }}
                  className={modeButtonClass(selectionMode === 'boundary')}
                >
                  {ar ? 'رسم حدود المزرعة' : 'Draw boundary'}
                </button>
              </div>

              {selectionMode === 'point-area' ? (
                <div className="space-y-2">
                  <p className="text-[11px] leading-snug text-slate-300">{ar ? 'اضغط على الخريطة، أو أدخل الإحداثيات، أو اختر منطقة مرجعية. المساحة المُدخلة تقديرية حول نقطة واحدة.' : 'Click the map, type coordinates or pick a reference area. The entered area is an estimate around one reference point.'}</p>
                  <label className={labelClass}>
                    <span>{ar ? 'منطقة زراعية مرجعية (اختياري)' : 'Reference agricultural area (optional)'}</span>
                    <select value={presetValue} onChange={(event) => handleSelectPreset(event.target.value)} className="field-control !min-h-8 h-8 px-2 text-xs">
                      <option value="">{ar ? '— اختر —' : '— Choose —'}</option>
                      {PRESET_LOCATIONS.map((loc, index) => <option key={loc.nameEn} value={String(index)}>{ar ? loc.nameAr : loc.nameEn}</option>)}
                    </select>
                  </label>
                  <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-1.5">
                    <label className={labelClass}>
                      <span>{ar ? 'خط العرض' : 'Latitude'}</span>
                      <input ref={latitudeRef} inputMode="decimal" dir="ltr" value={latitudeInput} aria-invalid={Boolean(locationError) || undefined} onChange={(event) => setLatitudeInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleApplyCoordinates(); }} className="field-control !min-h-8 h-8 px-2 text-xs" />
                    </label>
                    <label className={labelClass}>
                      <span>{ar ? 'خط الطول' : 'Longitude'}</span>
                      <input inputMode="decimal" dir="ltr" value={longitudeInput} onChange={(event) => setLongitudeInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleApplyCoordinates(); }} className="field-control !min-h-8 h-8 px-2 text-xs" />
                    </label>
                    <button type="button" onClick={handleApplyCoordinates} className="h-8 shrink-0 rounded-lg border border-cyan-400/40 bg-cyan-950/70 px-2.5 text-xs font-semibold text-cyan-50 hover:bg-cyan-900/80">
                      {ar ? 'تطبيق' : 'Apply'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className={labelClass}>
                      <span>{ar ? 'مساحة المزرعة' : 'Farm area'}</span>
                      <input ref={areaRef} type="number" min="0" step="any" dir="ltr" value={areaInput} aria-invalid={!pointAreaIsValid} aria-describedby={!pointAreaIsValid ? 'farm-area-error' : undefined} onChange={(event) => setAreaInput(event.target.value)} className={`field-control !min-h-8 h-8 px-2 text-xs ${!pointAreaIsValid && showValidation ? 'ring-2 ring-rose-400' : ''}`} />
                    </label>
                    <label className={labelClass}>
                      <span>{ar ? 'وحدة المساحة' : 'Area unit'}</span>
                      <select value={areaUnit} onChange={(event) => handleAreaUnitChange(event.target.value)} className="field-control !min-h-8 h-8 px-2 text-xs">
                        {Object.entries(FARM_AREA_UNITS).map(([unit, config]) => <option key={unit} value={unit}>{ar ? config.labelAr : config.labelEn}</option>)}
                      </select>
                    </label>
                  </div>
                  {!pointAreaIsValid && <p id="farm-area-error" role="alert" className="text-xs text-rose-300">{ar ? 'أدخل مساحة أكبر من الصفر وضمن الحد المقبول لمزرعة.' : 'Enter an area greater than zero and within a valid farm-size range.'}</p>}
                </div>
              ) : (
                <div ref={boundaryRef} tabIndex={-1} className={`space-y-2 rounded-lg outline-none ${showValidation && !boundaryValidation.valid ? 'ring-2 ring-rose-400 p-1.5' : ''}`}>
                  <p className="text-[11px] leading-snug text-slate-300">{ar ? 'اضغط على الخريطة لإضافة نقاط الحدود واسحب النقاط لتعديلها.' : 'Click the map to add boundary points and drag vertices to edit.'}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" disabled={!boundaryPoints.length} onClick={() => handleRemoveBoundaryPoint(boundaryPoints.length - 1)} className="h-8 rounded-lg border border-white/10 bg-[#081730] px-2 text-xs font-semibold text-slate-100 hover:bg-[#0c2242] disabled:opacity-40">{ar ? 'حذف آخر نقطة' : 'Undo point'}</button>
                    <button type="button" disabled={!boundaryPoints.length} onClick={handleClearBoundary} className="h-8 rounded-lg border border-rose-500/30 bg-rose-950/40 px-2 text-xs font-semibold text-rose-100 hover:bg-rose-950/70 disabled:opacity-40">{ar ? 'مسح الحدود' : 'Clear'}</button>
                  </div>
                  {boundaryPoints.length > 0 && (
                    <ol className="max-h-24 space-y-0.5 overflow-y-auto rounded-lg border border-white/10 p-1.5">
                      {boundaryPoints.map((point, index) => (
                        <li key={`${index}-${point.latitude}-${point.longitude}`} className="flex items-center justify-between gap-2 text-[11px] text-slate-200">
                          <span className="ltr-numeric">{index + 1}. {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</span>
                          <button type="button" onClick={() => handleRemoveBoundaryPoint(index)} className="flex h-6 w-6 items-center justify-center rounded text-rose-200 hover:bg-rose-950/60" aria-label={`${ar ? 'حذف النقطة' : 'Remove point'} ${index + 1}`}><X aria-hidden="true" className="h-3.5 w-3.5" /></button>
                        </li>
                      ))}
                    </ol>
                  )}
                  <label className={labelClass}>
                    <span>{ar ? 'وحدة المساحة المحسوبة' : 'Calculated area unit'}</span>
                    <select value={areaUnit} onChange={(event) => handleAreaUnitChange(event.target.value)} className="field-control !min-h-8 h-8 px-2 text-xs">
                      {Object.entries(FARM_AREA_UNITS).map(([unit, config]) => <option key={unit} value={unit}>{ar ? config.labelAr : config.labelEn}</option>)}
                    </select>
                  </label>
                  {(boundaryPoints.length > 0 || showValidation) && !boundaryValidation.valid && <p role="alert" className={`text-xs ${showValidation ? 'text-rose-300' : 'text-amber-200'}`}>{ar ? 'أكمل رسم الحدود: ' : ''}{localizeGeometryError(boundaryValidation.error, lang)}</p>}
                </div>
              )}

              {locationError && <p role="alert" className="text-xs text-rose-300">{localizeGeometryError(locationError, lang)}</p>}

              <dl className="surface-inset grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 p-2 text-xs">
                <dt className="text-slate-400">{ar ? 'الموقع' : 'Location'}</dt>
                <dd dir="auto" className="min-w-0 truncate text-slate-100">{selectedName}</dd>
                <dt className="text-slate-400">{ar ? 'الإحداثيات' : 'Coords'}</dt>
                <dd className="ltr-numeric text-slate-100 rtl:text-end">{displayedCoordinates[0].toFixed(4)}°, {displayedCoordinates[1].toFixed(4)}°</dd>
                <dt className="text-slate-400">{ar ? 'المساحة' : 'Area'}</dt>
                <dd className="font-semibold text-white">{areaSummary}</dd>
                <dd className="col-span-2 text-[10.5px] leading-tight text-slate-400 pt-0.5">{selectionMode === 'point-area'
                  ? (ar ? 'نقطة مرجعية ومساحة مُدخلة؛ لا تمثل حدودًا دقيقة.' : 'Reference point + entered area; exact boundary is unknown.')
                  : (ar ? `حدود مرسومة (${boundaryPoints.length} نقاط)` : `Drawn polygon (${boundaryPoints.length} vertices)`)}</dd>
                {selectionMode === 'boundary' && boundaryValidation.valid && <dd className="col-span-2 text-[10.5px] text-emerald-300">{ar ? 'الحدود محفوظة بصيغة GeoJSON.' : 'GeoJSON polygon ready for spatial analysis.'}</dd>}
              </dl>
            </section>

            <p className="text-[11px] leading-snug text-slate-400">{ar ? 'بعد الانتهاء اضغط «التالي»: يجري التحقق من الموقع والمساحة ثم حفظهما.' : 'When you are done, press Next below: the location and area are checked and saved.'}</p>

            <div className="grid shrink-0 grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleReloadPower}
                disabled={isNasaLoading || !farmSelection.valid}
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 text-[11px] font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-45"
              >
                <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${isNasaLoading ? 'animate-spin' : ''}`} />
                <span>{isNasaLoading ? (ar ? 'جارٍ التحميل…' : 'Loading…') : (ar ? 'تحديث بيانات NASA POWER' : 'Reload NASA data')}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 text-[11px] font-semibold text-slate-100 hover:bg-white/10"
              >
                <Printer aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span>{ar ? 'طباعة' : 'Print'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      </div>

      {activeStep === 1 && (
        <section id="workflow-section-1" className="mx-auto w-full max-w-5xl shrink-0 space-y-4 p-4 text-slate-100 sm:p-6" aria-label={ar ? 'الظروف البيئية' : 'Environmental overview'}>
          <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-cyan-300" />
              <div className="min-w-0">
                <p dir="auto" className="truncate text-sm font-semibold text-white">{selectedName}</p>
                <p className="text-xs text-slate-300"><span className="ltr-numeric">{displayedCoordinates[0].toFixed(4)}°, {displayedCoordinates[1].toFixed(4)}°</span> · {areaSummary}</p>
              </div>
            </div>
            <button type="button" onClick={onEditFarm} className="app-nav-button rounded-lg border border-white/15 px-3 text-sm text-slate-100 hover:bg-white/10">{ar ? 'تعديل الموقع' : 'Edit farm location'}</button>
          </div>
          <EnvironmentalAnalysisDashboard
            id="environmental-analysis"
            observations={powerObservations}
            farmLocation={farmSelection.valid ? farmSelection.farmLocation : null}
            lang={lang}
            isLoading={isNasaLoading}
            requestError={nasaError}
            selectedMonth={analysisMonth}
            onSelectedMonthChange={setAnalysisMonth}
            activeLayers={activeEnvironmentalLayers}
            onToggleLayer={handleToggleLayer}
            fusionGroups={environmentalFusion}
          />
        </section>
      )}

    </div>
  );
}
