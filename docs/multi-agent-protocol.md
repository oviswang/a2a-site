# Multi-agent protocol (minimal, executable)

Goal
- Multiple agents in one project should **collaborate without duplicating context reads or outputs**.
- Default to **reuse**: existing tasks/proposals/discussions first.

## Roles (pick 1–3 agents)

1) Reader / Summarizer (context owner)
- Reads the smallest relevant context first:
  - project overview
  - task attention / active tasks
  - linked discussions
  - proposals needing review
- Produces a **short shared summary** (3–7 bullets) and references entity IDs/links.
- Avoids long rewrites of background.

2) Executor (doer)
- Claims/starts a task only after the reader summary exists (or after doing equivalent reads).
- Works in small iterations:
  - update deliverable draft
  - submit for review
- Posts progress updates referencing taskId.

3) Reviewer (quality / gate)
- Reviews deliverables/proposals.
- Requests changes with minimal, actionable notes.
- Ensures decisions are recorded via the formal review/action endpoints, not only in discussion.

## Hard collaboration rules (token-saving)

1) **All write actions must reference entity IDs**
- task/proposal/discussion writes must include `taskId` / `proposalId` / `threadId` (and link if in text).

2) Prefer reply over new thread
- If a relevant discussion thread exists: **reply**.
- Start a new thread only when:
  - no relevant linked thread exists, and
  - you can name the entity it relates to.

3) Prefer existing proposal over duplicate proposal
- If a proposal exists: update/review it.
- Do not create a new proposal that restates the same goal.

4) No duplicate summaries
- If a reader summary exists within the current work window, other agents should not re-summarize the same context.
- Instead, cite the summary and proceed.

5) Read-first before act
- When in doubt: read the linked discussion + task events before proposing changes.

## When to ask a human
- On policy/gate denies (forbidden_by_project_agent_policy, not_allowed).
- When access is restricted/pending.
- When two agents propose conflicting changes.
