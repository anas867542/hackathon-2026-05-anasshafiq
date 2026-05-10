# Testing — TranspoLink

Phase 2 deliverable per [TEST_CASES.md](TEST_CASES.md). Maps every TC-* ID
in the master test case document to executable code.

## Layout

```
transpolink-api/test/
  jest-e2e.json                       # jest e2e config
  setup.ts                            # afterEach: resetDb()
  utils/app.ts                        # buildTestApp() — mirrors src/main.ts
  utils/db.ts                         # getPrisma() / resetDb() / disconnectDb()
  utils/factories.ts                  # registerCustomer / registerDriver / validBookingBody
  auth.e2e-spec.ts                    # TC-API-001..008 + TC-EDGE-001/003/004
  bookings.e2e-spec.ts                # TC-API-009..023 + TC-EDGE-007/009
  drivers-reviews-bidding.e2e-spec.ts # TC-API-024..028 + TC-EDGE-002

transpolink-web/
  playwright.config.ts                # chromium, geolocation Karachi, reuse server
  e2e/helpers/api.ts                  # registerCustomer / registerDriver / createBooking
  e2e/helpers/session.ts              # loginAs() — injects tl.* localStorage keys
  e2e/customer.spec.ts                # TC-CUST-001..026
  e2e/driver.spec.ts                  # TC-DRV-001..022
  e2e/admin.spec.ts                   # TC-ADM-001..016
  e2e/map-realtime.spec.ts            # TC-MAP-001..018
  e2e/edge-security.spec.ts           # TC-EDGE-002/005/006/010..014

perf/
  booking-create.js                   # TC-PERF-001  (k6)
  available-poll.js                   # TC-PERF-002 / 004  (k6)
  README.md                           # thresholds + run instructions

.github/workflows/test.yml            # CI: api-e2e then web-e2e
```

## Running locally

### Backend e2e

Requires a running Postgres and a `.env` with `DATABASE_URL` pointing at a
**dedicated test database** (the suite truncates all tables between specs).

```bash
cd transpolink-api
cp .env.example .env.test  # then edit DATABASE_URL → ..._test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transpolink_test \
  npx prisma migrate deploy
npm run test:e2e
```

### Web e2e (Playwright)

```bash
cd transpolink-web
npm install
npx playwright install chromium
# Make sure the API is running on :4000 and DB is migrated
API_URL=http://localhost:4000/api/v1 WEB_URL=http://localhost:3000 npm run test:e2e
```

`playwright.config.ts` will auto-spawn `npm run dev` on :3000 unless
`SKIP_WEBSERVER=1` is set (CI sets it because it pre-builds + starts).

### Performance (k6)

```bash
brew install k6   # or your platform equivalent
k6 run -e API=http://localhost:4000/api/v1 perf/booking-create.js
k6 run -e API=http://localhost:4000/api/v1 -e DRIVERS=100 perf/available-poll.js
```

## CI

`.github/workflows/test.yml` runs both suites on push/PR:
1. `api-e2e` — spins up Postgres service container, applies migrations,
   runs Jest e2e.
2. `web-e2e` — same Postgres, builds & boots API + Web, runs Playwright,
   uploads HTML report as artifact.

## Coverage matrix

| Section | Cases | File |
|---|---:|---|
| Customer | 26 | `transpolink-web/e2e/customer.spec.ts` |
| Driver | 22 | `transpolink-web/e2e/driver.spec.ts` |
| Admin | 16 | `transpolink-web/e2e/admin.spec.ts` |
| Backend APIs | 28 | `transpolink-api/test/*.e2e-spec.ts` |
| Map & Real-Time | 18 | `transpolink-web/e2e/map-realtime.spec.ts` |
| Edge / Security | 15 | mixed (api + `e2e/edge-security.spec.ts`) |
| Performance | 6 | `perf/*.js` + Playwright trace |
| **Total** | **131** | |

## Phase 3 / 4 (next)

- Phase 3: run all suites in CI; capture failures in `TEST_CASES.md` Status column.
- Phase 4: fix-loop until 100 % pass.
- Phase 5: edge / negative / security drills (most authored above; expand on real failures).
- Phase 6: keep CI green on every PR.
