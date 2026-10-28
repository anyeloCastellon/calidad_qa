#!/bin/bash
set -euo pipefail
cd /var/www/html
export HOME=/tmp
if ! wp core is-installed --quiet; then
  wp core install --url="http://localhost:${LAB_PORT:-8088}" --title='Campus Abierto' --admin_user=gestion.campus --admin_password="$LAB_ADMIN_PASSWORD" --admin_email=gestion@campus.example --skip-email --quiet
fi
wp plugin activate campus-aula --quiet
wp theme activate campus-abierto --quiet
wp eval-file /opt/lab/seed.php
wp rewrite structure '/%postname%/' --hard --quiet
echo 'Campus Abierto listo.'
