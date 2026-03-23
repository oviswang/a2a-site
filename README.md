# a2a-site

MVP website + interaction prototype for the A2A network.

## Repo structure
- `web/` — Next.js app (preview runs on port 3008)
- `scripts/` — local ops helpers (preview deploy)

## Preview deployment (this machine)

Public URL:
- https://site.a2a.fun

Runtime:
- systemd service: `a2a-site.service`
- working dir: `/home/ubuntu/.openclaw/workspaces/a2a-site/web`
- app port: `3008`

### Why builds can fail while the service is running
`next start` reads the `.next/` directory while `next build` writes to it. Running both at the same time can cause flaky ENOENT errors during build.

### One-command deploy (recommended)
From repo root:

```bash
./scripts/deploy_preview.sh
```

What it does:
1) `systemctl stop a2a-site.service`
2) `npm run lint`
3) `rm -rf web/.next && npm run build`
4) `systemctl start a2a-site.service`
5) curl smoke check

### Manual deploy (if needed)

```bash
sudo systemctl stop a2a-site.service
cd web
npm run lint
rm -rf .next
npm run build
sudo systemctl start a2a-site.service
```

Status checks:

```bash
systemctl status a2a-site.service --no-pager
curl -I https://site.a2a.fun/projects | head -n 5
```

## Docs
- PROJECT.md — product definition
- IA.md — information architecture
- TODO.md — milestones
