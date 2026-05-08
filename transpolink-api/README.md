# TranspoLink API

NestJS backend for the on-demand truck booking platform.

## Stack

- **NestJS 10** (modular monolith)
- **PostgreSQL** + **Prisma**
- **JWT** access + rotating refresh tokens
- **Socket.io** for real-time tracking
- **class-validator**, **helmet**, **throttler**

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# edit DATABASE_URL and JWT secrets

# 3. Migrate + generate client
npm run prisma:migrate -- --name init
npm run prisma:generate

# 4. Seed demo accounts
npm run db:seed

# 5. Run
npm run start:dev
```

API available at `http://localhost:4000/api/v1`
Swagger UI at `http://localhost:4000/api/v1/docs`

## Demo credentials (after `db:seed`)

| Role     | Email                          | Password        |
|----------|--------------------------------|-----------------|
| admin    | admin@transpolink.dev          | Admin@2025      |
| customer | customer@transpolink.dev       | Customer@2025   |
| driver   | driver@transpolink.dev         | Driver@2025     |

## Folder structure

```
transpolink-api/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── common/
│   │   ├── decorators/      (Public, Roles, CurrentUser)
│   │   ├── guards/          (JwtAuthGuard, RolesGuard)
│   │   └── filters/         (HttpExceptionFilter)
│   └── modules/
│       ├── auth/            (register, login, refresh, logout)
│       ├── users/           (GET /users/me)
│       ├── drivers/         (availability, location, nearby)
│       ├── trucks/          (CRUD)
│       ├── bookings/        (CRUD + lifecycle transitions)
│       └── tracking/        (Socket.io gateway @ /realtime)
└── .env.example
```

## Auth flow

1. `POST /auth/register` or `/auth/login` → `{ accessToken, refreshToken, user }`
2. Send `Authorization: Bearer <accessToken>` on every protected request
3. When `accessToken` expires, call `POST /auth/refresh` with the stored refresh token
4. `POST /auth/logout` revokes all active refresh tokens for the user

`JwtAuthGuard` and `RolesGuard` are registered as global `APP_GUARD`s. Mark public routes with `@Public()` and gate by role with `@Roles(UserRole.driver, …)`.

## Booking lifecycle

```
pending → matched → accepted → arrived → in_progress → completed
              │          │          │           │
              └──────────┴──────────┴───────────┴── cancelled
```

Illegal transitions are rejected by `BookingsService.assertTransition`.

| Action       | Endpoint                          | Role                         |
|--------------|-----------------------------------|------------------------------|
| Create       | `POST /bookings`                  | customer                     |
| List mine    | `GET /bookings`                   | customer / driver / admin    |
| Detail       | `GET /bookings/:id`               | participants + admin         |
| Accept       | `PATCH /bookings/:id/accept`      | driver                       |
| Arrive       | `PATCH /bookings/:id/arrive`      | driver (assigned)            |
| Start        | `PATCH /bookings/:id/start`       | driver (assigned)            |
| Complete     | `PATCH /bookings/:id/complete`    | driver (assigned)            |
| Cancel       | `PATCH /bookings/:id/cancel`      | participants + admin         |

## Realtime tracking — Socket.io

Connect to `ws://localhost:4000/realtime` with the JWT in the handshake:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:4000/realtime', {
  auth: { token: accessToken },
});
```

| Event (client → server) | Payload                                   | Notes                            |
|-------------------------|-------------------------------------------|----------------------------------|
| `booking:subscribe`     | `{ bookingId }`                           | Join the booking room            |
| `driver:location`       | `{ bookingId, lat, lng, speedKmh? }`      | Driver pushes GPS (~3s cadence)  |

| Event (server → client)    | Payload                                         |
|----------------------------|-------------------------------------------------|
| `booking:driver_location`  | `{ bookingId, lat, lng, at }`                   |
| `booking:status`           | `{ bookingId, status }`                         |

Authorisation is enforced in the gateway: only the assigned driver, the booking customer, or admin may join a booking's room.

## Scaling notes

- Add the **Socket.io Redis adapter** before running multiple gateway pods.
- Move driver discovery off Postgres (`drivers/nearby`) onto **Redis GEO** (`GEOADD drivers:online <lng> <lat> <driverId>`) — current Haversine query is for development.
- High-volume GPS pings should write to a dedicated `trip_locations` table partitioned by day, or to TimescaleDB / Influx, not the `drivers` row.
- Replace the mocked fare math (`BASE_FARE + km*PER_KM + min*PER_MIN`) with Google Distance Matrix for real estimates.
