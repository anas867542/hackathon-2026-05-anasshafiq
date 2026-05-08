# TranspoLink

## What it is (1 sentence)
A freight-booking platform for Pakistan that lets shippers instantly book or bid for nearby trucks, then track their goods live via GPS — with zero dependency on paid map APIs.

## Track
[x] Free-form

## Target user (1 sentence)
Pakistani small-business owners and individuals who need to move goods (furniture, stock, equipment) within a city and currently rely on phone calls or WhatsApp to find a truck.

## The user's job-to-be-done (1 sentence)
Get a reliable truck at a fair price, confirmed in under two minutes, without making a single phone call.

---

## Must-have features (5)

1. **Address search + route preview**
   Acceptance criteria: Shipper types a partial address, gets Nominatim suggestions within 600 ms, selects pickup + drop-off, sees an OSRM route line and a fare estimate on the map before confirming.

2. **Instant booking + driver dispatch**
   Acceptance criteria: Confirmed booking triggers a WebSocket push to all online drivers within 5 km with a matching active truck within 2 s; driver sees a request card with fare, route, and a 60 s accept timer.

3. **Bidding mode**
   Acceptance criteria: Shipper can post a job in "bidding" mode; drivers submit price offers; shipper sees ranked offer list and can accept any offer; unaccepted offers expire after 60 s.

4. **Live GPS tracking**
   Acceptance criteria: Once driver accepts, customer tracking page shows driver marker updating every 2 s, an OSRM route line (driver → pickup, then driver → drop-off), and live ETA in minutes.

5. **Post-trip review**
   Acceptance criteria: After trip completion, both parties see a 1–5 star rating modal; submission stores score + optional comment; modal is skippable; can only be submitted once per booking.

---

## Nice-to-have (won't block demo)
- Driver earnings history dashboard
- Customer saved addresses beyond localStorage history
- In-app messaging between shipper and driver
- Push notifications on mobile

---

## Tech stack
- Backend: TypeScript / NestJS 10
- DB: PostgreSQL 16 via Prisma 5
- Frontend: Next.js 14 App Router, Tailwind CSS
- Auth: JWT access + refresh tokens, `passport-jwt`, role-based (customer / driver / admin)
- Real-time: Socket.io 4 (WebSocket gateway in NestJS)
- Maps: Google Maps JS SDK (tiles only — free, no billing)
- Routing: OSRM public API (`router.project-osrm.org`) — free, no key
- Geocoding: Nominatim / OpenStreetMap — free, no key

---

## Architecture (5 lines)
Customer creates a booking via REST API → `matching.service.ts` runs a haversine SQL query to find online drivers within 5 km with an active matching truck → `tracking.gateway.ts` emits `booking:new_request` over WebSocket to those driver rooms → driver accepts via REST → driver client streams GPS position every 2 s via `location:update` Socket.io event → customer `TrackingMap` component consumes `driver:location` events and redraws the marker + recalculates OSRM route.

The 5 most important files:
- `transpolink-api/src/modules/bookings/matching.service.ts` — driver-finding query
- `transpolink-api/src/modules/tracking/tracking.gateway.ts` — WebSocket rooms + emit logic
- `transpolink-web/src/hooks/useDriverInbox.ts` — driver receives and acts on booking requests
- `transpolink-web/src/components/map/TrackingMap.tsx` — live tracking map (OSRM + driver marker)
- `transpolink-web/src/components/booking/BookingForm.tsx` — full booking creation flow

---

## Out of scope
- Payment processing (no Stripe, JazzCash, or Easypaisa integration in this sprint)
- Mobile app (web only; PWA install not targeted this sprint)
- Admin dispute resolution UI

---

## Risks I see

1. **OSRM public instance rate-limiting** — `router.project-osrm.org` is a shared public server. Under demo load it may throttle or go down. Mitigation: `TrackingMap` and `BookingMap` both fall back to a straight-line haversine estimate if OSRM fails; the app stays functional.

2. **GPS accuracy on browser** — Desktop browsers report accuracy of 50–150 m (vs. 5–15 m on mobile). The `useDriverTracking` hook accepts up to 150 m accuracy; any worse is rejected silently. For demo, use a mobile device as the driver.

3. **Nominatim rate limit (1 req/s)** — Rapid typing can queue requests faster than Nominatim allows. Mitigation: 400 ms debounce in `PlaceAutocompleteInput`; worst case user sees a 1 s delay in suggestions.

---

## How I'll demo it (3 lines)
1. Shipper opens `/book`, types "Gulberg Lahore" → selects pickup, types "DHA Phase 5" → selects drop-off, confirms booking with fare estimate shown.
2. Driver (second window) receives request card, accepts, taps "Start trip" — shipper tracking page shows live driver marker on route line with ETA updating in real time.
3. Driver taps "Complete trip" — rating modal appears, 5-star review submitted, both dashboards update to `completed`.
