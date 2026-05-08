'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { useGoogleMaps } from '@/lib/maps/loader';
import { cn } from '@/lib/utils';
import type { TripPhase } from '@/lib/booking/phase';

// ── Types ────────────────────────────────────────────────────────────────────

interface LatLng { lat: number; lng: number }

export interface DriverState extends LatLng {
  heading?: number;
  speedKmh?: number;
}

export interface NearbyDriverMarker { id: string; lat: number; lng: number }

interface Props {
  pickup: LatLng;
  dropoff: LatLng;
  driver?: DriverState | null;
  phase?: TripPhase;
  nearbyDrivers?: NearbyDriverMarker[];
  /** Historical GPS breadcrumb trail */
  trail?: LatLng[];
  /**
   * When true the `driver` position is already animated at 60 fps by the
   * caller (via useLiveDriver).  The component skips its internal rAF
   * interpolation and renders the position directly, avoiding double-animation.
   * Camera follow uses setCenter (instant) instead of panTo (animated).
   */
  preSmoothed?: boolean;
  /** Visually dim the truck and show a "Signal lost" badge. */
  isSignalStale?: boolean;
  followDriver?: boolean;
  /** Inter-frame animation duration when NOT pre-smoothed. Default 1500 ms. */
  animationMs?: number;
  className?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const containerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'cooperative',
  clickableIcons: false,
  // Subtle map style — de-emphasise POIs so the route reads clearly
  styles: [
    { featureType: 'poi',              elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit.station',  elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

// Distance threshold (km) that triggers a fresh DirectionsService call for
// the driver-leg route.  150 m is aggressive enough to keep the route current
// without burning API quota on micro-jitter.
const ROUTE_DIST_KM  = 0.15;
// Minimum wall-clock gap between driver-leg route fetches regardless of distance
const ROUTE_TIME_MS  = 30_000;

// ── Math ─────────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function smoothStep(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function lerpAngle(a: number, b: number, t: number) {
  const diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

async function fetchOsrmPath(a: LatLng, b: LatLng): Promise<google.maps.LatLngLiteral[]> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route');
  return (data.routes[0].geometry.coordinates as [number, number][]).map(([lng, lat]) => ({ lat, lng }));
}

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371, r = (n: number) => (n * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
            Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// ── SVG icon builders ────────────────────────────────────────────────────────

/**
 * Top-down truck SVG.  Heading rotates so the cab always faces forward.
 * `opacity` dims the icon when signal is stale.
 */
function buildTruckSvg(heading: number, opacity = 1) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" opacity="${opacity}">` +
    `<g transform="rotate(${heading},24,24)">` +
    // Drop shadow
    `<ellipse cx="24" cy="26" rx="14" ry="11" fill="#000" opacity="0.14"/>` +
    // Body
    `<rect x="12" y="8" width="24" height="32" rx="6" fill="#1d4ed8"/>` +
    // Windscreen
    `<rect x="15" y="10" width="18" height="11" rx="3" fill="#bfdbfe"/>` +
    // Direction arrow
    `<polygon points="24,3 16,13 32,13" fill="white"/>` +
    // Rear bumper
    `<rect x="15" y="36" width="18" height="4" rx="2" fill="#1e40af"/>` +
    // Centre line
    `<line x1="12" y1="24" x2="36" y2="24" stroke="#1e40af" stroke-width="1.5" opacity="0.5"/>` +
    // Border
    `<rect x="12" y="8" width="24" height="32" rx="6" fill="none" stroke="white" stroke-width="2.5"/>` +
    `</g></svg>`
  );
}

const PIN_SVG = (fill: string, label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48">` +
  `<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="${fill}"/>` +
  `<circle cx="18" cy="18" r="9" fill="white"/>` +
  `<text x="18" y="23" font-family="Arial" font-size="13" font-weight="bold" text-anchor="middle" fill="${fill}">${label}</text>` +
  `</svg>`;

// ── Component ────────────────────────────────────────────────────────────────

export function TrackingMap({
  pickup, dropoff, driver, phase = 'searching',
  nearbyDrivers, trail, preSmoothed = false,
  isSignalStale = false, followDriver = true,
  animationMs = 1500, className,
}: Props) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);

  // ── Internal smooth position (used when NOT pre-smoothed) ─────────────────
  const animatedRef  = useRef<LatLng | null>(null);
  const animHRef     = useRef<number>(0);  // animated heading ref
  const rafRef       = useRef<number | null>(null);
  const [smoothPos,  setSmoothPos]  = useState<LatLng | null>(null);
  const [smoothHead, setSmoothHead] = useState<number>(0);

  // ── Route state (OSRM paths) ──────────────────────────────────────────────
  const [basePath,   setBasePath]   = useState<google.maps.LatLngLiteral[]>([]);
  const [activePath, setActivePath] = useState<google.maps.LatLngLiteral[]>([]);

  // Throttle refs for driver-leg route fetching
  const routeThrottleRef = useRef<{ pos: LatLng; t: number; phase: TripPhase } | null>(null);

  // Throttled driver position for route-effect deps when pre-smoothed.
  // Updated only when driver moves >ROUTE_DIST_KM or >ROUTE_TIME_MS passes.
  const [routeDriverPos, setRouteDriverPos] = useState<LatLng | null>(null);
  const routeDriverRef   = useRef<{ pos: LatLng; t: number } | null>(null);

  // ── Internal rAF animation (only when NOT pre-smoothed) ──────────────────
  useEffect(() => {
    if (preSmoothed || !driver) {
      // No animation needed — either caller provides 60fps data, or no driver
      if (!driver) { animatedRef.current = null; setSmoothPos(null); }
      return;
    }

    if (!animatedRef.current) {
      animatedRef.current = { lat: driver.lat, lng: driver.lng };
      animHRef.current    = driver.heading ?? 0;
      setSmoothPos({ lat: driver.lat, lng: driver.lng });
      setSmoothHead(driver.heading ?? 0);
      return;
    }

    const startPos  = { ...animatedRef.current };
    const startHead = animHRef.current;
    const endPos    = { lat: driver.lat, lng: driver.lng };
    const endHead   = driver.heading ?? startHead;
    const t0        = performance.now();

    const tick = (now: number) => {
      const t  = Math.min(1, (now - t0) / animationMs);
      const e  = smoothStep(t);
      const next = {
        lat: lerp(startPos.lat, endPos.lat, e),
        lng: lerp(startPos.lng, endPos.lng, e),
      };
      const nextH = lerpAngle(startHead, endHead, e);
      animatedRef.current = next;
      animHRef.current    = nextH;
      setSmoothPos(next);
      setSmoothHead(nextH);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [preSmoothed, driver?.lat, driver?.lng, driver?.heading, animationMs]);

  // ── Throttle driver position for route-effect deps (pre-smoothed path) ───
  useEffect(() => {
    if (!preSmoothed || !driver) return;
    const now   = Date.now();
    const last  = routeDriverRef.current;
    const moved = last ? haversineKm(last.pos, driver) >= ROUTE_DIST_KM : true;
    const aged  = last ? (now - last.t) >= ROUTE_TIME_MS : true;
    if (!moved && !aged) return;
    routeDriverRef.current = { pos: { lat: driver.lat, lng: driver.lng }, t: now };
    setRouteDriverPos({ lat: driver.lat, lng: driver.lng });
  }, [preSmoothed, driver?.lat, driver?.lng]);

  // ── Base route: pickup → dropoff (OSRM) ──────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    fetchOsrmPath(pickup, dropoff)
      .then((path) => { if (!cancelled) setBasePath(path); })
      .catch(() => { if (!cancelled) setBasePath([pickup, dropoff]); });
    return () => { cancelled = true; };
  }, [isLoaded, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  // ── Driver-leg route: driver → pickup/dropoff (throttled) ────────────────
  // Uses `routeDriverPos` when pre-smoothed (updates ~150 m or every 30 s),
  // or `driver` directly when not pre-smoothed (low-frequency raw GPS updates).
  const driverRouteDepLat = preSmoothed ? (routeDriverPos?.lat ?? 0) : (driver?.lat ?? 0);
  const driverRouteDepLng = preSmoothed ? (routeDriverPos?.lng ?? 0) : (driver?.lng ?? 0);

  useEffect(() => {
    const isMovingPhase = phase === 'to_pickup' || phase === 'to_dropoff';
    const effectiveDriver = preSmoothed ? routeDriverPos : driver;

    if (!isLoaded || !effectiveDriver || !isMovingPhase) {
      if (!isMovingPhase) {
        setActivePath([]);
        routeThrottleRef.current = null;
      }
      return;
    }

    const target = phase === 'to_pickup' ? pickup : dropoff;
    const prev   = routeThrottleRef.current;
    const now    = performance.now();

    const phaseChanged = prev?.phase !== phase;
    const movedFar     = !prev || haversineKm(prev.pos, effectiveDriver) >= ROUTE_DIST_KM;
    const timeGate     = !prev || (now - prev.t) >= ROUTE_TIME_MS;

    if (!phaseChanged && !movedFar && !timeGate) return;

    routeThrottleRef.current = {
      pos: { lat: effectiveDriver.lat, lng: effectiveDriver.lng },
      t: now,
      phase,
    };

    let cancelled = false;
    fetchOsrmPath(effectiveDriver, target)
      .then((path) => { if (!cancelled) setActivePath(path); })
      .catch(() => { if (!cancelled) setActivePath([effectiveDriver, target]); });
    return () => { cancelled = true; };
  }, [
    isLoaded, phase, preSmoothed,
    pickup.lat, pickup.lng, dropoff.lat, dropoff.lng,
    driverRouteDepLat, driverRouteDepLng,
  ]);

  // ── Camera follows driver (smooth) ────────────────────────────────────────
  const followTarget = preSmoothed ? driver : smoothPos;

  useEffect(() => {
    if (!followDriver || !followTarget || !mapRef.current) return;
    if (preSmoothed) {
      // Pre-smoothed: caller delivers 60 fps data; use instant setCenter so we
      // don't stack Google Maps' own pan animation on top of our 60 fps feed.
      mapRef.current.setCenter({ lat: followTarget.lat, lng: followTarget.lng });
    } else {
      mapRef.current.panTo({ lat: followTarget.lat, lng: followTarget.lng });
    }
  }, [followTarget?.lat, followTarget?.lng, followDriver, preSmoothed]);

  // ── Fit-to-bounds on mount ────────────────────────────────────────────────
  const onMapLoad = useCallback((m: google.maps.Map) => {
    mapRef.current = m;
    const b = new google.maps.LatLngBounds();
    b.extend(pickup); b.extend(dropoff);
    if (driver) b.extend(driver);
    m.fitBounds(b, 64);
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Icons (memoised; truck rebuilds only when heading bin changes) ────────
  // Bin heading to nearest 15° so SVG rebuilds only 24 × per full rotation
  const displayPos  = preSmoothed ? driver : smoothPos;
  const rawHeading  = preSmoothed ? (driver?.heading ?? 0) : smoothHead;
  const headingBin  = Math.round(rawHeading / 15) * 15;

  const truckIcon = useMemo<google.maps.Icon | null>(() => {
    if (!isLoaded) return null;
    const opacity = isSignalStale ? 0.45 : 1;
    const svg     = buildTruckSvg(headingBin, opacity);
    return {
      url:        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(48, 48),
      anchor:     new google.maps.Point(24, 24),
    };
  }, [isLoaded, headingBin, isSignalStale]);

  const pickupIcon = useMemo<google.maps.Icon | null>(() => {
    if (!isLoaded) return null;
    return {
      url:        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PIN_SVG('#16a34a', 'A'))}`,
      scaledSize: new google.maps.Size(36, 48),
      anchor:     new google.maps.Point(18, 48),
    };
  }, [isLoaded]);

  const dropoffIcon = useMemo<google.maps.Icon | null>(() => {
    if (!isLoaded) return null;
    return {
      url:        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PIN_SVG('#dc2626', 'B'))}`,
      scaledSize: new google.maps.Size(36, 48),
      anchor:     new google.maps.Point(18, 48),
    };
  }, [isLoaded]);

  const nearbyIcon = useMemo<google.maps.Symbol | null>(() => {
    if (!isLoaded) return null;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 6,
      fillColor: '#10b981', fillOpacity: 0.75,
      strokeColor: '#fff', strokeWeight: 2,
    };
  }, [isLoaded]);

  // ── Route render decision ─────────────────────────────────────────────────
  const isDriverLeg       = activePath.length > 1 && (phase === 'to_pickup' || phase === 'to_dropoff');
  const displayPath       = isDriverLeg ? activePath : basePath;
  const isActiveTripPhase = ['to_pickup', 'at_pickup', 'to_dropoff'].includes(phase);
  const strokeColor       = isDriverLeg ? '#1d4ed8' : isActiveTripPhase ? '#3b82f6' : '#94a3b8';
  const strokeWeight      = isDriverLeg ? 6 : 4;
  const strokeOpacity     = isDriverLeg ? 1 : 0.55;

  // ── Error / loading fallbacks ─────────────────────────────────────────────
  if (loadError) return (
    <div className={cn('grid h-full place-items-center bg-zinc-50', className)}>
      <span className="text-sm text-red-600">Failed to load Google Maps</span>
    </div>
  );
  if (!isLoaded) return (
    <div className={cn('grid h-full place-items-center bg-zinc-50', className)}>
      <span className="text-sm text-zinc-500">Loading map…</span>
    </div>
  );

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-zinc-200', className)}>
      {/* Signal-lost badge */}
      {isSignalStale && (
        <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          Signal lost — last position shown
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={displayPos ?? pickup}
        zoom={14}
        onLoad={onMapLoad}
        options={mapOptions}
      >
        {/* Route line — always drawn (driver-leg or base fallback) */}
        {displayPath.length > 1 && (
          <PolylineF
            path={displayPath}
            options={{ strokeColor, strokeWeight, strokeOpacity }}
          />
        )}

        {/* GPS breadcrumb trail (thin, behind everything) */}
        {trail && trail.length > 1 && (
          <PolylineF
            path={trail}
            options={{ strokeColor: '#71717a', strokeWeight: 2, strokeOpacity: 0.45 }}
          />
        )}

        {/* Pickup pin A */}
        {pickupIcon && <MarkerF position={pickup}  icon={pickupIcon}  zIndex={20} />}

        {/* Drop-off pin B */}
        {dropoffIcon && <MarkerF position={dropoff} icon={dropoffIcon} zIndex={20} />}

        {/* Animated truck icon — use pre-smoothed pos if available */}
        {displayPos && truckIcon && (
          <MarkerF position={displayPos} icon={truckIcon} zIndex={50} />
        )}

        {/* Nearby driver dots (searching phase only) */}
        {nearbyDrivers && nearbyIcon && nearbyDrivers.map((d) => (
          <MarkerF
            key={d.id}
            position={{ lat: d.lat, lng: d.lng }}
            icon={nearbyIcon}
            zIndex={5}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
