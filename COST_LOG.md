# TranspoLink — Daily Cost Log

> Fill out at **end of each coding day**. Share number at morning standup.
> Soft cap: **$75/day**. Hard cap: **$100/day**.
> If you hit $75 before EOD → switch to Sonnet for all remaining work, no Opus.
> If you hit $100 → stop Claude Code sessions for the day; finish manually or pair with someone not at cap.

---

## Log

| Day | Date | Spend (USD) | Output tokens | Cache read tokens | Notes |
|---|---|---|---|---|---|
| Day 1 | Thu May 7 | $58.26 | 1,091,612 | 88M | TrackingMap OSRM fix, GPS accuracy, Nominatim migration, rating modal, test suite phase 1-2, QA fixes |
| Day 2 | Fri May 8 | $40.80 | 839,261 | 69M | Test suite phase 3-4, e2e green (42/42), Google OAuth, bug fixes |
| Day 3 | Sat May 9 | $86.13 | 1,564,421 | 163M | PostHog analytics integration (20 events), Railway deployment debugging, docs (ARCHITECTURE, TECHNICAL_DECISIONS, ROADMAP) |
| *(overlap)* | May 6 UTC / May 7 PKT | $53.03 | 853,687 | 105M | Early sessions (design, scaffolding, initial build) |
| *(overlap)* | May 10 UTC / May 9 PKT | $34.05 | 331,077 | 76M | Late sessions (deployment fixes, credential docs) |
| **Total** | **May 7–9** | **~$272** | **4,679,058** | **501M** | Timestamps UTC; Pakistan = UTC+5 |

---

## How to calculate your spend

Claude Code shows token usage in the session. Alternatively check the Anthropic console at `console.anthropic.com`.

**Pricing reference (claude-sonnet-4-6, as of May 2026):**
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens
- Cache read: $0.30 / 1M tokens (significant saving — keep context warm)

**Quick math:**
- 10,000 input + 2,000 output = $0.03 + $0.03 = **$0.06** per typical focused session
- A full day of heavy coding ~= 100k input + 20k output = **$0.60**
- Running Opus 4.7 costs ~5× more than Sonnet — use Sonnet as default

---

## Model usage log

| Day | Model | Use case | Was it necessary? |
|---|---|---|---|
| May 7 | Sonnet 4.6 | All fixes (TrackingMap, GPS, Nominatim, RatingModal) | Yes — Sonnet handled all of these |
| | | | |

---

## Tips for staying under budget

1. **Use `/compact` aggressively** — cache read tokens cost 10× less than fresh input tokens. Compact before context grows too large.
2. **One focused prompt > three vague ones** — a prompt that includes file path, root cause, and desired output wastes zero tokens on investigation.
3. **Don't use Opus for routine edits** — file edits, style fixes, adding a field to an interface: always Sonnet.
4. **Use Opus only for:** complex architectural decisions spanning 5+ files, designing a new module from scratch, or when Sonnet has failed twice on the same task.
5. **Avoid re-reading large files** — if you've already read a file in this session, reference line numbers rather than asking Claude to re-read from scratch.
