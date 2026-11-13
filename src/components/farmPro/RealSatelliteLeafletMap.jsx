'use client';

import React, { useEffect, useRef, useState } from 'react';
// Leaflet's stylesheet ships with this lazily loaded chunk instead of the global CSS.
import 'leaflet/dist/leaflet.css';

export default function RealSatelliteLeafletMap({
  center = [30.825, 31.310], // Nile Delta center
  zoom = 15,
  selectedLocation = [30.825, 31.310],
  onLocationSelect,
  isScanning,
  drawingMode = false,
  boundaryPoints = [],
  polygonIsValid = false,
  onBoundaryPointMove,
  environmentalPointLayers = [],
  lang = 'en',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const beaconLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const environmentalLayerRef = useRef(null);
  const zoomControlRef = useRef(null);
  const callbacksRef = useRef({});
  const leafletRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [tileLoadError, setTileLoadError] = useState(false);
  callbacksRef.current = { onLocationSelect, onBoundaryPointMove };

  // Initialize Leaflet Map once
  useEffect(() => {
    let map = null;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      leafletRef.current = L;

      // Initialize Map with custom high-res satellite controls
      map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: false,
        attributionControl: false,
      });

      // Esri World Imagery is the basemap, not an analytical NASA data layer.
      const imageryLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Esri, Maxar, Earthstar Geographics'
        }
      );
      imageryLayer.on('tileerror', () => setTileLoadError(true));
      imageryLayer.on('load', () => setTileLoadError(false));
      imageryLayer.addTo(map);

      // 2. Subtle Reference labels (Roads, canals, place names)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          opacity: 0.75
        }
      ).addTo(map);

      // Custom Zoom Control top-right
      zoomControlRef.current = L.control.zoom({
        position: 'topright',
        zoomInTitle: lang === 'ar' ? 'تكبير الخريطة' : 'Zoom in',
        zoomOutTitle: lang === 'ar' ? 'تصغير الخريطة' : 'Zoom out',
      }).addTo(map);

      // Click to choose any location on Earth!
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        callbacksRef.current.onLocationSelect?.([lat, lng]);
      });

      const beaconGroup = L.layerGroup().addTo(map);
      const boundaryGroup = L.layerGroup().addTo(map);
      const environmentalGroup = L.layerGroup().addTo(map);
      beaconLayerRef.current = beaconGroup;
      boundaryLayerRef.current = boundaryGroup;
      environmentalLayerRef.current = environmentalGroup;
      mapInstanceRef.current = map;
      // Layer effects wait for this flag, so a saved point or boundary is drawn
      // as soon as the map exists instead of after the next user edit.
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      const mountedMap = mapInstanceRef.current || map;
      mountedMap?.remove();
      if (mapInstanceRef.current === mountedMap) mapInstanceRef.current = null;
      zoomControlRef.current = null;
      beaconLayerRef.current = null;
      boundaryLayerRef.current = null;
      environmentalLayerRef.current = null;
    };
  }, []);

  // Keep Leaflet's internal size in sync with the container (step changes,
  // orientation changes, panel resizes) without re-creating the map.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!mapReady || !map || !container || typeof ResizeObserver === 'undefined') return undefined;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) map.invalidateSize({ pan: false });
      });
    });
    observer.observe(container);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [mapReady]);

  useEffect(() => {
    const control = zoomControlRef.current;
    if (!control) return;
    const zoomInTitle = lang === 'ar' ? 'تكبير الخريطة' : 'Zoom in';
    const zoomOutTitle = lang === 'ar' ? 'تصغير الخريطة' : 'Zoom out';
    control.options.zoomInTitle = zoomInTitle;
    control.options.zoomOutTitle = zoomOutTitle;
    const container = control.getContainer();
    container?.querySelector('.leaflet-control-zoom-in')?.setAttribute('title', zoomInTitle);
    container?.querySelector('.leaflet-control-zoom-out')?.setAttribute('title', zoomOutTitle);
  }, [lang, mapReady]);

  // Move the view only when the target is off-screen (search result, preset,
  // typed coordinates). Clicking a visible point or adding boundary vertices
  // must not re-centre the map or reset the zoom level the user chose.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !center || drawingMode) return;
    const size = map.getSize();
    if (!size.x || !size.y) {
      map.setView(center, zoom, { animate: false });
      return;
    }
    if (map.getBounds().pad(-0.1).contains(center)) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) map.setView(center, zoom, { animate: false });
    else map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom, mapReady]);

  // Render the point marker or polygon boundary without implying a surveyed farm edge.
  useEffect(() => {
    const L = leafletRef.current;
    if (!mapReady || !L || !beaconLayerRef.current) return;
    {
      const group = beaconLayerRef.current;
      group.clearLayers();
      if (drawingMode) return;

      if (!selectedLocation || selectedLocation.length < 2) return;
      const [lat, lng] = selectedLocation;
      const beaconIcon = L.divIcon({
        className: 'custom-neon-beacon',
        iconSize: [64, 64],
        iconAnchor: [32, 32],
        html: `
          <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 2px solid #22d3ee; animation: beaconPulse 2.4s infinite ease-out;"></div>
            <div style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #0891b2; border: 2px solid #ffffff; box-shadow: 0 1px 6px rgba(0,0,0,0.6);"></div>
            <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: rgba(7, 21, 43, 0.95); border: 1px solid rgba(34, 211, 238, 0.7); color: #e0f2fe; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px; white-space: nowrap;">
              ${lang === 'ar' ? 'موقع المزرعة' : 'Farm location'}
            </div>
          </div>
        `
      });

      const marker = L.marker([lat, lng], { icon: beaconIcon, interactive: false, keyboard: false });
      group.addLayer(marker);
    }
  }, [selectedLocation, drawingMode, lang, mapReady]);

  useEffect(() => {
    const L = leafletRef.current;
    if (!mapReady || !L || !boundaryLayerRef.current) return;
    {
      const group = boundaryLayerRef.current;
      group.clearLayers();
      if (!boundaryPoints.length) return;

      const latLngs = boundaryPoints.map((point) => [point.latitude, point.longitude]);
      if (latLngs.length >= 2) {
        const shape = latLngs.length >= 3 && polygonIsValid
          ? L.polygon(latLngs, {
            color: '#22d3ee',
            weight: 3,
            fillColor: '#0891b2',
            fillOpacity: 0.22,
            className: 'leaflet-neon-polygon-selected',
          })
          : L.polyline(latLngs, { color: '#22d3ee', weight: 3, dashArray: '6, 6' });
        group.addLayer(shape);
      }

      boundaryPoints.forEach((point, index) => {
        const editable = L.marker([point.latitude, point.longitude], {
          draggable: true,
          keyboard: true,
          icon: L.divIcon({
            className: 'custom-neon-beacon',
            // 36px hit area around an 18px handle keeps vertices draggable by touch.
            html: '<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center"><div style="width:18px;height:18px;border:2px solid #ecfeff;border-radius:50%;background:#06b6d4;box-shadow:0 1px 5px rgba(0,0,0,.6)"></div></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
          title: lang === 'ar' ? `نقطة الحدود ${index + 1}؛ اسحب للتعديل` : `Boundary point ${index + 1}; drag to edit`,
        });
        editable.on('dragend', (event) => {
          const { lat, lng } = event.target.getLatLng();
          callbacksRef.current.onBoundaryPointMove?.(index, { latitude: lat, longitude: lng });
        });
        group.addLayer(editable);
      });
    }
  }, [boundaryPoints, polygonIsValid, lang, mapReady]);

  // POWER currently supplies a location-based climatology, not a raster.
  // Render one point inspector with selected measures; never shade the farm.
  useEffect(() => {
    const L = leafletRef.current;
    if (!mapReady || !L || !environmentalLayerRef.current) return;
    {
      const group = environmentalLayerRef.current;
      group.clearLayers();
      if (!selectedLocation || !environmentalPointLayers.length) return;

      const marker = L.circleMarker(selectedLocation, {
        radius: 8,
        color: '#f8fafc',
        weight: 2,
        fillColor: '#06b6d4',
        fillOpacity: 0.95,
        bubblingMouseEvents: false,
      });
      marker.bindTooltip(lang === 'ar' ? 'نقطة بيانات من NASA POWER · ليست طبقة صور' : 'NASA POWER reference point · not a raster overlay', { direction: 'top' });

      const popup = L.DomUtil.create('div', 'environmental-point-popup');
      const heading = L.DomUtil.create('strong', '', popup);
      heading.textContent = lang === 'ar' ? 'NASA POWER · بيانات النقطة' : 'NASA POWER · point reference';
      const explanation = L.DomUtil.create('p', '', popup);
      explanation.textContent = lang === 'ar'
        ? 'صورة الخلفية من Esri للعرض فقط، والقيم متوسطات مناخية لخلية شبكية واسعة وليست قياسًا داخل الحقل.'
        : 'Esri imagery is the basemap. These values are climatological grid references, not field measurements or polygon averages.';
      environmentalPointLayers.forEach((item) => {
        const row = L.DomUtil.create('p', '', popup);
        const unit = item.unit === 'degC' ? '°C' : item.unit;
        row.textContent = `${item.variable}: ${Number(item.value).toFixed(2)} ${unit} · ${item.referenceDate} · ${item.source?.provider || 'NASA POWER'}`;
        row.style.fontSize = '14px';
        row.style.lineHeight = '1.5';
        const quality = L.DomUtil.create('small', '', popup);
        quality.textContent = item.quality || (lang === 'ar' ? 'قيم مأخوذة من المصدر مباشرة دون فحص إضافي' : 'Quality not further assessed by application');
        quality.style.fontSize = '12px';
        quality.style.lineHeight = '1.5';
      });
      marker.bindPopup(popup, { maxWidth: 280 });
      group.addLayer(marker);
    }
  }, [selectedLocation, environmentalPointLayers, lang, mapReady]);

  return (
    <div className="relative h-full min-h-0 w-full">
      <div ref={mapContainerRef} className="z-0 h-full w-full cursor-crosshair" />

      {tileLoadError && <div role="status" className="absolute inset-x-3 top-14 z-[500] rounded-lg border border-amber-400/50 bg-[#07152b]/95 px-3 py-2 text-xs leading-relaxed text-amber-100 shadow-lg sm:inset-x-auto sm:right-16 sm:top-3 sm:max-w-sm">
        {lang === 'ar' ? 'تعذّر تحميل بعض أجزاء الخريطة. تحقق من الاتصال بالإنترنت أو أعد تحميل الصفحة.' : 'Some Esri imagery tiles failed to load; blank map areas may appear. Check the connection or reload the map.'}
      </div>}

      {/* Basemap credit sits in the bottom corner, clear of the zoom control and farm tools. */}
      <div className="pointer-events-none absolute bottom-1 right-1 z-[450] max-w-[calc(100%-0.5rem)] truncate rounded bg-[#07152b]/85 px-1.5 py-0.5 text-2xs text-slate-200">
        {lang === 'ar' ? 'الخلفية: صور Esri © Esri وMaxar وEarthstar · التحليل: نقطة واحدة فقط' : 'Basemap: Esri imagery © Esri, Maxar, Earthstar · Analysis: point data only'}
      </div>

      {isScanning && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 animate-pulse bg-cyan-300/80" />
      )}
    </div>
  );
}
