# Reflection — TranspoLink Hackathon

> Submitted by every engineer by **EOD May 9** (before demo on May 11).
> Used in post-hackathon retro. Informs the hybrid workflow pilot starting Week 3.
> Be direct. Vague answers are less useful than honest ones.

---

## Template

```markdown
Engineer: _______________
Project: TranspoLink
Submitted: _______________

## Before the hackathon, my honest take on Claude Code was:
<1–2 sentences — your real prior opinion, not what sounds good>

## Now, my take is:
<1–2 sentences — what actually changed (or didn't)>

## The 3 patterns I'll bring to my real work

1.

2.

3.

## The 2 patterns I'll NOT bring (and why)

1. Pattern:
   Why not:

2. Pattern:
   Why not:

## What I'd change in our team's workflow
<2–4 sentences. Be direct — this feeds the pilot design.>

## My answer to: "would I keep using this on real tickets?"
[ ] Yes, default to it
[ ] Yes, for some kinds of work — specifically: _______________
[ ] No, prefer manual — because: _______________

Why:
```

---

## Example reflection (filled in for Day 1)

```
Engineer: Anas Shafique
Project: TranspoLink
Submitted: May 9, 2026

## Before the hackathon, my honest take on Claude Code was:
Useful for boilerplate and documentation, but I was skeptical it could handle
real debugging — finding the actual root cause of a bug rather than just guessing.

## Now, my take is:
When you give it the diagnosis rather than just the symptom, it fixes things
correctly on the first pass. The GPS accuracy bug took 30 seconds to fix once
I understood what MAX_ACCURACY_M was doing. The mistake was spending 20 minutes
diagnosing manually before giving Claude a precise prompt.

## The 3 patterns I'll bring to my real work

1. Diagnosis-first prompts — state root cause + file path + what to replace it with.
   Never say "something is broken." Say "X in file Y fails because Z; replace with W."

2. Grouped multi-file prompts — when a change touches 3–4 related files, bundle them
   into one prompt with all file names listed. Saves the back-and-forth of "and also
   update the type in bookings.ts."

3. Plan mode before touching > 2 files — I skipped this once and Claude missed the
   API type update that two page components depended on. Five minutes in plan mode
   would have caught it.

## The 2 patterns I'll NOT bring (and why)

1. Pattern: Using Claude for open-ended architectural decisions mid-sprint.
   Why not: I asked "should GPS positions be stored in DB or WebSocket only?" after
   half the tracking code was written. The answer was irrelevant by then — the
   decision was already baked in. Architecture questions belong in SPEC.md on Day 0.

2. Pattern: Letting Opus run as the default model.
   Why not: Every fix on Day 1 was done by Sonnet at $0.03–$0.09 per prompt.
   Opus would have cost 5× more for identical output. Only escalate to Opus for
   genuinely complex multi-module architectural work.

## What I'd change in our team's workflow
Every sprint should start with 30 minutes of SPEC.md + CLAUDE.md authoring before
any code is written. Both documents pay for themselves within the first hour because
Claude stops asking context questions it should already know. Also: the prompt log
should be live-updated, not reconstructed from memory at the end of the day — I
missed the exact wording of 2–3 prompts because I didn't log them immediately.

## My answer to: "would I keep using this on real tickets?"
[x] Yes, for some kinds of work — specifically: any ticket that touches > 2 files,
    any migration/refactor, and any debugging task where the root cause is already known.

Why:
For single-file edits I can often type the change faster than writing the prompt.
But for cross-cutting changes — like replacing an entire API integration across
multiple components — Claude's ability to hold the full context and make consistent
changes across files is faster than doing it manually and less error-prone than
doing it in pieces.
```
