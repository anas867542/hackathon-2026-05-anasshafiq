# TranspoLink — Architecture Overview

## System diagram (text)

```
Browser (Customer)          Browser (Driver)
        │                           │
        │  HTTPS REST               │  HTTPS REST + Socket.io WS
        ▼                           ▼
┌─────────────────────────────────────────────┐
│              NestJS API (Railway)            │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Auth   │  │Bookings  │  │ Bidding  │  │
│  │  module  │  │ module   │  │ module   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Drivers  │  │ Tracking │  │ Reviews  │  │
│  │  module  │  │ gateway  │  │ module   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                    │                        │
│              Socket.io rooms                │
│              driver:{id}                    │
└─────────────────────────────────────────────┘
              │
              ▼
   ┌──────────────────┐
   │  PostgreSQL 16   │  (Railway managed)
   │  via Prisma 5    │
   └──────────────────┘

External APIs (all free, no billing key needed):
  OSRM   router.project-osrm.org  — road routing
  Nominatim openstreetmap.org     — geocoding / address search
  Google Maps JS SDK              — tile rendering only
```

---

## Layers

### 1. Frontend — Next.js 14 App Router (Railway)

Two route groups with separate auth contexts:

| Group | Routes | Key components |
|-------|--------|----------------|
| `(customer)` | `/book`, `/book/[id]` | `BookingForm`, `TrackingMap`, `FareEstimate` |
| `(driver)` | `/driver/dashboard`, `/driver/inbox`, `/driver/trip/[id]` | `useDriverInbox`, `useDriverTracking`, `TrackingMap` |
| `(auth)` | `/login`, `/register` | `useAuth` |

**State management:** React hooks only — no Redux, no Zustand. Server state lives in `lib/api/*.ts` (typed fetch wrappers around the REST API). Real-time state in `useDriverInbox` and `useCustomerTracking` (Socket.io).

**Map philosophy:** Google Maps JS SDK is loaded for tile rendering only — zero billing surface. All routing goes to OSRM (`router.project-osrm.org`); all geocoding goes to Nominatim. `google.maps.DirectionsService` and `google.maps.Geocoder` are never called.

### 2. API — NestJS 10 monolith (Railway)

One module per domain. Every module follows the same pattern:

```
<name>.module.ts       — imports, providers, exports
<name>.controller.ts   — HTTP routes, DTOs, guards
<name>.service.ts      — business logic, Prisma queries
<name>.dto.ts          — class-validator DTOs
```

Optional: `<name>.gateway.ts` for WebSocket modules (tracking only).

**Guard chain (every authenticated request):**
```
JwtAuthGuard  →  RolesGuard  →  Controller method
```

**Database access rule:** Prisma is injected into services only. Controllers never touch `PrismaService` directly.

**Raw SQL exception:** `matching.service.ts` uses a single haversine SQL query to find online drivers within radius. Prisma's query builder cannot express spherical distance calculations, so raw SQL is allowed here and nowhere else.

### 3. Real-time layer — Socket.io 4 gateway

`tracking.gateway.ts` owns all WebSocket logic:

| Event (client → server) | Purpose |
|--------------------------|---------|
| `location:update` | Driver streams GPS position (lat, lng, accuracy) every 2 s |

| Event (server → client) | Purpose |
|--------------------------|---------|
| `booking:new_request` | New booking broadcast to matched drivers |
| `driver:location` | Driver GPS position forwarded to customer tracking page |

**Room strategy:** Each driver joins room `driver:{userId}` on WebSocket connect. `BookingsService.notifyDrivers()` emits `booking:new_request` to all matched driver rooms. This avoids broadcasting to all connected clients.

### 4. Database — PostgreSQL 16 (Railway managed)

Key tables and relationships:

```
users (id, email, role: customer|driver|admin, passwordHash)
  └── drivers (userId, isOnline, latitude, longitude, rating)
        └── trucks (driverId, type: mini_truck|..., plateNumber, isActive)

bookings (id, customerId, status: pending→accepted→arrived→in_progress→completed|cancelled)
  ├── pickupLat/Lng, dropoffLat/Lng, distanceKm, fareAmount
  ├── driverId (nullable until accepted)
  └── bids[] (driverId, amount, status: pending|accepted|expired)

reviews (bookingId, reviewerId, revieweeId, score 1-5, comment)
```

Migrations managed by Prisma. Applied automatically at deploy time via `prisma migrate deploy` in `start:prod`.

---

## Request lifecycle — booking creation

```
1. Customer submits BookingForm
   POST /api/v1/bookings  { pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType, bookingType, fareAmount }

2. JwtAuthGuard validates access token → attaches user to request
   RolesGuard checks role === 'customer'

3. BookingsService.create()
   - Validates pickup ≠ dropoff (< 50 m → 400)
   - Persists booking (status: 'pending')
   - Calls MatchingService.findNearbyDrivers() → haversine SQL, radius 5 km
   - For each matched driver: gateway.notifyDrivers(driverIds, booking)
     → server emits booking:new_request to room driver:{id}

4. Driver client (useDriverInbox hook) receives event → shows request card

5. Driver taps Accept
   POST /api/v1/bookings/:id/accept
   - Sets booking.driverId, status → 'accepted'
   - 409 if already accepted (race condition guard)

6. Driver streams GPS
   Socket.io: location:update { lat, lng, accuracy }
   → gateway stores in memory → emits driver:location to booking room

7. Customer TrackingMap receives driver:location → moves marker → re-fetches OSRM route

8. Driver: arrive → start → complete
   Each is a PATCH that advances the state machine with role + ownership checks
```

---

## Deployment

| Service | Platform | Builder | Start command |
|---------|----------|---------|---------------|
| `transpolink-api` | Railway | Nixpacks | `npm run start:prod` (= `prisma migrate deploy && node dist/main`) |
| `transpolink-web` | Railway | Nixpacks | `node server.js` (Next.js standalone) |
| PostgreSQL | Railway | Managed | — |

Both services are in the same Railway project (`captivating-fascination`) and share env vars via Railway's variable injection. The API's `PORT` is injected at runtime; NestJS reads it via `ConfigService.get('PORT', 4000)`.

---

## Security posture (MVP)

| Concern | Mitigation |
|---------|-----------|
| Auth | JWT access (15 min) + refresh (7 day) tokens, bcrypt password hashing (12 rounds) |
| Authorization | Role guard on every route; ownership checks in service layer |
| Rate limiting | `@nestjs/throttler` global guard (100 req / 60 s per IP) |
| SQL injection | Prisma parameterises all queries; haversine query uses `$queryRaw` with tagged template literal (safe) |
| CORS | `CORS_ORIGIN` env var, validated — no wildcard in production |
| Secrets | Never baked into image; injected at runtime via Railway env vars |
| Input validation | `class-validator` on all DTOs; unknown fields stripped via `forbidNonWhitelisted` |
