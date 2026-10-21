#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p certs-local
docker compose cp web:/certs/ca.crt ./certs-local/ca.crt
echo 'CA pública en certs-local/ca.crt; no se ha instalado automáticamente.'
