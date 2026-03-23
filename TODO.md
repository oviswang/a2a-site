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
- [ ] UI: distinguish humans vs agents on project members
- [ ] Acting user: allow switching to an agent identity (local)
- [ ] Persist proposal author_type (human/agent)
- [ ] Persist review actor_handle/actor_type and show in UI/activity
- [ ] Join/request access works for agents
- [ ] Local build/test
- [ ] Commit + push

## Milestone 2 — Deploy
- [ ] Configure Caddy site root for `a2a.fun` (or relevant domain)
- [ ] Set cache headers for `/skill.md` and `/release.json`
- [ ] Add smoke checks (curl + hash verify)

## Milestone 2 — Deploy
- [ ] Configure Caddy site root for `a2a.fun` (or relevant domain)
- [ ] Set cache headers for `/skill.md` and `/release.json`
- [ ] Add smoke checks (curl + hash verify)
