#!/usr/bin/env bash
# One-time setup: DNS + Let's Encrypt + nginx proxy for the classroom video server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VIDEO_HOST="${JITSI_VIDEO_HOST:-video.nursing.pameoinvestimentsltd.com}"
SERVER_IP="${JITSI_SERVER_IP:-57.129.125.218}"
WEBROOT="/var/www/certbot-nursing"
NGINX_DEST="/etc/nginx/conf.d/video.nursing.pameoinvestimentsltd.conf"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run with sudo: sudo $ROOT/scripts/setup-video-server.sh"
  exit 1
fi

echo "==> Checking DNS for ${VIDEO_HOST}..."
RESOLVED="$(dig +short "${VIDEO_HOST}" A | head -1 || true)"
if [[ -z "${RESOLVED}" ]]; then
  echo ""
  echo "ERROR: ${VIDEO_HOST} has no DNS A record yet."
  echo ""
  echo "Option A — add DNS, then re-run this script:"
  echo "  ${VIDEO_HOST}  A  ${SERVER_IP}"
  echo ""
  echo "Option B — no DNS needed (uses your existing nursing cert on port 443):"
  echo "  sudo ${ROOT}/scripts/setup-video-same-domain.sh"
  exit 1
fi
if [[ "${RESOLVED}" != "${SERVER_IP}" ]]; then
  echo "WARNING: ${VIDEO_HOST} resolves to ${RESOLVED} (expected ${SERVER_IP}). Continuing anyway..."
fi

echo "==> Ensuring certbot webroot exists..."
mkdir -p "${WEBROOT}"
chown -R www-data:www-data "${WEBROOT}" 2>/dev/null || chown -R nginx:nginx "${WEBROOT}" 2>/dev/null || true

echo "==> Obtaining Let's Encrypt certificate..."
if [[ ! -f "/etc/letsencrypt/live/${VIDEO_HOST}/fullchain.pem" ]]; then
  certbot certonly --webroot -w "${WEBROOT}" \
    -d "${VIDEO_HOST}" \
    --non-interactive --agree-tos -m "admin@${VIDEO_HOST#video.}" \
    || certbot certonly --webroot -w "${WEBROOT}" -d "${VIDEO_HOST}"
else
  echo "Certificate already exists."
fi

echo "==> Installing nginx site..."
install -m 644 "${ROOT}/scripts/nginx/video.nursing.pameoinvestimentsltd.conf" "${NGINX_DEST}"
nginx -t
systemctl reload nginx

echo "==> Firewall (443 should already be open; 10000/udp for media)..."
ufw allow 10000/udp 2>/dev/null || true

echo "==> Updating .env and restarting stacks..."
cd "${ROOT}"
if grep -q '^JITSI_PUBLIC_URL=' .env 2>/dev/null; then
  sed -i "s|^JITSI_PUBLIC_URL=.*|JITSI_PUBLIC_URL=https://${VIDEO_HOST}|" .env
else
  echo "JITSI_PUBLIC_URL=https://${VIDEO_HOST}" >> .env
fi
if grep -q '^JITSI_VIDEO_HOST=' .env 2>/dev/null; then
  sed -i "s|^JITSI_VIDEO_HOST=.*|JITSI_VIDEO_HOST=${VIDEO_HOST}|" .env
else
  echo "JITSI_VIDEO_HOST=${VIDEO_HOST}" >> .env
fi

export JITSI_PUBLIC_URL="https://${VIDEO_HOST}"
export JITSI_VIDEO_HOST="${VIDEO_HOST}"

docker compose up -d --force-recreate jitsi-web jitsi-prosody jitsi-jicofo jitsi-jvb
docker compose build --build-arg "VITE_JITSI_DOMAIN=${VIDEO_HOST}" frontend
docker compose up -d frontend

echo ""
echo "Done. Video URL: https://${VIDEO_HOST}"
echo "Test: curl -sI https://${VIDEO_HOST}/external_api.js | head -1"
echo "Then hard-refresh the app and open a live classroom."
