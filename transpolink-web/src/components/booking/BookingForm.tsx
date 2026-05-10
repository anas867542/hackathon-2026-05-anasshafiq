'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TruckTypeSelector, TRUCK_OPTIONS } from './TruckTypeSelector';
import { FareEstimate } from './FareEstimate';
import { BookingTypeSelector } from './BookingTypeSelector';
import { BookingMap, RouteInfo, Place, PinMode } from '@/components/map/BookingMap';
import { PlaceAutocompleteInput, nominatimReverse } from '@/components/map/PlaceAutocompleteInput';
import { bookingsApi, VehicleType } from '@/lib/api/bookings';
import { ApiError } from '@/lib/api/client';
import { useNearbyDrivers } from '@/hooks/useNearbyDrivers';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const EMPTY: Place = { address: '', lat: 0, lng: 0 };
const PER_KM  = 80;
const PER_MIN = 5;

function hasCoord(p: Place) { return p.lat !== 0 || p.lng !== 0; }

export function BookingForm() {
  const router = useRouter();
  const { track } = useAnalytics();
  const [pickup,  setPickup]  = useState<Place>(EMPTY);
  const [dropoff, setDropoff] = useState<Place>(EMPTY);
  const [detectingLocation, setDetectingLocation] = useState(true);

  const [bookingType,       setBookingType]       = useState<'instant' | 'bidding'>('instant');
  const [vehicleType,       setVehicleType]        = useState<VehicleType | null>('mini_truck');
  const [goodsDescription,  setGoodsDescription]  = useState('');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState('');
  const [pinMode,           setPinMode]           = useState<PinMode>(null);
  const [route,             setRoute]             = useState<RouteInfo | null>(null);
  const [routeWarning,      setRouteWarning]       = useState<string | null>(null);
  const [submitting,        setSubmitting]         = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  // Sheet state
  const [showVehicleSheet,  setShowVehicleSheet]  = useState(false);
  const [showConfirmSheet,  setShowConfirmSheet]  = useState(false);

  const autoDetected = useRef(false);
  useEffect(() => {
    if (autoDetected.current) return;
    autoDetected.current = true;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDetectingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const place = await nominatimReverse(pos.coords.latitude, pos.coords.longitude);
        setPickup(place);
        setDetectingLocation(false);
      },
      () => setDetectingLocation(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const handleRoute = useCallback((info: RouteInfo) => {
    setRoute(info);
    if (!info.fallback) setRouteWarning(null);
    track('route_loaded', { distance_km: info.distanceKm, duration_minutes: info.durationMinutes });
  }, [track]);

  const handleRouteError = useCallback((status: string) => {
    const msgs: Record<string, string> = {
      ROUTING_UNAVAILABLE: 'Routing unavailable. Using straight-line estimate.',
      ZERO_RESULTS:        'No road route found. Using straight-line estimate.',
    };
    setRouteWarning(msgs[status] ?? 'Cannot compute route. Using straight-line estimate.');
  }, []);

  const handlePickupChange = useCallback((place: Place) => {
    setPickup(place); setPinMode(null); setRoute(null);
    if (place.address) track('location_selected', { type: 'pickup' });
  }, [track]);
  const handleDropoffChange = useCallback((place: Place) => {
    setDropoff(place); setPinMode(null); setRoute(null);
    if (place.address) track('location_selected', { type: 'dropoff' });
  }, [track]);

  const nearbyDrivers = useNearbyDrivers(
    pickup.lat || null,
    pickup.lng || null,
    { vehicleType: vehicleType ?? undefined, radiusKm: 5 },
  );

  const baseFare      = TRUCK_OPTIONS.find((t) => t.type === vehicleType)?.baseFare ?? 600;
  const estimatedFare = route
    ? Math.round(baseFare + route.distanceKm * PER_KM + route.durationMinutes * PER_MIN)
    : null;

  const bothCoordsReady = hasCoord(pickup) && hasCoord(dropoff);
  const canConfirm      = bothCoordsReady && !!route && !!vehicleType;

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!vehicleType)            { setError('Pick a truck type.'); return; }
    if (!pickup.address.trim())  { setError('Pickup address is required.'); return; }
    if (!dropoff.address.trim()) { setError('Drop-off address is required.'); return; }
    if (!hasCoord(pickup))       { setError('Pickup has no coordinates.'); return; }
    if (!hasCoord(dropoff))      { setError('Drop-off has no coordinates.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const booking = await bookingsApi.create({
        vehicleType,
        pickup,
        dropoff,
        goodsDescription: goodsDescription.trim() || undefined,
        estimatedWeightKg: estimatedWeightKg ? Number(estimatedWeightKg) : undefined,
        bookingType,
      });
      track('ride_requested', {
        vehicle_type:  vehicleType,
        booking_type:  bookingType,
        distance_km:   route?.distanceKm ?? 0,
        fare_pkr:      estimatedFare ?? 0,
      });
      router.push(`/book/${booking.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create booking');
      setSubmitting(false);
    }
  }

  const selectedTruck = TRUCK_OPTIONS.find((t) => t.type === vehicleType);

  // ── Confirm sheet summary ────────────────────────────────────────────────────
  const ConfirmSheet = (
    <BottomSheet
      open={showConfirmSheet}
      onClose={() => setShowConfirmSheet(false)}
      title="Confirm booking"
    >
      <div className="space-y-5">
        {/* Route summary */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">A</span>
            <div>
              <p className="text-xs text-gray-400 font-medium">Pickup</p>
              <p className="text-sm font-medium text-gray-900 leading-snug">{pickup.address}</p>
            </div>
          </div>
          <div className="ml-3 h-4 w-px bg-gray-200" />
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">B</span>
            <div>
              <p className="text-xs text-gray-400 font-medium">Drop-off</p>
              <p className="text-sm font-medium text-gray-900 leading-snug">{dropoff.address}</p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-4">
          {[
            { label: 'Vehicle',   value: selectedTruck?.name ?? '—' },
            { label: 'Distance',  value: route ? `${route.distanceKm.toFixed(1)} km` : '—' },
            { label: 'Duration',  value: route ? `~${route.durationMinutes} min` : '—' },
            { label: 'Pricing',   value: bookingType === 'bidding' ? 'Driver bids' : 'Fixed' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900 capitalize">{value}</p>
            </div>
          ))}
        </div>

        {/* Goods info */}
        <div className="space-y-3">
          <Textarea
            label="What are you sending? (optional)"
            placeholder="Two-seater sofa, 6 boxes…"
            value={goodsDescription}
            onChange={(e) => setGoodsDescription(e.target.value)}
            rows={2}
          />
          <Input
            label="Estimated weight, kg (optional)"
            type="number"
            min={1}
            value={estimatedWeightKg}
            onChange={(e) => setEstimatedWeightKg(e.target.value)}
            placeholder="e.g. 200"
          />
        </div>

        {/* Fare display */}
        <div className="flex items-center justify-between rounded-2xl bg-brand-50 border border-brand-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-brand-600">
              {bookingType === 'bidding' ? 'Reference fare' : 'Estimated fare'}
            </p>
            <p className="mt-0.5 text-2xl font-bold text-brand-700">
              {estimatedFare != null ? formatCurrency(estimatedFare) : '—'}
            </p>
          </div>
          <span className="text-3xl" aria-hidden>🚛</span>
        </div>

        {routeWarning && (
          <p className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">{routeWarning}</p>
        )}
        {bookingType === 'bidding' && (
          <p className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
            Drivers will see this as a reference price and submit their own offers.
          </p>
        )}
        {error && (
          <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <Button
          variant="brand"
          size="lg"
          className="w-full"
          isLoading={submitting}
          onClick={() => onSubmit()}
        >
          {bookingType === 'bidding' ? 'Post for bidding' : 'Confirm booking →'}
        </Button>

        <p className="text-center text-xs text-gray-400">
          Nearby drivers will be notified instantly.
        </p>
      </div>
    </BottomSheet>
  );

  // ── Vehicle sheet ────────────────────────────────────────────────────────────
  const VehicleSheet = (
    <BottomSheet
      open={showVehicleSheet}
      onClose={() => setShowVehicleSheet(false)}
      title="Choose a truck"
    >
      <div className="space-y-5">
        <TruckTypeSelector value={vehicleType} onChange={setVehicleType} />

        <div>
          <p className="mb-3 text-sm font-semibold text-gray-900">Pricing mode</p>
          <BookingTypeSelector value={bookingType} onChange={setBookingType} />
        </div>

        {/* Fare preview */}
        {vehicleType && route && (
          <div className="flex items-center justify-between rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3">
            <div>
              <p className="text-xs text-brand-600 font-medium">Estimated fare</p>
              <p className="mt-0.5 text-xl font-bold text-brand-700">
                {estimatedFare != null ? formatCurrency(estimatedFare) : '—'}
              </p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <div>{route.distanceKm.toFixed(1)} km</div>
              <div>~{route.durationMinutes} min</div>
            </div>
          </div>
        )}

        <Button
          variant="brand"
          size="lg"
          className="w-full"
          disabled={!vehicleType}
          onClick={() => {
            setShowVehicleSheet(false);
            setShowConfirmSheet(true);
            if (vehicleType && route && estimatedFare != null) {
              track('fare_viewed', { vehicle_type: vehicleType, distance_km: route.distanceKm, fare_pkr: estimatedFare });
            }
          }}
        >
          Continue →
        </Button>
      </div>
    </BottomSheet>
  );

  // ── Mobile layout: map-first ─────────────────────────────────────────────────
  const MobileLayout = (
    <div className="md:hidden relative" style={{ height: 'calc(100dvh - 64px)' }}>
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <BookingMap
          pickup={hasCoord(pickup) ? pickup : null}
          dropoff={hasCoord(dropoff) ? dropoff : null}
          nearbyDrivers={nearbyDrivers}
          onRoute={handleRoute}
          onRouteError={handleRouteError}
          onPickupChange={handlePickupChange}
          onDropoffChange={handleDropoffChange}
          clickMode={pinMode}
          className="h-full rounded-none"
        />
      </div>

      {/* Floating top card — location inputs */}
      <div className="absolute left-3 right-3 top-3 z-10 animate-slide-down">
        <div className="rounded-2xl bg-white shadow-floating overflow-hidden">
          {/* Pickup row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="relative flex size-3 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-brand-600" />
            </span>
            <div className="flex-1 min-w-0">
              <PlaceAutocompleteInput
                value={pickup}
                onChange={handlePickupChange}
                placeholder="Pickup location"
                showCurrentLocation
                loading={detectingLocation}
                compact
              />
            </div>
          </div>

          {/* Divider + pin controls */}
          <div className="flex items-center gap-3 px-4">
            <div className="ml-1.5 w-px h-4 bg-gray-200 shrink-0" />
            <div className="flex flex-1 gap-2 py-1">
              {(['pickup', 'dropoff'] as const).map((mode) => {
                const active = pinMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPinMode(active ? null : mode)}
                    className={cn(
                      'flex-1 rounded-full py-1 text-[10px] font-semibold transition-all',
                      active
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                    )}
                  >
                    {active ? `✓ ${mode}` : `Pin ${mode}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dropoff row */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
            <span className="size-3 shrink-0 rounded-full bg-red-500" />
            <div className="flex-1 min-w-0">
              <PlaceAutocompleteInput
                value={dropoff}
                onChange={handleDropoffChange}
                placeholder="Drop-off location"
                compact
              />
            </div>
          </div>
        </div>

        {/* Drivers online pill */}
        {nearbyDrivers.length > 0 && (
          <div className="mt-2 flex justify-center">
            <span className="glass rounded-full px-3 py-1.5 text-xs font-medium text-brand-700 shadow-soft">
              <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              {nearbyDrivers.length} driver{nearbyDrivers.length !== 1 ? 's' : ''} nearby
            </span>
          </div>
        )}
      </div>

      {/* Floating bottom CTA */}
      <div className="absolute bottom-3 left-3 right-3 z-10">
        {!bothCoordsReady ? (
          <div className="glass rounded-2xl px-5 py-3.5 text-center shadow-floating">
            <p className="text-sm text-gray-500">Set pickup &amp; drop-off to continue</p>
          </div>
        ) : !route ? (
          <div className="glass rounded-2xl px-5 py-3.5 shadow-floating flex items-center justify-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            <p className="text-sm text-gray-600">Calculating route…</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowVehicleSheet(true)}
            className="w-full rounded-2xl bg-brand-600 px-5 py-4 text-white shadow-glow flex items-center justify-between transition-all active:scale-[0.98] hover:bg-brand-700"
          >
            <div className="text-left">
              {estimatedFare && vehicleType ? (
                <>
                  <p className="text-xs text-brand-200">{selectedTruck?.name} · {route.distanceKm.toFixed(1)} km</p>
                  <p className="text-xl font-bold">{formatCurrency(estimatedFare)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-brand-200">{route.distanceKm.toFixed(1)} km · ~{route.durationMinutes} min</p>
                  <p className="text-base font-semibold">Choose vehicle</p>
                </>
              )}
            </div>
            <span className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold">
              {vehicleType ? 'Review' : 'Choose'} →
            </span>
          </button>
        )}
      </div>
    </div>
  );

  // ── Desktop layout: 2-column form ───────────────────────────────────────────
  const DesktopLayout = (
    <form onSubmit={onSubmit} className="hidden md:block">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Locations card */}
          <Card>
            <CardHeader>
              <CardTitle>Where are you sending?</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <PlaceAutocompleteInput
                label="Pickup address"
                value={pickup}
                onChange={setPickup}
                placeholder="Where to pick up?"
                hint="Type an address or use your current location."
                showCurrentLocation
                loading={detectingLocation}
              />
              <PlaceAutocompleteInput
                label="Drop-off address"
                value={dropoff}
                onChange={setDropoff}
                placeholder="Where are you sending it?"
              />

              {/* Pin mode controls */}
              <div className="flex gap-2">
                {(['pickup', 'dropoff'] as const).map((mode) => {
                  const active = pinMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPinMode(active ? null : mode)}
                      className={cn(
                        'flex-1 rounded-2xl border px-3 py-2 text-xs font-medium transition-all',
                        active
                          ? 'border-brand-500 bg-brand-600 text-white shadow-soft'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      {active ? `✓ Tap to set ${mode}` : `Set ${mode} on map`}
                    </button>
                  );
                })}
              </div>

              {/* Map */}
              <div className="relative h-64 sm:h-72 overflow-hidden rounded-2xl">
                <BookingMap
                  pickup={hasCoord(pickup) ? pickup : null}
                  dropoff={hasCoord(dropoff) ? dropoff : null}
                  nearbyDrivers={nearbyDrivers}
                  onRoute={handleRoute}
                  onRouteError={handleRouteError}
                  onPickupChange={handlePickupChange}
                  onDropoffChange={handleDropoffChange}
                  clickMode={pinMode}
                  className="h-full"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className={`size-2 rounded-full ${nearbyDrivers.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} aria-hidden />
                {nearbyDrivers.length > 0
                  ? `${nearbyDrivers.length} driver${nearbyDrivers.length !== 1 ? 's' : ''} online near you`
                  : 'No drivers online nearby'}
              </div>
            </CardBody>
          </Card>

          {/* Pricing type */}
          <Card>
            <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
            <CardBody>
              <BookingTypeSelector value={bookingType} onChange={setBookingType} />
            </CardBody>
          </Card>

          {/* Truck type */}
          <Card>
            <CardHeader><CardTitle>Choose a truck</CardTitle></CardHeader>
            <CardBody>
              <TruckTypeSelector value={vehicleType} onChange={setVehicleType} />
            </CardBody>
          </Card>

          {/* Goods info */}
          <Card>
            <CardHeader><CardTitle>About your goods</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <Textarea
                label="What are you sending?"
                placeholder="Two-seater sofa and 6 boxes…"
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
              />
              <Input
                label="Estimated weight (kg)"
                type="number"
                min={1}
                value={estimatedWeightKg}
                onChange={(e) => setEstimatedWeightKg(e.target.value)}
                placeholder="Optional"
              />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <FareEstimate
            distanceKm={route?.distanceKm ?? null}
            durationMinutes={route?.durationMinutes ?? null}
            estimatedFare={vehicleType ? estimatedFare : null}
          />
          {routeWarning && (
            <p className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">{routeWarning}</p>
          )}
          {bookingType === 'bidding' && (
            <p className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
              Drivers will see this as a reference price and submit their own offers.
            </p>
          )}
          {error && (
            <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            isLoading={submitting}
            disabled={!canConfirm}
          >
            {!bothCoordsReady
              ? 'Set pickup & drop-off first'
              : !route
              ? 'Calculating route…'
              : bookingType === 'bidding'
              ? 'Post for bidding'
              : 'Confirm booking →'}
          </Button>
          <p className="text-center text-xs text-gray-400">
            Drivers within 5 km will be notified instantly.
          </p>
        </aside>
      </div>
    </form>
  );

  return (
    <>
      {MobileLayout}
      {DesktopLayout}
      {VehicleSheet}
      {ConfirmSheet}
    </>
  );
}
