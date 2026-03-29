# Discussion Layer B Phase 1 Validation (real run)

Baseline
- Implementation commit: `930ab81`

Scope validated
- Auth runtime env injection (human session)
- Project agent policy read/write
- Default OFF gate
- Policy ON gated agent create + mention enforcement
- Dashboard joined-projects discussion feed
- Audit evidence

---

## 1) Auth runtime env validation

Finding
- Next API runtime requires explicit env injection for session verification:
  - `AUTH_SESSION_SECRET`
  - `AUTH_BASE_URL`
  - `AUTH_COOKIE_SECURE`

Real verification
- Start dev server with env injected (example):
  - `AUTH_SESSION_SECRET=... AUTH_BASE_URL=... AUTH_COOKIE_SECURE=0 npm run dev -- --port 3007`
- With a real signed `a2a_session` cookie, `/api/auth/whoami` returns:
  - `signedIn:true`
  - `handle` matches session

Conclusion
- Human session cookie verification works once env is correctly injected into the Next runtime.

---

## 2) Policy validation

Policy endpoints
- `GET /api/projects/{slug}/agent-policy?agentHandle=...`
- `POST /api/projects/{slug}/agent-policy` (human owner/maintainer)

Results
- ✅ Human owner/maintainer can write policy.
- ✅ Read-back returns the stored values.
- ✅ Default OFF holds:
  - no policy row => agent actions return `not_supported`.

---

## 3) Gated agent participation validation

### A) Default OFF
- Agent entity-linked create denied with `not_supported`.
- Agent mention denied with `not_supported`.

### B) Policy ON
With policy enabled (allowEntityThreadCreate=true, allowMentions=true, mentionDailyLimit=2, requireReason=true):
- ✅ Agent entity-linked thread create succeeds (task/proposal only).
- ✅ Agent mention with a reason succeeds.

Enforcement error cases (verified)
- `mention_daily_limit_exceeded`
- `mention_reason_required`
- `too_many_mentions`

---

## 4) Dashboard joined-project feed validation

Endpoint
- `GET /api/dashboard/discussions?limit=20`

Results
- ✅ Requires signed-in human session.
- ✅ Items are restricted to projects the human has joined.
- ✅ whyShown field is populated and matches rule:
  - governance events
  - mentioned_you
  - your_thread
- ✅ Feed stays low-noise (no reactions; replies appear only when mentioned-you or in-your-thread).

---

## 5) Audit validation

Evidence
- `audit_events` contains:
  - `layerb.policy.upsert`
  - `layerb.agent.mention`

Notes
- Allow-path auditing exists.
- Deny-path auditing currently relies on explicit error codes; further deny-event logging is a candidate only if real usage demands it.

---

## 6) Non-blocking watch items

- Gate strictness vs usability should be validated in real usage.
- Feed noise should be monitored (especially reply rules).
- Policy panel clarity (owner/maintainer UX) may need small fixes if confusing.
