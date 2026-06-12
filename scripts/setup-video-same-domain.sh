#!/usr/bin/env bash
# Classroom video on the existing nursing hostname — no new DNS record required.
# Uses the Let's Encrypt cert already on nursing.pameoinvestimentsltd.com (port 443).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_HOST="${JITSI_VIDEO_HOST:-nursing.pameoinvestimentsltd.com}"
NGINX_DEST="/etc/nginx/conf.d/nursing.pameoinvestimentsltd.conf"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run with sudo: sudo $ROOT/scripts/setup-video-same-domain.sh"
  exit 1
fi

echo "==> Backing up current nginx site (if present)..."
if [[ -f "${NGINX_DEST}" ]]; then
  cp -a "${NGINX_DEST}" "${NGINX_DEST}.bak.$(date +%Y%m%d%H%M%S)"
fi

echo "==> Installing nginx config (video paths + app on ${APP_HOST})..."
install -m 644 "${ROOT}/scripts/nginx/nursing.pameoinvestimentsltd.conf" "${NGINX_DEST}"
nginx -t
systemctl reload nginx

echo "==> Updating .env and restarting Docker stacks..."
cd "${ROOT}"
if grep -q '^JITSI_PUBLIC_URL=' .env 2>/dev/null; then
  sed -i "s|^JITSI_PUBLIC_URL=.*|JITSI_PUBLIC_URL=https://${APP_HOST}|" .env
else
  echo "JITSI_PUBLIC_URL=https://${APP_HOST}" >> .env
fi
if grep -q '^JITSI_VIDEO_HOST=' .env 2>/dev/null; then
  sed -i "s|^JITSI_VIDEO_HOST=.*|JITSI_VIDEO_HOST=${APP_HOST}|" .env
else
  echo "JITSI_VIDEO_HOST=${APP_HOST}" >> .env
fi

export JITSI_PUBLIC_URL="https://${APP_HOST}"
export JITSI_VIDEO_HOST="${APP_HOST}"

docker compose up -d --force-recreate jitsi-web jitsi-prosody jitsi-jicofo jitsi-jvb
docker compose build --build-arg "VITE_JITSI_DOMAIN=${APP_HOST}" frontend
docker compose up -d frontend api

echo ""
echo "Done — video uses https://${APP_HOST} (same cert as the app, no :8443 in the browser)."
echo "Test: curl -sI https://${APP_HOST}/external_api.js | head -1"
echo "Then hard-refresh the app (Ctrl+Shift+R) and open a live classroom."
