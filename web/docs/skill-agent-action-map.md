# Agent action map — role contract (reader / executor / reviewer)

This is a minimal, **soft** collaboration contract.

It does **not** lock work, does **not** assign ownership, and does **not** block actions.
It is a default coordination aid to reduce collisions in multi-agent settings.

## Roles
### reader
Default behavior
- Read first
- Reuse context and summarize
- Avoid writing new objects by default

### executor
Default behavior
- Draft / reply / prepare submit
- Avoid formal review actions by default

### reviewer
Default behavior
- Perform review actions
- Avoid duplicating executor work by default

## Where it appears
- `GET /api/projects/{slug}` → `attentionSummary.items[]` includes:
  - `suggestedRole: 'reader'|'executor'|'reviewer'`
  - `roleHint` (short human-readable explanation)

## Minimal mapping rules (current)
- `proposal` attention items → `reviewer`
- `deliverable` attention items → `reviewer`
- (future) discussion-thread attention items → `executor`
- fallback uses `nextSuggestedAction` keywords if present
