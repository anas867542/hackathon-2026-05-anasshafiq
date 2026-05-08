# TranspoLink — Daily Standup Format

> 5 minutes per engineer. Hard time-box. Timer enforced.
> Same format on: **May 7 EOD · May 8 morning · May 9 morning**

---

## Template (copy and fill in before standup)

```
Engineer: <name>
Date: <date>

1. SHIPPED yesterday:   <1 sentence — feature or fix that is demo-ready>
2. SHIPPING today:      <1 sentence — what you'll have working by EOD>
3. BLOCKED on:          <specific blocker, or "nothing">
4. SPEND yesterday:     $<X>.  Running total: $<Y>.
5. ONE thing I learned about Claude Code:  <1 sentence>
```

---

## Example standups — TranspoLink

### May 7 EOD

```
Engineer: Anas
Date: May 7

1. SHIPPED yesterday:   Live GPS tracking map now shows route lines (OSRM) and driver marker
                        (GPS accuracy threshold raised); address autocomplete works without
                        Google billing (Nominatim); rating modal hover flicker fixed.
2. SHIPPING today:      Workshop pack docs complete; end-to-end demo flow rehearsed.
3. BLOCKED on:          Driver listing in inbox — cannot confirm root cause without two live
                        devices within 5 km of each other; likely env issue not a code bug.
4. SPEND yesterday:     $0.28.  Running total: $0.28.
5. ONE thing I learned: Diagnosis-first prompts (state root cause before asking for fix)
                        cut Claude's investigation overhead by 3–4 tool calls per session.
```

### May 8 morning (template)

```
Engineer: Anas
Date: May 8

1. SHIPPED yesterday:   <e.g., "Bidding flow end-to-end: driver submits offer, customer
                        sees ranked list, accepts, booking transitions to accepted.">
2. SHIPPING today:      <e.g., "Mobile responsive polish, bottom sheet confirm flow,
                        driver earnings stub page.">
3. BLOCKED on:          <or "nothing">
4. SPEND yesterday:     $<X>.  Running total: $<Y>.
5. ONE thing I learned: <1 sentence>
```

### May 9 morning (template)

```
Engineer: Anas
Date: May 9

1. SHIPPED yesterday:   <recap Day 2>
2. SHIPPING today:      Demo rehearsal, final polish, reflection doc submitted by EOD.
3. BLOCKED on:          <or "nothing — demo-ready">
4. SPEND yesterday:     $<X>.  Running total: $<Y>.
5. ONE thing I learned: <1 sentence>
```

---

## What counts as "SHIPPED"

A feature is shipped when:
- It works end-to-end in the browser (not just "code written")
- It doesn't crash on the happy path
- The demo judge could tap through it without you narrating what's "supposed to happen"

It is NOT shipped if: it only works in one browser, it requires a specific DB seed, or it needs manual API calls to set up state.

---

## Rules for facilitators

- Cut the engineer off at 5:00. Do not negotiate.
- If BLOCKED has been the same two days in a row → escalate to Adnan before 11 am.
- If SPEND is trending toward $100 by midday → pull the engineer aside immediately.
- The "ONE thing I learned" item feeds the post-hackathon retro — don't skip it.
