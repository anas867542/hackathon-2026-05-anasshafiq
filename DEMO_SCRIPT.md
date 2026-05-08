# TranspoLink — Demo Script

> **Per-engineer slot: 5 min demo + 2–3 min Q&A = 7–8 min total. Hard cap. Timer enforced.**
> Demo day: **Monday May 11**. Practice once on May 11 morning before the meeting.

---

## Timing breakdown

| Time | What you cover |
|---|---|
| 0:00–0:30 | Hook — the problem, in one sentence |
| 0:30–2:30 | Live demo — 3 user actions, end-to-end, no slides |
| 2:30–3:30 | Architecture — 1-paragraph version |
| 3:30–4:30 | How I used Claude Code — 1 worked, 1 didn't, 1 I'll keep |
| 4:30–5:00 | Cost — total spend, $/feature, what surprised me |

---

## Setup checklist (do this before judges arrive)

- [ ] Two browser windows open side by side: **left = customer** (`/book`), **right = driver** (`/driver/dashboard`)
- [ ] Driver is logged in, status set to **Online**, Mini Truck is **active**
- [ ] Driver's device location is within 5 km of your demo pickup address (Gulberg, Lahore)
- [ ] API running (`npm run start:dev`) — no red errors in console
- [ ] Web running (`npm run dev`) — map tiles loading, no Google billing popup
- [ ] Customer booking form is open with clean inputs (no stale address from previous run)
- [ ] Nominatim is responding — test one address search in advance
- [ ] Socket.io connected — check Network tab for a `101 Switching Protocols` WebSocket upgrade

---

## The script (word-for-word)

### 0:00–0:30 — Hook

> "In Pakistan, booking a freight truck today means calling five different numbers and hoping one of them picks up. You have no guaranteed price, no ETA, and zero visibility on where your goods are. TranspoLink changes that. Let me show you."

### 0:30–2:30 — Live demo

**Step 1 — Customer books a truck (40 s)**

1. Focus the customer window. Type **"Gulberg"** in the Pickup field.
   > "Address search runs on Nominatim — OpenStreetMap's free geocoding. No Google billing required."
2. Select **"Gulberg, Lahore, Punjab, Pakistan"** from the dropdown.
3. Type **"DHA Phase 5"** in Drop-off, select the first result.
4. Point at the map:
   > "The route line is drawn by OSRM — open-source routing, also free. Distance and fare estimate update instantly."
5. Select **Mini Truck**.
6. Read the fare estimate aloud (e.g., "₨1,840 estimated").
7. Click **Confirm booking**.
   > "Booking confirmed. Watch the driver window."

**Step 2 — Driver receives and accepts (30 s)**

1. Focus the driver window — a request card should appear within ~2 s.
   > "The server found this driver within 5 km via a haversine SQL query and pushed the request over WebSocket. That happened in under 2 seconds."
2. Driver clicks **Accept**.
3. Both windows update status to `accepted`.
   > "Status is live on both sides simultaneously."

**Step 3 — Live GPS tracking (50 s)**

1. Driver clicks **Mark arrived at pickup** → **Start trip**.
2. Focus the customer window. Open `/book/<id>` (the tracking page should already be open, or navigate there).
3. Point at the driver marker on the map:
   > "The driver marker updates every 2 seconds. The route line is the OSRM path from the driver's current position to the drop-off. ETA recalculates live."
4. If on a mobile device, move slightly to see the marker animate.
   > "This works on any browser — no native app required."

**Bonus: Complete and review (if time allows)**

1. Driver clicks **Complete trip**.
2. Rating modal appears — select 5 stars, type "Quick and careful", click Submit.
   > "Post-trip rating stored per booking. Skippable. Can only submit once."

### 2:30–3:30 — Architecture

> "The API is NestJS with a Prisma + PostgreSQL backend. The real-time layer is a single Socket.io gateway — drivers join a room when they connect online, and the booking service pushes directly to their room. The web app is Next.js 14 App Router. Map tiles come from Google Maps — free tier. Everything else: OSRM for routing, Nominatim for geocoding. Zero paid API calls at runtime."

*Point to the Network tab if visible — show WebSocket frames.*

### 3:30–4:30 — How I used Claude Code

> "One prompt that worked really well: I described the exact root cause — `DirectionsService` calls failing because billing was off — gave Claude the file to change, named the replacement component (`PolylineF`), and pointed at `BookingMap.tsx` as the pattern to copy. It rewrote both route effects in one pass."

> "One that wasted time: I said 'fix the map' with no context. Claude read three files before I had to redirect it. Lesson: diagnosis first, then ask for the fix."

> "One pattern I'll keep: grouping related changes into a single prompt. The GPS fix touched four files — `useDriverTracking.ts`, `bookings.ts` API type, and both trip pages. One prompt, one pass."

### 4:30–5:00 — Cost

> "Day 1: **$0.28** for roughly 4 hours of heavy AI-assisted coding. That's about **$0.07/hour**. Three major features fixed or built: live tracking map, address autocomplete, and a UI flicker bug. The most expensive single prompt was the Nominatim rewrite at about $0.09 — three files in one pass. Everything else was under $0.05. Running Sonnet as default kept the cost negligible."

---

## Common demo failures (avoid)

| Failure | What to do instead |
|---|---|
| Showing slides before the app | Open the live app first. Slides = wasted time. |
| "This part doesn't work but normally..." | Don't demo broken paths. If a feature isn't ready, cut it from the script. |
| Reading code on screen | Architecture is 3–4 spoken sentences maximum. No code tours. |
| Demoing in a slow/throttled network | Test your network before judges arrive. Nominatim + OSRM need a live connection. |
| Running over 5 minutes | Practise out loud. Time yourself. 5 minutes is enough. |

---

## Q&A — likely questions and short answers

| Question | Answer |
|---|---|
| "How does driver matching work?" | Haversine SQL query in `matching.service.ts` — finds drivers within 5 km radius with an active matching truck type. Runs in < 50 ms. |
| "What happens if the driver goes offline mid-trip?" | The WebSocket room connection drops. The customer's last known driver position is held on screen. Reconnection is automatic. |
| "Why not use Google Maps for everything?" | Google Directions + Places APIs require billing. We have no card on file. OSRM + Nominatim deliver the same result for free, and they're production-grade — used by Apple Maps and major OSS projects. |
| "Is this production-ready?" | The core booking + tracking + bidding flows are complete. Payment processing, push notifications, and admin tooling are out of scope for this sprint. |
| "What's the cost to run at scale?" | Maps: $0 (OSRM + Nominatim). Routing: $0. The only variable cost is server compute — a single NestJS + Postgres instance handles ~100 concurrent bookings comfortably. |
