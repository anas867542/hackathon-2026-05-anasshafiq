# TranspoLink — Hackathon Onboarding

> Everything you need before you write a single line of code.

---

## Before the hackathon (May 4–6)

**Self-study: ~90 min total**

| Resource | Time | What you'll learn |
|---|---|---|
| [Engineer Handbook](https://app.notion.com/p/2-Engineer-Handbook-351c849d637f819993d5e78a5d4b0f88) | ~60 min | Claude Code: plan mode, sub-agents, `/compact`, `/clear`, hooks |
| [Stack Guide](https://app.notion.com/p/351c849d637f814bb2c2fa9dbd1b0b70) | ~30 min | What to install, how to configure Claude Code for this stack |

**Prerequisite — completed by EOD May 6 and confirmed in `#ai-hackathon`:**
- [Quick Start for Engineers](https://app.notion.com/p/0-Quick-Start-for-Engineers-352c849d637f8181a47ee16345a1c640) one-shot install done
- `claude --version` returns a version number in your terminal
- You've run one test prompt in the TranspoLink repo and it returned sensible output

---

## Optional refresher — May 7, 09:30–10:00 (30 min, in person)

Adnan + a senior engineer run live demos of:
- Plan mode for multi-file changes
- Sub-agents for parallel research tasks
- `/compact` to reclaim context when a session grows too large
- `/clear` to start a fresh context without losing your session

**Skip this if:** you already completed the Handbook and feel confident. The refresher is not a repeat — it builds on the Handbook with live TranspoLink examples.

---

## TranspoLink-specific setup (15 min)

### 1. Clone and install

```bash
# API
cd transpolink-api
cp .env.example .env          # fill DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev
npm run start:dev             # should print "Listening on :3000"

# Web (separate terminal)
cd transpolink-web
cp .env.local.example .env.local   # fill NEXT_PUBLIC_GOOGLE_MAPS_KEY, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
npm install
npm run dev                   # should open on :3001 (or :3000 if API not running yet)
```

### 2. Verify the map loads

Open `http://localhost:3001/book`. You should see:
- A Google Maps tile layer (no "billing required" popup)
- The Pickup address input with "Use current location" button
- No console errors about Google APIs

> The Google Maps key is needed for **tiles only**. Routing and geocoding use OSRM + Nominatim (free, no billing).

### 3. Create test accounts

Open two browser windows (or one normal + one incognito):
- Window 1: register a **customer** account at `/register`
- Window 2: register a **driver** account at `/register` → then visit `/driver/dashboard` and set status to **Online** + add an active truck

### 4. Run a test booking end-to-end

1. Customer: go to `/book`, set pickup + drop-off in Lahore, pick Mini Truck, confirm
2. Driver: watch for the request card to appear in the inbox (within ~5 s)
3. Driver: accept → mark arrived → start trip → complete
4. Customer: open the booking detail page and watch the driver marker move

If this works, you're fully set up.

---

## Key environment variables

| Variable | File | Required for |
|---|---|---|
| `DATABASE_URL` | `transpolink-api/.env` | Everything API-side |
| `JWT_SECRET` | `transpolink-api/.env` | Auth tokens |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `transpolink-web/.env.local` | Map tiles (free, no billing needed) |
| `NEXT_PUBLIC_API_URL` | `transpolink-web/.env.local` | API fetch calls |
| `NEXT_PUBLIC_WS_URL` | `transpolink-web/.env.local` | Socket.io connection |

---

## What to read in the codebase first (in this order)

1. `transpolink-api/src/modules/bookings/matching.service.ts` — haversine driver-matching SQL
2. `transpolink-api/src/modules/tracking/tracking.gateway.ts` — WebSocket gateway (driver rooms, `booking:new_request` push)
3. `transpolink-web/src/hooks/useDriverInbox.ts` — how the driver client receives requests
4. `transpolink-web/src/components/map/TrackingMap.tsx` — live GPS tracking map (OSRM routes, driver marker)
5. `transpolink-web/src/components/booking/BookingForm.tsx` — booking creation flow

---

## Common first-day mistakes

| Mistake | How to avoid |
|---|---|
| Asking Claude to change 5 files at once without plan mode | Always open plan mode first for anything touching > 2 files |
| Running Opus for routine edits | Use Sonnet by default; switch to Opus only for complex architectural decisions |
| Forgetting to read a file before editing | Claude Code requires a `Read` before `Edit` — it will error if you skip |
| Letting context grow too large without `/compact` | Run `/compact` when the session exceeds ~100 messages or you notice slower responses |
| Committing with `--no-verify` when a hook fails | Fix the underlying hook issue; never bypass hooks |
