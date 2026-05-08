# TranspoLink — Hackathon Workshop Pack

> Pakistan's AI-assisted freight booking platform  
> NestJS 10 API · Next.js 14 App Router · PostgreSQL / Prisma 5 · Socket.io · OSRM · Nominatim

---

## §1 — Team Onboarding

### Project in one sentence
TranspoLink connects shippers with nearby truck drivers in Pakistan, handling instant bookings, competitive bidding, real-time GPS tracking, and post-trip reviews — all without Google's paid APIs.

### Tech stack at a glance

| Layer | Technology |
|---|---|
| API | NestJS 10, Prisma 5, PostgreSQL |
| Web | Next.js 14 App Router, Tailwind CSS |
| Real-time | Socket.io (WebSocket gateway) |
| Maps | Google Maps JS SDK (tiles only) |
| Routing | OSRM (free, `router.project-osrm.org`) |
| Geocoding | Nominatim / OpenStreetMap (free, no key) |
| Auth | JWT access + refresh tokens, role-based (customer / driver / admin) |

### Repo layout

```
transpolink-api/          NestJS monolith
  src/modules/
    auth/                 JWT + refresh token flow
    bookings/             CRUD, state machine, matching.service.ts
    bidding/              Offer lifecycle (drivers bid, customer picks)
    drivers/              Profile, status (online/offline), truck types
    reviews/              Post-trip ratings (customer ↔ driver)
    tracking/             Socket.io gateway, GPS update stream
    trucks/               Vehicle type catalogue
    users/                Customer profiles

transpolink-web/          Next.js 14 App Router
  src/app/
    (auth)/               Login / register pages
    (customer)/           Booking form, trip tracker, bid inbox
    (driver)/             Dashboard, inbox, live trip page
  src/components/
    booking/              BookingForm, FareEstimate, TruckTypeSelector, RatingModal
    map/                  BookingMap, TrackingMap, PlaceAutocompleteInput
    ui/                   Button, Card, Badge, BottomSheet, Skeleton, …
  src/hooks/              useDriverTracking, useDriverInbox, useCustomerTracking, …
  src/lib/api/            bookings.ts, reviews.ts, client.ts (fetch wrapper)
```

### Getting started (first 15 minutes)
1. `cp transpolink-api/.env.example transpolink-api/.env` — set `DATABASE_URL` and `JWT_SECRET`
2. `cd transpolink-api && npx prisma migrate dev && npm run start:dev`
3. `cd transpolink-web && cp .env.local.example .env.local` — set `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (tiles only, no billing needed)
4. `npm run dev` — open `http://localhost:3000`
5. Register one **customer** account and one **driver** account (different browser / incognito)

### Key environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | API `.env` | PostgreSQL connection |
| `JWT_SECRET` | API `.env` | Token signing |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Web `.env.local` | Map tiles (no billing) |
| `NEXT_PUBLIC_API_URL` | Web `.env.local` | NestJS base URL |
| `NEXT_PUBLIC_WS_URL` | Web `.env.local` | Socket.io endpoint |

---

## §2 — 1-Page Product Spec

**Product name:** TranspoLink  
**Tagline:** Book a truck in seconds. Track it live.

### Problem
Pakistan's informal freight market runs on phone calls and WhatsApp. Shippers can't get instant quotes, can't track their goods in transit, and can't compare prices across drivers. Drivers waste hours waiting for walk-up work.

### Users
| Persona | Goal |
|---|---|
| **Shipper (customer)** | Book a truck quickly, know the fare upfront, see driver ETA in real time |
| **Truck driver** | Receive job requests near their location, set their own price via bidding |

### Core features (MVP)
1. **Instant booking** — enter pickup/drop-off (Nominatim autocomplete), pick truck type, get fare estimate (base + ₨80/km + ₨5/min), confirm
2. **Bidding mode** — post a job, drivers submit offers, customer picks the best bid
3. **Driver dispatch** — server finds online drivers within 5 km with a matching active truck; WebSocket push within 2 s
4. **Live GPS tracking** — driver streams position every 2 s via Socket.io; customer sees animated truck marker + OSRM route line + ETA
5. **Trip state machine** — `pending → accepted → arrived → in_progress → completed` (or `cancelled`)
6. **Post-trip review** — 1–5 star rating with optional comment; stored per booking

### Out of scope (this sprint)
- Payment processing
- Driver earnings dashboard
- Push notifications (mobile)
- Admin dispute resolution UI

### Success metrics
- Booking-to-driver-accept < 60 s in test environment
- GPS position updates visible on customer map within 5 s of driver movement
- Fare estimate within 10 % of completed trip distance

---

## §3 — CLAUDE.md Template (project conventions)

```markdown
# TranspoLink — Claude Code conventions

## Architecture rules
- API: NestJS modules in `src/modules/<name>/`. Each module = service + controller + optional gateway.
- Prisma models in `schema.prisma`; never write raw SQL except in `matching.service.ts` (haversine query).
- Web: Next.js App Router. Server components for data-fetching pages; 'use client' only for interactive components.
- All map routing uses OSRM (`router.project-osrm.org`). Do NOT call `google.maps.DirectionsService`.
- All geocoding uses Nominatim. Do NOT call `google.maps.Geocoder` or Google Places API.

## Code style
- TypeScript strict mode. No `any` except for third-party data that genuinely has no type.
- Tailwind only — no inline styles, no CSS modules.
- Functional components with named exports. No default exports in component files.
- Hooks in `src/hooks/use<Name>.ts`.

## Pre-existing errors (do not touch)
- `src/app/(auth)/login/page.tsx`: typedRoutes RouteImpl error — known issue, leave alone.
- `src/hooks/useNearbyDrivers.ts`: NearbyDriversQuery index signature — known issue, leave alone.

## Commit style
Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`. One sentence max.

## Testing
- API: `npm run test` (Jest unit tests per module).
- Web: No test suite yet. Verify UI flows manually in browser.
```

---

## §4 — Prompt Log

> Record every significant Claude Code prompt and what it produced. Honest log — include failed attempts.

| # | Date | Prompt (summary) | Outcome | Tokens est. |
|---|---|---|---|---|
| 1 | 2026-05-07 | "Fix TrackingMap — no route lines, DirectionsService uses paid API" | Replaced DirectionsService × 2 with OSRM `fetchOsrmPath` + `PolylineF`; removed `DirectionsRenderer` import | ~3 k |
| 2 | 2026-05-07 | "No driver icon on maps — GPS accuracy rejected, no seed position" | Raised `MAX_ACCURACY_M` 40 → 150; added `initialDriverPos` from `booking.driver.currentLat/currentLng` on both customer + driver pages | ~2 k |
| 3 | 2026-05-07 | "Google Maps can't load correctly popup when typing address — replace with Nominatim" | Rewrote `PlaceAutocompleteInput.tsx` (debounced Nominatim search, address history, reverse geocode); updated `BookingMap.tsx` reverseGeocode; removed `useGoogleMaps` from `BookingForm.tsx` | ~5 k |
| 4 | 2026-05-07 | "Rating modal flickers on hover after ride completes" | Added `min-h-[1.25rem]` to label `<p>` so modal height stays constant; no conditional render | ~0.5 k |
| 5 | 2026-05-07 | "Driver listing not showing after OSRM integration" | Traced full dispatch path (matchingService → notifyDrivers → useDriverInbox); no code bug found — likely env issue (driver not within 5 km / no active truck) | ~2 k |

**Running total: ~12 k tokens**

---

## §5 — Daily Cost Log

| Date | Session | Input tokens | Output tokens | Estimated cost (USD) | Notes |
|---|---|---|---|---|---|
| 2026-05-07 | Day 1 | ~35,000 | ~8,000 | ~$0.28 | Tracking + geocode + rating fixes |
| | | | | | |
| | **Total** | | | **$0.28** | |

> Pricing ref (claude-sonnet-4-6 as of 2026-05): $3/M input · $15/M output

---

## §6 — Daily Standup Format

```
Date: YYYY-MM-DD
Sprint day: X of 3

DONE (yesterday / this morning)
  - 
  - 

IN PROGRESS (right now)
  - 

BLOCKED
  - 

PLAN (rest of today)
  - 

DEMO-READY features
  - 
```

### Example standup — Day 1 (2026-05-07)

```
Date: 2026-05-07
Sprint day: 1 of 3

DONE
  - Replaced Google DirectionsService with OSRM in TrackingMap (route lines now render)
  - Raised GPS accuracy threshold to 150 m (driver marker now visible on desktop)
  - Replaced Google Places + Geocoder with Nominatim (address search works without billing)
  - Fixed rating modal hover flicker (constant modal height)

IN PROGRESS
  - Workshop pack document

BLOCKED
  - Driver listing: cannot confirm root cause without two live devices in same city

PLAN
  - Complete workshop pack
  - Full end-to-end demo flow (book → accept → track → complete → review)

DEMO-READY features
  - Booking form with Nominatim address search + map pin drag
  - Fare estimate sidebar (distance + duration + base fare)
  - Live GPS tracking with OSRM route line + ETA
  - Post-trip star rating
```

---

## §7 — Demo Script (5 minutes)

### Setup checklist (before judges arrive)
- [ ] Two browser windows open side by side: left = customer (`/book`), right = driver (`/driver/dashboard`)
- [ ] Driver is logged in and status is **Online** with an active truck (Mini Truck)
- [ ] Driver's location is set to near Lahore (31.5204° N, 74.3587° E) — within 5 km of demo pickup
- [ ] API server running (`npm run start:dev`), no red errors in console
- [ ] Web running (`npm run dev`), map tiles loading

### Script

**[0:00 — 0:45] The problem**  
> "In Pakistan, booking a freight truck today means calling five numbers and hoping someone picks up. You have no price, no ETA, and no way to track your goods. TranspoLink fixes that."

**[0:45 — 2:00] Customer books a truck**  
1. Open `/book` — point out the Nominatim address autocomplete (no Google billing)
2. Type "Gulberg, Lahore" in Pickup → select first suggestion
3. Type "DHA Phase 5, Lahore" in Drop-off → select
4. Map draws OSRM route line — point out distance + fare estimate in sidebar
5. Select **Mini Truck**, leave Booking Type as **Instant**
6. Click **Confirm booking** — show the pending booking page

**[2:00 — 2:45] Driver accepts**  
1. Switch to driver window — a request card appears in the inbox with fare and route preview
2. Driver clicks **Accept** — both windows update status to `accepted`

**[2:45 — 4:00] Live GPS tracking**  
1. Driver window: click **Mark arrived at pickup** → **Start trip**
2. Customer window: open `/book/<id>` tracking page — driver marker appears on map
3. Point out: OSRM route line (pickup → drop-off), ETA and distance widgets, animated marker
4. Driver window: move position (or let GPS stream) — customer sees marker update in real time

**[4:00 — 4:30] Complete + review**  
1. Driver clicks **Complete trip**
2. Rating modal appears — select 5 stars, type "Fast and careful driver", click Submit
3. Dashboard redirects — trip appears in history with `completed` status

**[4:30 — 5:00] Wrap-up**  
> "Zero paid APIs. Maps use OSRM and Nominatim — fully open-source. The bidding mode lets drivers set their own price, creating a real market. This is TranspoLink."

### Fallback (if WebSocket breaks)
- Refresh both pages — Socket.io reconnects automatically
- If GPS won't stream on demo device, driver marker seeds from DB position (last known location)

---

## §8 — Judges' Scorecard

| Criterion | Weight | 1 — Poor | 3 — Meets bar | 5 — Excellent | Score |
|---|---|---|---|---|---|
| **Problem clarity** | 15 % | Vague use case | Clear problem, clear user | Quantified pain point, specific Pakistani freight context | /5 |
| **Technical execution** | 25 % | Crashes or key flows broken | Core booking flow works | Booking + tracking + bidding all work E2E, clean error states | /5 |
| **Real-time / AI use** | 20 % | No real-time features | WebSocket present | Live GPS with < 5 s latency, smooth marker interpolation, OSRM route updates | /5 |
| **Product polish** | 15 % | Raw / unstyled | Usable UI | Mobile-responsive, loading states, error handling, accessible | /5 |
| **Innovation** | 15 % | Standard CRUD | At least one novel angle | Bidding marketplace + free-API-only approach (OSRM + Nominatim) | /5 |
| **Presentation** | 10 % | Unclear or over-time | Follows structure | Crisp story, confident demo, handles Q&A | /5 |

**Total: /30**

---

## §9 — 1-Page Reflection

**Team:** _______________  
**Date:** _______________

### What we shipped
*(List the 3–5 features that are demo-ready)*

1. 
2. 
3. 

### What we cut
*(List anything planned but not shipped, and why)*

1. 
2. 

### Biggest technical win
> *(One paragraph — the hardest problem you solved and how)*

### Biggest mistake / lesson
> *(One paragraph — something that cost more time than expected)*

### If we had one more day
> *(One paragraph — the single highest-impact thing you would add)*

### AI usage reflection
- Prompts that saved the most time: 
- Prompts that produced wrong output (and how you caught it): 
- Things Claude couldn't help with (had to do yourself): 

### Would you use this approach again?
- [ ] Yes, for all future projects
- [ ] Yes, for prototyping / hackathons only
- [ ] Probably not — why: _______________

---

### Example reflection (Day 1)

**Biggest technical win:**  
Replacing the entire Google Maps API stack (Directions, Places, Geocoder) with free alternatives in under 3 hours. OSRM handles routing on both the booking map and the live tracking map; Nominatim handles all address search and reverse geocoding. The app now works with zero billing credentials.

**Biggest mistake:**  
GPS accuracy threshold of 40 m silently rejected every fix from a desktop browser (which reports 50–150 m accuracy). The driver marker never appeared and there was no error — just silence. Raising the threshold to 150 m fixed it instantly; we should have checked that constant on day one.

**If we had one more day:**  
Smooth driver marker interpolation on the customer tracking map. Right now the marker jumps every 2 s. A simple linear interpolation between received positions would make it feel production-quality.

---

## §10 — What Excellent Looks Like

### Booking flow
- Address autocomplete returns results within 600 ms (Nominatim debounce 400 ms + network)
- OSRM route line appears within 2 s of second location being set
- Fare estimate updates live as route changes — never shows stale value
- Mobile bottom sheet shows truck name + distance + formatted fare before confirm

### Driver dispatch
- `matching.service.ts` haversine query runs in < 50 ms (indexed `current_lat`, `current_lng` columns)
- `booking:new_request` WebSocket event arrives at driver client within 2 s of booking creation
- Driver offer expires after 60 s (TTL enforced both server-side and in `useDriverInbox` sweep)

### Live GPS tracking
- Driver position updates every 2 s via `tracking.gateway.ts`
- Customer `TrackingMap` re-renders driver marker on every `driver:location` event
- OSRM driver-leg route (driver → pickup or driver → dropoff) recalculates when driver deviates > 200 m
- ETA shown in minutes, rounds up to 1 min minimum
- Phase label changes automatically: "On the way to pickup" → "At pickup" → "En route to drop-off" → "Delivered"

### Code quality signals
- No `any` types in business logic files
- No direct DOM/browser API calls outside hooks
- All async operations have `.catch()` or `try/catch` with user-visible error state
- `TrackingMap.tsx` and `BookingMap.tsx` have no Google paid API calls
- Pre-existing TS errors untouched (typedRoutes, NearbyDriversQuery)

### What separates a 4 from a 5
A 4 has working flows. A 5 handles every edge case gracefully: driver goes offline mid-trip (banner appears), GPS stream drops (last known position held, reconnect automatic), booking cancelled after acceptance (customer and driver both notified), review already submitted (modal skipped, redirects to dashboard).

---

## §11 — Facilitator Cheat Sheet

### Common blockers and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Map tiles don't load | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` missing or invalid | Set key in `.env.local`; tiles are free (no billing needed) |
| Address autocomplete returns nothing | Nominatim rate-limited (1 req/s) | Wait 5 s and retry; or set a custom `User-Agent` header |
| Driver doesn't receive booking request | Driver not online, no active truck, or > 5 km from pickup | Set driver status Online, activate a truck, verify GPS coords in DB |
| No route line on tracking map | OSRM fetch failed (network / CORS) | Check browser console; OSRM is public — usually transient |
| GPS marker not moving | `MAX_ACCURACY_M` too low, or browser blocked location | Check `useDriverTracking.ts` threshold; allow location in browser |
| Socket.io not connecting | `NEXT_PUBLIC_WS_URL` wrong or API not running | Check API console; verify env var |
| Prisma migration fails | DB not running or `DATABASE_URL` wrong | `pg_isready`; check connection string |
| `typedRoutes` TS error on login page | Known pre-existing issue | Ignore — do not attempt to fix |

### Time box suggestions (3-day sprint)

| Day | Focus |
|---|---|
| Day 1 | Core booking flow working E2E (book → accept → status updates) |
| Day 2 | Live GPS tracking + bidding mode + mobile responsiveness |
| Day 3 | Polish, review flow, demo rehearsal, slide deck |

### Judging day reminders
- Demo device should have location permission pre-granted
- Have the `/book/<id>` tracking URL open in customer window before judges arrive
- Keep NestJS console visible — real-time Socket.io events are impressive to show
- Emphasise the free-API angle: OSRM + Nominatim = production-grade maps at $0/month
