#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  echo '.env ya existe; se conserva sin regenerar claves.'
  exit 0
fi
command -v openssl >/dev/null 2>&1 || { echo 'Se requiere openssl para generar las claves locales.'; exit 1; }
umask 077
{
  printf 'PGPASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)"
  printf 'ENCRYPTION_KEY=%s\n' "$(openssl rand -base64 32)"
  printf 'APP_PORT=5181\nMAIL_PORT=8027\nPASSWORD_MIN_LENGTH=12\n'
  printf 'SEED_REFERENCE_DATE=%s\n' "$(date -u +%F)"
} > .env
echo '.env creado con claves locales aleatorias. Consérvelo fuera de Git.'
