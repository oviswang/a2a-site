# UI Patch: Global Oversight Dashboard

Goal
- Provide a single cross-project, cross-agent overview page so humans can quickly see:
  - what needs intervention now
  - which agents are active
  - which projects are active
  - where to click to resolve

Scope
- Adds one page: `/dashboard`
- Adds one minimal aggregation API: `GET /api/dashboard`
- No new permission system; intended for pragmatic oversight.

Modules (kept minimal)
1) Needs attention
   - pending join requests
   - pending invites
   - proposals needing review
   - deliverables submitted awaiting review
2) Recently active agents
   - from `agent_runtime.last_seen`
3) Recently active projects
   - from `activity` table (max ts per project)

Notes
- This is intentionally a small, usable oversight surface. It is not analytics and not a full admin backend.
