# Prompt Log — TranspoLink Hackathon

> Maintained throughout the hackathon. Submitted with the project. Judges score "Effective use of Claude Code" (25% weight) partly from this log. Be honest — failed prompts are as valuable as successes.

---

## Top 5 prompts that worked

### 1. Replace Google DirectionsService with OSRM in TrackingMap

**Context:** Customer tracking page and driver trip page showed no route lines at all. The billing popup from Google Maps appeared on load. `TrackingMap.tsx` was using `google.maps.DirectionsService` (paid API) for both the base route (pickup → drop-off) and the driver-leg route (driver → current target). With billing disabled, `DirectionsResult` always came back null.

**Prompt:**
```
TrackingMap.tsx uses google.maps.DirectionsService for two route effects — one for the
base pickup→dropoff route and one for the driver→target leg. Both return null because
billing is disabled. Replace both with OSRM fetchOsrmPath (same pattern as BookingMap.tsx
which already uses OSRM). Use PolylineF instead of DirectionsRenderer. Keep the
isDriverLeg display logic: show driver leg when phase is to_pickup or to_dropoff,
otherwise show base route.
```

**Why it worked:** Gave Claude the exact file, the exact pattern to copy (`BookingMap.tsx`), the exact JSX component to switch to (`PolylineF`), and the existing display logic to preserve. No ambiguity about what "replace" meant.

**Output quality:** 5/5

**Model used:** Sonnet 4.6

**Approx tokens / cost:** ~3 k tokens / ~$0.05

---

### 2. Fix GPS accuracy threshold rejecting all desktop browser fixes

**Context:** Driver marker never appeared on either the customer tracking map or the driver trip page, even when the driver was actively moving. No error shown. `useDriverTracking.ts` had `MAX_ACCURACY_M = 40` — desktop browsers report accuracy of 50–150 m, so every fix was silently rejected and `currentPosition` stayed null.

**Prompt:**
```
In useDriverTracking.ts the constant MAX_ACCURACY_M is 40. Desktop browsers report
GPS accuracy of 50–150 m so every fix is rejected and currentPosition stays null forever.
Raise it to 150 to allow desktop demo. Also, on both the customer page (book/[id]/page.tsx)
and the driver page (driver/trip/[id]/page.tsx), add an initialDriverPos memo that reads
booking.driver.currentLat and booking.driver.currentLng from the booking response and uses
that as a seed position for the driver marker before any WebSocket GPS events arrive.
The bookings.ts API type BookingDriver needs currentLat and currentLng optional fields added.
```

**Why it worked:** Described the exact root cause (accuracy number), the exact fix (raise threshold), and the two downstream effects (seed position on both pages + API type update) in a single prompt. Claude made all four changes without back-and-forth.

**Output quality:** 5/5

**Model used:** Sonnet 4.6

**Approx tokens / cost:** ~2 k tokens / ~$0.03

---

### 3. Replace Google Places + Geocoder with Nominatim

**Context:** Typing in the pickup/drop-off fields showed no suggestions. The Google Maps error popup appeared: "This page can't load Google Maps correctly." The app had no credit card on file — Google Places API and Geocoding API require billing. `PlaceAutocompleteInput.tsx` used `@react-google-maps/api Autocomplete`; `BookingMap.tsx` used `google.maps.Geocoder`; `BookingForm.tsx` used `google.maps.Geocoder` for auto-detected location.

**Prompt:**
```
PlaceAutocompleteInput.tsx uses Google Places Autocomplete which needs billing.
Rewrite it from scratch using Nominatim:
- nominatimSearch(query): GET nominatim.openstreetmap.org/search?q=...&format=json&limit=6&countrycodes=pk
- nominatimReverse(lat, lng): GET nominatim.openstreetmap.org/reverse?lat=...&lon=...&format=json
- Debounce search 400ms, min 3 chars
- Keep the address history in localStorage (existing readHistory/pushHistory logic)
- Show history (clock icon) when input is empty, results (pin icon) when searching
- Export nominatimReverse so BookingForm and BookingMap can import it
Also update BookingMap.tsx reverseGeocode() to use the same Nominatim fetch instead of
google.maps.Geocoder. Update BookingForm.tsx to import nominatimReverse and remove the
useGoogleMaps() call entirely.
```

**Why it worked:** Specified the exact API URLs, the debounce value, what to keep from the existing implementation, what to export, and which other files needed updating. Claude rewrote all three files correctly in one pass.

**Output quality:** 5/5

**Model used:** Sonnet 4.6

**Approx tokens / cost:** ~5 k tokens / ~$0.09

---

### 4. Fix rating modal hover flicker

**Context:** After trip completion, hovering over the star rating caused the modal to flicker — rapidly jumping position with each mouse move. The stars had `hover:scale-110` which changed the element slightly, but the real cause was the label paragraph: `{display > 0 && <p>{labels[display]}</p>}` — when `display` was 0 the paragraph was absent, changing modal height, which triggered `items-center` re-centering, which moved the modal, which fired `onMouseLeave`, which set `hovered` to 0, which removed the paragraph again, cycling infinitely.

**Prompt:**
```
RatingModal.tsx has a hover flicker bug. The label paragraph:
{display > 0 && <p className="...">{labels[display]}</p>}
is conditionally rendered — when display drops to 0 the paragraph disappears, the modal
height changes, items-center repositions it, the mouse leaves the star, hovered resets to 0,
repeat. Fix by making the paragraph always present with min-h-[1.25rem] and rendering an
empty string when display === 0. The modal height stays constant so the repositioning loop
can't start.
```

**Why it worked:** Diagnosed the exact cycle (paragraph absent → height change → repositioning → mouse leave → hovered=0 → repeat) and gave the one-line fix. Claude didn't need to investigate — it just applied the change.

**Output quality:** 5/5

**Model used:** Sonnet 4.6

**Approx tokens / cost:** ~0.5 k tokens / ~$0.01

---

### 5. Tracing driver listing bug after OSRM integration

**Context:** After all the OSRM/Nominatim changes, the driver inbox stopped showing booking requests that it used to show. Needed to verify whether any server-side dispatch code was accidentally broken.

**Prompt:**
```
After the OSRM integration, drivers are no longer seeing booking requests in their inbox.
Trace the full dispatch chain server-side: where does the booking creation trigger driver
notification? Show me matching.service.ts (the haversine query) and tracking.gateway.ts
(the WebSocket emit). Also show me the client-side useDriverInbox.ts to verify the event
name matches. I need to know if any of the OSRM changes could have broken this.
```

**Why it worked:** Framed it as a debugging investigation, specified the exact files to read, and asked for a specific comparison (server event name vs. client event name). Confirmed server-side was untouched; narrowed the issue to environment (driver not within 5 km radius in test).

**Output quality:** 4/5 — correctly concluded no code bug; actual root cause was test environment setup

**Model used:** Sonnet 4.6

**Approx tokens / cost:** ~2 k tokens / ~$0.03

---

## Bottom 3 prompts that wasted time

### 1. Vague "fix the map" prompt

**What I asked:**
```
The tracking map isn't showing the route line. Can you fix it?
```

**What went wrong:** Claude couldn't know which file to look at, which API was failing, or what "route line" meant in this specific codebase. It started reading multiple files speculatively before I redirected it with the specific diagnosis.

**What I should have done:** Include the file name (`TrackingMap.tsx`), the specific component that failed (`google.maps.DirectionsService`), and the replacement approach (`OSRM like BookingMap.tsx does`). The specific prompt #1 above is what I should have written from the start.

---

### 2. Asking Claude to "check if the booking flow is broken"

**What I asked:**
```
Something broke in the booking flow after the changes. Can you check?
```

**What went wrong:** "Booking flow" spans 6+ files. Claude started reading them sequentially, burning context and tokens, before finding that `BookingForm.tsx` had a residual indentation issue from a previous edit. A targeted prompt would have found it in one read.

**What I should have done:** Run `npm run type-check` first, see which file the error was in, then ask Claude to fix that specific file and error.

---

### 3. Asking for architectural advice mid-implementation

**What I asked:**
```
Should we store GPS positions in the database or only stream them via WebSocket?
```

**What went wrong:** This is a legitimate architecture question but asking it after half the tracking code was already written was too late — the decision was already made (WebSocket stream only, no DB persistence in MVP). Claude gave a balanced answer but it didn't help move anything forward.

**What I should have done:** Make this call before writing any tracking code, put it in `SPEC.md` under Architecture or Out of Scope, and not revisit it mid-sprint.

---

## Workflow patterns I'll keep using

- **Diagnosis-first prompts:** Always state the root cause you've identified before asking for the fix. Claude fixes faster when it doesn't have to investigate.
- **"Same pattern as X file":** When a fix mirrors existing code in the repo, name the file. Claude reads it and applies the pattern correctly without guessing.
- **Plan mode for cross-file changes:** Any change touching > 2 files goes through plan mode first. Saves back-and-forth about missed files.
- **Single-prompt multi-file updates:** Group logically related changes (e.g., new API type + two page components that use it) into one prompt with all affected files listed.

## Workflow patterns I'll stop

- Vague symptom descriptions without a diagnosed cause — wastes 3–5 tool calls on investigation that I could have done with `npm run type-check` or a browser console screenshot.
- Asking architecture questions after implementation has started — decisions go in `SPEC.md` before sprint day 1.
- Not specifying which model to use — defaulted to Sonnet for all routine edits; only escalate to Opus for complex multi-file architectural rewrites.
