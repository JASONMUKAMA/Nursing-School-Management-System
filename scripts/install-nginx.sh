#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="nursing.pameoinvestimentsltd.com"
CONF_DST="/etc/nginx/conf.d/nursing.pameoinvestimentsltd.conf"
WEBROOT="/var/www/certbot-nursing"

TLS=false
if [[ "${1:-}" == "--tls" ]]; then
  TLS=true
fi

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "Run with sudo: sudo $0${TLS:+ --tls}"
  exit 1
fi

mkdir -p "$WEBROOT"
chown www-data:www-data "$WEBROOT"

# Remove legacy IP-only vhost (duplicate upstream name breaks nginx -t)
rm -f /etc/nginx/conf.d/nursing-school-ip.conf

if [[ "$TLS" == true ]]; then
  install -m 644 "$ROOT/scripts/nginx/nursing.pameoinvestimentsltd.conf" "$CONF_DST"
else
  install -m 644 "$ROOT/scripts/nginx/nursing.pameoinvestimentsltd.http-bootstrap.conf" "$CONF_DST"
fi

nginx -t
systemctl reload nginx

if [[ "$TLS" == false ]]; then
  echo ""
  echo "HTTP is live: http://${DOMAIN}/"
  echo ""
  echo "Next — obtain TLS certificate, then enable HTTPS:"
  echo "  sudo certbot certonly --webroot -w ${WEBROOT} -d ${DOMAIN}"
  echo "  sudo $0 --tls"
  exit 0
fi

echo "Done. https://${DOMAIN}/"
