#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .env ]; then echo '.env existente conservado.'; exit 0; fi
umask 077
{
  printf 'DB_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'DB_ROOT_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'ADMIN_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'LAB_PORT=8088\n'
} > .env
echo 'Claves locales creadas. No publique .env.'
