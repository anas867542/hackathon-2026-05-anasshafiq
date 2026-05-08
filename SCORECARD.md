# TranspoLink — Judges' Scorecard

> **Judges: Ilan + Adnan** score independently. Scores averaged. Consensus on 1st / 2nd / 3rd.
> Ties broken by: **Effective use of Claude Code first** (25% weight) → Functionality → Idea & Utility.
> Discipline penalty: **–25 points** for missing `CLAUDE.md` or `PROMPT_LOG.md` (non-negotiable).

---

## Scoring rubric with 1–10 anchors

### 1. Idea & Utility (8%)

| Score | Anchor |
|---|---|
| 1–2 | Solves a problem nobody has, or the problem is already well-solved by existing tools |
| 3–4 | Addresses a real need but the user and pain are vague |
| 5–6 | Clear problem, clear user, clear benefit — but nothing differentiating |
| 7–8 | Specific underserved user (Pakistani freight shipper), quantifiable pain (phone-call reliance), and a concrete workflow improvement |
| 9–10 | All of the above + demonstrates market insight (bidding model creates a real price market; free-API constraint creates a moat for markets without credit cards) |

**TranspoLink benchmark:** 8 — Pakistani freight context is specific and well-motivated; bidding mode is genuinely differentiated for the market.

---

### 2. Functionality — does it work end-to-end? (15%)

| Score | Anchor |
|---|---|
| 1–2 | Crashes on the happy path or core flow is broken |
| 3–4 | One major flow works; others are stubs or broken |
| 5–6 | Core booking flow works but tracking or bidding is missing/broken |
| 7–8 | Booking + tracking + bidding all work end-to-end; error states handled |
| 9–10 | All above + edge cases handled (cancellation banner, GPS dropout, review skip, offer expiry) |

**TranspoLink benchmark:** 8 — booking, tracking, and review are demo-ready; bidding flow complete; edge cases (GPS fallback, OSRM fallback to haversine) handled.

---

### 3. Code Quality (10%)

| Score | Anchor |
|---|---|
| 1–2 | `any` types everywhere, raw strings thrown as errors, no structure |
| 3–4 | Works but inconsistent patterns, mixed concerns, no error handling |
| 5–6 | Reasonable structure; some typed errors; business logic starting to leak into routes/components |
| 7–8 | Typed errors, service layer respected, no `any` in business logic, hooks separate from components |
| 9–10 | All above + clear module boundaries, consistent naming, deliberate use of `unknown` + narrowing |

---

### 4. Architecture & Code Complexity (6%)

| Score | Anchor |
|---|---|
| 1–2 | Monolithic spaghetti; no separation of concerns |
| 3–4 | Some structure but modules bleed into each other |
| 5–6 | Clear module separation; some tech debt visible |
| 7–8 | Domain modules, service layer, hook abstraction — architecture matches complexity of the problem |
| 9–10 | Architecture is self-explaining from `CLAUDE.md` alone; file additions are obvious from structure |

**TranspoLink benchmark:** 7 — NestJS module-per-domain, Socket.io gateway isolated, hooks abstract WebSocket logic from UI components.

---

### 5. Database Quality (5%)

| Score | Anchor |
|---|---|
| 1–2 | Schema is a blob; no relationships; data duplicated |
| 3–4 | Tables exist but FK relationships missing or wrong |
| 5–6 | Normalized schema; migrations present |
| 7–8 | Normalized, properly indexed (GPS coords for haversine), enum types used, migrations clean |
| 9–10 | All above + down-migrations present, seed scripts, explicit `NOT NULL` constraints where appropriate |

**TranspoLink benchmark:** 7 — Prisma schema with proper relations and enums; haversine-queried columns indexed; Prisma manages migrations.

---

### 6. UI/UX & Front-end (10%)

| Score | Anchor |
|---|---|
| 1–2 | Raw HTML or broken layout |
| 3–4 | Functional but unstyled or no mobile support |
| 5–6 | Clean desktop UI; mobile has issues |
| 7–8 | Mobile-responsive (bottom sheet, sticky bar, safe-area insets); loading states; error states; clear typography hierarchy |
| 9–10 | All above + micro-interactions (star hover, animated markers, GPS pulse badge), accessible labels, skeleton loading |

**TranspoLink benchmark:** 8 — bottom sheet on mobile, sticky fare bar, `min-h` flicker-free rating modal, GPS live badge, status badges, Skeleton loading.

---

### 7. Optimization & Performance (5%)

| Score | Anchor |
|---|---|
| 1–2 | N+1 queries, no debouncing, re-renders on every keystroke |
| 3–4 | Some obvious performance issues remain |
| 5–6 | Debounced search, no obvious N+1 |
| 7–8 | Debounced Nominatim (400 ms), `useCallback`/`useMemo` on stable callbacks, OSRM route only recalculated when coords change, haversine SQL indexed |
| 9–10 | All above + WebSocket event deduplication, GPS position smoothing/interpolation, connection reconnect with back-off |

**TranspoLink benchmark:** 7 — debounced search, memoized callbacks, route effects cancel on unmount, `useRef` guards on auto-detect.

---

### 8. Observability, Admin & Hardening (8%)

| Score | Anchor |
|---|---|
| 1–2 | No error states, no logging, crashes silently |
| 3–4 | Some console.log; no user-facing errors |
| 5–6 | User-facing error messages exist; some edge cases unhandled |
| 7–8 | All API errors surface to UI; cancellation banners; GPS error banner; OSRM fallback with warning message |
| 9–10 | All above + NestJS Logger used (not console.log), structured error responses, admin review dashboard |

**TranspoLink benchmark:** 7 — OSRM fallback warning, GPS error banner, cancellation banner, API error messages surfaced via `ApiError`, review-already-submitted skip.

---

### 9. Effective use of Claude Code (25%) — BIGGEST CRITERION

| Score | Anchor |
|---|---|
| 1–2 | Claude wrote boilerplate only; no complex logic delegated; no prompt log |
| 3–4 | Some AI-generated code but prompts were vague; log exists but sparse |
| 5–6 | Claude handled multi-file changes; prompt log shows 3+ meaningful entries |
| 7–8 | Diagnosis-first prompts; grouped related changes; model selection deliberate (Sonnet vs Opus); prompt log honest (includes failures) |
| 9–10 | All above + demonstrated workflow mastery: plan mode used for complex changes, `/compact` used to manage context, sub-agents used for parallel research, cost managed under $1/day |

**TranspoLink benchmark:** 8 — diagnosis-first prompts demonstrated; grouped 4-file GPS fix in one pass; Nominatim rewrite (3 files) in one pass; prompt log includes 3 failures with lessons; cost $0.28 for Day 1.

---

### 10. Submission & Demo (8%)

| Score | Anchor |
|---|---|
| 1–2 | Missing files (`SPEC.md`, `CLAUDE.md`, `PROMPT_LOG.md`) or demo didn't run |
| 3–4 | Files present but demo was confused or ran over time |
| 5–6 | Demo ran on time; story unclear |
| 7–8 | Clean story (problem → demo → architecture → Claude → cost); ran within 5 min |
| 9–10 | All above + confident Q&A; architecture explained without code on screen; cost data specific and surprising |

---

## Judge scoring sheet (print one per project)

```
Project: TranspoLink        Engineer: _______________
Demo date: Mon May 11       Judge: _______________

 1. Idea & utility (8%):                     /10  ×0.08 = ____
 2. Functionality (15%):                     /10  ×0.15 = ____
 3. Code quality (10%):                      /10  ×0.10 = ____
 4. Architecture & complexity (6%):          /10  ×0.06 = ____
 5. Database quality (5%):                   /10  ×0.05 = ____
 6. UI/UX & front-end (10%):                 /10  ×0.10 = ____
 7. Optimization & performance (5%):         /10  ×0.05 = ____
 8. Observability & hardening (8%):          /10  ×0.08 = ____
 9. Effective use of Claude Code (25%):      /10  ×0.25 = ____   ← BIGGEST
10. Submission & demo (8%):                  /10  ×0.08 = ____

Weighted total:                                           /100

Discipline penalty (missing CLAUDE.md or PROMPT_LOG.md): -25
Final score:                                              /100

──────────────────────────────────────────────────────────────
One thing this project did exceptionally well:


One thing the engineer should keep doing in real work:


One thing to work on:

```
