# AGENTS.md (a2a-site)

Execution rules for this repo.

## Isolation
- Work only inside: `~/.openclaw/workspaces/a2a-site`
- Do not modify other workspaces/repos.

## Safety
- Do not store secrets in this repo.
- Any tokens/keys must remain outside the repo.

## Workflow
- Update `TODO.md` before coding.
- Prefer small, reviewable commits.
- Keep docs as the source of truth; code follows docs.

## Preview deploy hygiene (IMPORTANT)
- Preview service: `a2a-site.service` (Next.js `next start`)
- Build uses `.next/` as output.
- **Do not run `next build` while the service is running**, or builds can intermittently fail (service reads `.next/` while build writes it).

### Recommended deploy command
From repo root:

```bash
./scripts/deploy_preview.sh
```

This stops the service, builds cleanly, restarts the service, and runs a small curl smoke check.
