// TC-PERF-001 — Booking creation latency
// Run: k6 run -e API=http://localhost:4000/api/v1 perf/booking-create.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API || 'http://localhost:4000/api/v1';

export const options = {
  scenarios: {
    booking_create: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 30,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

let token = null;

export function setup() {
  const i = Date.now();
  const reg = http.post(
    `${API}/auth/register`,
    JSON.stringify({
      email: `perf${i}@test.local`,
      phone: `+92305${String(1000000 + (i % 9999999)).slice(-7)}`,
      password: 'PerfPass1234A',
      fullName: 'Perf Customer',
      role: 'customer',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  return { token: reg.json('accessToken') };
}

export default function (data) {
  const res = http.post(
    `${API}/bookings`,
    JSON.stringify({
      vehicleType: 'mini_truck',
      pickup: { address: 'Karachi', lat: 24.8607, lng: 67.0011 },
      dropoff: { address: 'Karachi East', lat: 24.9056, lng: 67.0822 },
      bookingType: 'instant',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.token}`,
      },
    },
  );
  check(res, {
    'status 201': (r) => r.status === 201,
    'p95 < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(0.05);
}
