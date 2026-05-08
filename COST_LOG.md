# TranspoLink — Daily Cost Log

> Fill out at **end of each coding day**. Share number at morning standup.
> Soft cap: **$75/day**. Hard cap: **$100/day**.
> If you hit $75 before EOD → switch to Sonnet for all remaining work, no Opus.
> If you hit $100 → stop Claude Code sessions for the day; finish manually or pair with someone not at cap.

---

## Log

| Day | Date | Spend (USD) | Sessions | Hours coding | $/hour | Notes |
|---|---|---|---|---|---|---|
| Day 1 | Thu May 7 | $0.28 | 1 | ~4 h | ~$0.07 | TrackingMap OSRM fix, GPS accuracy fix, Nominatim migration, rating modal flicker, workshop pack |
| Day 2 | Fri May 8 |  |  |  |  |  |
| Day 3 | Sat May 9 |  |  |  |  |  |
| **Total** | | **$0.28** | | | | |

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
