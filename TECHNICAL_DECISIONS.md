# TranspoLink — Technical Decisions

> ADR-style log of every significant architectural or tooling choice made during the hackathon.
> Format: **Decision → Alternatives considered → Why we chose this → Trade-offs accepted**.

---

## TD-001: OSRM for road routing (not Google Maps Directions API)

**Decision:** All road routing — booking map preview and live tracking route line — uses the OSRM public API (`router.project-osrm.org`).

**Alternatives considered:**
- Google Maps Directions API (billing required, ~$5 / 1 000 requests)
- Mapbox Directions API (free tier limited to 100 000 requests/month, requires key)
- GraphHopper (self-hosted option too heavy for hackathon)

**Why OSRM:** Zero cost, no API key, no billing setup, globally hosted, returns GeoJSON polyline in one HTTP call. The public instance handles demo-scale traffic fine.

**Trade-offs accepted:** Public OSRM instance has no SLA. Under sustained load it may rate-limit or go offline. Mitigation: both `BookingMap` and `TrackingMap` fall back to a straight-line connector if OSRM fails — the app stays functional, just less precise.

---

## TD-002: Nominatim / OpenStreetMap for geocoding (not Google Places)

**Decision:** Address search and reverse geocoding use Nominatim (`nominatim.openstreetmap.org`).

**Alternatives considered:**
- Google Places Autocomplete API (requires billing)
- Mapbox Geocoding API (requires key, rate-limited free tier)
- Algolia Places (deprecated)

**Why Nominatim:** Free, no key, good coverage of Pakistani cities. 400 ms debounce in `PlaceAutocompleteInput` keeps request rate under the 1 req/s Nominatim policy.

**Trade-offs accepted:** Nominatim results for informal Pakistani addresses (no house numbers, colloquial area names) can be less precise than Google's local-knowledge dataset. Acceptable for MVP — users can drag the map pin.

---

## TD-003: Google Maps JS SDK for tile rendering only

**Decision:** `@react-google-maps/api` is used solely as the tile renderer. The SDK's `DirectionsService`, `Geocoder`, and `PlacesService` are explicitly never called.

**Why:** Google Maps tiles do not require billing to be enabled — only the paid sub-APIs do. This gives us a polished map UI at zero cost.

**Trade-offs accepted:** Requires team discipline to not accidentally call paid sub-APIs. Enforced via `CLAUDE.md` "Things to NEVER do" list.

---

## TD-004: NestJS monolith (not microservices)

**Decision:** Single NestJS application with one module per domain.

**Alternatives considered:**
- Separate microservices per domain (auth, bookings, tracking)
- Serverless functions (Vercel Edge, AWS Lambda)

**Why monolith:** Hackathon time constraint — microservices add deployment complexity that doesn't pay off at this scale. A single NestJS deploy is debuggable in one log stream. Module boundaries are clean enough to extract later.

**Trade-offs accepted:** Single point of failure; horizontal scaling requires sticky sessions for Socket.io. Acceptable for MVP — Railway can scale the instance vertically.

---

## TD-005: Socket.io over raw WebSocket

**Decision:** Real-time layer uses Socket.io 4 (via `@nestjs/platform-socket.io`).

**Alternatives considered:**
- Raw WebSocket (`ws` library)
- Server-Sent Events (unidirectional, not suitable for bi-directional GPS streaming)
- Polling (too high latency for live tracking)

**Why Socket.io:** Room abstraction (`driver:{id}`) makes selective broadcast trivial. Auto-reconnect and fallback transports (long-polling) handle flaky mobile connections. NestJS has a first-class Socket.io gateway adapter.

**Trade-offs accepted:** ~30 KB client bundle overhead vs raw WS. Room-based fan-out requires all instances to share state (Redis adapter) at scale — not needed for MVP.

---

## TD-006: JWT access + refresh token pair (not sessions)

**Decision:** Auth uses short-lived JWT access tokens (15 min) + long-lived refresh tokens (7 days) stored in localStorage.

**Alternatives considered:**
- HTTP-only cookie sessions (better XSS protection, harder to use with mobile later)
- Single long-lived JWT (simpler but unrevokable)
- OAuth-only (adds third-party dependency)

**Why JWT pair:** Stateless API (no session store needed), easy to extend to React Native later, refresh pattern limits blast radius of token theft. Google OAuth is also supported as an alternative login path.

**Trade-offs accepted:** Tokens in localStorage are vulnerable to XSS — mitigated by strict Content-Security-Policy (not yet enforced, flagged as post-MVP work). Refresh tokens are not persisted server-side so cannot be individually revoked.

---

## TD-007: Prisma ORM (not TypeORM or raw SQL)

**Decision:** All database access goes through Prisma 5, except the haversine driver-matching query in `matching.service.ts`.

**Alternatives considered:**
- TypeORM (NestJS default in many tutorials)
- Knex (query builder only, no schema management)
- Raw SQL everywhere

**Why Prisma:** Schema-first (`schema.prisma` is the single source of truth), type-safe client generation, migration tooling. TypeORM's decorator-based entity definitions felt verbose for a hackathon.

**Trade-offs accepted:** Prisma's query builder cannot express `ST_Distance` / haversine. One raw SQL query is accepted in `matching.service.ts`. Everything else uses the Prisma client.

---

## TD-008: Railway for deployment (not Vercel + Render split)

**Decision:** Both API and web are deployed to Railway (same project).

**Alternatives considered:**
- Vercel (web) + Render (API) — different platforms, harder env var sharing
- Fly.io — excellent but Docker-only, slower to iterate
- AWS ECS — too much infra setup for a hackathon

**Why Railway:** One-click PostgreSQL, shared env vars across services in a project, Nixpacks auto-detects Node.js without a Dockerfile, deployment trigger via GitHub push. The entire infra is set up in under 10 minutes.

**Trade-offs accepted:** Railway trial plan has resource limits (512 MB RAM, shared CPU). Acceptable for demo load. Paid plan needed for production traffic.

---

## TD-009: Haversine SQL for driver matching (not PostGIS)

**Decision:** `matching.service.ts` uses a raw SQL haversine formula to find drivers within radius.

**Alternatives considered:**
- PostGIS `ST_DWithin` (accurate, indexed, but requires PostGIS extension)
- Application-side distance calculation (load all online drivers, filter in JS — does not scale)

**Why haversine SQL:** PostGIS is not available on Railway's managed PostgreSQL without a custom instance. Haversine is accurate to within ~0.3% for distances under 100 km — more than sufficient for a 5 km dispatch radius.

**Trade-offs accepted:** No spatial index — full table scan on `drivers` for every booking. At hundreds of online drivers this is fine; at tens of thousands it needs a PostGIS index or geohash bucketing.

---

## TD-010: PostHog for analytics (not Mixpanel, Amplitude, or Segment)

**Decision:** Client-side and server-side analytics via PostHog (`posthog-js` + `posthog-node`).

**Alternatives considered:**
- Mixpanel (good, but paid for volume; no open-source option)
- Amplitude (free tier limited, complex setup)
- Segment (pipeline layer, still needs a downstream destination)
- Custom event log to PostgreSQL (zero-dependency but no dashboards)

**Why PostHog:** Generous free tier (1 M events/month), open-source, self-hostable later, single SDK covers product analytics + session replay + feature flags. One project token covers both frontend and backend.

**Trade-offs accepted:** PostHog adds ~30 KB to the web bundle. `autocapture` is disabled — all events are explicit and typed via `useAnalytics()` hook to avoid noisy/unexpected data.
