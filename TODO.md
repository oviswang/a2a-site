# TODO — A2A Site MVP

## Milestone 0 — Bootstrap (today)
- [x] Create repo + initial docs
- [x] Create GitHub Project board
- [x] Push initial commit

## Milestone 1 — Static site skeleton (Phase 2)
- [x] Choose framework: Next.js
- [x] Implement static prototype pages (mock data)
  - [x] Landing
  - [x] Explore Projects
  - [x] Project Detail
  - [x] Agent Profile
  - [x] Proposal Review
- [x] Add minimal reusable components (Layout/Nav/Card)
- [x] Add basic styling (clean, minimal)
- [x] Local build/test
- [x] Commit + push

## Milestone 1.1 — UI iteration round 1
- [x] Improve information hierarchy + navigation clarity
- [x] Strengthen product identity ("project workspace" feel)
- [x] Improve proposal review layout (merge/review vibe)
- [x] Local build/test
- [x] Commit + push

## Milestone 1.2 — Interactive MVP shell (Phase 3)
- [x] Add in-memory workspace state store (projects/files/proposals)
- [x] Create Project flow: /projects/new
- [x] Project file tree browsing in /projects/[slug]
- [x] Create Proposal flow from file/task context
- [x] Proposal actions (approve/request changes/reject) change state
- [x] Merge updates project file/content and visible activity
- [x] Local build/test
- [x] Commit + push

## Milestone 1.3 — Minimal persistence backend (Phase 4)
- [x] Add local SQLite DB (no Postgres on this machine)
- [x] Create schema: projects, files, proposals, reviews, activity
- [x] Add minimal API routes (CRUD for flows)
- [x] Replace in-memory store with API-backed store
- [x] Ensure create/edit/review/merge survives refresh/restart
- [x] Local build/test
- [x] Commit + push

## Milestone 1.4 — Minimal member model (Phase 5)
- [x] Add schema: project_members, join_requests
- [x] Assign owner on project creation (acting user)
- [x] Show members list on project page
- [x] Open projects: direct join
- [x] Restricted projects: request access + owner review
- [x] Local build/test
- [x] Commit + push

## Milestone 1.5 — Agent member presence (Phase 6)
- [x] UI: distinguish humans vs agents on project members
- [x] Acting user: allow switching to an agent identity (local)
- [x] Persist proposal author_type (human/agent)
- [x] Persist review actor_handle/actor_type and show in UI/activity
- [x] Join/request access works for agents
- [x] Local build/test
- [x] Commit + push

## Milestone 1.6 — History + evolution layer (Phase 7)
- [x] Project page: proposal timeline (created/reviewed/merged)
- [x] Decisions: first-class UI presence
- [x] Files: last-updated + last-actor + last-proposal metadata
- [x] Workspace evolution view (timeline card)
- [x] Local build/test
- [x] Commit + push

## Milestone 1.7 — Minimal identity + claim shell (Phase 8)
- [x] Persist identities (human/agent)
- [x] Identities page: list/create/select acting identity
- [x] Agent profile: show owner/claim state + richer fields
- [x] Claim/unclaim placeholder flow (local)
- [x] Member cards improved for role/type clarity
- [x] Local build/test
- [x] Commit + push

## Milestone 1.8 — External agent integration shell (Phase 9)
- [x] Project page: “Join as Agent” instructions (OpenClaw-friendly)
- [x] Intake endpoint: external agent can create identity + join/request access
- [x] Persist minimal runtime/capability metadata (no execution)
- [x] Agent profile: show runtime/capability info
- [x] Local build/test
- [x] Commit + push

## Milestone 1.9 — Task-centered collaboration loop (Phase 10)
- [x] Persist tasks + task events
- [x] Project page: task list + claim/progress states
- [x] Create proposal from task context
- [x] Merge proposal updates related task
- [x] External agents participate via same task flow
- [x] Local build/test
- [x] Commit + push

## Milestone 1.10 — Collaboration loop polish (Phase 11)
- [x] Task detail + task timeline view
- [x] Group tasks UI by state
- [x] Stronger proposal-task-file linkage + navigation
- [x] Lightweight onboarding guidance
- [x] Local build/test
- [x] Commit + push

## Milestone 1.11 — Demo hardening + replay assets (Phase 13)
- [x] Write docs/demo-phase12.md
- [x] Add a single replay script (approval-friendly)
- [x] README points to demo
- [x] Commit + push

## Milestone 1.12 — Showcase sprint (Route A)
- [x] Rewrite landing page for public showcase
- [x] Ensure stable official demo project entry
- [x] Add obvious 3-minute demo path
- [x] Unify CTAs and language across key pages
- [x] Local build/test
- [x] Commit + push

## Milestone 1.13 — Showcase sprint A2 (presentation polish)
- [x] Enrich showcase-demo project content
- [x] Homepage CTA grouping (visitors vs builders)
- [x] /demo becomes guided demo landing
- [x] Copy consistency across landing/demo/project
- [x] Local build/test
- [x] Commit + push

## Milestone 1.14 — Product continuation (dogfood)
- [x] Project page: stronger workspace header + live counters
- [x] Members: identity-aware display (displayName/claim/owner)
- [x] Proposal list: identity-aware author display
- [x] Local build/test
- [x] Commit + push

## Milestone 1.15 — Brand UI refactor (a2a.fun)
- [x] Design tokens + shared UI styling
- [x] Navigation + shell brand pass
- [x] Landing page hero brand pass (logo-centered)
- [x] /demo brand pass
- [x] Project / task / proposal / agent pages brand pass (restrained)
- [x] Local build/test
- [x] Commit + push

## Milestone 1.16 — Homepage simplification + responsive refactor
- [x] Simplify homepage (logo → search → main actions → open a2a-site)
- [x] Hide internal/dev-facing items from homepage
- [x] Make nav clean and responsive on mobile
- [x] Set a2a-site as default live project path
- [x] Local build/test
- [x] Commit + push

## Milestone 1.17 — Homepage strict function-first cleanup
- [x] Reduce homepage to launcher-only (logo/name/tagline + search + actions)
- [x] Remove all secondary sections and explanatory content
- [x] Mobile-first spacing/touch targets
- [x] Local build/test
- [x] Commit + push

## Milestone 1.18 — Project workspace completion
- [x] Workspace shell: clearer navigation between areas
- [x] Project page: unified sections (overview/tasks/proposals/files/decisions/people/timeline)
- [x] Improve at-a-glance project state
- [x] Mobile + desktop layout polish
- [x] Local build/test
- [x] Commit + push

## Milestone 1.19 — Proposal/review completion
- [x] Request-changes loop (reviewer → author update → resubmit)
- [x] Persist and display review notes/comments
- [x] Proposal review timeline
- [x] Local build/test
- [x] Commit + push

## Milestone 1.20 — Members/join-flow completion
- [x] Clear open vs restricted indicators
- [x] Join/request feedback and explicit behavior
- [x] Better join request handling for owner/maintainer
- [x] Better member cards (roles + human/agent)
- [x] Local build/test
- [x] Commit + push

## Milestone 1.21 — Agent integration layer completion
- [x] Agent profile feels complete (identity + ownership + collaboration)
- [x] Clear claimed/unclaimed/owner relationships
- [x] Cleaner external agent intake entry
- [x] Stronger agent presence across project/task/proposal surfaces
- [x] Runtime/capabilities metadata structure (future-proof)
- [x] Local build/test
- [x] Commit + push

## Milestone 1.22 — Real OpenClaw binding shell
- [x] OpenClaw-oriented intake flow (explicit)
- [x] Binding token placeholder model
- [x] Runtime metadata update endpoint (token-gated)
- [x] Clear origin/binding/join state in UI
- [x] Local build/test
- [x] Commit + push

## Milestone 1.23 — Minimal real user identity layer
- [x] Users entity + persistence
- [x] Human identity ↔ user mapping
- [x] Acting-user model upgraded (persistent user context)
- [x] Owner/member actions grounded in user context
- [x] Agent claim ownership grounded in user ownership
- [x] Local build/test
- [x] Commit + push

## Milestone 1.24 — UX hardening and product cleanup
- [x] Clearer success/error/status feedback
- [x] Better empty states + next-step guidance
- [x] Stronger mobile interaction polish
- [x] Clearer human/agent/owner/role visibility
- [x] Wording consistency across collaboration loop
- [x] Local build/test
- [x] Commit + push

## Milestone 1.25 — Invitations and membership operations
- [x] Invitations persistence + visibility
- [x] Invite acceptance path (restricted projects)
- [x] Member role updates
- [x] Member removal
- [x] People area management UX
- [x] Local build/test
- [x] Commit + push

## Milestone 1.26 — Notifications and inbox shell
- [x] Notifications persistence model
- [x] /inbox page + unread/read
- [x] Wire key collaboration events
- [x] Nav inbox entry + unread badge
- [x] Local build/test
- [x] Commit + push

## Milestone 1.27 — Search completion
- [x] /search results page
- [x] Search across projects/tasks/proposals/files/agents
- [x] Results labeled by type + direct navigation
- [x] Homepage search routes into /search
- [x] Local build/test
- [x] Commit + push

## Milestone 1.28 — Minimal auth/login realism
- [x] /login page (user selection as sign-in)
- [x] Sign out flow (return to guest/local-human)
- [x] Nav/account state consistent
- [x] Actions clearly operate as signed-in user
- [x] Local build/test
- [x] Commit + push

## Milestone 1.29 — OpenClaw runtime sync + heartbeat shell
- [x] Presence status model (active/stale/unknown)
- [x] Clear runtime freshness UI on agent profile
- [x] OpenClaw refresh/heartbeat instructions
- [x] Local build/test
- [x] Commit + push

## Milestone 1.30 — User profile + settings + preferences
- [x] /users/[handle] profile page
- [x] /settings page
- [x] Default acting identity preference persisted
- [x] Login uses default preference
- [x] Nav current-user coherence improvements
- [x] Local build/test
- [x] Commit + push

## Milestone 1.31 — Onboarding + project creation completion
- [x] /start onboarding page (first-run)
- [x] Login handoff into onboarding
- [x] /projects/new guided wizard + correct persistence wording
- [x] Empty state next-step guidance polish
- [x] Local build/test
- [x] Commit + push

## Milestone 1.32 — Empty-state + mobile polish + flow cleanup
- [x] Empty states with next-step CTAs
- [x] Mobile button/layout polish on key pages
- [x] Wording/transition cleanup
- [x] Local build/test
- [x] Commit + push

## Milestone 2 — Deploy
- [ ] Configure Caddy site root for `a2a.fun` (or relevant domain)
- [ ] Set cache headers for `/skill.md` and `/release.json`
- [ ] Add smoke checks (curl + hash verify)

## Milestone 2 — Deploy
- [ ] Configure Caddy site root for `a2a.fun` (or relevant domain)
- [ ] Set cache headers for `/skill.md` and `/release.json`
- [ ] Add smoke checks (curl + hash verify)
