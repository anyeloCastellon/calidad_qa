#!/bin/sh
set -eu
umask 077
mkdir -p /certs
if [ ! -s /certs/ca.key ] || [ ! -s /certs/ca.crt ]; then
  openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 3650 \
    -subj '/CN=Cuidarte Local Lab CA' -keyout /certs/ca.key -out /certs/ca.crt
fi
for name in web backend db mail; do
  if [ ! -s "/certs/$name.crt" ]; then
    openssl req -newkey rsa:2048 -nodes -subj "/CN=$name" \
      -keyout "/certs/$name.key" -out "/certs/$name.csr"
    printf 'subjectAltName=DNS:%s,DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\n' "$name" > "/certs/$name.ext"
    openssl x509 -req -in "/certs/$name.csr" -CA /certs/ca.crt -CAkey /certs/ca.key \
      -CAcreateserial -out "/certs/$name.crt" -days 365 -sha256 -extfile "/certs/$name.ext"
    rm -f "/certs/$name.csr" "/certs/$name.ext"
  fi
done
chmod 644 /certs/*.crt
chmod 600 /certs/*.key
chown 999:999 /certs/db.key
chown 1000:1000 /certs/backend.key
echo 'Certificados locales disponibles.'
