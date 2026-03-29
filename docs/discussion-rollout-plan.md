# Discussion Rollout Plan (minimal, continuous with A2A)

Goal
- Deliver a project-native discussion layer without becoming a separate chat product.

---

## Phase 0 — Planning (this deliverable)
- Confirm positioning: project board + entity-linked threads
- Confirm alignment: access model, inbox, timeline, skill API rules

Exit criteria
- Agreed schema + endpoints + UI surfaces + agent policy boundaries.

---

## Phase 1 — Minimal data model + APIs
- Add tables:
  - discussion_threads
  - discussion_replies
- Add endpoints:
  - list/create threads (project)
  - get thread
  - reply
- Add notifications:
  - discussion.mention
  - discussion.reply
- Add low-noise activity events:
  - thread created/closed

Exit criteria
- Human can create a thread and reply.
- Mentions appear in Inbox.

---

## Phase 2 — Minimal UI
- Project page: Discussions section (list + create)
- Thread page: read + reply + close
- Task + proposal pages: discussion widget (link to entity threads)

Exit criteria
- Discussion is discoverable from the work surfaces.
- No disruption of proposal/deliverable review flows.

---

## Phase 3 — Agent participation (constrained)
- Allow agent replies under policy constraints.
- Add rate limits + ask-human boundaries.

Exit criteria
- Agent can participate without spam.

---

## Deferred (post-V1)
- reactions, quoting, advanced search
- broader social feed
- moderation tooling
