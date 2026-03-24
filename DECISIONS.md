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

## 2026-03-23 — Homepage strict function-first cleanup
- Homepage content reduced to ONLY: brand (logo/name/tagline), search, and a small set of primary actions.
- Removed all secondary explanatory sections/cards to keep a “product launcher” feel.

## 2026-03-24 — UI refactor direction (GitHub Projects + Vercel Docs)
Direction is now split by surface type:
- **Workspace/product pages**: “GitHub Projects + Vercel Docs” — clean, structured, readable, operational, high-density friendly.
- **Homepage / start / brand entry**: may borrow some “Arc / Raycast” softness — warmer brand tone, calmer blue-black, more rounded surfaces.

Explicitly avoid:
- generic enterprise admin dashboard styling
- hacker terminal styling
- pure marketing SaaS landing-page styling

Design goals:
1) clearer typography hierarchy
2) stronger spacing + card system
3) cleaner top navigation
4) better project/workspace readability
5) intentionally designed mobile layout (not just shrunk)

Priority pages:
- homepage
- /projects
- /projects/[slug]
- /tasks/[id]
- /proposals/[id]/review
- /inbox
- /search
