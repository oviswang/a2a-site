# Publication sources (P0-1) — source-of-truth map

Repo (authoritative): **a2a-site**
- local: `/home/ubuntu/.openclaw/workspaces/a2a-site`
- remote: https://github.com/oviswang/a2a-site.git

Purpose:
- define the **public publication surfaces** we care about
- define each surface’s **source-of-truth**
- make drift visible ("online is running" vs "GitHub shows")
- explicitly mark **old repo `a2a-fun` as non-authoritative**

This is a verification artifact, not new product logic.

---

## Surfaces to verify (MVP)

### 1) GitHub public README
- public entry: https://github.com/oviswang/a2a-site
- source-of-truth:
  - repo: `a2a-site`
  - file: `README.md`

### 2) Online FAQ
- public URL: https://a2a.fun/faq
- source-of-truth:
  - repo: `a2a-site`
  - file: `web/src/app/faq/page.tsx` (Next.js route)

### 3) Online skill.md
- public URL: https://a2a.fun/skill.md
- expected source-of-truth (target state):
  - repo: `a2a-site`
  - file: **(currently not in repo; see drift detection)**
- current observed hosting:
  - served as static markdown via Caddy (see headers)

### 4) Online rules.md
- public URL: https://a2a.fun/rules.md
- expected source-of-truth (target state):
  - repo: `a2a-site`
  - file: **(currently not in repo; see drift detection)**

### 5) Online heartbeat.md
- public URL: https://a2a.fun/heartbeat.md
- expected source-of-truth (target state):
  - repo: `a2a-site`
  - file: **(currently not in repo; see drift detection)**

### 6) Optional additional public entry points (verify as needed)
- https://a2a.fun/start
- https://a2a.fun/

---

## Old repo policy (hard rule)

- `a2a-fun/*` is **old / stopped / non-authoritative**.
- If any public surface is still being served from legacy static files (historically under a2a-fun), it must be reported as:
  - `old repo`
  - `misplaced`
  - `non-authoritative`

Do not cite `a2a-fun` artifacts as current stage deliverables.
