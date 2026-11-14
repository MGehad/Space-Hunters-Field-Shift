'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkingSession } from '../../context/WorkingSessionContext';
import { getPowerClimatology } from '../../services/nasa/powerProvider';
import { fuseEnvironmentalObservations } from '../../analysis/environmental/fusion';
import EnvironmentalAnalysisDashboard from './EnvironmentalAnalysisDashboard';
import { searchPlaces, reversePlace, parseCoordinateQuery, shortPlaceLabel } from '../../services/geocoding/nominatim';
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
  MapPin, X, Search, LocateFixed, Loader2,
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
  // Place search (OpenStreetMap Nominatim) and browser geolocation.
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placeStatus, setPlaceStatus] = useState({ state: 'idle', message: '' }); // idle | searching | locating | done | empty | error
  const placeRequestRef = useRef(null);
  const [showValidation, setShowValidation] = useState(false);
  const latitudeRef = useRef(null);
  const [coordsOpen, setCoordsOpen] = useState(false);
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

  useEffect(() => () => placeRequestRef.current?.abort(), []);

  const startPlaceRequest = () => {
    placeRequestRef.current?.abort();
    const controller = new AbortController();
    placeRequestRef.current = controller;
    return controller;
  };

  const handlePlaceSearch = async (event) => {
    event?.preventDefault();
    const query = placeQuery.trim();
    if (query.length < 2) {
      setPlaceResults([]);
      setPlaceStatus({ state: 'error', message: ar ? 'اكتب اسم مكان من حرفين على الأقل.' : 'Type at least two characters of a place name.' });
      return;
    }
    // Typed coordinates are applied directly, without a network request.
    const coordinates = parseCoordinateQuery(query);
    if (coordinates) {
      setPlaceResults([]);
      setPlaceStatus({ state: 'idle', message: '' });
      applyPointLocation(coordinates.latitude, coordinates.longitude, `${coordinates.latitude.toFixed(4)}°, ${coordinates.longitude.toFixed(4)}°`);
      return;
    }
    const controller = startPlaceRequest();
    setPlaceStatus({ state: 'searching', message: ar ? 'جارٍ البحث…' : 'Searching…' });
    try {
      const results = await searchPlaces(query, { lang, signal: controller.signal });
      if (controller.signal.aborted) return;
      setPlaceResults(results);
      setPlaceStatus(results.length
        ? { state: 'done', message: ar ? `${results.length === 1 ? 'نتيجة واحدة' : results.length === 2 ? 'نتيجتان' : `${results.length.toLocaleString('ar-EG')} نتائج`}؛ اختر المكان المقصود.` : `${results.length} result${results.length === 1 ? '' : 's'}; choose the place you mean.` }
        : { state: 'empty', message: ar ? 'لم يُعثر على مكان بهذا الاسم. جرّب اسمًا آخر أو أضف اسم الدولة.' : 'No place found with that name. Try another spelling or add the country.' });
    } catch (error) {
      if (controller.signal.aborted || error?.code === 'aborted') return;
      setPlaceResults([]);
      setPlaceStatus({ state: 'error', message: error?.code === 'rate-limited'
        ? (ar ? 'خدمة البحث مشغولة الآن؛ حاول بعد لحظات.' : 'The search service is busy; try again in a moment.')
        : (ar ? 'تعذّر الوصول إلى خدمة البحث. تحقّق من الاتصال، أو اضغط على الخريطة، أو أدخل الإحداثيات.' : 'The search service could not be reached. Check your connection, click the map or type coordinates.') });
    }
  };

  const handleSelectPlace = (place) => {
    const label = shortPlaceLabel(place.displayName) || place.name;
    if (applyPointLocation(Number(place.latitude.toFixed(6)), Number(place.longitude.toFixed(6)), label)) {
      setPlaceQuery(place.name || label);
      setPlaceResults([]);
      setPlaceStatus({ state: 'idle', message: '' });
    }
  };

  const handleUseMyLocation = () => {
    setPlaceResults([]);
    if (typeof navigator === 'undefined' || !navigator.geolocation || (typeof window !== 'undefined' && window.isSecureContext === false)) {
      setPlaceStatus({ state: 'error', message: ar ? 'تحديد الموقع غير متاح في هذا المتصفح أو على اتصال غير آمن (يتطلب HTTPS).' : 'Location is not available in this browser or on an insecure connection (HTTPS is required).' });
      return;
    }
    const controller = startPlaceRequest();
    setPlaceStatus({ state: 'locating', message: ar ? 'جارٍ تحديد موقعك… وافق على طلب الإذن في المتصفح.' : 'Finding your location… allow the browser permission request.' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (controller.signal.aborted) return;
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy || 0);
        const fallback = ar ? `موقعي (${latitude.toFixed(4)}°، ${longitude.toFixed(4)}°)` : `My location (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`;
        if (!applyPointLocation(latitude, longitude, fallback)) return;
        const accuracyText = accuracy ? (ar ? ` الدقة نحو ±${accuracy} م.` : ` Accuracy about ±${accuracy} m.`) : '';
        setPlaceStatus({ state: 'done', message: (ar ? 'تم تحديد موقعك.' : 'Your location was set.') + accuracyText });
        // Best effort: replace the coordinate label with the place name.
        try {
          const name = await reversePlace(latitude, longitude, { lang, signal: controller.signal });
          if (name && !controller.signal.aborted) {
            setLocationName((current) => (current === fallback ? (ar ? `موقعي: ${name}` : `My location: ${name}`) : current));
          }
        } catch { /* keep the coordinate label */ }
      },
      (error) => {
        if (controller.signal.aborted) return;
        const messages = {
          1: ar ? 'لم يُسمح بالوصول إلى الموقع. فعّل إذن الموقع لهذا الموقع من إعدادات المتصفح ثم حاول مجددًا.' : 'Location permission was denied. Allow location access for this site in your browser settings, then try again.',
          2: ar ? 'تعذّر تحديد موقعك الآن. تأكد من تشغيل خدمات الموقع في جهازك.' : 'Your location could not be determined. Check that location services are on for your device.',
          3: ar ? 'انتهت مهلة تحديد الموقع؛ حاول مجددًا.' : 'Finding your location took too long; try again.',
        };
        setPlaceStatus({ state: 'error', message: messages[error?.code] || messages[2] });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
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
        setCoordsOpen(true);
        setTimeout(() => latitudeRef.current?.focus(), 0);
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
  const modeButtonClass = (active) => `h-9 rounded-lg px-2 text-sm transition-colors ${active ? 'bg-[#0e1e38] font-semibold text-white shadow-[inset_0_0_0_1px_#1f3b6a]' : 'font-medium text-slate-300 hover:text-white'}`;
  const panelIconClass = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[#1f3b6a] bg-[#0a1528] text-slate-200 hover:border-cyan-400/50 hover:bg-[#0e1e38] disabled:opacity-45';
  const labelClass = 'block space-y-1 text-xs font-medium text-slate-300';

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
        <p className={`pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-4.5rem)] items-center gap-2 rounded-xl border border-[#1f3b6a] bg-[#060d1d]/92 px-3.5 py-1.5 text-xs sm:rounded-full text-slate-100 shadow-md backdrop-blur-sm sm:left-auto sm:right-[4.25rem] sm:top-3 sm:max-w-sm ${isPanelCollapsed ? 'flex' : 'flex sm:hidden lg:flex'}`}>
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
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
          <div className="relative z-20 m-2 flex flex-col gap-3 rounded-2xl border border-[#1f3b6a] bg-[#060d1d]/95 p-3 text-white shadow-2xl backdrop-blur-sm sm:absolute sm:m-0 sm:left-3 sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:w-[24rem] sm:max-w-[calc(100%-5rem)] sm:overflow-y-auto sm:overscroll-contain sm:p-4">

            {/* Selected farm + collapse */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" />
                <div className="min-w-0">
                  <div className="text-xs leading-tight text-slate-400">{ar ? 'المزرعة المحددة' : 'Selected farm'}</div>
                  <div dir="auto" className="truncate text-sm sm:text-base font-semibold leading-tight text-white">{selectedName}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={handleReloadPower} disabled={isNasaLoading || !farmSelection.valid} aria-label={isNasaLoading ? (ar ? 'جارٍ التحميل…' : 'Loading…') : (ar ? 'تحديث بيانات NASA POWER' : 'Reload NASA data')} title={ar ? 'تحديث بيانات NASA POWER' : 'Reload NASA data'} className={panelIconClass}>
                  <RefreshCw aria-hidden="true" className={`h-4 w-4 ${isNasaLoading ? 'animate-spin' : ''}`} />
                </button>
                <button type="button" onClick={() => window.print()} aria-label={ar ? 'طباعة' : 'Print'} title={ar ? 'طباعة' : 'Print'} className={panelIconClass}>
                  <Printer aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  aria-expanded
                  aria-label={ar ? 'تصغير اللوحة لعرض الخريطة كاملة' : 'Collapse panel to view the full map'}
                  title={ar ? 'تصغير اللوحة' : 'Collapse panel'}
                  className={panelIconClass}
                >
                  <ChevronDown aria-hidden="true" className="h-4 w-4 rotate-180 sm:rotate-90 rtl:sm:-rotate-90" />
                </button>
              </div>
            </div>

            <section className="space-y-3" aria-label={ar ? 'تحديد موقع ومساحة المزرعة' : 'Farm location and area selection'}>
              <div className="grid grid-cols-2 gap-1 rounded-[11px] border border-[#162b4f] bg-[#030712] p-[3px]">
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
                <div className="space-y-3">
                  <p className="text-xs leading-snug text-slate-300">{ar ? 'ابحث عن مكان، أو استخدم موقعك، أو اضغط على الخريطة، أو أدخل الإحداثيات. المساحة المُدخلة تقديرية حول نقطة واحدة.' : 'Search for a place, use your location, click the map or type coordinates. The entered area is an estimate around one reference point.'}</p>
                  <form role="search" onSubmit={handlePlaceSearch} className="space-y-1.5">
                    <label htmlFor="farm-place-search" className={labelClass}>
                      <span>{ar ? 'البحث عن مكان' : 'Search for a place'}</span>
                    </label>
                    <div className="flex items-stretch gap-1.5">
                      <input
                        id="farm-place-search"
                        type="search"
                        value={placeQuery}
                        onChange={(event) => setPlaceQuery(event.target.value)}
                        placeholder={ar ? 'اسم المكان' : 'Place name'}
                        autoComplete="off"
                        enterKeyHint="search"
                        aria-describedby="farm-place-status"
                        className="field-control !min-h-10 h-10 min-w-0 flex-1 px-3 text-sm focus-visible:shadow-[0_0_0_4px_rgb(6_182_212_/_0.15)]"
                      />
                      <button type="submit" disabled={placeStatus.state === 'searching'} aria-label={ar ? 'بحث' : 'Search'} title={ar ? 'بحث' : 'Search'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-r from-blue-600 to-cyan-700 text-white hover:brightness-110 disabled:opacity-60 rtl:bg-gradient-to-l">
                        {placeStatus.state === 'searching' ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Search aria-hidden="true" className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={handleUseMyLocation} disabled={placeStatus.state === 'locating'} className="flex h-10 shrink-0 items-center gap-1.5 rounded-[11px] border border-[#1f3b6a] bg-[#0a1528] px-3 text-sm font-semibold text-slate-50 hover:border-cyan-400/50 hover:bg-[#0e1e38] disabled:opacity-60">
                        {placeStatus.state === 'locating' ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LocateFixed aria-hidden="true" className="h-4 w-4" />}
                        <span>{ar ? 'موقعي' : 'My location'}</span>
                      </button>
                    </div>
                  </form>
                  <p id="farm-place-status" role="status" aria-live="polite" className={`text-[11px] leading-snug ${placeStatus.state === 'error' || placeStatus.state === 'empty' ? 'text-amber-200' : 'text-slate-300'} ${placeStatus.message ? '' : 'sr-only'}`}>{placeStatus.message}</p>
                  {placeResults.length > 0 && (
                    <div className="overflow-hidden rounded-[11px] border border-[#162b4f] bg-[#0a1528]">
                      <ul aria-label={ar ? 'نتائج البحث' : 'Search results'} className="max-h-44 divide-y divide-white/5 overflow-y-auto">
                        {placeResults.map((place) => (
                          <li key={place.id}>
                            <button type="button" onClick={() => handleSelectPlace(place)} className="flex w-full items-start gap-2.5 px-3 py-2 text-start hover:bg-[#0e1e38] focus-visible:bg-[#0e1e38]">
                              <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-white">{place.name}</span>
                                <span className="block truncate text-xs text-slate-400">{place.displayName}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="border-t border-[#162b4f] px-3 py-1 text-xs text-slate-400">
                        {ar ? 'البحث: ' : 'Search: '}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-200">© OpenStreetMap contributors</a>
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <label className={labelClass}>
                      <span>{ar ? 'مساحة المزرعة' : 'Farm area'}</span>
                      <input ref={areaRef} type="number" min="0" step="any" dir="ltr" value={areaInput} aria-invalid={!pointAreaIsValid} aria-describedby={!pointAreaIsValid ? 'farm-area-error' : undefined} onChange={(event) => setAreaInput(event.target.value)} className={`field-control !min-h-10 h-10 px-2.5 text-sm ${!pointAreaIsValid && showValidation ? 'ring-2 ring-rose-400' : ''}`} />
                    </label>
                    <label className={labelClass}>
                      <span>{ar ? 'وحدة المساحة' : 'Area unit'}</span>
                      <select value={areaUnit} onChange={(event) => handleAreaUnitChange(event.target.value)} className="field-control !min-h-10 h-10 px-2.5 text-sm">
                        {Object.entries(FARM_AREA_UNITS).map(([unit, config]) => <option key={unit} value={unit}>{ar ? config.labelAr : config.labelEn}</option>)}
                      </select>
                    </label>
                  </div>
                  {!pointAreaIsValid && <p id="farm-area-error" role="alert" className="text-xs text-rose-300">{ar ? 'أدخل مساحة أكبر من الصفر وضمن الحد المقبول لمزرعة.' : 'Enter an area greater than zero and within a valid farm-size range.'}</p>}
                  <div className="rounded-[11px] border border-dashed border-[#1f3b6a]">
                    <button type="button" onClick={() => setCoordsOpen((open) => !open)} aria-expanded={coordsOpen} aria-controls="farm-coordinates" className="flex h-10 w-full items-center justify-between gap-2 rounded-[11px] px-3 text-sm text-slate-200 hover:bg-white/5">
                      <span>{ar ? 'إدخال الإحداثيات يدويًا' : 'Enter coordinates instead'}</span>
                      <ChevronDown aria-hidden="true" className={`h-4 w-4 text-slate-400 transition-transform ${coordsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div id="farm-coordinates" hidden={!coordsOpen} className="px-3 pb-3">
                      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                        <label className={labelClass}>
                          <span>{ar ? 'خط العرض' : 'Latitude'}</span>
                          <input ref={latitudeRef} inputMode="decimal" dir="ltr" value={latitudeInput} aria-invalid={Boolean(locationError) || undefined} onChange={(event) => setLatitudeInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleApplyCoordinates(); }} className="field-control !min-h-10 h-10 px-2.5 text-sm" />
                        </label>
                        <label className={labelClass}>
                          <span>{ar ? 'خط الطول' : 'Longitude'}</span>
                          <input inputMode="decimal" dir="ltr" value={longitudeInput} onChange={(event) => setLongitudeInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleApplyCoordinates(); }} className="field-control !min-h-10 h-10 px-2.5 text-sm" />
                        </label>
                        <button type="button" onClick={handleApplyCoordinates} className="h-10 shrink-0 rounded-[11px] border border-[#1f3b6a] bg-[#0a1528] px-3 text-sm font-semibold text-slate-50 hover:border-cyan-400/50 hover:bg-[#0e1e38]">
                          {ar ? 'تطبيق' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  </div>
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

              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border border-[#162b4f] bg-[#0a1528] p-3 text-sm">
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

            <p className="text-xs leading-snug text-slate-400">{ar ? 'بعد الانتهاء اضغط «التالي»: يجري التحقق من الموقع والمساحة ثم حفظهما.' : 'When you are done, press Next below: the location and area are checked and saved.'}</p>

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
