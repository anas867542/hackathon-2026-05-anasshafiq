# TranspoLink — Master Test Case Document

**Project:** TranspoLink (On-demand Truck Booking Platform)
**Stack:** NestJS 10 (API) · Next.js 14 App Router (Web) · Prisma 5 / PostgreSQL 16 · Socket.io 4 · OSRM · Nominatim · Google Maps JS SDK
**Document version:** 1.0
**Author:** QA / SDET
**Status legend:** ✅ Pass · ❌ Fail · ⏳ Pending · ⚠️ Blocked · 🔁 Retest

---

## Table of Contents

1. [Customer Side](#1-customer-side) — TC-CUST-001 → TC-CUST-026
2. [Driver Side](#2-driver-side) — TC-DRV-001 → TC-DRV-022
3. [Admin Panel](#3-admin-panel) — TC-ADM-001 → TC-ADM-016
4. [Backend APIs](#4-backend-apis) — TC-API-001 → TC-API-028
5. [Map & Real-Time](#5-map--real-time) — TC-MAP-001 → TC-MAP-018
6. [Edge / Negative / Security](#6-edge--negative--security) — TC-EDGE-001 → TC-EDGE-015
7. [Performance](#7-performance) — TC-PERF-001 → TC-PERF-006

---

## 1. Customer Side

### TC-CUST-001 — Customer signup with email
- **Description:** Register a new customer account with email + password.
- **Preconditions:** Web app reachable; email not already in DB.
- **Steps:** 1) Open `/register`. 2) Fill name, email, phone, password. 3) Select role = customer. 4) Submit.
- **Expected Result:** 201 from `POST /auth/register`; redirected to `/book`; access token persisted in localStorage.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-002 — Signup validation: weak password
- **Description:** Reject password shorter than 8 chars.
- **Preconditions:** On `/register`.
- **Steps:** Submit with password = "abc".
- **Expected Result:** Inline error "Password must be at least 8 characters". No API call fires.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-003 — Signup validation: duplicate email
- **Description:** Reject email already registered.
- **Preconditions:** Email already exists.
- **Steps:** Register with same email.
- **Expected Result:** 409 Conflict; message "Email already in use" rendered.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-004 — Customer login with email
- **Description:** Login using credentials from TC-CUST-001.
- **Preconditions:** Customer exists.
- **Steps:** 1) `/login` → enter email + password → submit.
- **Expected Result:** 200; `accessToken`, `refreshToken` stored; redirect to `/book`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-005 — Login: wrong password
- **Description:** Reject invalid credentials.
- **Steps:** Submit valid email + wrong password.
- **Expected Result:** 401; toast "Invalid credentials"; no token stored.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-006 — Google OAuth login
- **Description:** Login via Google.
- **Preconditions:** Google OAuth client configured.
- **Steps:** Click "Continue with Google" → consent → redirect.
- **Expected Result:** Account auto-provisioned (role customer); session active.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-007 — Logout clears session
- **Steps:** Click Logout in header.
- **Expected Result:** localStorage tokens removed; redirected to `/login`; protected routes blocked.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-008 — Session persistence on reload
- **Steps:** Login → reload page.
- **Expected Result:** Still authenticated; user data hydrated from `/auth/me`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-009 — Map loads on /book
- **Steps:** Visit `/book` while authenticated.
- **Expected Result:** Google Maps tiles render within 3 s; default center on user's geolocation if granted.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-010 — Manual pickup address autocomplete (Nominatim)
- **Steps:** Type "Karachi Air" in pickup input.
- **Expected Result:** Within 600 ms (debounced) ≥3 suggestions appear; selecting one fills lat/lng.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-011 — Use current location for pickup
- **Steps:** Click "Use my location" → grant permission.
- **Expected Result:** Pickup address auto-filled via reverse-geocode; map centers on coords.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-012 — Drop-off entry + route preview
- **Steps:** Enter both pickup and dropoff.
- **Expected Result:** OSRM polyline drawn between them; distance + duration text shown.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-013 — Vehicle type selection
- **Steps:** Click each vehicle option (mini, pickup, medium, large, container, flatbed, refrigerated).
- **Expected Result:** Selected card highlighted; fare recalculates per type.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-014 — Fare estimation displays
- **Description:** Estimated fare shown before submitting.
- **Expected Result:** Fare = base + (per_km × distance); breakdown visible; updates on type change.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-015 — Submit instant booking
- **Steps:** Fill form → Booking type = Instant → Confirm.
- **Expected Result:** 201 from `POST /bookings`; redirect to `/book/[id]`; status = `pending`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-016 — Submit bidding booking
- **Steps:** Booking type = Bidding → Confirm.
- **Expected Result:** Booking created; bidding panel visible on `/book/[id]`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-017 — Pending booking shows Resend + Cancel
- **Preconditions:** Booking in `pending` status, no driver matched yet.
- **Expected Result:** Both buttons visible on `/book/[id]`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-018 — Resend rebroadcasts to nearby drivers
- **Steps:** Click "Resend request".
- **Expected Result:** 200 from `POST /bookings/:id/resend`; "✓ Request re-sent" toast for 6 s; nearby drivers receive `booking:new_request` again.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-019 — Cancel booking
- **Steps:** Click "Cancel booking" on a pending booking.
- **Expected Result:** Status → `cancelled`; redirect to `/book` with toast.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-020 — Live tracking after driver accepts
- **Preconditions:** Driver accepts in TC-DRV-009.
- **Expected Result:** Customer's `/book/[id]` shows driver name, vehicle, ETA, live marker on map; updates every ≤5 s.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-021 — Status transitions visible
- **Steps:** Watch as driver progresses: matched → accepted → arrived → in_progress → completed.
- **Expected Result:** UI phase badge updates within 2 s of each event.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-022 — Rating modal opens after completion
- **Expected Result:** Modal appears as soon as `booking:status_change` to `completed` fires; cannot dismiss without action.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-023 — Submit driver rating
- **Steps:** 5-star + comment → Submit.
- **Expected Result:** 201 from `POST /reviews`; modal closes; driver's `ratingAvg` updates server-side.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-024 — Booking history list
- **Steps:** Visit `/bookings`.
- **Expected Result:** Paginated list of past bookings with status badges; clickable to detail.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-025 — Booking detail (completed)
- **Expected Result:** Shows route, fare, driver info, rating given, timestamps.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-CUST-026 — Booking expires when no driver accepts in 4 min
- **Preconditions:** No drivers online.
- **Expected Result:** After 240 s status flips to `expired` (or stays `pending` past `since` window — see backend); UI shows clear messaging.
- **Actual Result:** ⏳
- **Status:** ⏳

---

## 2. Driver Side

### TC-DRV-001 — Driver signup
- **Steps:** Register with role=driver; complete profile (license #, vehicle).
- **Expected Result:** Account created; `driverProfile` row in DB.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-002 — Driver login
- **Expected Result:** Token issued; redirect to `/driver/dashboard`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-003 — Truck registration
- **Steps:** Add truck (plate, type, capacity).
- **Expected Result:** Truck appears in "My trucks"; `isPrimary` defaults true if first.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-004 — Go online (geolocation prompt)
- **Steps:** Toggle "Go online" → grant location.
- **Expected Result:** `driverProfile.status = online`; `currentLat/Lng` set.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-005 — Go online: location denied
- **Expected Result:** Toggle aborts; error "Location permission denied"; status remains offline.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-006 — Go offline
- **Expected Result:** Status → offline; no further `booking:new_request` events.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-007 — Refresh location
- **Steps:** Click "Refresh location".
- **Expected Result:** `currentLat/Lng` updated; reverse-geocoded label refreshes.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-008 — Receive booking via WebSocket
- **Preconditions:** Driver online, within 5 km of pickup, truck type matches.
- **Steps:** Customer creates booking.
- **Expected Result:** Inbox card appears within 2 s with reference code, route, fare, countdown.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-009 — REST poll fallback (missed websocket)
- **Steps:** Disconnect WS briefly; create booking; reconnect.
- **Expected Result:** Within 5 s the next poll of `/bookings/available` surfaces the booking.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-010 — Inbox countdown timer
- **Expected Result:** Countdown decrements every 1 s from 300 s; turns red ≤10 s; bar shrinks proportionally.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-011 — Accept booking
- **Steps:** Click "Accept".
- **Expected Result:** 200 from `PATCH /bookings/:id/accept`; redirect to `/driver/trip/[id]`; customer notified.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-012 — Skip removes from inbox
- **Steps:** Click Skip.
- **Expected Result:** Card removed locally; no API call (or DELETE-from-list); other drivers still see it.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-013 — Submit bid (bidding type)
- **Steps:** Click "Submit offer" → enter price → submit.
- **Expected Result:** 201 from `POST /bidding/offers`; card shows "Bid submitted — waiting for customer".
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-014 — Inbox persists across reload
- **Steps:** Have ≥1 inbox item → reload.
- **Expected Result:** Item still visible (loaded from localStorage); only items <5 min old retained.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-015 — Inbox auto-expires after 5 min
- **Steps:** Leave booking unactioned for 5 min.
- **Expected Result:** Sweep timer removes it from inbox.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-016 — Trip page loads
- **Steps:** After accept, navigate to `/driver/trip/[id]`.
- **Expected Result:** Map + route + customer info + action buttons visible.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-017 — Mark arrived
- **Expected Result:** 200 from `PATCH /bookings/:id/arrive`; status → `arrived`; customer sees update.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-018 — Start trip
- **Expected Result:** Status → `in_progress`; GPS streaming begins.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-019 — GPS streams during trip
- **Expected Result:** `location:update` emitted every ≤5 s; values within accuracy threshold (≤150 m).
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-020 — Complete trip
- **Expected Result:** Status → `completed`; redirect to dashboard; earnings updated.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-021 — Earnings reflect completed trip
- **Expected Result:** `totalEarnings` increased by `finalFare`; `totalTrips` +1.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-DRV-022 — Driver cannot accept own already-accepted booking twice
- **Steps:** Accept once, retry the API call.
- **Expected Result:** 400/409; status unchanged.
- **Actual Result:** ⏳
- **Status:** ⏳

---

## 3. Admin Panel

### TC-ADM-001 — Admin login
- **Preconditions:** Admin user seeded.
- **Expected Result:** Redirect to `/admin/dashboard`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-002 — Non-admin cannot access /admin
- **Expected Result:** 403 or redirect to `/login`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-003 — Dashboard widgets render
- **Expected Result:** Total users, drivers, bookings today, active trips counts shown.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-004 — User list
- **Expected Result:** Paginated table with name, email, role, created date.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-005 — User search
- **Steps:** Type email substring.
- **Expected Result:** Table filters within 500 ms.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-006 — Driver list
- **Expected Result:** Drivers with rating, trips, online/offline, verification status.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-007 — Driver verification toggle
- **Expected Result:** Verified flag flips; driver receives status update.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-008 — Booking monitor list
- **Expected Result:** All bookings with live status; filter by status.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-009 — Booking detail (admin view)
- **Expected Result:** Full timeline, assigned driver, locations, payments.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-010 — Force cancel booking (admin)
- **Expected Result:** Status → `cancelled`; both parties notified.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-011 — Truck types CRUD
- **Expected Result:** Add/edit/delete vehicle category; reflected in customer booking form.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-012 — Reviews moderation
- **Expected Result:** List of reviews; can flag/delete abusive ones.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-013 — Analytics: bookings over time
- **Expected Result:** Chart renders with last 30 days.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-014 — Analytics: revenue
- **Expected Result:** Sum of completed-trip fares; matches DB query.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-015 — Sidebar navigation
- **Expected Result:** Each link routes to its page; active route highlighted.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-ADM-016 — Admin logout
- **Expected Result:** Tokens cleared; back to `/login`.
- **Actual Result:** ⏳
- **Status:** ⏳

---

## 4. Backend APIs

### TC-API-001 — POST /auth/register (happy path)
- **Steps:** Send valid body.
- **Expected Result:** 201; `{ accessToken, refreshToken, user }`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-002 — POST /auth/register validation
- **Steps:** Missing email.
- **Expected Result:** 400 with message "email should not be empty".
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-003 — POST /auth/login (valid)
- **Expected Result:** 200; tokens issued.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-004 — POST /auth/login (invalid)
- **Expected Result:** 401.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-005 — POST /auth/refresh
- **Expected Result:** 200; new access token.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-006 — GET /auth/me
- **Expected Result:** 200 with current user.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-007 — Protected endpoint without token → 401
- **Expected Result:** 401 Unauthorized.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-008 — Protected endpoint wrong role → 403
- **Steps:** Customer hits `/bookings/available` (driver-only).
- **Expected Result:** 403 Forbidden.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-009 — POST /bookings (customer)
- **Expected Result:** 201; status pending; `dispatchToNearbyDrivers` invoked.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-010 — POST /bookings invalid lat/lng
- **Steps:** lat=999.
- **Expected Result:** 400 with class-validator error.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-011 — POST /bookings invalid vehicleType
- **Expected Result:** 400.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-012 — GET /bookings paginated
- **Expected Result:** 200; `{ items, total, page, pageSize }`.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-013 — GET /bookings/:id (own)
- **Expected Result:** 200.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-014 — GET /bookings/:id (other user) → 403
- **Expected Result:** 403.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-015 — GET /bookings/available (driver, online)
- **Expected Result:** 200; pending bookings within 5 km, type-matched, ≤4 min old.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-016 — PATCH /bookings/:id/accept
- **Expected Result:** 200; first driver wins; subsequent calls 409.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-017 — PATCH /bookings/:id/arrive
- **Preconditions:** Booking accepted by this driver.
- **Expected Result:** 200; status arrived.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-018 — PATCH /bookings/:id/start
- **Expected Result:** 200; status in_progress.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-019 — PATCH /bookings/:id/complete
- **Expected Result:** 200; status completed; finalFare set.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-020 — PATCH /bookings/:id/cancel
- **Expected Result:** 200; status cancelled; reason persisted.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-021 — POST /bookings/:id/resend
- **Preconditions:** booking pending, instant/bidding.
- **Expected Result:** 200; updatedAt bumped; `booking:new_request` re-emitted.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-022 — POST /bookings/:id/resend (already accepted) → 400
- **Expected Result:** 400 "Cannot resend a booking with status 'accepted'".
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-023 — Out-of-order state transition rejected
- **Steps:** Try `start` before `arrive`.
- **Expected Result:** 400/409.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-024 — POST /reviews after completion
- **Expected Result:** 201; driver `ratingAvg` recomputed.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-025 — GET /drivers/me
- **Expected Result:** 200; profile + trucks.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-026 — PATCH /drivers/availability
- **Expected Result:** 200; status + lat/lng updated.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-027 — POST /bidding/offers
- **Expected Result:** 201; offer linked to booking.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-API-028 — Throttler rate limit
- **Steps:** 100 requests in 1 s from same IP.
- **Expected Result:** 429 Too Many Requests after threshold.
- **Actual Result:** ⏳
- **Status:** ⏳

---

## 5. Map & Real-Time

### TC-MAP-001 — Google Maps tiles load
- **Expected Result:** Tiles render; no console error about API key.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-002 — OSRM route polyline drawn
- **Expected Result:** Polyline matches road network; no Google `DirectionsService` call (verify via network tab).
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-003 — Nominatim autocomplete debounce 600ms
- **Expected Result:** No request fires until typing stops 600 ms.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-004 — Reverse geocode driver coords
- **Expected Result:** `display_name` populated in dashboard pin.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-005 — WebSocket connect joins driver room
- **Expected Result:** Server log "joined room driver:{id}".
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-006 — WebSocket connect joins customer room
- **Expected Result:** Server log "joined room user:{id}".
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-007 — booking:new_request emitted to matched drivers
- **Expected Result:** Only drivers within 5 km + matching truck type receive event.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-008 — booking:new_request NOT emitted to out-of-range driver
- **Expected Result:** Driver >5 km away receives nothing.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-009 — location:update from driver
- **Expected Result:** `driverLocations` row inserted; broadcast to customer room.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-010 — driver:location received by customer
- **Expected Result:** Marker on customer map moves smoothly.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-011 — booking:status_change to both parties
- **Steps:** Driver marks arrived.
- **Expected Result:** Both customer and driver UIs receive event within 1 s.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-012 — WebSocket reconnect after drop
- **Steps:** Kill network 5 s → restore.
- **Expected Result:** Auto-reconnect; rooms rejoined; no duplicate events.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-013 — Booking phase derivation
- **Expected Result:** `lib/booking/phase.ts` returns expected phase for each status.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-014 — Auto re-dispatch on no acceptance
- **Preconditions:** Server stays up.
- **Expected Result:** After 60 s without accept, `dispatchToNearbyDrivers` retries.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-015 — Map fits to route bounds
- **Expected Result:** Both pickup and dropoff visible without manual zoom.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-016 — Geolocation accuracy threshold
- **Expected Result:** Readings >150 m discarded; status indicator shows "Searching for GPS…".
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-017 — OSRM coordinate order (lng,lat)
- **Expected Result:** All OSRM URLs in code use `${lng},${lat}` (verified by static analysis + integration result correctness).
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-MAP-018 — No Google Geocoder / Places usage
- **Expected Result:** `git grep "google.maps.Geocoder\|PlacesService"` returns 0 hits.
- **Actual Result:** ⏳
- **Status:** ⏳

---

## 6. Edge / Negative / Security

### TC-EDGE-001 — SQL injection attempt in login
- **Steps:** Email = `' OR 1=1 --`.
- **Expected Result:** 401; Prisma parameterizes safely.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-002 — XSS in booking goodsDescription
- **Steps:** Description = `<script>alert(1)</script>`.
- **Expected Result:** Rendered escaped; no script execution.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-003 — JWT tampering
- **Steps:** Modify token signature.
- **Expected Result:** 401.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-004 — Expired JWT
- **Expected Result:** 401; refresh flow kicks in.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-005 — CSRF on state-changing endpoint
- **Expected Result:** Bearer-token-only auth — CSRF not applicable; verify no cookie auth fallback.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-006 — Helmet security headers present
- **Expected Result:** `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` set.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-007 — Booking with pickup == dropoff
- **Expected Result:** 400 "Pickup and dropoff must differ" (or distance 0 rejected).
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-008 — Booking with extreme distance (>500 km)
- **Expected Result:** Either accepted with warning or rejected per business rule.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-009 — Two drivers accept simultaneously
- **Expected Result:** Exactly one wins (DB unique constraint or transaction); other gets 409.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-010 — Customer cancels mid-trip (in_progress)
- **Expected Result:** Allowed with reason; driver notified; partial fare applied per policy.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-011 — Driver goes offline while on active trip
- **Expected Result:** Status forced to `online` (busy) or trip continues; defined behavior, not crash.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-012 — Network failure during booking submit
- **Expected Result:** Error toast; form data preserved; retry available.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-013 — Map fails to load (Google key invalid)
- **Expected Result:** Fallback message; manual address entry still works.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-014 — Nominatim rate limit / 429
- **Expected Result:** Graceful fallback; no UI crash.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-EDGE-015 — Refresh token reuse / replay
- **Expected Result:** Server rejects already-rotated token; logs incident.
- **Actual Result:** ⏳
- **Status:** ⏳

---

## 7. Performance

### TC-PERF-001 — Booking creation latency
- **Expected Result:** p95 ≤ 500 ms.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-PERF-002 — Matching query latency (haversine SQL)
- **Expected Result:** p95 ≤ 200 ms with 10 k drivers.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-PERF-003 — WebSocket event delivery latency
- **Expected Result:** Driver-to-customer location event ≤ 300 ms.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-PERF-004 — `/bookings/available` poll under load
- **Expected Result:** 100 concurrent drivers polling every 5 s — no errors, p95 ≤ 250 ms.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-PERF-005 — Page load — /book
- **Expected Result:** LCP ≤ 2.5 s on Fast 3G throttle.
- **Actual Result:** ⏳
- **Status:** ⏳

### TC-PERF-006 — Page load — /driver/dashboard
- **Expected Result:** LCP ≤ 2.5 s.
- **Actual Result:** ⏳
- **Status:** ⏳

---

## Execution Plan

| Phase | Tooling | Scope |
|-------|---------|-------|
| Phase 1 ✅ | (this document) | All 115 cases authored |
| Phase 2 | Jest + Supertest (`transpolink-api/test/`) | TC-API-* + TC-EDGE-001/003/004/006/009/015 |
| Phase 2 | Playwright (`transpolink-web/e2e/`) | TC-CUST-*, TC-DRV-*, TC-ADM-*, TC-MAP-*, TC-EDGE-002/007/010/012/013 |
| Phase 2 | k6 / autocannon | TC-PERF-* |
| Phase 3 | `npm run test:e2e` + CI | Execute all suites |
| Phase 4 | Iterate until 100 % pass | Fix root causes, re-run |
| Phase 5 | Burn-in soak (24 h) | Stability verification |

---

## Final Report (to be filled after execution)

| Section | Total | Pass | Fail | Pending |
|---------|------:|-----:|-----:|--------:|
| Customer | 26 | 0 | 0 | 26 |
| Driver | 22 | 0 | 0 | 22 |
| Admin | 16 | 0 | 0 | 16 |
| Backend APIs | 28 | 0 | 0 | 28 |
| Map & Real-Time | 18 | 0 | 0 | 18 |
| Edge / Security | 15 | 0 | 0 | 15 |
| Performance | 6 | 0 | 0 | 6 |
| **Total** | **131** | **0** | **0** | **131** |

> Document Phase 1 complete. Phase 2 (automation) awaiting kickoff.
