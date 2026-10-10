import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Station } from '../types/station';
import type { Observation } from '../types/observation';
import type { Hotspot } from '../types/hotspot';
import type { AnalyzedRoute } from '../types/route';
import { getAqiInfo } from '../utils/aqiUtils';
import { getSeverity } from '../utils/severityEngine';

interface Props {
  stations: Station[];
  latestObservations: Array<Observation | any>;
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  mode?: 'live' | 'historical' | 'forecast';
  selectedDate?: string;
  hotspots?: Hotspot[];
  selectedHotspot?: Hotspot | null;
  onSelectHotspot?: (hotspot: Hotspot | null) => void;
  // Route planning props (Feature 13)
  routes?: AnalyzedRoute[];
  selectedRouteIndex?: number;
  onSelectRouteIndex?: (idx: number) => void;
  routeOrigin?: { latitude: number; longitude: number; name: string } | null;
  routeDestination?: { latitude: number; longitude: number; name: string } | null;
  height?: number | string;
}

export function MapView({
  stations,
  latestObservations,
  selectedStation,
  onSelectStation,
  mode = 'live',
  selectedDate,
  hotspots = [],
  selectedHotspot = null,
  onSelectHotspot,
  routes = [],
  selectedRouteIndex = 0,
  onSelectRouteIndex,
  routeOrigin = null,
  routeDestination = null,
  height,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const hotspotsLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const obsMap = new Map(latestObservations.map((o) => [o.station_id, o]));

  // Synchronize Leaflet HTML popup button actions with React state
  useEffect(() => {
    (window as unknown as { airpulseSelectStation?: (id: number) => void }).airpulseSelectStation = (stationId: number) => {
      const station = stations.find((s) => s.id === stationId);
      if (station) {
        onSelectStation(station);
      }
    };
    return () => {
      delete (window as unknown as { airpulseSelectStation?: (id: number) => void }).airpulseSelectStation;
    };
  }, [stations, onSelectStation]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use imported Leaflet instance or global fallback
    const leaflet = L || (window as any).L;
    if (!leaflet) return;

    // React StrictMode safety check: reset ID if container was previously mounted
    if ((mapContainerRef.current as any)._leaflet_id) {
      (mapContainerRef.current as any)._leaflet_id = null;
    }

    const map = leaflet.map(mapContainerRef.current, {
      center: [22.5, 82.5],
      zoom: 5,
      zoomControl: true,
    });

    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    // Invalidate size once DOM reflow / flexbox settles
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    // Watch container size changes (e.g. detail panel open/close)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (mapContainerRef.current) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }
    };
  }, []);

  // 2. Render Station Markers
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = L || (window as any).L;
    if (!map || !leaflet) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const isForecast = mode === 'forecast';

    stations.forEach((station) => {
      const lat = Number(station.latitude);
      const lon = Number(station.longitude);
      if (!isFinite(lat) || !isFinite(lon)) return;

      const obs = obsMap.get(station.id);
      const hasData = obs && obs.has_data !== false && (obs.pm25 !== null || obs.aqi !== null);
      const aqi = obs?.aqi ?? null;
      const pm25 = obs?.pm25 != null ? Math.round(Number(obs.pm25)) : null;

      // Color coding & marker label (Nature theme)
      let markerColor = '#94a3b8'; // default muted slate for no data
      let markerLabel = '—';
      let borderStyle = '2px solid #ffffff';

      if (hasData) {
        if (isForecast) {
          borderStyle = '2px solid #ffffff';
          if (pm25 !== null) {
            markerLabel = `${Math.round(pm25)}`;
            if (pm25 <= 30) markerColor = '#1b4332'; // Forest Green (Good)
            else if (pm25 <= 60) markerColor = '#2d6a4f'; // Sage Green (Satisfactory)
            else if (pm25 <= 90) markerColor = '#d97706'; // Warm Amber (Moderate)
            else if (pm25 <= 120) markerColor = '#ea580c'; // Burnt Orange (Poor)
            else if (pm25 <= 250) markerColor = '#dc2626'; // Terra Cotta (Very Poor)
            else markerColor = '#7f1d1d'; // Deep Maroon (Severe)
          } else {
            markerColor = '#94a3b8';
            markerLabel = '—';
          }
        } else if (aqi !== null) {
          const info = getAqiInfo(aqi);
          markerColor = info.color;
          markerLabel = String(Math.round(aqi));
        } else if (pm25 !== null) {
          if (pm25 <= 30) markerColor = '#1b4332'; // Forest Green (Good)
          else if (pm25 <= 60) markerColor = '#2d6a4f'; // Deep Sage (Satisfactory)
          else if (pm25 <= 90) markerColor = '#d97706'; // Warm Amber (Moderate)
          else if (pm25 <= 120) markerColor = '#ea580c'; // Burnt Orange (Poor)
          else markerColor = '#dc2626'; // Terra Cotta Red (Very Poor/Severe)
          markerLabel = `${pm25}`;
        }
      } else if (isForecast) {
        markerColor = '#94a3b8';
        markerLabel = '—';
        borderStyle = '2px dashed #cbd5e1';
      }

      const icon = leaflet.divIcon({
        className: 'custom-station-icon',
        html: `<div style="
          width:28px;height:28px;
          background:${markerColor};
          border:${borderStyle};
          border-radius:50%;
          box-shadow:0 2px 8px rgba(27,67,50,0.28);
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:700;color:#ffffff;
          opacity:${hasData ? 1 : 0.55};
          cursor:pointer;
          transition:transform 0.15s ease;
        ">${markerLabel}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const forecastSeverity = (hasData && isForecast && pm25 !== null)
        ? getSeverity('pm25', pm25, true, obs?.model_name)
        : null;

      const observedSeverity = (hasData && !isForecast)
        ? (aqi !== null
            ? getSeverity('aqi', aqi, false)
            : (pm25 !== null ? getSeverity('pm25', pm25, false) : null))
        : null;

      // Build compact, wide rectangular Leaflet popup (wider than tall)
      const popupContent = `
        <div class="map-popup-card">
          <!-- Top Row: Identity & Badges -->
          <div class="map-popup-header-row">
            <div class="map-popup-identity">
              <h4 class="map-popup-station-name" title="${station.name}">${station.name}</h4>
              <div class="map-popup-sub">
                <span>📍 ${station.city}, ${station.state}</span>
                <span class="map-popup-code-badge">${station.station_code || 'ID: ' + station.id}</span>
              </div>
            </div>
            <span class="map-popup-source-tag">${station.source_type.toUpperCase()}</span>
          </div>

          ${hasData ? (
            isForecast ? `
              <!-- ML Forecast Mode -->
              <div class="map-popup-summary-row">
                <div class="popup-category-pill" style="background:${forecastSeverity?.bg_color || 'rgba(124,58,237,0.12)'};color:${forecastSeverity?.color || '#7c3aed'};border:1px solid ${forecastSeverity?.color ? forecastSeverity.color + '44' : 'rgba(124,58,237,0.3)'}">
                  <span class="pill-dot" style="background:${forecastSeverity?.color || '#7c3aed'}"></span>
                  <span>5-DAY ML FORECAST · ${forecastSeverity?.category ? forecastSeverity.category.toUpperCase() : 'PREDICTED'}</span>
                </div>
                <div class="popup-primary-metric">
                  <span class="metric-num">${Number(obs?.pm25).toFixed(1)}</span>
                  <span class="metric-unit">µg/m³</span>
                </div>
              </div>

              <!-- 2-Column Compact Grid for Forecast Specs -->
              <div class="map-popup-compact-grid">
                <div class="compact-grid-cell"><span class="cell-label">Target Date:</span><strong class="cell-val">${obs?.prediction_date || selectedDate}</strong></div>
                <div class="compact-grid-cell"><span class="cell-label">Model:</span><strong class="cell-val">${obs?.model_name || 'Ensemble'}</strong></div>
                ${obs?.lower_bound != null && obs?.upper_bound != null ? `
                  <div class="compact-grid-cell full-span">
                    <span class="cell-label">90% Uncertainty Envelope:</span>
                    <strong class="cell-val">[${Number(obs.lower_bound).toFixed(1)} – ${Number(obs.upper_bound).toFixed(1)}] µg/m³</strong>
                  </div>
                ` : ''}
              </div>

              <div class="map-popup-footer-row">
                <span class="popup-footer-time">Validated Forecast Horizon</span>
                <button type="button" class="popup-select-btn" onclick="window.airpulseSelectStation && window.airpulseSelectStation(${station.id})">
                  Select Station ↗
                </button>
              </div>
            ` : `
              <!-- Live Ground Telemetry Mode -->
              <div class="map-popup-summary-row">
                <div class="popup-category-pill" style="background:${observedSeverity?.bg_color || (aqi !== null ? getAqiInfo(aqi).color + '22' : 'rgba(82,183,136,0.14)')};color:${observedSeverity?.color || (aqi !== null ? getAqiInfo(aqi).color : '#1b4332')};border:1px solid ${observedSeverity?.color ? observedSeverity.color + '44' : (aqi !== null ? getAqiInfo(aqi).color + '44' : 'rgba(82,183,136,0.3)')}">
                  <span class="pill-dot" style="background:${observedSeverity?.color || (aqi !== null ? getAqiInfo(aqi).color : '#2d6a4f')}"></span>
                  <span>${observedSeverity?.category ? observedSeverity.category.toUpperCase() : (aqi !== null ? 'AQI ' + Math.round(aqi) : 'GROUND MEASUREMENT')}</span>
                </div>
                <div class="popup-primary-metric">
                  <span class="metric-num">${observedSeverity?.value != null ? (observedSeverity.metric === 'aqi' ? Math.round(observedSeverity.value) : Number(observedSeverity.value).toFixed(1)) : (pm25 != null ? pm25 : '—')}</span>
                  <span class="metric-unit">${observedSeverity?.unit || (aqi !== null ? 'AQI' : 'µg/m³')}</span>
                </div>
              </div>

              <!-- Compact Horizontal Pollutants Grid -->
              <div class="map-popup-compact-grid">
                ${obs?.pm25 != null ? `<div class="compact-grid-cell"><span class="cell-label">PM2.5:</span><strong class="cell-val">${Number(obs.pm25).toFixed(1)} <small>µg/m³</small></strong></div>` : ''}
                ${obs?.pm10 != null ? `<div class="compact-grid-cell"><span class="cell-label">PM10:</span><strong class="cell-val">${Number(obs.pm10).toFixed(1)} <small>µg/m³</small></strong></div>` : ''}
                ${obs?.no2 != null ? `<div class="compact-grid-cell"><span class="cell-label">NO₂:</span><strong class="cell-val">${Number(obs.no2).toFixed(1)} <small>µg/m³</small></strong></div>` : ''}
                ${obs?.so2 != null ? `<div class="compact-grid-cell"><span class="cell-label">SO₂:</span><strong class="cell-val">${Number(obs.so2).toFixed(1)} <small>µg/m³</small></strong></div>` : ''}
                ${obs?.o3 != null ? `<div class="compact-grid-cell"><span class="cell-label">O₃:</span><strong class="cell-val">${Number(obs.o3).toFixed(1)} <small>µg/m³</small></strong></div>` : ''}
                ${obs?.temperature != null ? `<div class="compact-grid-cell"><span class="cell-label">Temp:</span><strong class="cell-val">${Number(obs.temperature).toFixed(1)}°C</strong></div>` : ''}
              </div>

              <div class="map-popup-footer-row">
                <span class="popup-footer-time">
                  ${obs?.recorded_at ? 'Recorded: ' + new Date(obs.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Ground Observation'}
                </span>
                <button type="button" class="popup-select-btn" onclick="window.airpulseSelectStation && window.airpulseSelectStation(${station.id})">
                  Select Station ↗
                </button>
              </div>
            `
          ) : isForecast ? `
            <div class="map-popup-empty-box">
              <span class="empty-icon">⚠️</span>
              <div>
                <strong>ML Prediction Unavailable</strong>
                <p>Insufficient historical telemetry (&lt;14 days) to generate forecast.</p>
              </div>
            </div>
          ` : `
            <div class="map-popup-empty-box">
              <span class="empty-icon">📡</span>
              <div>
                <strong>Observation Offline</strong>
                <p>Telemetry pending from OpenAQ sensor.</p>
              </div>
            </div>
          `}
        </div>
      `;

      // Concise hover tooltip without clutter
      const tooltipContent = `
        <div class="nature-map-tooltip">
          <div class="tooltip-name">${station.name}</div>
          <div class="tooltip-loc">📍 ${station.city}, ${station.state}</div>
          ${hasData ? `
            <div class="tooltip-metric">
              ${isForecast
                ? `Predicted PM2.5: <strong>${Number(obs?.pm25).toFixed(1)} µg/m³</strong>`
                : (aqi !== null ? `AQI: <strong>${Math.round(aqi)}</strong> (${getAqiInfo(aqi).category})` : `PM2.5: <strong>${pm25} µg/m³</strong>`)
              }
            </div>
          ` : `<div class="tooltip-empty">Telemetry pending</div>`}
        </div>
      `;

      const marker = leaflet.marker([lat, lon], { icon })
        .addTo(map)
        .bindTooltip(tooltipContent, {
          direction: 'top',
          offset: [0, -14],
          className: 'nature-marker-tooltip',
          opacity: 0.98,
        })
        .bindPopup(popupContent, {
          maxWidth: 360,
          minWidth: 290,
          className: 'airpulse-leaflet-popup',
          autoPan: true,
          autoPanPadding: [20, 20],
        })
        .on('click', () => onSelectStation(station));

      markersRef.current.set(station.id, marker);
    });

    // Make sure map updates its tile rendering
    map.invalidateSize();
  }, [stations, latestObservations, mode, selectedDate]);

  // 3. Render Hotspot Spatial Clusters Layer
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = L || (window as any).L;
    if (!map || !leaflet) return;

    if (hotspotsLayerRef.current) {
      hotspotsLayerRef.current.clearLayers();
    } else {
      hotspotsLayerRef.current = leaflet.layerGroup().addTo(map);
    }

    if (!hotspots || hotspots.length === 0) return;

    hotspots.forEach((h) => {
      const isForecast = h.mode === 'forecast';
      const color = h.severity?.color || '#ef4444';

      // 1. Cluster Extent Semi-transparent Circle
      const circle = leaflet.circle([h.center.latitude, h.center.longitude], {
        radius: h.radius_meters,
        color,
        fillColor: color,
        fillOpacity: 0.16,
        weight: 2,
        dashArray: isForecast ? '6, 6' : undefined,
      }).addTo(hotspotsLayerRef.current!);

      // 2. Centroid Flame Marker
      const flameIcon = leaflet.divIcon({
        className: 'custom-hotspot-centroid',
        html: `<div style="
          background: rgba(15, 23, 42, 0.95);
          border: 2px solid ${color};
          border-radius: 9999px;
          padding: 3px 10px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.65);
          display: flex; align-items: center; gap: 6px;
          font-family: monospace; font-size: 10px; font-weight: 700; color: #ffffff;
          cursor: pointer; white-space: nowrap;
        ">
          <span>🔥</span>
          <span>${h.title}</span>
          <span style="color:${color}">${Math.round(h.avg_pm25)} µg/m³</span>
        </div>`,
        iconSize: [170, 26],
        iconAnchor: [85, 13],
      });

      const popupContent = `
        <div class="map-popup-card hotspot-popup">
          <div class="map-popup-header">
            <div class="map-popup-name">🔥 ${h.title}</div>
            <div class="map-popup-location">${h.center.latitude.toFixed(4)}°N, ${h.center.longitude.toFixed(4)}°E · ${h.date}</div>
          </div>
          <div class="map-popup-divider"></div>
          <div class="map-popup-aqi-row">
            <span class="map-popup-aqi-tag" style="background:${h.severity?.bg_color || 'rgba(239,68,68,0.2)'};color:${h.severity?.color || '#ef4444'};border:1px solid ${h.severity?.color ? h.severity.color + '55' : 'rgba(239,68,68,0.4)'}">
              ${isForecast ? 'PREDICTED HOTSPOT' : 'OBSERVED HOTSPOT'} · ${h.severity?.category?.toUpperCase()} (Tier ${h.severity?.severity_level}/6)
            </span>
          </div>
          <div class="map-popup-grid">
            <div class="map-popup-item"><span class="map-popup-label">Avg PM2.5</span><span class="map-popup-val">${h.avg_pm25.toFixed(1)} <small>µg/m³</small></span></div>
            <div class="map-popup-item"><span class="map-popup-label">Peak PM2.5</span><span class="map-popup-val">${h.max_pm25.toFixed(1)} <small>µg/m³</small></span></div>
            <div class="map-popup-item"><span class="map-popup-label">Stations</span><span class="map-popup-val">${h.station_count} distinct</span></div>
            <div class="map-popup-item"><span class="map-popup-label">Radius</span><span class="map-popup-val">${(h.actual_cluster_radius_meters / 1000).toFixed(1)} km</span></div>
          </div>
          <div class="hotspot-popup-contrib-list">
            <strong>Contributing Stations:</strong>
            ${h.contributing_stations.map(st => `<div>· ${st.name}: <b>${Math.round(st.pm25)} µg/m³</b></div>`).join('')}
          </div>
          <div class="map-popup-footer">Algorithm: PostGIS ST_ClusterDBSCAN · HDII: ${h.scoring.value}</div>
        </div>
      `;

      leaflet.marker([h.center.latitude, h.center.longitude], { icon: flameIcon })
        .addTo(hotspotsLayerRef.current!)
        .bindPopup(popupContent)
        .on('click', () => {
          if (onSelectHotspot) onSelectHotspot(h);
        });

      circle.bindPopup(popupContent).on('click', () => {
        if (onSelectHotspot) onSelectHotspot(h);
      });
    });
  }, [hotspots, onSelectHotspot]);

  // 4. Pan to Selected Hotspot
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedHotspot) return;
    const lat = Number(selectedHotspot.center.latitude);
    const lon = Number(selectedHotspot.center.longitude);
    if (!isFinite(lat) || !isFinite(lon)) return;

    map.setView([lat, lon], 10, { animate: true });
  }, [selectedHotspot]);

  // 5. Pan to Selected Station and open Popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.invalidateSize();

    if (!selectedStation) return;
    const lat = Number(selectedStation.latitude);
    const lon = Number(selectedStation.longitude);
    if (!isFinite(lat) || !isFinite(lon)) return;

    map.setView([lat, lon], 12, { animate: true });
    const marker = markersRef.current.get(selectedStation.id);
    if (marker) marker.openPopup();
  }, [selectedStation]);

  // 6. Render Pollution-Aware Route Layers (Feature 13)
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = L || (window as any).L;
    if (!map || !leaflet) return;

    if (!routesLayerRef.current) {
      routesLayerRef.current = leaflet.layerGroup().addTo(map);
    } else {
      routesLayerRef.current.clearLayers();
    }

    if (!routes || routes.length === 0) return;

    // Origin Marker (A)
    if (routeOrigin && isFinite(routeOrigin.latitude) && isFinite(routeOrigin.longitude)) {
      const pinA = leaflet.divIcon({
        className: 'route-map-pin-container',
        html: `<div style="
          width: 30px; height: 30px; border-radius: 50%;
          background: #10b981; border: 3px solid #ffffff;
          box-shadow: 0 3px 10px rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; color: #ffffff;
        ">A</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      leaflet.marker([routeOrigin.latitude, routeOrigin.longitude], { icon: pinA })
        .addTo(routesLayerRef.current!)
        .bindPopup(`<b>Start (A):</b> ${routeOrigin.name}`);
    }

    // Destination Marker (B)
    if (routeDestination && isFinite(routeDestination.latitude) && isFinite(routeDestination.longitude)) {
      const pinB = leaflet.divIcon({
        className: 'route-map-pin-container',
        html: `<div style="
          width: 30px; height: 30px; border-radius: 50%;
          background: #ef4444; border: 3px solid #ffffff;
          box-shadow: 0 3px 10px rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; color: #ffffff;
        ">B</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      leaflet.marker([routeDestination.latitude, routeDestination.longitude], { icon: pinB })
        .addTo(routesLayerRef.current!)
        .bindPopup(`<b>Destination (B):</b> ${routeDestination.name}`);
    }

    let selectedPolyline: any = null;

    // Draw Route Polylines
    routes.forEach((route, idx) => {
      const isSelected = idx === selectedRouteIndex;
      const coords = route.geometry?.coordinates || [];
      const latLngs: [number, number][] = coords.map(([lon, lat]) => [lat, lon] as [number, number]);

      if (latLngs.length === 0) return;

      const strokeColor = isSelected
        ? (route.pollution_analysis?.severity?.color || '#38bdf8')
        : '#64748b';

      const polyline = leaflet.polyline(latLngs, {
        color: strokeColor,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.6,
        dashArray: isSelected ? undefined : '6, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routesLayerRef.current!);

      const popupContent = `
        <div style="font-family: system-ui; min-width: 180px;">
          <strong style="color: ${strokeColor}; font-size: 13px;">${route.name} (${route.tag})</strong><br/>
          <div style="margin-top: 4px; font-size: 12px; color: #334155;">
            Distance: <b>${route.distance_km} km</b> · Est. Time: <b>${route.duration_minutes} min</b> (${route.mode_label})<br/>
            ${route.pollution_analysis?.corridor_avg_concentration !== null
              ? `Corridor Exposure: <b>${route.pollution_analysis.corridor_avg_concentration} µg/m³</b> (${route.pollution_analysis.severity?.category || ''})`
              : '<i>Corridor Exposure: Data Unavailable</i>'}
          </div>
        </div>
      `;
      polyline.bindPopup(popupContent);

      polyline.on('click', () => {
        if (onSelectRouteIndex) onSelectRouteIndex(idx);
      });

      if (isSelected) {
        selectedPolyline = polyline;
      }
    });

    // Zoom and pan to fit the route
    if (selectedPolyline) {
      map.fitBounds(selectedPolyline.getBounds(), { padding: [50, 50], animate: true });
    }
  }, [routes, selectedRouteIndex, onSelectRouteIndex, routeOrigin, routeDestination]);
  const computedHeight = height
    ? (typeof height === 'number' ? `${height}px` : height)
    : '100%';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={mapContainerRef}
        className="airpulse-map-container"
        style={{
          width: '100%',
          height: computedHeight,
          minHeight: typeof height === 'number' ? `${height}px` : '320px',
          maxHeight: typeof height === 'number' ? `${height}px` : '460px',
          background: '#e9f0e6',
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      />
      <button
        type="button"
        className="nature-map-reset-btn"
        onClick={() => {
          if (mapRef.current) {
            mapRef.current.setView([22.5, 82.5], 5, { animate: true });
          }
        }}
        title="Reset map view to All India"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(27, 67, 50, 0.25)',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#1b4332',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'all 0.15s ease',
        }}
      >
        <span>↺</span>
        <span>Reset View (All India)</span>
      </button>
    </div>
  );
}
