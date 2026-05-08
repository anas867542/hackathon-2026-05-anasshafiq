# TranspoLink — Facilitator Cheat Sheet

> **Adnan (Hackathon Lead) + senior engineer running point each day.**
> Everything participants, facilitators, and judges need on the day. Print this. Tape it to the wall.

---

## Daily schedule

| Time | Activity |
|---|---|
| 08:55 | Public cost board updated |
| 09:00 | Standup begins — 5 min/engineer, hard time-boxed |
| 09:30 | Anyone over $100 prior day → 15-min review with Adnan before 11 am |
| 11:00 | Office hours block 1 (30 min) |
| 12:00 | Quiet room — no interruptions |
| 15:00 | Office hours block 2 (30 min) |
| 17:30 | Engineers commit prompt log + cost log for the day |
| 17:45 | Facilitator picks "cheapest output that worked" of the day |
| 18:00 | Demo slot: engineer demos that prompt tomorrow morning (3 min) |

---

## Each morning checklist

- [ ] Cost board updated before standup (pull from Anthropic console or self-reported log)
- [ ] Standup timer is ready (phone timer is fine)
- [ ] "Cheapest prompt of yesterday" demo slot is filled — ask the engineer identified the night before
- [ ] Anyone who was blocked yesterday has a plan for today (not just "I'll try again")

---

## During the day

**Office hours rules:**
- Two 30-min blocks only (11:00 + 15:00). Outside those, room is quiet.
- Facilitators are available in a designated area — engineers come to them.
- No drive-by interruptions.

**When you see someone stuck > 30 min without using plan mode:**
→ Walk over. Ask: "Have you tried plan mode?" Show the command. Walk away.
Do not take the keyboard.

**When you see Opus running on routine work (file edits, style fixes):**
→ Walk over. Say: "Switch to Sonnet — `/model sonnet`." Walk away.
Do not explain further; the cost log will make the lesson concrete.

**When you see an engineer asking Claude a vague prompt:**
→ Walk over. Ask: "What's the specific root cause?" Help them articulate it. Walk away.
Do not write the prompt for them.

---

## Each evening checklist

- [ ] Every engineer has committed `PROMPT_LOG.md` and `COST_LOG.md` updates
- [ ] Identify the "cheapest output that worked" entry from the day's logs
- [ ] Confirm who will demo it tomorrow morning
- [ ] Check if anyone is trending toward > $100 for tomorrow (review their model usage)

---

## Common blockers — TranspoLink specific

| Symptom | Likely cause | Fix |
|---|---|---|
| Map tiles don't load / "billing required" popup | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` missing or wrong | Set key in `transpolink-web/.env.local`; tiles are free, no billing needed |
| Address autocomplete returns no results | Nominatim rate-limited (max 1 req/s) | Wait 5 s and retype; check there's no rapid-fire fetching (debounce should be 400 ms) |
| Driver inbox shows no booking requests | Driver not online / no active truck / > 5 km from pickup | Set driver status Online in `/driver/dashboard`; activate a truck; check GPS coords in DB via Prisma Studio |
| No route line on TrackingMap | OSRM fetch failed — check browser console | OSRM is a public shared server — transient. Refresh; check for "No route returned" error in console |
| Driver marker never appears on map | GPS accuracy rejected OR `booking.driver.currentLat` is null | Check `useDriverTracking.ts` `MAX_ACCURACY_M`; verify driver has ever sent a location update |
| GPS marker not moving on customer map | `useCustomerTracking` not receiving WebSocket events | Check `NEXT_PUBLIC_WS_URL`; verify `driver:location` events firing in Network tab → WS frames |
| Socket.io not connecting at all | API not running or `NEXT_PUBLIC_WS_URL` wrong | `npm run start:dev` in API; check port; verify env var |
| "typedRoutes RouteImpl" TS error on login page | Known pre-existing Next.js issue | Ignore. Do not attempt to fix. Does not affect runtime. |
| Prisma migration fails | DB not running or `DATABASE_URL` misconfigured | `pg_isready -h localhost`; verify connection string format |
| Booking created but driver never notified | `tracking.gateway.ts` not running — NestJS didn't register the gateway | Restart API; check for startup errors mentioning `TrackingGateway` |

---

## Things facilitators must NOT do

- **Don't take the keyboard.** If you code for them, they don't learn. Coach and walk away.
- **Don't grade ambiguously.** Every score on the scorecard gets a 1-line note. "Good job" is not a note.
- **Don't let demos run over.** 5 minutes. Timer on. Cut them off. Time discipline is a deliverable.
- **Don't interpret "blocked" charitably.** If something has been blocked 2 days running, escalate — don't wait for Day 3.
- **Don't suggest workarounds that bypass CLAUDE.md rules.** If they're stuck because of a convention, help them work within it, not around it.

---

## Red flags — escalate to CEO (Adnan)

| Flag | Threshold | Action |
|---|---|---|
| Zero working features | EOD May 8 | 1:1 with Adnan before May 9 standup |
| Spend trending toward team hard cap | EOD May 8 | Review model usage; cap Opus immediately |
| "This hackathon is theater" sentiment | Any day | Address directly in 1:1 — not in retro, not in group chat |
| Engineer skipping prompt log updates | Two days in a row | Scorecard criterion 9 (25%) requires a real log — remind them the discipline penalty is –25 points |

---

## Demo day — May 11

**Morning (before demos start):**
- [ ] All engineers have practiced their 5-minute run-through at least once
- [ ] `SPEC.md`, `CLAUDE.md`, `PROMPT_LOG.md`, and `COST_LOG.md` committed
- [ ] Every demo device has location permission pre-granted
- [ ] API server running on demo machine (not relying on dev laptop over WiFi)
- [ ] Socket.io WebSocket connection verified in Network tab before judges sit down

**During demos:**
- One facilitator keeps the timer. Cuts off at 5:00 with a hand signal.
- One facilitator takes notes on the judge scoring sheet.
- Q&A is unstructured — 2–3 minutes after the 5-minute demo.

**Scoring:**
- Ilan and Adnan score independently.
- Scores averaged after all demos complete.
- Consensus discussion on 1st / 2nd / 3rd.
- Ties: Effective use of Claude Code (criterion 9, 25%) → Functionality → Idea & Utility.
- Announce results same day.

---

## Cost board format (post publicly each morning)

```
TranspoLink — Cost Board — <date>

Engineer    | Day 1 | Day 2 | Day 3 | Total | Models used
------------|-------|-------|-------|-------|-------------
Anas        | $0.28 |       |       | $0.28 | Sonnet (all)

Soft cap: $75/day   Hard cap: $100/day
Team running total: $0.28
```
