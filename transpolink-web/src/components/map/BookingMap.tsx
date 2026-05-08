'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { DEFAULT_CENTER, useGoogleMaps } from '@/lib/maps/loader';
import { cn } from '@/lib/utils';

interface Coord {
  address?: string;
  lat: number;
  lng: number;
}

export interface Place {
  address: string;
  lat: number;
  lng: number;
}

export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  /** True when Directions API failed and we fell back to a straight-line estimate. */
  fallback?: boolean;
}

export interface NearbyDriverMarker {
  id: string;
  lat: number;
  lng: number;
}

/** Which pin the next map-click will reposition. */
export type PinMode = 'pickup' | 'dropoff' | null;

interface Props {
  pickup: Coord | null;
  dropoff: Coord | null;
  /** Online drivers near pickup — rendered as green dots. */
  nearbyDrivers?: NearbyDriverMarker[];
  /** Fired when a route (real or fallback) is available. */
  onRoute?: (info: RouteInfo) => void;
  /** Fired with the DirectionsStatus when the road route can't be computed. */
  onRouteError?: (status: string) => void;
  /** Called when the pickup pin is dragged or a map-click sets pickup. */
  onPickupChange?: (place: Place) => void;
  /** Called when the dropoff pin is dragged or a map-click sets dropoff. */
  onDropoffChange?: (place: Place) => void;
  /** Which pin a map-click repositions. Null = clicks do nothing. */
  clickMode?: PinMode;
  className?: string;
}

const containerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'cooperative',
  clickableIcons: false,
};

async function reverseGeocode(lat: number, lng: number): Promise<Place> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Nominatim error');
    const data = await res.json() as { display_name?: string };
    return { address: data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  } catch {
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  }
}

export function BookingMap({
  pickup,
  dropoff,
  nearbyDrivers,
  onRoute,
  onRouteError,
  onPickupChange,
  onDropoffChange,
  clickMode = null,
  className,
}: Props) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);

  const onRouteRef = useRef(onRoute);
  const onRouteErrorRef = useRef(onRouteError);

  useEffect(() => {
    onRouteRef.current = onRoute;
    onRouteErrorRef.current = onRouteError;
  }, [onRoute, onRouteError]);

  useEffect(() => {
    if (!isLoaded || !pickup || !dropoff) {
      setRoutePath([]);
      return;
    }
    if (!isValidCoord(pickup.lat, pickup.lng) || !isValidCoord(dropoff.lat, dropoff.lng)) {
      setRoutePath([]);
      return;
    }
    let cancelled = false;

    fetchOsrmRoute(pickup, dropoff)
      .then(({ distanceKm, durationMinutes, path }) => {
        if (cancelled) return;
        setRoutePath(path);
        onRouteRef.current?.({ distanceKm, durationMinutes, fallback: false });
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[BookingMap] OSRM route failed, using straight-line fallback:', err);
        setRoutePath([]);
        onRouteErrorRef.current?.('ROUTING_UNAVAILABLE');
        const km = haversineKm(pickup, dropoff);
        onRouteRef.current?.({
          distanceKm: km,
          durationMinutes: Math.max(1, Math.round(km * 2)),
          fallback: true,
        });
      });

    return () => { cancelled = true; };
  }, [isLoaded, pickup, dropoff]);

  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !clickMode) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const place = await reverseGeocode(lat, lng);
      if (clickMode === 'pickup') onPickupChange?.(place);
      else onDropoffChange?.(place);
    },
    [clickMode, onPickupChange, onDropoffChange],
  );

  const handlePickupDragEnd = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !onPickupChange) return;
      const place = await reverseGeocode(e.latLng.lat(), e.latLng.lng());
      onPickupChange(place);
    },
    [onPickupChange],
  );

  const handleDropoffDragEnd = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !onDropoffChange) return;
      const place = await reverseGeocode(e.latLng.lat(), e.latLng.lng());
      onDropoffChange(place);
    },
    [onDropoffChange],
  );

  const center =
    pickup && dropoff
      ? { lat: (pickup.lat + dropoff.lat) / 2, lng: (pickup.lng + dropoff.lng) / 2 }
      : pickup ?? dropoff ?? DEFAULT_CENTER;

  const driverIcon = useMemo<google.maps.Symbol | null>(() => {
    if (!isLoaded) return null;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 6,
      fillColor: '#10b981',
      fillOpacity: 0.85,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    };
  }, [isLoaded]);

  if (loadError) {
    return (
      <div className={cn('grid h-full place-items-center bg-zinc-50', className)}>
        <span className="text-sm text-red-600">Failed to load Google Maps</span>
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className={cn('grid h-full place-items-center bg-zinc-50', className)}>
        <span className="text-sm text-zinc-500">Loading map…</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-zinc-200', className)}>
      {clickMode && (
        <div className="absolute left-2 top-2 z-10 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
          {clickMode === 'pickup' ? '📍 Tap map to set pickup' : '📍 Tap map to set drop-off'}
        </div>
      )}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={pickup && dropoff ? 12 : 13}
        options={mapOptions}
        onClick={clickMode ? handleMapClick : undefined}
      >
        {routePath.length > 1 && (
          <PolylineF
            path={routePath}
            options={{
              strokeColor: '#18181b',
              strokeWeight: 4,
              strokeOpacity: 0.9,
            }}
          />
        )}
        {pickup && (
          <MarkerF
            position={{ lat: pickup.lat, lng: pickup.lng }}
            label={{ text: 'A', color: 'white', fontWeight: '600' }}
            draggable={!!onPickupChange}
            onDragEnd={handlePickupDragEnd}
          />
        )}
        {nearbyDrivers && driverIcon &&
          nearbyDrivers.map((d) => (
            <MarkerF
              key={d.id}
              position={{ lat: d.lat, lng: d.lng }}
              icon={driverIcon}
              zIndex={5}
            />
          ))}
        {dropoff && (
          <MarkerF
            position={{ lat: dropoff.lat, lng: dropoff.lng }}
            label={{ text: 'B', color: 'white', fontWeight: '600' }}
            draggable={!!onDropoffChange}
            onDragEnd={handleDropoffDragEnd}
          />
        )}
      </GoogleMap>
    </div>
  );
}

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

async function fetchOsrmRoute(
  a: Coord,
  b: Coord,
): Promise<{ distanceKm: number; durationMinutes: number; path: google.maps.LatLngLiteral[] }> {
  // OSRM expects coordinates as lng,lat (note: reversed vs Google)
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${a.lng},${a.lat};${b.lng},${b.lat}` +
    `?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route returned');
  const route = data.routes[0];
  // GeoJSON coordinates are [lng, lat] — convert to Google LatLngLiteral { lat, lng }
  const path = (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => ({ lat, lng }));
  return {
    distanceKm: route.distance / 1000,
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
    path,
  };
}

function haversineKm(a: Coord, b: Coord) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
