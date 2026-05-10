// TC-PERF-002 / TC-PERF-004 — Driver "available" poll under load
// Run: k6 run -e API=http://localhost:4000/api/v1 -e DRIVERS=100 perf/available-poll.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API || 'http://localhost:4000/api/v1';
const DRIVERS = parseInt(__ENV.DRIVERS || '100', 10);

export const options = {
  scenarios: {
    available_poll: {
      executor: 'constant-vus',
      vus: DRIVERS,
      duration: '60s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<250'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const tokens = [];
  for (let i = 0; i < DRIVERS; i++) {
    const id = `${Date.now()}-${i}`;
    const reg = http.post(
      `${API}/auth/register`,
      JSON.stringify({
        email: `perfd${id}@test.local`,
        phone: `+9230${String(1000000000 + i).slice(-9)}`,
        password: 'PerfPass1234A',
        fullName: `Perf Driver ${i}`,
        role: 'driver',
        licenseNumber: `LIC-PERF-${id}`,
        licenseExpiry: '2030-01-01',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    const t = reg.json('accessToken');
    if (t) {
      http.patch(
        `${API}/drivers/me/availability`,
        JSON.stringify({ status: 'online', lat: 24.8607, lng: 67.0011 }),
        {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        },
      );
      tokens.push(t);
    }
  }
  return { tokens };
}

export default function (data) {
  const t = data.tokens[(__VU - 1) % data.tokens.length];
  if (!t) return;
  const res = http.get(`${API}/bookings/available`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(5);
}
