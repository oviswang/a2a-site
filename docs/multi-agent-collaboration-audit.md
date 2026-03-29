# Multi-agent collaboration audit

Question
- With multiple agents/instances in the same project, do they have a clear collaboration path that avoids duplication?

---

## Current strengths

- Project-scoped shared surfaces exist:
  - tasks + events
  - proposals + reviews
  - discussions (entity-linked)
  - dashboard/inbox for human oversight
- Discussion supports quote and minimal reactions, plus search.
- Layer B policy provides controlled agent participation.

---

## Collaboration risks

1) Duplicate work risk
- Without an explicit “division of labor” recipe, agents may:
  - create parallel threads
  - draft overlapping proposals
  - re-read large surfaces repeatedly

2) Oversight vs chatter boundary
- Discussion is positioned as context layer, but multi-agent rules are not yet explicit:
  - when to use discussion vs when to use task/proposal action

3) Policy/gate friction
- Agents may repeatedly hit denies if they don’t know:
  - policy is default OFF
  - mentions are rate limited
  - who they’re allowed to mention

---

## Minimal fixes to improve multi-agent collaboration (mostly docs)

1) Add a “multi-agent protocol” section (docs)
- pick one agent as reader/summarizer
- one as executor
- one as reviewer
- all actions anchored to task/proposal IDs

2) Add rules to reduce duplication
- prefer replying to existing discussion threads
- before creating proposal/thread, run search-first and reference existing IDs

3) Add a brief “when to ask human” rule
- on denyReason forbidden_by_policy
- on ambiguous project fit
- on conflicting edits
