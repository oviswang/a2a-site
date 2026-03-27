# PUBLIC_DOCS_SOURCES.md

Purpose: map **public a2a.fun docs/pages** to their **true editable source-of-truth locations** on this machine.

Rule for future sessions:
- **Check this file first** before editing any public-facing doc.
- Do **not** assume public docs live inside the Next.js app repo.
- After any edit, **verify the live URL** directly.

---

## Public static docs (served by Caddy static root, NOT the Next.js app)

These URLs are served from a static directory and will NOT be affected by edits under `src/app/*`.

Hard rule:
- For these URLs, the **only** publishable source is the file under `/var/www/a2a-fun-site/*` that Caddy serves.
- Any copies under git repos (including this Next.js repo, other workspaces, or `/home/ubuntu/.openclaw/workspace/*`) are **non-authoritative** and must be treated as drafts/notes only.

Verification (must do after edits):
- `curl -fsSL https://a2a.fun/<doc>.md | head`

- https://a2a.fun/skill.md
  - Source-of-truth: `/var/www/a2a-fun-site/skill.md`
  - Served by: Caddy `handle /skill.md { root * /var/www/a2a-fun-site }`

- https://a2a.fun/heartbeat.md
  - Source-of-truth: `/var/www/a2a-fun-site/heartbeat.md`
  - Served by: Caddy `handle /heartbeat.md { root * /var/www/a2a-fun-site }`

- https://a2a.fun/rules.md
  - Source-of-truth: `/var/www/a2a-fun-site/rules.md`
  - Served by: Caddy `handle /rules.md { root * /var/www/a2a-fun-site }`

Non-public / do-not-edit-as-source:
- `/var/www/a2a-fun-site/faq.md`
  - Not served to users (no Caddy `handle /faq.md`), and `https://a2a.fun/faq.md` is 404.
  - Treat as **deprecated**; do not edit expecting it to change https://a2a.fun/faq.

Notes:
- Editing these files usually does **not** require restarting `a2a-site.service`.
- Always confirm by fetching the live URL after editing.

---

## Next.js-routed pages (served by the app)

These pages are served by the Next.js app behind Caddy reverse_proxy:
- Upstream: `a2a-site.service` → `next start` on `127.0.0.1:3008`
- Repo/worktree: `/home/ubuntu/.openclaw/workspaces/a2a-site/web`

Key routes and source paths:
- https://a2a.fun/start
  - Source: `src/app/start/page.tsx`

- https://a2a.fun/faq
  - Source: `src/app/faq/page.tsx`

- https://a2a.fun/terms
  - Source: `src/app/terms/page.tsx`

- https://a2a.fun/privacy
  - Source: `src/app/privacy/page.tsx`

(If you change these, you typically need: `npm run build` + restart `a2a-site.service`.)

---

## Editing rules (operational)

1) Identify whether the target URL is:
   - static-served (`/var/www/a2a-fun-site/*`) OR
   - Next.js-routed (`/home/ubuntu/.openclaw/workspaces/a2a-site/web/src/app/*`)

2) Edit the **real** source file.

3) Verify live:
   - `curl -fsSL https://a2a.fun/<path>`

4) Restart only if needed:
   - static docs: usually no restart
   - Next.js pages: build + `sudo systemctl restart a2a-site.service`

5) Do not report success based only on local edits; require live verification.

- Root domain only (public): https://a2a.fun
- site.a2a.fun is internal/non-public; do not reference in UI/docs.
