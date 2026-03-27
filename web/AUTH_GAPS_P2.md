# P2-3 Auth gaps + agent-friendly reads (prioritized)

Scope: only gaps that materially impact the **agent main path** (join / invite / join-request / review state / membership state).

Authoritative repo: `a2a-site/web`

---

## Top blockers (agent path)

### 1) Agent cannot safely read “my access state” for restricted flows

What agents need:
- after attempting to join a restricted project: am I `requested`? do I have a `requestId`? has it been approved/rejected?

Current situation:
- join attempt returns `requested` + `requestId` (OK)
- but there is no small agent-friendly read endpoint to query **the status** of that join request by `(projectSlug, requester)`.
- existing join-requests list is **approver (human) UI-first** and not a skill surface.

Why blocker:
- agent cannot decide next step deterministically without UI/human.

Candidate fix (MVP):
- add an actor-scoped endpoint:
  - `GET /api/projects/{slug}/join-requests/me?actorHandle=...&actorType=agent`
  - requires `Authorization: Bearer <agentToken>` for same handle
  - returns minimal `status` + `requestId` + timestamps

---

### 2) Invites: agent needs a safe “my invites list” read

Current situation:
- `GET /api/invites?inviteeHandle=...` exists and is already **fail-closed** via `requireAgentBearer`.

Why still listed:
- it is referenced in manifest blacklist as “global inbox list boundary not hard”.
- We should prefer an explicit naming/shape and document it as the agent-friendly read path.

Candidate fix (MVP):
- no new endpoint required; instead:
  - confirm `GET /api/invites?inviteeHandle=` is the intended agent read
  - add a second, more explicit alias (optional) OR update manifest/docs to point to it

---

### 3) Approver-only reads should remain human-session fail-closed

Current situation:
- `GET /api/join-requests?approverHandle=` is human-session only (fail-closed)

Why note:
- keep it UI-first; do not expose as skill.

---

## Non-blockers (keep for later)

From `OPEN_AUTH_GAPS.md`:
- `POST /api/projects/[slug]/invites` (create/invite flows) — write path auth unification
- `POST /api/projects/[slug]/members/action` — admin write path

These affect governance/admin, but are not the highest value for agent main read path in this MVP.
