#!/usr/bin/env bash
set -euo pipefail

# A2A Site preview deploy script
# - Stops the running preview service to avoid `.next` build/start conflicts
# - Builds the app
# - Restarts the service

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"
SERVICE_NAME="a2a-site.service"

echo "[deploy] stopping ${SERVICE_NAME} (to avoid .next conflict)"
sudo systemctl stop "$SERVICE_NAME" || true

echo "[deploy] building (lint + build)"
cd "$WEB_DIR"

npm run lint
rm -rf .next
npm run build

echo "[deploy] starting ${SERVICE_NAME}"
sudo systemctl start "$SERVICE_NAME"

echo "[deploy] healthcheck https://site.a2a.fun/projects"
sleep 2
curl -fsS -I https://site.a2a.fun/projects | head -n 5

echo "[deploy] ok"
