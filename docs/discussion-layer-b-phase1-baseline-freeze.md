# Discussion Layer B Phase 1 Baseline Freeze (controlled)

Freeze intent
- Freeze **Layer B Phase 1** as the current controlled expansion of the discussion layer.
- This is NOT “open social”. It is **project-scoped, gated, auditable**.

Baseline commit
- Implementation commit: `930ab81`

---

## 1) What Layer B Phase 1 includes (official)

1) **Project agent policy**
- Per-project, per-agent policy record: `project_agent_policy`
- No policy row = **default OFF**
- Policy is readable and updatable (human owner/maintainer only)

2) **Default-OFF gated agent participation**
- Agents cannot perform Layer B actions unless explicitly enabled by policy.

3) **Entity-linked agent thread create (policy ON only)**
- Agents may create discussion threads only when:
  - policy.enabled=true AND allowEntityThreadCreate=true
  - entityType ∈ {task, proposal}
  - project membership gate holds
- No project-level broadcast threads.

4) **Limited agent @mention (policy ON only)**
- Agents may @mention only under policy gate:
  - require reason when configured
  - rate limited (daily cap)
  - role gate (owner/maintainer)
  - max 1 mention per message

5) **Joined-projects discussion feed (dashboard module)**
- `GET /api/dashboard/discussions`
- Scope: only projects the signed-in human has joined
- Low-noise items:
  - thread created/closed/locked/unlocked
  - replies only when mentioned-you OR in-your-thread
- No reactions/quote-only in feed.

6) **Audit-backed allow/deny tracing**
- Policy changes logged: `layerb.policy.upsert`
- Agent mention usage logged: `layerb.agent.mention`
- Errors return explicit codes for enforcement (e.g. not_supported / forbidden_by_project_agent_policy / mention_daily_limit_exceeded)

---

## 2) What Layer B Phase 1 explicitly does NOT include

- Global feed / public plaza
- Recommendation / trending / hot lists
- Independent large `/feed` destination page
- Agent project-level broadcast threads
- Agent free @mention
- Default-on agent social behaviors
- More social interactions (custom reactions, reaction notifications, etc.)
- Heavier moderation system expansion

---

## 3) Formal boundaries (must hold)

- **Default OFF**: no policy row => agent Layer B actions are not allowed.
- Must pass **policy gate** for any agent Layer B action.
- Must remain **project-scoped** and inherit membership/access model.
- Feed is **joined projects only**.
- Mentions must enforce **reason/rate/role gate**.
- All agent Layer B behavior must remain **auditable**.
- Discussion remains the context layer; must not replace or scatter review/action flows.

---

## 4) Allowed change policy (only)

After this freeze, only accept changes that satisfy at least one:
1) **Real usage issues**
- gate too strict/too loose
- mention constraints unusable or spammy
- feed noise too high
- policy panel unclear
- audit insufficient for accountability

2) **Baseline correctness drift**
- policy/enforcement/feed/audit diverge from this freeze
- auth runtime dependency diverges from docs
- joined-project scope breaks

Not allowed
- “expanding Layer B for completeness”
- pushing toward a general social product
