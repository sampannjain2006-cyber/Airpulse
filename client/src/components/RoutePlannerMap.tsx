/**
 * AIRPULSE — Route Planner Leaflet Map Component
 * Dedicated lifecycle-safe Leaflet map implementation for the Pollution-Aware Route Planner.
 * Strictly avoids zombie instances, invalidates sizes on drawer layout transitions,
 * validates GeoJSON [lon, lat] -> Leaflet [lat, lon] geometry safely, and provides
 * dev diagnostics and theme-accessible markers and popups.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RoutePlanResponse } from '../types/route';

interface RoutePlannerMapProps {
  activeRouteResponse: RoutePlanResponse | null;
  selectedRouteIndex: number;
  onSelectRouteIndex: (idx: number) => void;
  resetTrigger?: number;
}

export const RoutePlannerMap: React.FC<RoutePlannerMapProps> = ({
  activeRouteResponse,
  selectedRouteIndex,
  onSelectRouteIndex,
  resetTrigger = 0,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedPolylineRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);

  // 1. Initialize Leaflet Map instance on mount
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Remove any stale Leaflet instance or property on container
    if ('_leaflet_id' in container) {
      delete (container as unknown as Record<string, unknown>)._leaflet_id;
    }

    const map = L.map(container, {
      center: [28.6139, 77.2090],
      zoom: 12,
      zoomControl: true,
      fadeAnimation: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const routesLayer = L.layerGroup().addTo(map);
    routesLayerRef.current = routesLayer;
    mapRef.current = map;
    setMapReady(true);

    if (import.meta.env.DEV) {
      const rect = container.getBoundingClientRect();
      console.debug('[AirPulse RoutePlannerMap] Leaflet map initialized. Container dimensions:', `${rect.width}px x ${rect.height}px`);
    }

    // Force invalidateSize after drawer transitions settle
    const t1 = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 120);

    const t2 = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 320);

    const t3 = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 600);

    // Watch container resize for responsive drawer/window changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      routesLayerRef.current = null;
      selectedPolylineRef.current = null;
      setMapReady(false);
    };
  }, []);

  // 2. Plot origin, destination, and route polylines whenever route response or selection changes
  const updateRouteVisuals = useCallback(() => {
    const map = mapRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !routesLayer) return;

    routesLayer.clearLayers();
    selectedPolylineRef.current = null;

    if (!activeRouteResponse) {
      map.setView([28.6139, 77.2090], 12);
      map.invalidateSize();
      return;
    }

    const { origin, destination, routes } = activeRouteResponse;
    const allBounds = L.latLngBounds([]);

    // 1. Origin Marker (A - Green)
    if (
      origin &&
      typeof origin.latitude === 'number' &&
      typeof origin.longitude === 'number' &&
      isFinite(origin.latitude) &&
      isFinite(origin.longitude) &&
      Math.abs(origin.latitude) <= 90 &&
      Math.abs(origin.longitude) <= 180
    ) {
      const pinA = L.divIcon({
        className: 'route-map-pin-origin',
        html: `<div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: #10b981; border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; color: #ffffff;
        ">A</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([origin.latitude, origin.longitude], { icon: pinA })
        .addTo(routesLayer)
        .bindPopup(`<b>Start (A):</b> ${origin.name}`);

      allBounds.extend([origin.latitude, origin.longitude]);
    }

    // 2. Destination Marker (B - Red)
    if (
      destination &&
      typeof destination.latitude === 'number' &&
      typeof destination.longitude === 'number' &&
      isFinite(destination.latitude) &&
      isFinite(destination.longitude) &&
      Math.abs(destination.latitude) <= 90 &&
      Math.abs(destination.longitude) <= 180
    ) {
      const pinB = L.divIcon({
        className: 'route-map-pin-dest',
        html: `<div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: #ef4444; border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; color: #ffffff;
        ">B</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([destination.latitude, destination.longitude], { icon: pinB })
        .addTo(routesLayer)
        .bindPopup(`<b>Destination (B):</b> ${destination.name}`);

      allBounds.extend([destination.latitude, destination.longitude]);
    }

    // 3. Polylines for each route option
    routes.forEach((route, idx) => {
      const isSelected = idx === selectedRouteIndex;
      const rawCoords = route.geometry?.coordinates;
      if (!rawCoords || !Array.isArray(rawCoords) || rawCoords.length === 0) return;

      // GeoJSON coordinates are [longitude, latitude]. Leaflet requires [latitude, longitude].
      const latLngs: [number, number][] = [];
      for (const pt of rawCoords) {
        if (Array.isArray(pt) && pt.length >= 2) {
          const lon = pt[0];
          const lat = pt[1];
          if (
            typeof lat === 'number' &&
            typeof lon === 'number' &&
            isFinite(lat) &&
            isFinite(lon) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lon) <= 180
          ) {
            latLngs.push([lat, lon]);
            allBounds.extend([lat, lon]);
          }
        }
      }

      if (latLngs.length === 0) return;

      const strokeColor = isSelected
        ? (route.pollution_analysis?.severity?.color || '#10b981')
        : '#64748b';

      const polyline = L.polyline(latLngs, {
        color: strokeColor,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.65,
        dashArray: isSelected ? undefined : '6, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routesLayer);

      const exposureText = route.pollution_analysis?.corridor_avg_concentration !== null
        ? `${route.pollution_analysis.corridor_avg_concentration} µg/m³ (${route.pollution_analysis.severity?.category || ''})`
        : 'Data Unavailable';

      const popupContent = `
        <div style="font-family: var(--font-sans, system-ui); min-width: 200px;">
          <strong style="color: ${strokeColor}; font-size: 13px;">${route.name} (${route.tag})</strong>
          <div style="margin-top: 5px; font-size: 12px; line-height: 1.5; color: var(--color-text-secondary, #334155);">
            Distance: <b>${route.distance_km} km</b> · Est. Time: <b>${route.duration_minutes} min</b> (${route.mode_label})<br/>
            Corridor Exposure: <b>${exposureText}</b>
          </div>
        </div>
      `;
      polyline.bindPopup(popupContent);

      polyline.on('click', () => {
        onSelectRouteIndex(idx);
      });

      if (isSelected) {
        selectedPolylineRef.current = polyline;
        polyline.bringToFront();
      }
    });

    // 4. Fit map bounds to encompass all valid geometry
    if (allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 16, animate: true });
    }

    map.invalidateSize();

    if (import.meta.env.DEV) {
      const containerRect = mapContainerRef.current?.getBoundingClientRect();
      console.debug('[AirPulse RoutePlannerMap] Diagnostics updated:', {
        containerWidth: containerRect?.width,
        containerHeight: containerRect?.height,
        origin: origin?.name,
        destination: destination?.name,
        routesCount: routes.length,
        selectedRouteIndex,
        boundsValid: allBounds.isValid(),
      });
    }
  }, [activeRouteResponse, selectedRouteIndex, onSelectRouteIndex]);

  // Trigger visual updates when map is ready or route props change
  useEffect(() => {
    if (mapReady) {
      updateRouteVisuals();
    }
  }, [mapReady, updateRouteVisuals]);

  // Handle explicit Reset / Fit to Route trigger
  useEffect(() => {
    if (!mapReady || resetTrigger === 0) return;
    const map = mapRef.current;
    if (!map || !activeRouteResponse) return;

    if (selectedPolylineRef.current) {
      map.fitBounds(selectedPolylineRef.current.getBounds(), { padding: [40, 40], animate: true });
    } else {
      const allBounds = L.latLngBounds([]);
      const { origin, destination } = activeRouteResponse;
      if (origin && isFinite(origin.latitude) && isFinite(origin.longitude)) {
        allBounds.extend([origin.latitude, origin.longitude]);
      }
      if (destination && isFinite(destination.latitude) && isFinite(destination.longitude)) {
        allBounds.extend([destination.latitude, destination.longitude]);
      }
      if (allBounds.isValid()) {
        map.fitBounds(allBounds, { padding: [40, 40], animate: true });
      }
    }
    map.invalidateSize();
  }, [resetTrigger, mapReady, activeRouteResponse]);

  return (
    <div
      ref={mapContainerRef}
      className="route-planner-leaflet-container"
      role="region"
      aria-label="Route Planner Interactive Map"
    />
  );
};
