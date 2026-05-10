# Performance test suite

Maps to **TC-PERF-001 .. TC-PERF-006** in `TEST_CASES.md`.

## Tooling
- [k6](https://k6.io) — HTTP load testing.
- Web LCP (TC-PERF-005/006) — measure with Lighthouse CI or Playwright trace.

## Running

```bash
# Booking creation latency  (TC-PERF-001)
k6 run -e API=http://localhost:4000/api/v1 perf/booking-create.js

# Driver availability poll under 100 VUs  (TC-PERF-002 / 004)
k6 run -e API=http://localhost:4000/api/v1 -e DRIVERS=100 perf/available-poll.js

# Web LCP — /book                            (TC-PERF-005)
npx playwright test e2e/customer.spec.ts --grep "TC-CUST-009" --trace=on

# Web LCP — /driver/dashboard                 (TC-PERF-006)
npx playwright test e2e/driver.spec.ts --grep "TC-DRV-002" --trace=on
```

## Thresholds (from TEST_CASES.md)
| Test | Metric | Threshold |
|------|--------|-----------|
| TC-PERF-001 | `http_req_duration` p95 | ≤ 500 ms |
| TC-PERF-002 | matching haversine query p95 | ≤ 200 ms |
| TC-PERF-003 | WS event delivery (driver→customer) | ≤ 300 ms |
| TC-PERF-004 | `/bookings/available` p95 @ 100 VUs | ≤ 250 ms |
| TC-PERF-005 | LCP `/book` | ≤ 2.5 s |
| TC-PERF-006 | LCP `/driver/dashboard` | ≤ 2.5 s |
