import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Station } from '../types/station';
import type { Observation } from '../types/observation';
import type { Hotspot } from '../types/hotspot';
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
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const hotspotsLayerRef = useRef<L.LayerGroup | null>(null);

  const obsMap = new Map(latestObservations.map((o) => [o.station_id, o]));

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use imported Leaflet instance or global fallback
    const leaflet = L || (window as any).L;
    if (!leaflet) return;

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
      map.invalidateSize();
    }, 100);

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
      map.remove();
      mapRef.current = null;
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

      // Color coding & marker label
      let markerColor = '#64748b'; // default grey for no data
      let markerLabel = '—';
      let borderStyle = '2px solid #ffffff';

      if (hasData) {
        if (isForecast) {
          markerColor = '#a855f7'; // Purple theme for ML forecasts
          borderStyle = '2px solid #e9d5ff';
          markerLabel = pm25 !== null ? `${pm25}` : 'P';
        } else if (aqi !== null) {
          const info = getAqiInfo(aqi);
          markerColor = info.color;
          markerLabel = String(Math.round(aqi));
        } else if (pm25 !== null) {
          markerColor = '#38bdf8'; // Cyan for raw PM2.5 measurements
          markerLabel = `${pm25}`;
        }
      }

      const icon = leaflet.divIcon({
        className: 'custom-station-icon',
        html: `<div style="
          width:30px;height:30px;
          background:${markerColor};
          border:${borderStyle};
          border-radius:50%;
          box-shadow:0 2px 8px rgba(0,0,0,0.5);
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:700;color:#ffffff;
          opacity:${hasData ? 1 : 0.45};
          cursor:pointer;
        ">${markerLabel}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const forecastSeverity = (hasData && isForecast && pm25 !== null)
        ? getSeverity('pm25', pm25, true, obs?.model_name)
        : null;

      const observedSeverity = (hasData && !isForecast)
        ? (aqi !== null
            ? getSeverity('aqi', aqi, false)
            : (pm25 !== null ? getSeverity('pm25', pm25, false) : null))
        : null;

      const popupContent = `
        <div class="map-popup-card">
          <div class="map-popup-header">
            <div class="map-popup-name">${station.name}</div>
            <div class="map-popup-location">${station.city}, ${station.state}</div>
          </div>
          <div class="map-popup-divider"></div>

          ${
            hasData
              ? isForecast
                ? `
                <div class="map-popup-aqi-row">
                  <span class="map-popup-aqi-tag" style="background:${forecastSeverity?.bg_color || 'rgba(168,85,247,0.18)'};color:${forecastSeverity?.color || '#c084fc'};border:1px solid ${forecastSeverity?.color ? forecastSeverity.color + '55' : 'rgba(168,85,247,0.4)'}">
                    ML FORECAST · ${forecastSeverity?.category ? forecastSeverity.category.toUpperCase() + ' (Tier ' + forecastSeverity.severity_level + '/6)' : 'PREDICTED'}
                  </span>
                </div>
                <div class="map-popup-grid">
                  <div class="map-popup-item"><span class="map-popup-label">Target Date</span><span class="map-popup-val">${obs?.prediction_date || selectedDate}</span></div>
                  <div class="map-popup-item"><span class="map-popup-label">Pred PM2.5</span><span class="map-popup-val">${Number(obs?.pm25).toFixed(1)} <small>µg/m³</small></span></div>
                  ${obs?.lower_bound != null ? `<div class="map-popup-item"><span class="map-popup-label">Lower CI</span><span class="map-popup-val">${Number(obs.lower_bound).toFixed(1)}</span></div>` : ''}
                  ${obs?.upper_bound != null ? `<div class="map-popup-item"><span class="map-popup-label">Upper CI</span><span class="map-popup-val">${Number(obs.upper_bound).toFixed(1)}</span></div>` : ''}
                </div>
                <div class="map-popup-footer">Model: ${obs?.model_name || 'weighted_ensemble'} v${obs?.model_version || '1.0.0'}</div>
              `
                : `
                <div class="map-popup-aqi-row">
                  <span class="map-popup-aqi-tag" style="background:${observedSeverity?.bg_color || (aqi !== null ? getAqiInfo(aqi).color + '22' : 'rgba(56,189,248,0.12)')};color:${observedSeverity?.color || (aqi !== null ? getAqiInfo(aqi).color : '#38bdf8')};border:1px solid ${observedSeverity?.color ? observedSeverity.color + '55' : (aqi !== null ? getAqiInfo(aqi).color + '55' : 'rgba(56,189,248,0.3)')}">
                    ${observedSeverity?.category
                      ? `${observedSeverity.metric_display} ${Math.round(observedSeverity.value!)}${observedSeverity.unit ? ' ' + observedSeverity.unit : ''} · ${observedSeverity.category.toUpperCase()} (Tier ${observedSeverity.severity_level}/6)`
                      : (aqi !== null ? `AQI ${Math.round(aqi)} · ${getAqiInfo(aqi).category}` : 'OBSERVED MEASUREMENT')}
                  </span>
                </div>
                <div class="map-popup-grid">
                  ${obs?.pm25 != null ? `<div class="map-popup-item"><span class="map-popup-label">PM2.5</span><span class="map-popup-val">${Number(obs.pm25).toFixed(1)} <small>µg/m³</small></span></div>` : ''}
                  ${obs?.pm10 != null ? `<div class="map-popup-item"><span class="map-popup-label">PM10</span><span class="map-popup-val">${Number(obs.pm10).toFixed(1)} <small>µg/m³</small></span></div>` : ''}
                  ${obs?.no2 != null ? `<div class="map-popup-item"><span class="map-popup-label">NO₂</span><span class="map-popup-val">${Number(obs.no2).toFixed(1)} <small>µg/m³</small></span></div>` : ''}
                  ${obs?.so2 != null ? `<div class="map-popup-item"><span class="map-popup-label">SO₂</span><span class="map-popup-val">${Number(obs.so2).toFixed(1)} <small>µg/m³</small></span></div>` : ''}
                  ${obs?.o3 != null ? `<div class="map-popup-item"><span class="map-popup-label">O₃</span><span class="map-popup-val">${Number(obs.o3).toFixed(1)} <small>µg/m³</small></span></div>` : ''}
                  ${obs?.temperature != null ? `<div class="map-popup-item"><span class="map-popup-label">Temp</span><span class="map-popup-val">${Number(obs.temperature).toFixed(1)}°C</span></div>` : ''}
                  ${obs?.humidity != null ? `<div class="map-popup-item"><span class="map-popup-label">Humidity</span><span class="map-popup-val">${Number(obs.humidity).toFixed(0)}%</span></div>` : ''}
                </div>
                ${obs?.recorded_at ? `<div class="map-popup-footer">Recorded: ${new Date(obs.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} · ${new Date(obs.recorded_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>` : '<div class="map-popup-footer">Ground observation</div>'}
              `
              : `
              <div class="map-popup-empty-notice">
                <span class="empty-warn-icon">⚠</span>
                <span>Data unavailable for this station on selected date ${selectedDate ? `(${selectedDate})` : ''}</span>
              </div>
            `
          }
        </div>
      `;

      const marker = leaflet.marker([lat, lon], { icon })
        .addTo(map)
        .bindPopup(popupContent)
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

  return (
    <div
      ref={mapContainerRef}
      className="map-container"
      style={{ width: '100%', height: '100%', minHeight: 350, background: '#1e293b' }}
    />
  );
}
