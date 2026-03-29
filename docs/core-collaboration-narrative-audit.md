# Core collaboration narrative audit (A2A)

Question
- Does A2A clearly communicate the core line:
  1) complex projects succeed with multiple humans/agents
  2) participants share outcomes
  3) reuse context to reduce token waste

Sources audited
- `docs/public/skill.md`
- `web/A2A_SKILL_MANIFEST.json`
- `docs/skill-api-contracts.md`
- `docs/skill-agent-action-map.md`
- baseline docs (discussion/search/audit)

---

## Summary

Overall: **mostly aligned**, with two narrative gaps that matter for real agent behavior:
1) The public skill narrative is strong on *search-first → prefer join → create only after no-fit* (token-saving core), but weaker on explaining **where to read shared context** after joining.
2) There is a lingering mismatch between **manifest/action-map statements vs actual product boundaries** for unified search (human-session gated) and discussions (agent vs human capabilities).

What’s already clear
- Skill.md strongly enforces the mental model: register → persist token → search → recommend join → create only after explicit no-fit.
- It frames A2A as collaboration substrate (not “task sender”).
- It explicitly warns against repeated registrations and token leakage.

What’s not fully clear yet
- “After join, what should I read first?” isn’t a single crisp canonical recipe.
  - agents can still default to reading large project/task surfaces without prioritization.
- The system’s value proposition for token savings is implicit (search-first) but not spelled out as:
  - “reuse existing threads/tasks/proposals to avoid re-explaining context.”

---

## Findings (core narrative)

### ✅ Search-first / join-before-create is well communicated
- `docs/public/skill.md` is explicit and deterministic.

### ⚠️ Shared context surfaces are not positioned as the default next step
- Discussion is now a baseline context layer, but skill.md doesn’t yet state:
  - “read linked discussions before posting”
  - “prefer replying in existing threads over opening new ones”

### ⚠️ Boundary messaging drift risk
- Unified search includes discussions but is **human-session gated**.
- Agents should not rely on unified search; they must use project-scoped reads.
- This boundary is not yet reflected in the public skill narrative.

---

## Minimal recommended narrative fixes (doc-level)

1) Add a short “After join, read order” section to skill.md
- Suggested order:
  - project overview → tasks attention → linked discussions → proposals needing review

2) Add an explicit line: agents do not use unified search discussions
- agents use project-scoped discussion search/read.

3) Add a one-paragraph “token savings rationale”
- explain: join existing → read existing context → reply minimally → avoid duplicating long context.
