# TranspoLink — Deployment Checklist

## Pre-deploy

- [ ] Generate real JWT secrets (never use placeholder values):
  ```
  openssl rand -hex 32   # run twice — one for ACCESS, one for REFRESH
  ```
- [ ] Set `DATABASE_URL` to the production PostgreSQL connection string.
- [ ] Confirm `NODE_ENV=production` in the API environment.
- [ ] Confirm `CORS_ORIGIN` lists exact allowed origins (no `*`).
- [ ] Confirm `BCRYPT_ROUNDS` is between 10 and 15 (default 12).
- [ ] Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_WS_URL` to the production API domain.
- [ ] Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and restrict it to production domains in GCP.
- [ ] Confirm the production database is reachable from the deployment host.

## Environment variable reference

### API (`transpolink-api`)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | ≥32 chars, unique |
| `JWT_REFRESH_SECRET` | Yes | ≥32 chars, must differ from ACCESS |
| `NODE_ENV` | Yes | `production` |
| `PORT` | No | Default `4000`, range 1024–65535 |
| `CORS_ORIGIN` | No | Comma-separated origins; no `*` in prod |
| `BCRYPT_ROUNDS` | No | Default `12`, range 10–15 |
| `THROTTLE_TTL` | No | Default `60` (seconds) |
| `THROTTLE_LIMIT` | No | Default `100` (requests per TTL) |
| `BODY_LIMIT` | No | Default `1mb` |
| `API_PREFIX` | No | Default `api/v1` |

### Web (`transpolink-web`)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | e.g. `https://api.transpolink.com/api/v1` |
| `NEXT_PUBLIC_API_WS_URL` | Yes | e.g. `https://api.transpolink.com` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Restrict to prod domains in GCP |

## Build & deploy with Docker Compose

```bash
# From the repo root — build and start everything
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

The `migrate` service runs `prisma migrate deploy` once and exits. The `api` service
starts only after `migrate` completes successfully.

## Manual build (without Compose)

```bash
# API
cd transpolink-api
npm ci --omit=dev
npx prisma generate
npm run build

# Web (bake NEXT_PUBLIC_* at build time)
cd transpolink-web
NEXT_PUBLIC_API_URL=https://api.transpolink.com/api/v1 \
NEXT_PUBLIC_API_WS_URL=https://api.transpolink.com \
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key> \
npm run build
```

## Database migration

Always run migrations before starting the API:
```bash
cd transpolink-api
npx prisma migrate deploy
```

Rolling back a migration requires a new migration (`prisma migrate dev --name revert_xyz`).
Never delete migration files that have been applied to production.

## Health check verification

After deploy, confirm both probes return 200:

```bash
# Liveness
curl -sf https://api.transpolink.com/api/v1/health

# Readiness (also verifies DB connectivity)
curl -sf https://api.transpolink.com/api/v1/health/ready
```

Expected responses:
```json
{ "status": "ok", "ts": "..." }
{ "status": "ok", "db": "ok", "ts": "..." }
```

If `/health/ready` returns 503, the API cannot reach the database. Check `DATABASE_URL` and network connectivity.

## Post-deploy verification

- [ ] `GET /api/v1/health` → 200
- [ ] `GET /api/v1/health/ready` → 200
- [ ] Register a new user via the web UI and confirm email/password auth works.
- [ ] Place a test booking and confirm WebSocket events fire in the driver dashboard.
- [ ] Confirm Swagger UI is **not** accessible at `/api/v1/docs` in production.
- [ ] Confirm `X-Powered-By` header is absent in API and web responses.
- [ ] Confirm HTTPS is enforced (HTTP redirects to HTTPS).

## Rollback

1. Stop the new containers: `docker compose -f docker-compose.prod.yml down`
2. Restore the previous image tag or git checkout the previous release.
3. If a migration was applied, create a revert migration and re-deploy.
4. Start the previous version: `docker compose -f docker-compose.prod.yml up -d`
