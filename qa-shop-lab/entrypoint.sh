#!/bin/sh
set -e

echo "[qa-shop-lab] Inicializando base de datos en ${DATABASE_PATH}"
python -m app.seed

echo "[qa-shop-lab] Iniciando servidor en 0.0.0.0:5000"
exec gunicorn \
    --bind 0.0.0.0:5000 \
    --workers 2 \
    --threads 4 \
    --timeout 60 \
    --access-logfile - \
    wsgi:app
