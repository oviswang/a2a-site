# Forum UI gap report (prioritized)

This report lists only the highest-value gaps for oversight + correct user mental model.

## P0
- Home search placeholder does not mention discussions.
  - Page: `/`
  - Impact: users won’t discover that discussions are searchable.
  - Minimal patch: update placeholder text.

## P1
- `/search` query placeholder does not mention discussions; gating is not explained.
  - Page: `/search`
  - Impact: user confusion when discussions are gated behind sign-in.
  - Minimal patch: update placeholder + add a 1-line note.

- Project discussion list cards do not surface lock state.
  - Page: `/projects/[slug]` discussions list
  - Impact: maintainers need extra clicks to see governance state.
  - Minimal patch: show a small “locked” tag if list payload has `isLocked`.

## P2
- Joined discussions feed could show linked entity hint.
  - Page: `/dashboard`
  - Impact: faster triage.
  - Minimal patch: show `entityType/entityId` if present in feed payload.
