# TranspoLink — Post-Hackathon Roadmap

> What it takes to go from hackathon beta → shippable product.
> Grouped by theme. Items are roughly priority-ordered within each section.

---

## 1. Security (must fix before any real users)

| Item | Why | Effort |
|------|-----|--------|
| Move JWT tokens from localStorage to HTTP-only cookies | localStorage is XSS-readable; cookies with `HttpOnly` + `SameSite=Strict` are not | M |
| Implement refresh token rotation + server-side revocation | Current refresh tokens are unrevokable — theft = permanent access until expiry | M |
| Add Content-Security-Policy header | Prevents XSS injection that could steal localStorage tokens today | S |
| Rate-limit per user (not just per IP) | IP-based throttling is easily bypassed with rotating IPs; add `userId` dimension | S |
| Audit `CORS_ORIGIN` for all environments | Currently a single string; needs per-environment list with no wildcard | S |
| Add Helmet.js security headers (already imported, verify config) | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS | S |
| Penetration test the booking state machine | Manually verify every state transition rejects unauthorised role + ownership combinations | M |

---

## 2. Database & scalability

| Item | Why | Effort |
|------|-----|--------|
| Enable PostGIS extension; replace haversine SQL with `ST_DWithin` + spatial index | Current haversine does a full `drivers` table scan per booking — breaks at ~10 000 online drivers | L |
| Add database connection pooling (PgBouncer or Prisma Accelerate) | NestJS opens one connection per module instance; under load this exhausts PostgreSQL's connection limit | M |
| Index `bookings(status, createdAt)` and `drivers(isOnline, latitude, longitude)` | Most-hit query paths have no covering index today | S |
| Add soft-delete pattern to bookings (set `deletedAt`, never hard-delete) | Needed for dispute resolution and driver earnings history | S |
| Store driver GPS history (time-series, TTL 30 days) | Needed for trip replay, ETA accuracy improvement, and dispute evidence | L |
| Backup strategy | Railway's managed PostgreSQL has point-in-time recovery — verify it's enabled and tested | S |

---

## 3. Features (next sprint)

| Item | Why | Effort |
|------|-----|--------|
| In-app driver ↔ customer messaging | Current product forces WhatsApp fallback once booking is accepted | L |
| Push notifications (PWA / FCM) | Drivers miss booking requests when browser tab is in background | L |
| Payment integration (JazzCash / Easypaisa) | Cash on delivery is unverifiable; digital payment enables chargebacks and driver payouts | XL |
| Driver earnings dashboard | Drivers have no visibility into weekly income — highest-requested feature in user interviews | M |
| Customer saved addresses | Power users rebook same routes; remove re-typing friction | S |
| Surge pricing signal | Show customers "high demand" badge and optional +20% fare for priority matching | M |
| Admin dispute resolution UI | Currently disputes require direct database intervention | M |
| Cancel penalty / no-show flow | Prevent customers from cancelling after driver is en route without consequence | M |
| Truck photo verification | Admin-gated upload + approval before driver can go online | M |
| Multi-city support | Matching radius is currently hardcoded to 5 km; needs configurable per-city dispatch zones | L |

---

## 4. Quality & testing

| Item | Why | Effort |
|------|-----|--------|
| CI pipeline (GitHub Actions) runs `npm test` + `npm run test:e2e` on every PR | Currently only runs locally | S |
| Frontend Playwright e2e tests | API is tested; the browser flows (booking, tracking, rating) have no automated coverage | L |
| Load test the WebSocket gateway | Unknown how many concurrent `location:update` events the single gateway instance handles | M |
| Visual regression tests for map components | `TrackingMap` and `BookingMap` are purely visual — screenshot diffing catches regressions | M |
| Contract tests between frontend `lib/api/*.ts` and API controllers | Prevent silent breaking changes when API responses change | M |

---

## 5. Observability & ops

| Item | Why | Effort |
|------|-----|--------|
| Structured logging (replace `Logger.log` with JSON fields) | Needed for log aggregation (Datadog, Loki) — plain strings are unsearchable at scale | M |
| Error tracking (Sentry) on both API and web | PostHog tracks product events; Sentry tracks crashes and exceptions | S |
| Uptime monitoring + alerting (Better Uptime / UptimeRobot on `/api/v1/health`) | No alert today if the API goes down between Railway deploys | S |
| Railway metrics dashboard review | Memory, CPU, and response time baselines need to be established before go-live | S |
| On-call runbook | Document how to restart, roll back, and restore from backup | M |

---

## 6. Mobile

| Item | Why | Effort |
|------|-----|--------|
| PWA manifest + service worker | Enables "Add to Home Screen" on iOS/Android; no App Store needed for beta | M |
| React Native driver app | Browser GPS is 50–150 m accurate; native GPS is 5–15 m; driver UX needs haptics and background tracking | XL |
| Deep links for booking confirmation | SMS / WhatsApp link takes driver directly to the right booking screen | S |

---

## Effort key
- **S** — 1–2 days
- **M** — 3–5 days  
- **L** — 1–2 weeks
- **XL** — 2+ weeks / separate sprint

---

## Suggested sprint order for beta → v1.0

**Sprint 1 (Week 1–2): Security hardening + CI**
HTTP-only cookies, refresh token rotation, CSP, GitHub Actions CI, Sentry.

**Sprint 2 (Week 3–4): Database + scalability**
PostGIS spatial index, PgBouncer, GPS history table, missing DB indexes.

**Sprint 3 (Week 5–6): Core missing features**
Push notifications, driver earnings dashboard, cancel penalty flow, admin dispute UI.

**Sprint 4 (Week 7–8): Payments**
JazzCash / Easypaisa integration, driver payout schedule, receipt generation.

**Sprint 5+: Mobile**
PWA hardening → React Native driver app.
