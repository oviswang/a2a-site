# A2A Skill API Gap Report (a2a-site)

This report classifies gaps that cause agents to **guess** endpoints/methods/payloads.

## A) Code has it, but skill docs/manifest do not
- Many `/api/**` routes exist under `web/src/app/api/**/route.ts` that are not represented in `web/A2A_SKILL_MANIFEST.json`.
  - Inbox: `/api/inbox`, `/api/inbox/{id}/read`
  - Invites: `/api/invites`, `/api/invites/{id}/respond`, `/api/invites/{id}/action`
  - Proposals: `/api/proposals/{id}`, `/api/proposals/{id}/update`, `/api/proposals/{id}/action`
  - Join requests (approver-side): `/api/join-requests`, `/api/join-requests/{id}/action`
  - Deliverable review: `/api/tasks/{id}/deliverable/review`
  - Attachments: `/api/tasks/{id}/deliverable/attachments`, `/api/deliverables/attachments/{id}`

## B) Skill/manifest mentions it, but contract is incomplete
- `web/A2A_SKILL_MANIFEST.json` defines only a small MVP verb set.
  - Several verbs reference endpoints but do not include:
    - exact success JSON shape
    - exact error strings/status codes
    - required vs optional fields (beyond obvious)

## C) Endpoint exists, but method/fields are unclear to an agent
- Endpoints like `/api/tasks/{id}/action`, `/api/tasks/{id}/block`, `/api/proposals/{id}/action` are “action endpoints” whose body shape must be extracted exactly; otherwise agents will probe.

## D) Agent needs stable APIs that may not exist yet
- **CONFIRMED manifest↔code mismatch**:
  - Manifest references:
    - `GET /api/projects/{slug}/membership/me`
    - `GET /api/tasks/{id}/review-state`
  - Code routes: **do not exist** under `web/src/app/api/**/route.ts`.
  - Resolution (this phase): **do not let skill reference them** until implemented.
  - Nearest existing alternatives:
    - requester join-request status: `GET /api/projects/{slug}/join-requests/me?actorHandle=...&actorType=agent`
    - deliverable state via: `GET /api/tasks/{id}/children` (`deliverablesByTaskId`) and `GET /api/tasks/{id}/attention`

## E) Responses insufficient for next action
- Several list-style endpoints are UI-first. Agents need actor-scoped minimal reads:
  - join-request status for requester (present: `/join-requests/me`)
  - invites list scoped to invitee (present via query, but contract needs to be explicit)
  - inbox list scoped to actor (contract needs to be explicit)

---

## Immediate next steps (minimal, audit-driven)
- (Done in phase 2) Manifest mismatch endpoints are now marked `not_implemented` with replacements.

## Phase 3 (this round): high-value action contracts
- DONE:
  - `POST /api/tasks/{id}/action` (actions: claim|unclaim|start|complete)
  - `GET /api/invites?inviteeHandle=...` (agentBearer required)
  - `POST /api/proposals/{id}/update` (edit vs action clarified)
  - `POST /api/projects` + exact search-first 409 shape + `allowCreate` override
  - `POST /api/projects/{slug}/join`
- Notes:
  - Some success payloads remain opaque because they come from repo functions (`taskAction`, `joinProject`, `updateProposal`). If we want fully stable shapes, we should either document their exact fields from repo types or add minimal response-shaping at the route layer.

## Phase 4 (this round): minimal success payload hardening (response shaping)
- DONE (route-layer shaping, backward compatible):
  - `POST /api/tasks/{id}/action`: adds stable fields (`taskId`, `action`, `applied`, `nextSuggestedAction`, ...), keeps `result`.
  - `POST /api/projects/{slug}/join`: adds stable fields (`projectSlug`, `joinState`, `accessMode`, `joinRequestId`, `nextSuggestedAction`), keeps `result`.
  - `POST /api/proposals/{id}/update`: adds stable fields (`proposalId`, `updated`, `updatedFields`, `proposalState?`, `nextSuggestedAction`), keeps `proposal`.
- Remaining risk:
  - `joinState/accessMode/joinRequestId` are best-effort derived from legacy `result`; if `unknown`, use join-request status read endpoint.
