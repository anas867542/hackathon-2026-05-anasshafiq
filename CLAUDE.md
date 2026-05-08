# TranspoLink

## Stack
- Language: TypeScript 5.4
- API framework: NestJS 10
- DB ORM: Prisma 5 (PostgreSQL 16)
- Web framework: Next.js 14 App Router
- CSS: Tailwind CSS 3
- Real-time: Socket.io 4
- Package manager: npm
- Runtime: Node 20
- Maps: Google Maps JS SDK (tiles only — `@react-google-maps/api`)
- Routing: OSRM public API (`router.project-osrm.org`)
- Geocoding: Nominatim / OpenStreetMap

## Architecture (1 paragraph)
The API is a NestJS monolith with one module per domain (`auth`, `bookings`, `bidding`, `drivers`, `reviews`, `tracking`, `trucks`, `users`). The web app is Next.js 14 App Router with two route groups: `(customer)` and `(driver)`. The real-time layer runs through a single Socket.io gateway (`tracking.gateway.ts`): drivers join a room named `driver:{id}` on connect; the booking service emits `booking:new_request` to matched driver rooms via `notifyDrivers`; drivers stream GPS via `location:update`; customers receive `driver:location` events. Map routing uses OSRM (free); all geocoding uses Nominatim (free). The 5 most important files are: `matching.service.ts`, `tracking.gateway.ts`, `useDriverInbox.ts`, `TrackingMap.tsx`, `BookingForm.tsx`.

## Directory map

```
transpolink-api/src/
  modules/auth/           JWT login, refresh, guards
  modules/bookings/       CRUD + state machine + matching.service.ts
  modules/bidding/        Offer create/accept/expire
  modules/drivers/        Profile, online/offline toggle, truck activation
  modules/reviews/        Post-trip ratings
  modules/tracking/       tracking.gateway.ts — all WebSocket logic
  modules/trucks/         Vehicle type catalogue
  modules/users/          Customer profiles

transpolink-web/src/
  app/(auth)/             Login / register pages
  app/(customer)/         /book, /book/[id] tracking page
  app/(driver)/           /driver/dashboard, /driver/inbox, /driver/trip/[id]
  components/booking/     BookingForm, FareEstimate, TruckTypeSelector, BookingTypeSelector, RatingModal
  components/map/         BookingMap, TrackingMap, PlaceAutocompleteInput
  components/ui/          Button, Card, Badge, BottomSheet, Skeleton, Input, Textarea, StatusBadge
  hooks/                  useDriverTracking, useDriverInbox, useCustomerTracking, useNearbyDrivers, useAuth, useDriverTripStatus
  lib/api/                bookings.ts, reviews.ts, client.ts (typed fetch wrapper)
  lib/auth/               session.ts (localStorage token management)
  lib/maps/               loader.ts (Google Maps JS SDK loader)
  lib/booking/            phase.ts (booking status → UI phase mapping)
```

## Conventions

### API
- Each module = `<name>.service.ts` + `<name>.controller.ts` + optional `<name>.gateway.ts`
- DB access only inside service files. Controllers call services; never call Prisma from a controller.
- Throw typed NestJS exceptions (`NotFoundException`, `ForbiddenException`, etc.). Never throw raw strings.
- Guards: `JwtAuthGuard` for all authenticated routes; `RolesGuard` with `@Roles('customer' | 'driver' | 'admin')` for role-gated routes.
- Raw SQL only in `matching.service.ts` (haversine query requires it). Everywhere else use Prisma query builder.

### Web
- `'use client'` directive only on interactive components that need browser APIs or React state.
- Hooks in `src/hooks/use<PascalName>.ts`. No business logic in page components.
- All API calls go through `src/lib/api/<domain>.ts` using the typed `client.ts` wrapper. Never call `fetch` directly in components.
- Tailwind only — no inline styles, no CSS modules, no styled-components.
- Named exports only in component files. No default exports in `components/` or `hooks/`.

### Maps
- All road routing: OSRM (`router.project-osrm.org`). Never call `google.maps.DirectionsService`.
- All geocoding: Nominatim. Never call `google.maps.Geocoder` or Google Places API.
- Google Maps key is for tile rendering only.

### Naming
- DB tables: snake_case, plural (`bookings`, `driver_locations`, `truck_types`)
- TypeScript: PascalCase for types/interfaces/classes; camelCase for variables/functions
- API routes: kebab-case (`/bookings/:id/accept`)
- Enum values: snake_case strings (`'mini_truck'`, `'in_progress'`)

## Build / test / deploy commands

```bash
# API
npm install            # install
npm run start:dev      # dev server (hot reload)
npm run build          # production build
npm run test           # Jest unit tests
npm run test:e2e       # end-to-end tests
npx prisma migrate dev # apply pending migrations
npx prisma studio      # DB GUI

# Web
npm install            # install
npm run dev            # dev server
npm run build          # production build
npm run lint           # ESLint
npm run type-check     # tsc --noEmit
```

## Things to NEVER do

- Never call `google.maps.DirectionsService` — it requires billing. Use OSRM.
- Never call `google.maps.Geocoder` or Google Places API — use Nominatim.
- Never write raw SQL outside `matching.service.ts`. Use Prisma.
- Never bypass the service layer from a controller (no `this.prisma` in controllers).
- Never commit secrets. Use `.env` / `.env.local` (both gitignored).
- Never use `any` in business logic. Use `unknown` and narrow, or define a proper type.
- Never call `console.log` in production paths. Use NestJS `Logger` in the API.
- Never skip pre-commit hooks with `--no-verify`.

## Open questions / known weirdness

- `src/app/(auth)/login/page.tsx`: TypeScript reports a `RouteImpl` typedRoutes error. This is a framework-level issue with Next.js 14 typedRoutes — do not attempt to fix, it does not affect runtime.
- `src/hooks/useNearbyDrivers.ts`: `NearbyDriversQuery` index signature TS error — pre-existing, leave alone.
- OSRM coordinate order: OSRM expects `lng,lat` (not `lat,lng`). All OSRM calls in this codebase pass `${lng},${lat}` — this is correct and intentional.
- `MAX_ACCURACY_M = 150` in `useDriverTracking.ts`: Desktop browsers report GPS accuracy of 50–150 m. 150 m threshold is intentionally permissive to allow desktop demo. Tighten to 40 m for production mobile-only use.

## Useful sub-files

- `transpolink-api/prisma/schema.prisma` — full data model (all entities, relations, enums)
- `transpolink-api/src/modules/bookings/matching.service.ts` — driver dispatch haversine SQL
- `transpolink-api/src/modules/tracking/tracking.gateway.ts` — all WebSocket room and event logic
- `transpolink-web/src/components/map/TrackingMap.tsx` — live GPS tracking map with OSRM routes
- `transpolink-web/src/lib/api/client.ts` — typed fetch wrapper (handles auth headers + error parsing)
