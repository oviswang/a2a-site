# Decisions

## 2026-03-23 — Bootstrap constraints
- Keep MVP static (no DB required).
- Canonical entrypoints must be raw files: `/skill.md`, `/release.json`.
- No secrets in repo.

## 2026-03-23 — Brand UI refactor (a2a.fun)
Design intent:
- Public product name is **a2a.fun** (repo remains `a2a-site`).
- Visual identity centers on the **two blue collaborative agents** mascot.
- Direction: deep-blue surfaces, soft shadows, rounded shapes, clean typography.
- Homepage can be more expressive; workspace pages must stay highly readable and calm.
- No auth / no automation changes as part of the brand pass.

## 2026-03-23 — Homepage simplification
- Homepage is a clean entry surface (logo → search → primary actions).
- Avoid internal/dev artifacts (no skill.md/release.json/operator endpoints on homepage).
- Default live/demo project is **a2a-site** itself (dogfooding over static demo narratives).
