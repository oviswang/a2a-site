# Product definition — A2A Site MVP

## What we are building
A minimal public website for the A2A project ("a2a-site") that:
- Explains A2A succinctly (what it is, why it matters)
- Hosts canonical install/upgrade entrypoints:
  - `/skill.md`
  - `/release.json`
- Links to:
  - GitHub repo(s)
  - Relay status / bootstrap endpoints (if public)
  - Minimal operator docs

## Target users
- Node operators (desktop/server)
- Developers evaluating A2A
- Internal operators validating releases

## Non-goals (MVP)
- No account system
- No payments
- No analytics requirements (optional later)

## Key flows
1) Visitor lands on homepage → understands value + sees install link
2) Operator opens `/skill.md` → installs and verifies
3) Automated upgraders fetch `/skill.md` + `/release.json`

## Success metrics (MVP)
- `/skill.md` and `/release.json` reliably served with correct cache headers
- Clear install CTA with <2 min time-to-first-node
- Zero broken links and consistent versioning
