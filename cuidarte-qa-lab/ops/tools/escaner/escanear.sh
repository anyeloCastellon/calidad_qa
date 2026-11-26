#!/bin/sh
# Escaner del laboratorio para la evaluacion de seguridad (EP3/EP5).
# Uso: docker compose run --rm escaner [puertos|cabeceras|sqli|todo]
# Toda la parte tecnica (login, token, nmap, sqlmap) queda encapsulada aqui;
# el estudiante solo ejecuta un verbo y documenta lo que ve.
APP="${APP:-http://web}"

login() {
  TOKEN=$(curl -s "$APP/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"nombre_usuario\":\"$USUARIO\",\"password\":\"$CLAVE\"}" \
    | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"//; s/"$//')
  if [ -z "$TOKEN" ]; then
    echo "No se pudo iniciar sesion. Verifica que el laboratorio este arriba (docker compose up -d --wait)."
    exit 1
  fi
}

puertos() {
  echo "== nmap: servicios accesibles desde el host =="
  echo "   (busca servicios que no deberian estar publicados)"
  nmap -sV "$HOST_REAL" -p "$PUERTOS"
}

cabeceras() {
  echo "== Cabeceras de respuesta del servidor =="
  echo "   (observa si el servidor revela su version de producto)"
  curl -s -D - -o /dev/null "$APP/api/health"
}

sqli() {
  echo "== sqlmap: prueba de inyeccion SQL en el buscador de auditoria =="
  login
  URL="$SQLI_PATH"
  case "$URL" in
    *EID*)
      EID=$(curl -s "$APP/api/empresas" -H "Authorization: Bearer $TOKEN" \
        | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//; s/"$//')
      URL=$(echo "$URL" | sed "s/EID/$EID/")
      ;;
  esac
  sqlmap -u "$APP$URL" -H "Authorization: Bearer $TOKEN" -p buscar --batch --level=2 --risk=2
}

case "${1:-ayuda}" in
  puertos)   puertos ;;
  cabeceras) cabeceras ;;
  sqli)      sqli ;;
  todo)      puertos; echo; cabeceras; echo; sqli ;;
  *) echo "Uso: docker compose run --rm escaner [puertos|cabeceras|sqli|todo]" ;;
esac
