# What Excellent Looks Like — TranspoLink

> The gold standard for this project. Read this before scoping each feature.
> A score of 9–10 on any rubric criterion means every item in that section is true.

---

## The reference skill: blog-publisher

Before Day 1 coding, every engineer should read the `blog-publisher` skill source pinned in `#ai-hackathon`.

**Why it's the gold standard:**

| Property | What it does |
|---|---|
| Full pipeline orchestration | Chains research → draft → graphic → 3-pass review → publish → notify. Each stage is self-contained. |
| Encoded judgment | ICP-first topic selection, persona rotation, category rotation, title-pattern banlists — decisions a senior lead makes, now in code |
| Hard rules with reasons | "No em dashes", "never reference ChainGPT", "never say 'we are a bank'" — explicit, enforceable, with rationale |
| Quality gates that block | BLOCK / FIX / NOTE classification; pipeline loops back before publishing |
| Built-in audit hooks | Documents its own failure modes inline and refuses to proceed when they occur |
| Scheduled-mode aware | Same skill runs autonomously on cron, twice a week, without human approval |

---

## What engineers should copy from blog-publisher

### The structure
Number your stages. Hard-rules section. Content templates. IDs and configuration centralized at the top.

In TranspoLink terms: the booking state machine transitions (`pending → accepted → arrived → in_progress → completed`) should be as explicit as the blog-publisher's pipeline stages — every transition has a condition, a side effect, and an error case.

### The 3-pass review
blog-publisher runs: pass 1 correctness, pass 2 conventions, pass 3 brand.

TranspoLink engineering equivalent:
- Pass 1 — does it work? (happy path + error path)
- Pass 2 — does it follow CLAUDE.md conventions? (no direct DB in routes, no Google paid APIs, no `any`)
- Pass 3 — is it demo-safe? (no crashes on expected judge actions, loading states present, error messages user-readable)

### The BLOCK / FIX / NOTE classification

Use this for every PR review:
- **BLOCK** — must be resolved before merge (crashes, data loss, security, missing acceptance criteria)
- **FIX** — should be resolved before merge (convention violation, performance issue, unhandled error)
- **NOTE** — informational, no action required (style preference, future improvement idea)

### The audit hooks

Skills know their failure modes and document them inline. TranspoLink equivalents:
- `matching.service.ts`: documents the "driver not found" silent-failure case — if no candidates returned, the booking stays in `pending` indefinitely without user feedback
- `useDriverTracking.ts`: documents the `MAX_ACCURACY_M` threshold — intentionally 150 m for desktop demo, must be tightened to 40 m for production mobile

---

## Week-3 target: scaffold-feature skill for TranspoLink

```markdown
# scaffold-feature (TranspoLink)

## Pipeline overview
Spec input → Prisma migration → NestJS service → NestJS controller → Next.js page/hook → Integration test → PR draft

## Stage 1: Validate spec
Required: feature name, DB tables affected, API route, owner, acceptance criteria.
BLOCK if any missing.

## Stage 2: Generate Prisma migration
- Add model to schema.prisma following naming conventions (snake_case, plural tables)
- Run `npx prisma migrate dev --name <feature>`
- BLOCK if down-migration not generated

## Stage 3: Generate NestJS service + controller
- Service in `src/modules/<domain>/<domain>.service.ts`
  - Prisma access only here — never in controller
  - Typed NestJS exceptions (NotFoundException, ForbiddenException)
- Controller in `src/modules/<domain>/<domain>.controller.ts`
  - Calls service methods only
  - JwtAuthGuard + RolesGuard on all routes
- FIX if controller references `this.prisma` directly

## Stage 4: Generate Next.js page or hook
- Hook in `transpolink-web/src/hooks/use<Feature>.ts`
  - All API calls via `src/lib/api/<domain>.ts`
  - Never call fetch() directly in a component
- Page uses existing UI primitives (Card, Button, Badge, Skeleton)
- BLOCK if any new inline styles added

## Stage 5: Generate integration test
- Test the service boundary (not the controller, not the DB directly)
- Test: happy path + 400 input error + 403 unauthorized + 404 not found
- BLOCK if test passes against a deliberately-broken service implementation

## Stage 6: Open PR draft
- Conventional commit subject: `feat: <feature name>`
- PR body includes: spec reference, acceptance criteria checklist, demo instructions
- Notify Slack #eng-prs

## Hard rules
- Never call google.maps.DirectionsService or google.maps.Geocoder
- Never write raw SQL outside matching.service.ts
- Never bypass the service layer from a controller
- Never add a Google paid API call (check billing requirements before using any Google API)
- Never commit with --no-verify
```

---

## Excellent looks like — per feature area

### Address search
- Results appear within 600 ms of stopping typing (400 ms debounce + ~200 ms Nominatim roundtrip)
- Minimum 3 characters before search fires — no wasted requests on single characters
- Address history shows (clock icon) when input is empty on focus
- "Use current location" uses `nominatimReverse` — shows "Locating…" spinner, surfaces permission errors
- Selecting an address immediately updates the map pin and triggers route recalculation

### Booking creation
- Fare estimate shows within 2 s of both addresses being set (OSRM response time)
- "Confirm booking" button is disabled and shows clear reason text until both coordinates are valid
- Mobile bottom sheet shows truck name + distance + formatted fare before confirm — no surprise
- OSRM fallback to haversine shows an amber warning but never blocks the booking

### Driver dispatch
- `matching.service.ts` haversine query completes in < 50 ms (indexed `current_lat`, `current_lng`)
- `booking:new_request` WebSocket event arrives at driver client within 2 s of booking creation
- Driver offer card shows: pickup address, drop-off address, estimated fare, distance, accept timer
- Timer counts down visually — driver knows exactly how long they have

### Live GPS tracking
- Driver position updates on customer map every 2 s
- OSRM driver-leg route (driver → current target) is shown as a distinct color from base route
- ETA label updates every position update — rounds up to 1 min minimum
- Phase label changes automatically without page refresh: "On the way" → "At pickup" → "En route" → "Delivered"
- Driver marker is visible from the moment the booking is accepted (seeds from DB position before WebSocket GPS fires)

### Cancellation handling
- If booking is cancelled while driver is en route, both customer and driver see an immediate banner with reason and cancelled-by info
- Cancelled status propagates via WebSocket — no stale UI state

### Post-trip review
- Rating modal appears automatically when driver completes the trip
- `reviewsApi.hasReviewed()` is checked first — modal is skipped if already submitted (no duplicate review prompt)
- Star hover doesn't cause modal flicker (`min-h` reserves label space)
- "Skip" button is always available — review is never mandatory
- After submission, redirect to dashboard is immediate

### Code quality signals (a 9–10 submission has all of these)
- Zero `any` types in `src/modules/` and `src/components/`
- No `console.log` in API code (use NestJS `Logger`)
- No `google.maps.DirectionsService` or `google.maps.Geocoder` calls anywhere
- All async operations in components have loading states and catch blocks with user-visible error messages
- `CLAUDE.md` accurately describes the codebase as it exists on demo day (not aspirationally)
- `PROMPT_LOG.md` has at least 3 real prompts with honest quality scores and at least 1 failure entry
