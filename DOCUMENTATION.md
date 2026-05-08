# TranspoLink — Full Technical Documentation

> On-demand truck booking platform connecting customers who need freight moved with verified drivers who have the right vehicle for the job.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [API Reference](#3-api-reference)
4. [Setup Instructions](#4-setup-instructions)
5. [Deployment Guide](#5-deployment-guide)
6. [Feature List](#6-feature-list)
7. [Future Improvements Roadmap](#7-future-improvements-roadmap)

---

## 1. Project Overview

TranspoLink is a full-stack, real-time freight booking platform. Customers place bookings specifying vehicle type, pickup and dropoff locations, and goods details. The platform either matches them instantly with a nearby available driver or opens a bidding window where drivers compete on price. Once a trip begins, customers see the driver's vehicle moving on a live map with dead-reckoned smooth animation. Drivers manage their trucks, set availability, and receive new booking requests through a real-time inbox.

### Monorepo Layout

```
transpolink/
├── transpolink-api/          NestJS 10 REST + WebSocket API
├── transpolink-web/          Next.js 14 App Router frontend
├── docker-compose.yml        Local development stack
├── docker-compose.prod.yml   Production stack
├── DEPLOY.md                 Pre-deploy checklist & runbook
└── DOCUMENTATION.md          This file
```

### Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | NestJS 10 (Express adapter) |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Real-time | Socket.io 4 (`/realtime` namespace) |
| Authentication | JWT (access 15 m) + Refresh tokens (7 d, SHA-256 hashed) |
| Frontend framework | Next.js 14 App Router |
| UI | Tailwind CSS |
| Maps | Google Maps JavaScript API (Maps, Directions, Distance Matrix) |
| Containerisation | Docker + Docker Compose |
| Password hashing | bcrypt (rounds configurable, default 12) |
| Rate limiting | `@nestjs/throttler` (global guard, per-route overrides) |

---

## 2. Architecture

### High-Level Diagram

```
Browser (Next.js 14)
        │
        │  HTTPS  REST calls (JWT Bearer)
        ├──────────────────────────────────────────► NestJS API :4000
        │                                                    │
        │  WSS  Socket.io /realtime (JWT handshake)          │  Prisma
        └──────────────────────────────────────────►         ├──────► PostgreSQL :5432
                                                             │
                                                    Google Maps API
                                                    (client-side only)
```

### Backend — NestJS

The API follows the standard NestJS module pattern. Every feature area is encapsulated in its own module under `src/modules/`.

```
src/
├── app.module.ts             Root module — wires everything together
├── main.ts                   Bootstrap: Helmet, CORS, validation pipe, Swagger
├── common/
│   ├── config/
│   │   └── env.validation.ts Startup env-var validation (fails fast on bad config)
│   ├── decorators/           @CurrentUser(), @Roles(), @Public()
│   ├── filters/              HttpExceptionFilter (uniform error shape)
│   ├── guards/               JwtAuthGuard, RolesGuard
│   └── middleware/           LoggerMiddleware (request/response logging)
├── health/
│   ├── health.controller.ts  GET /health (liveness) + GET /health/ready (readiness)
│   └── health.module.ts
├── prisma/
│   ├── prisma.service.ts     PrismaClient wrapper with retry-on-connect (5 × 5 s)
│   └── prisma.module.ts
└── modules/
    ├── auth/                 Register, login, refresh, logout; JWT strategy
    ├── users/                Profile endpoint
    ├── drivers/              Onboarding, availability, location updates, nearby search
    ├── trucks/               CRUD for driver vehicles
    ├── bookings/             Create + full status-transition lifecycle
    ├── bidding/              Submit / accept / withdraw bids
    ├── tracking/             Socket.io gateway — GPS broadcast & booking events
    └── reviews/              Post-trip ratings (1–5 stars)
```

#### Request lifecycle

```
Request
  → LoggerMiddleware (logs method, url, status, latency)
  → ThrottlerGuard (global, configurable TTL/limit)
  → JwtAuthGuard (validates Bearer token, populates req.user)
  → RolesGuard (checks @Roles() decorator on handler)
  → ValidationPipe (class-validator DTOs, whitelist + forbidNonWhitelisted)
  → Controller → Service → Prisma → PostgreSQL
  → HttpExceptionFilter (catches all exceptions, returns { statusCode, message, error })
```

#### Security layers

- **Helmet** — HTTP security headers (HSTS in production, CSP off in dev so Swagger loads).
- **CORS** — Exact-origin allowlist; wildcard `*` causes `process.exit(1)` on startup in production.
- **Rate limiting** — Global 100 req / 60 s; auth endpoints tightened to 5 req / 60 s.
- **Brute-force lockout** — 5 failed logins per email → 15-minute lockout (in-memory per instance).
- **Constant-time login** — DUMMY_HASH ensures bcrypt always runs even when email not found, preventing timing-based email enumeration.
- **JWT secrets** — Must be ≥ 32 characters, must differ from each other; placeholder values cause immediate startup failure.
- **Body size limit** — Configurable `BODY_LIMIT` (default `1mb`) on both `json` and `urlencoded` parsers.
- **Input validation** — All DTOs enforced via `class-validator`; unknown properties rejected (`forbidNonWhitelisted`).
- **Swagger** — Only available when `NODE_ENV !== production`.

### Frontend — Next.js 14

```
src/
├── app/
│   ├── layout.tsx            Root layout (metadata, fonts)
│   ├── page.tsx              Public landing page
│   ├── (auth)/
│   │   ├── login/            Email + password login
│   │   └── register/         Customer or driver registration
│   ├── (customer)/
│   │   ├── dashboard/        Booking history + active booking summary
│   │   ├── book/             Create booking (vehicle picker, map pin selection)
│   │   └── book/[id]/        Live trip tracking (map + status panel)
│   └── (driver)/
│       ├── driver/dashboard/ Earnings, trip history, truck management
│       ├── driver/onboarding/ License + CNIC document upload
│       └── driver/trip/[id]/ Active trip controls + GPS broadcast
├── components/               Shared UI components (maps, cards, forms, modals)
├── hooks/                    Custom React hooks (see §3)
└── lib/
    ├── api/                  Typed fetch wrappers per module
    ├── socket/               Singleton Socket.io client + event type definitions
    └── auth/                 LocalStorage session management
```

#### Auth flow (frontend)

1. `login()` / `register()` → API returns `{ accessToken, refreshToken, user }`.
2. Tokens stored in `localStorage` (`tl.accessToken`, `tl.refreshToken`, `tl.user`).
3. Every API call sends `Authorization: Bearer <accessToken>`.
4. On 401 → single-flight refresh → retry original request → on second 401 → redirect to `/login`.
5. WebSocket connection authenticates via `{ auth: { token: accessToken } }` in Socket.io handshake.

### Database Schema

```
User ──────────── Driver ──────────── Truck
  │                  │                  │
  │                  │                  │
  └── RefreshToken   └── Bid            │
  │                  │                  │
  └── Review ─────── Booking ───────────┘
       (reviewer/       │
        reviewee)       ├── Payment
                        ├── TripLocation
                        └── Review
```

**Indexes added for query performance:**
- `Booking(customerId, status)` — customer dashboard filter
- `Booking(driverId, status)` — driver dashboard filter
- `Bid(bookingId, status)` — bid list for a booking

### Real-Time Architecture (Socket.io)

**Namespace:** `/realtime`

**Room topology:**

| Room | Members | Purpose |
|---|---|---|
| `user:{userId}` | Any authenticated user | General notifications |
| `driver:{driverId}` | Driver only | New booking requests, bid updates |
| `booking:{bookingId}` | Customer + assigned driver + admins | Live tracking, status changes |

**GPS pipeline:**
```
Driver device → useDriverTracking hook → driver:location event
  → TrackingGateway validates authz (is this driver assigned to booking?)
  → Writes TripLocation row (rate-limited: 1 write / 3 s)
  → Deduplication gate: skip emit if <10 m moved AND <2 s elapsed
  → Broadcasts booking:driver_location to booking room
  → Customer useLiveDriver hook interpolates at 60 fps via requestAnimationFrame
```

**Dead-reckoning interpolation (client side):**
GPS updates arrive every ~2–4 s. Between updates the hook extrapolates position using last known speed and heading, then smoothly transitions to the next real fix using a cubic ease. The expected GPS interval is auto-calibrated from real inter-event timing (exponential moving average). Heading changes smaller than 5° are suppressed to prevent jitter.

---

## 3. API Reference

> Base URL: `http://localhost:4000/api/v1` (development)
> All endpoints except `GET /reviews` require `Authorization: Bearer <accessToken>` unless noted.
> Swagger UI available at `GET /api/v1/docs` in development only.

### Error shape

```json
{
  "statusCode": 400,
  "message": "plateNumber must be a string",
  "error": "Bad Request"
}
```

### Rate limits

| Scope | Limit |
|---|---|
| Global | 100 requests / 60 s |
| `POST /auth/login` | 5 requests / 60 s |
| `POST /auth/register` | 5 requests / 60 s |
| `POST /auth/refresh` | 10 requests / 60 s |
| `GET /health`, `GET /health/ready` | Exempt (`@SkipThrottle`) |

---

### Auth — `/auth`

#### `POST /auth/register`

Register a new account. Drivers must provide licence details.

**Body:**
```json
{
  "email": "alice@example.com",
  "phone": "+923001234567",
  "password": "Str0ng!Pass",
  "fullName": "Alice Khan",
  "role": "customer",
  "licenseNumber": "DL-123456",
  "licenseExpiry": "2028-06-01"
}
```

| Field | Required | Notes |
|---|---|---|
| `email` | Yes | Unique |
| `phone` | Yes | |
| `password` | Yes | |
| `fullName` | Yes | Max 100 chars |
| `role` | No | `customer` (default) or `driver` |
| `licenseNumber` | Driver only | |
| `licenseExpiry` | Driver only | ISO date |

**Response `201`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "a3f9...",
  "user": { "id": "uuid", "email": "alice@example.com", "role": "customer", "driverId": null }
}
```

---

#### `POST /auth/login`

**Body:**
```json
{ "email": "alice@example.com", "password": "Str0ng!Pass" }
```

**Response `200`:** Same shape as register.

**Response `401`:** Wrong credentials.
**Response `429`:** Account locked (5 failures in rolling window → 15-minute lockout).

---

#### `POST /auth/refresh`

Exchange a valid refresh token for a new token pair.

**Body:**
```json
{ "refreshToken": "a3f9..." }
```

**Response `200`:** Same shape as login.

---

#### `POST /auth/logout`

Revokes all refresh tokens for the current user.

**Response `204`:** No content.

---

### Users — `/users`

#### `GET /users/me`

Returns the authenticated user's profile.

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "alice@example.com",
  "phone": "+923001234567",
  "fullName": "Alice Khan",
  "role": "customer",
  "status": "active",
  "avatarUrl": null,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

### Drivers — `/drivers`

#### `PATCH /drivers/me/onboarding` — Role: `driver`

Submit or update driver documents.

**Body:**
```json
{
  "licenseNumber": "DL-123456",
  "licenseExpiry": "2028-06-01",
  "cnicNumber": "42101-1234567-1",
  "licenseDocUrl": "https://cdn.example.com/docs/dl.pdf"
}
```

---

#### `GET /drivers/me` — Role: `driver`

Returns the authenticated driver's profile including rating, total trips, and earnings.

---

#### `PATCH /drivers/me/availability` — Role: `driver`

**Body:**
```json
{ "status": "online" }
```

`status`: `online` | `offline` | `on_trip`

---

#### `PATCH /drivers/me/location` — Role: `driver`

**Body:**
```json
{
  "lat": 24.8607,
  "lng": 67.0011,
  "speedKmh": 45.5,
  "heading": 270
}
```

| Field | Validation |
|---|---|
| `lat` | -90 to 90 |
| `lng` | -180 to 180 |
| `speedKmh` | 0 to 250 |
| `heading` | 0 to 360 |

> Driver positions returned from `GET /drivers/nearby` are fuzzed to ~1 km precision for privacy.

---

#### `GET /drivers/nearby` — Role: `customer` or `admin`

**Query params:**

| Param | Required | Default | Notes |
|---|---|---|---|
| `lat` | Yes | | |
| `lng` | Yes | | |
| `radiusKm` | No | `10` | Max search radius |
| `vehicleType` | No | | Filter by truck type |

**Response `200`:**
```json
[
  {
    "driverId": "uuid",
    "fullName": "Bob Driver",
    "ratingAvg": 4.8,
    "lat": 24.86,
    "lng": 67.00,
    "distanceKm": 2.3
  }
]
```

---

### Trucks — `/trucks`

#### `POST /trucks` — Role: `driver`

**Body:**
```json
{
  "type": "medium_truck",
  "plateNumber": "KHI-1234",
  "capacityKg": 5000,
  "capacityVolumeM3": 20.5,
  "make": "Isuzu",
  "model": "NKR",
  "year": 2019,
  "isPrimary": true
}
```

`type` values: `mini_truck` | `pickup` | `medium_truck` | `large_truck` | `container` | `flatbed` | `refrigerated`

Plate numbers are normalised to uppercase on save.

---

#### `GET /trucks` — Role: `driver` or `admin`

Returns trucks owned by the current driver. Admins may pass `?driverId=uuid` to view any driver's fleet.

---

#### `GET /trucks/:id` — Role: `driver` or `admin`

#### `PATCH /trucks/:id` — Role: `driver` or `admin`

Same fields as `POST /trucks`, all optional.

#### `DELETE /trucks/:id` — Role: `driver` or `admin`

---

### Bookings — `/bookings`

#### `POST /bookings` — Role: `customer`

**Body:**
```json
{
  "vehicleType": "medium_truck",
  "pickup": {
    "address": "Saddar, Karachi",
    "lat": 24.8607,
    "lng": 67.0011
  },
  "dropoff": {
    "address": "Gulshan-e-Iqbal, Karachi",
    "lat": 24.9215,
    "lng": 67.0892
  },
  "goodsDescription": "Office furniture — 10 desks, 20 chairs",
  "estimatedWeightKg": 800,
  "bookingType": "instant",
  "scheduledAt": null
}
```

| Field | Validation |
|---|---|
| `address` | Max 500 chars |
| `goodsDescription` | Max 1000 chars |
| `bookingType` | `instant` \| `bidding` \| `scheduled` |

**`instant` type** — Platform broadcasts `booking:new_request` to all nearby online drivers with a matching vehicle. First driver to `PATCH /bookings/:id/accept` wins.

**`bidding` type** — Drivers submit bids; customer reviews and accepts one.

**`scheduled` type** — Same as instant but triggers at `scheduledAt`.

**Response `201`:** Full booking object including generated `referenceCode`.

---

#### `GET /bookings`

Lists bookings relevant to the caller's role. Customers see their own; drivers see assigned ones; admins see all.

**Query params:**

| Param | Values |
|---|---|
| `status` | `pending` \| `accepted` \| `in_progress` \| `completed` \| `cancelled` \| … |
| `page` | integer ≥ 1 |
| `pageSize` | integer, default 20 |

---

#### `GET /bookings/:id`

Returns full booking details. Access restricted: customer (own), driver (assigned), admin (any).

---

#### `GET /bookings/:id/locations`

Returns the GPS breadcrumb trail for the trip.

**Response `200`:**
```json
[
  { "lat": 24.8607, "lng": 67.0011, "speedKmh": 0, "heading": 0, "recordedAt": "..." },
  ...
]
```

---

#### `PATCH /bookings/:id/accept` — Role: `driver`

Driver accepts a pending booking. Validates that the driver's truck type matches `booking.vehicleType`.

**Body (optional):**
```json
{ "truckId": "uuid" }
```

If `truckId` is omitted the driver's primary active truck is used automatically.

**Status transition:** `pending` → `accepted`

---

#### `PATCH /bookings/:id/arrive` — Role: `driver`

Driver has arrived at the pickup location.

**Status transition:** `accepted` → `arrived`

---

#### `PATCH /bookings/:id/start` — Role: `driver`

Trip is underway.

**Status transition:** `arrived` → `in_progress`

---

#### `PATCH /bookings/:id/complete` — Role: `driver`

Trip finished; goods delivered.

**Status transition:** `in_progress` → `completed`

---

#### `PATCH /bookings/:id/cancel` — Role: `customer`, `driver`, or `admin`

**Body (optional):**
```json
{ "reason": "Customer cancelled before pickup" }
```

**Status transition:** Any non-terminal status → `cancelled`

---

### Bidding — `/bookings/:bookingId/bids`

#### `POST /bookings/:bookingId/bids` — Role: `driver`

Submit a bid on a `bidding`-type booking.

**Body:**
```json
{
  "amount": 2500.00,
  "etaMinutes": 15,
  "message": "I can be there in 15 minutes with a clean medium truck.",
  "expiresInSeconds": 300
}
```

| Field | Validation |
|---|---|
| `amount` | > 0, ≤ 9,999,999, ≤ 10× `estimatedFare` |
| `etaMinutes` | Optional |
| `expiresInSeconds` | Default 300 (5 minutes) |

---

#### `GET /bookings/:bookingId/bids` — Role: `customer` or `admin`

Lists all bids for the booking, ordered by amount ascending.

---

#### `PATCH /bookings/:bookingId/bids/:bidId/accept` — Role: `customer`

Accept a bid. The booking is assigned to that driver; all other bids are rejected.

---

#### `PATCH /bookings/:bookingId/bids/:bidId/withdraw` — Role: `driver`

Driver retracts their bid.

---

### Reviews — `/reviews`

#### `POST /reviews` — Auth required

Submit a review after a completed booking. Both customer and driver can review each other.

**Body:**
```json
{
  "bookingId": "uuid",
  "revieweeId": "uuid",
  "score": 5,
  "comment": "Professional driver, on time, careful with the cargo."
}
```

`score`: integer 1–5.

---

#### `GET /reviews` — Public

Fetch reviews about a user.

**Query params:** `userId` (required), `take` (default 20), `skip` (default 0).

---

#### `GET /reviews/has-reviewed` — Auth required

Check whether the current user has already reviewed a booking.

**Query params:** `bookingId` (required).

**Response `200`:** `{ "hasReviewed": true }`

---

### Health — `/health`

#### `GET /health`

Liveness probe. Always returns 200 while the process is alive.

**Response `200`:** `{ "status": "ok", "ts": "2024-01-15T10:00:00Z" }`

---

#### `GET /health/ready`

Readiness probe. Executes `SELECT 1` against the database.

**Response `200`:** `{ "status": "ok", "db": "ok", "ts": "..." }`
**Response `503`:** `{ "status": "degraded", "db": "error", "ts": "..." }`

---

### WebSocket — `/realtime`

Connect with:
```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:4000/realtime', {
  auth: { token: '<accessToken>' },
  transports: ['websocket'],
});
```

#### Client → Server events

| Event | Payload | Notes |
|---|---|---|
| `booking:subscribe` | `{ bookingId: string }` | Join booking room |
| `booking:unsubscribe` | `{ bookingId: string }` | Leave booking room |
| `driver:location` | `{ bookingId, lat, lng, speedKmh?, heading? }` | Driver GPS push (driver only) |

#### Server → Client events

| Event | Payload | Notes |
|---|---|---|
| `booking:status` | `{ bookingId, status, at, cancelledBy?, reason? }` | Status machine transition |
| `booking:driver_location` | `{ bookingId, lat, lng, speedKmh, heading, at }` | Live GPS (every ~2 s) |
| `booking:matched` | `{ bookingId, driver, truck?, acceptedAt }` | Instant match assigned |
| `booking:new_request` | Full booking summary | Broadcast to nearby drivers |
| `booking:no_drivers` | `{ bookingId, message? }` | No drivers found |
| `booking:bid_received` | `{ bookingId, bid }` | New bid arrived (customer) |
| `booking:bid_accepted` | `{ bookingId, bidId }` | |
| `booking:bid_rejected` | `{ bookingId, bidId }` | |
| `booking:bid_withdrawn` | `{ bookingId, bidId }` | |

---

## 4. Setup Instructions

### Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20 LTS |
| npm | 10 |
| PostgreSQL | 15 (or Docker) |
| Docker + Compose | Optional but recommended |

---

### Option A — Docker (recommended)

```bash
# 1. Clone the repo
git clone <repo-url>
cd transpolink

# 2. Copy and edit environment files
cp transpolink-api/.env.example transpolink-api/.env
cp transpolink-web/.env.example transpolink-web/.env.local
# Edit both files — see §4.3 for required variables

# 3. Start the full stack (Postgres + API + Web)
docker compose up --build

# First run takes ~2 minutes to build all images
# API:  http://localhost:4000/api/v1
# Web:  http://localhost:3000
# Docs: http://localhost:4000/api/v1/docs
```

The `api` service runs `prisma migrate dev` on startup in development. The database is persisted in a named Docker volume `pgdata`.

---

### Option B — Local (manual)

#### 1. Database

```bash
createdb transpolink
# Or via psql:
psql -c "CREATE DATABASE transpolink;"
```

#### 2. API

```bash
cd transpolink-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and generate JWT secrets (see below)

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start dev server (hot-reload)
npm run start:dev
```

The API starts at `http://localhost:4000`.

#### 3. Web

```bash
cd transpolink-web

npm install

cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL, NEXT_PUBLIC_API_WS_URL, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

npm run dev
```

The web app starts at `http://localhost:3000`.

---

### 4.3 Environment Variables

#### API — `transpolink-api/.env`

```bash
# Runtime
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:3000
BODY_LIMIT=1mb

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transpolink?schema=public

# JWT — generate with: openssl rand -hex 32
JWT_ACCESS_SECRET=<min-32-chars-unique-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=<min-32-chars-different-secret>
JWT_REFRESH_EXPIRES=7d

# Security
BCRYPT_ROUNDS=12

# Rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

#### Web — `transpolink-web/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_API_WS_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-google-maps-key>
```

> To obtain a Google Maps API key: enable **Maps JavaScript API**, **Directions API**, and **Distance Matrix API** in the [GCP Console](https://console.cloud.google.com/apis). Restrict the key to `localhost` for development and to your production domain for production.

---

### 4.4 Useful Development Commands

```bash
# API
npm run start:dev          # Hot-reload dev server
npx prisma studio          # Visual DB browser at localhost:5555
npx prisma migrate dev     # Create + apply a new migration
npm run test               # Unit tests
npm run test:e2e           # End-to-end tests
npm run lint               # ESLint + fix

# Web
npm run dev                # Next.js dev server
npm run typecheck          # TypeScript check (no emit)
npm run lint               # ESLint
npm run build              # Production build
```

---

## 5. Deployment Guide

See [DEPLOY.md](./DEPLOY.md) for the complete pre-deploy checklist, environment variable reference, rollback steps, and post-deploy verification procedures.

### Quick reference

#### 1. Generate secrets

```bash
openssl rand -hex 32   # Run twice — one for JWT_ACCESS_SECRET, one for JWT_REFRESH_SECRET
```

#### 2. Prepare production environment files

**`transpolink-api/.env.production`**
```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/transpolink
JWT_ACCESS_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
CORS_ORIGIN=https://app.transpolink.com
BCRYPT_ROUNDS=12
```

**`transpolink-web/.env.production`**
```bash
NEXT_PUBLIC_API_URL=https://api.transpolink.com/api/v1
NEXT_PUBLIC_API_WS_URL=https://api.transpolink.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<restricted-key>
```

#### 3. Build and start

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

#### Docker services (production)

| Service | Image | Role |
|---|---|---|
| `migrate` | API builder | One-shot `prisma migrate deploy` — exits 0 on success |
| `api` | API runner (non-root, node:20-alpine) | Starts only after `migrate` succeeds |
| `web` | Web runner (non-root, node:20-alpine) | Starts only after `api` is healthy |

#### 4. Verify deployment

```bash
# Liveness
curl -sf https://api.transpolink.com/api/v1/health

# Readiness (tests DB)
curl -sf https://api.transpolink.com/api/v1/health/ready
```

#### Multi-stage Docker build summary

**API image stages:**
1. `deps` — `npm ci --omit=dev` (production deps only)
2. `builder` — `npm ci`, `prisma generate`, `nest build`
3. `runner` — copies `dist/`, `.prisma/`, `node_modules/` from previous stages; non-root user; `HEALTHCHECK wget /health`

**Web image stages:**
1. `deps` — `npm ci`
2. `builder` — accepts `NEXT_PUBLIC_*` as `ARG`/`ENV`, runs `npm run build` (bakes vars into JS bundle)
3. `runner` — copies `.next/standalone/`, `.next/static/`, `public/`; non-root user; requires `output: 'standalone'` in `next.config.mjs`

#### Reverse proxy (nginx / Caddy recommendation)

- Terminate TLS at the proxy layer.
- Forward `/api/*` and WebSocket upgrades to `api:4000`.
- Forward all other traffic to `web:3000`.
- Set `X-Forwarded-Proto`, `X-Real-IP` headers.
- Enable HTTP/2.

---

## 6. Feature List

### Authentication & Accounts

- Email + password registration with role selection (customer / driver)
- JWT access tokens (15-minute lifetime) with rotating refresh tokens (7-day lifetime)
- Refresh tokens hashed with SHA-256 before storage — raw token never persisted
- Brute-force protection: per-email lockout after 5 failed logins (15-minute window)
- Constant-time password comparison prevents email enumeration via timing
- Logout revokes all refresh tokens

### Booking Lifecycle

- **Instant booking** — real-time broadcast to nearby online drivers; first accept wins
- **Bidding booking** — open bid window; customer reviews and accepts a driver's price
- **Scheduled booking** — triggers like instant at a future `scheduledAt` timestamp
- Full status machine: `pending` → `accepted` → `arrived` → `in_progress` → `completed` / `cancelled`
- Booking cancellation with optional reason at any pre-completion stage
- Vehicle type matching on accept (driver's truck type must match booking requirement)
- Auto-resolve primary truck when driver does not specify one on accept

### Driver Management

- Driver onboarding with licence and CNIC document upload
- Availability toggle (online / offline / on-trip)
- Truck fleet management (create, update, delete multiple vehicles)
- Primary truck designation per driver
- Nearby driver search with ~1 km position fuzzing for customer-visible privacy

### Real-Time GPS Tracking

- Socket.io `/realtime` namespace authenticated with JWT handshake
- Room-based subscriptions: per-user, per-driver, per-booking
- GPS broadcast deduplication: skip emit if driver moved < 10 m AND < 2 s since last broadcast
- Server-side write throttle: TripLocation row written at most every 3 seconds
- Client-side 60 fps dead-reckoning animation between GPS fixes
- Automatic GPS interval calibration using exponential moving average
- Signal-loss detection: stale flag raised if no update for 8 seconds
- Full GPS breadcrumb trail stored and queryable via `GET /bookings/:id/locations`

### Bidding System

- Multiple drivers can bid simultaneously on a single booking
- Bid expiry (configurable per bid, default 5 minutes)
- Bid ceiling: amount cannot exceed 10× `estimatedFare`
- Bid withdraw before acceptance
- Customer acceptance closes bidding; all other bids auto-rejected
- Real-time bid events pushed to customer as they arrive

### Reviews & Ratings

- Post-trip reviews from both parties (customer ↔ driver)
- 1–5 star score with optional comment
- Duplicate review prevention (one review per booking per reviewer)
- Driver rating average maintained on the `Driver` row

### Security Hardening

- Helmet HTTP headers (HSTS, XSS protection, no-sniff, frame denial)
- Global rate limiting (100 req / 60 s) with tighter per-endpoint overrides
- Wildcard CORS blocked at startup in production
- Body size limit (default 1 MB) prevents oversized payload attacks
- Input validation whitelist on all DTOs — unknown fields rejected
- Field-level length limits (address ≤ 500, description ≤ 1000, name ≤ 100)
- Swagger hidden in production

### Performance Optimisations

- Composite DB indexes on frequently filtered columns
- WebSocket broadcast deduplication reduces unnecessary network traffic
- Frontend exponential backoff on API polling errors (cap 60 s)
- `useMemo` for derived booking stats (single-pass reduce)
- O(n) sorted insertion for bid lists instead of full re-sort on each event
- ETA hook uses refs (not state) for origin/destination to avoid effect restarts
- `NEXT_PUBLIC_*` env vars baked at build time — no runtime config server needed

### Production Readiness

- Multi-stage Docker builds (API and web) — lean runner images with non-root users
- One-shot DB migration container before API starts
- Docker Compose for both development and production stacks
- Startup environment validation — required variables and placeholder detection fail fast
- DB connection retry on startup (5 attempts × 5 s delay)
- Structured logging via NestJS Logger (replaces `console.*`)
- `unhandledRejection` + `uncaughtException` handlers with proper Logger output
- `uncaughtException` calls `process.exit(1)` to allow process manager restart
- Graceful shutdown hooks (`enableShutdownHooks`)
- Health endpoints: `/health` (liveness) and `/health/ready` (readiness with DB check)
- `X-Powered-By` header removed from web responses (`poweredByHeader: false`)
- Brotli/gzip compression enabled on Next.js (`compress: true`)
- `output: 'standalone'` for lean Docker web image

---

## 7. Future Improvements Roadmap

### High Priority

#### Payment Processing
Integrate a payment gateway (Stripe or a local provider) to handle the `Payment` model that is already fully modelled in the schema. The flow would be: authorise on booking creation → capture on `completed` → partial/full refund on `cancelled`. The `Payment` model already has `providerIntentId`, `providerChargeId`, `commission`, and `driverPayout` fields ready.

#### Push Notifications
Add Firebase Cloud Messaging (FCM) or APNs for native mobile push. Useful for: new booking requests (driver), booking status changes (customer), bid accepted/rejected. The WebSocket events already fire the right data — a notification fan-out service consuming those events would be straightforward.

#### Email Notifications
Transactional emails via SendGrid or AWS SES for: account verification, booking confirmation, trip completion receipts, password reset.

#### Admin Dashboard
A protected `/admin` section with:
- User management (suspend, reinstate, delete)
- Driver document verification (approve / reject licence/CNIC)
- Booking oversight and manual intervention
- Revenue and commission reporting
- System health overview

---

### Medium Priority

#### Refresh Token Rotation Family Tracking
Currently refresh tokens are rotated on each use but there is no family/lineage tracking. Adding a `family` column to `RefreshToken` would allow detecting token reuse (where a revoked token is replayed), which indicates token theft — the entire family can then be invalidated.

#### Scheduled Booking Dispatcher
The `scheduled` booking type is modelled but needs a background job (Bull queue / pg_cron) to trigger the instant-matching broadcast at `scheduledAt`. A simple cron that queries `WHERE bookingType = 'scheduled' AND status = 'pending' AND scheduledAt <= now()` every minute would suffice.

#### Driver Document Verification Workflow
The `docStatus` field on `Driver` (`pending` / `approved` / `rejected`) is in the schema but a full admin review flow — with rejection reasons, re-submission, and email notification — is not yet implemented.

#### Subscription / Commission Model
The `isSubscribed` and `subscriptionUntil` fields on `Driver` are present but unused. A subscription tier could reduce the platform commission rate, incentivising driver retention.

#### Cancellation Penalties
Track cancellation counts per user. After a threshold (e.g. 3 cancellations in 30 days) apply a fee or temporary booking restriction.

---

### Lower Priority

#### WebSocket Horizontal Scaling
The current Socket.io setup works for a single API instance. For multi-instance deployments (load balancer in front of multiple API containers) a Redis adapter (`@socket.io/redis-adapter`) is needed so events emitted by one instance are broadcast to clients connected to other instances.

#### Refresh Token Storage Migration
Refresh tokens are currently stored in PostgreSQL. For high-traffic scenarios, migrating to Redis (with TTL-based expiry) would reduce DB write load and enable instant token invalidation without a table scan.

#### Trip Fare Estimation
The `estimatedFare`, `distanceKm`, and `durationMinutes` fields are stored on `Booking` but the calculation logic (Google Maps Distance Matrix → fare formula) is not fully wired. A `POST /bookings/estimate` endpoint would let customers see a price before booking.

#### Driver Earnings Analytics
Build on the existing `totalEarnings` and `totalTrips` driver fields with time-series breakdowns (daily, weekly, monthly) and a dedicated driver earnings page.

#### Mobile Apps
The backend API and WebSocket layer are designed to be client-agnostic. A React Native app (sharing types and API client code from the web package) would be a natural extension.

#### Internationalization (i18n)
Add `next-intl` or a similar library for multi-language support. Karachi is a multilingual market — Urdu and English are the minimum viable languages.

#### End-to-End Tests
Add Playwright tests covering the critical paths: registration, booking creation, driver accept, live tracking, and trip completion. The API already has an e2e test configuration (`jest-e2e.json`) ready to be populated.

#### Observability
Add structured JSON logging (Pino), distributed tracing (OpenTelemetry), and metrics export (Prometheus). The NestJS Logger is already in place as the foundation — replacing it with Pino would add log levels and JSON output suitable for log aggregation (Loki, Datadog, etc.).
