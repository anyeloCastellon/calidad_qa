#!/usr/bin/env bash
# Lanzadera del Selenium Lab para Linux / macOS (equivalente a lab.ps1).
# Uso: ./lab.sh <comando> [version]
#   version 1 (por defecto) = Mini-Blog QA      version 2 = TaskFlow QA
#   Ej: ./lab.sh up      ./lab.sh up 2      ./lab.sh test 2      ./lab.sh reset 2
set -euo pipefail
cd "$(dirname "$0")"

limpiar() { printf '%s' "$1" | sed 's/^[-/]*//' | tr '[:upper:]' '[:lower:]'; }
comando="$(limpiar "${1:-ayuda}")"
version_arg="$(limpiar "${2:-}")"; version_arg="${version_arg#v}"

APP_URL="http://localhost:5000"
GRID_URL="http://localhost:4444"
VNC_URL="http://localhost:7900/?autoconnect=1&resize=scale"
compose() { docker compose --profile v1 --profile v2 --profile tests "$@"; }

servicio() { [ "$1" = 2 ] && echo app2 || echo app; }
suite()    { [ "$1" = 2 ] && echo tests2 || echo tests; }
nombre()   { [ "$1" = 2 ] && echo "TaskFlow QA" || echo "Mini-Blog QA"; }

assert_docker() {
  docker info --format '{{.ServerVersion}}' >/dev/null || { echo "Inicia Docker antes de continuar."; exit 1; }
}

version_activa() {
  local corriendo; corriendo="$(compose ps --status running --services 2>/dev/null || true)"
  if grep -qx app2 <<<"$corriendo"; then echo 2
  elif grep -qx app <<<"$corriendo"; then echo 1
  fi
}

resolver_version() {  # $1 = "activa" para preferir la version que este corriendo
  if [ -n "$version_arg" ]; then
    case "$version_arg" in 1|2) echo "$version_arg" ;; *) echo "Version no valida: $version_arg (usa 1 o 2)" >&2; exit 1 ;; esac
    return
  fi
  if [ "${1:-}" = activa ]; then local a; a="$(version_activa)"; [ -n "$a" ] && { echo "$a"; return; }; fi
  echo 1
}

levantar() {  # $1 = version, $2 = "recrear" opcional
  local otra; [ "$1" = 2 ] && otra=app || otra=app2
  compose rm --stop --force "$otra" >/dev/null 2>&1 || true   # ambas usan el puerto 5000
  # En reset solo se recrea la app (datos iniciales); el Grid se deja como esta.
  if [ "${2:-}" = recrear ]; then compose up -d --wait --force-recreate "$(servicio "$1")"; fi
  compose up -d --wait "$(servicio "$1")" selenium
}

ayuda() {
  cat <<'EOF'
Selenium Lab - comandos disponibles (agrega 2 para la version 2):

  ./lab.sh up [2]     Construye y levanta la app y el Selenium Grid.
                      up = Mini-Blog QA (v1)   up 2 = TaskFlow QA (v2). Ambas en :5000
  ./lab.sh test [2]   Corre la suite pytest de esa version (mira http://localhost:7900).
                      Reporte JUnit en resultados/junit-v1.xml / junit-v2.xml
  ./lab.sh estado     Muestra que version esta arriba y si responde.
  ./lab.sh logs [2]   Muestra el registro de la app.
  ./lab.sh reset [2]  Reinicia la app con los datos iniciales.
  ./lab.sh down       Detiene y elimina todos los contenedores.
  ./lab.sh ayuda      Muestra esta ayuda.

Sin numero, test/logs/reset usan la version que este corriendo.
EOF
}

responde() { curl -fsS -o /dev/null --max-time 5 "$1"; }

case "$comando" in
  up)
    assert_docker
    v="$(resolver_version)"
    echo "Construyendo la imagen (la primera vez puede tardar)..."
    compose build
    echo "Levantando $(nombre "$v") (version $v) y Selenium Grid..."
    levantar "$v"
    echo
    printf 'LISTO: %-14s %s   (admin / Admin123)\n' "$(nombre "$v")" "$APP_URL"
    echo "       Selenium Grid  $GRID_URL"
    echo "       Ver navegador  $VNC_URL"
    if [ "$v" = 1 ]; then echo "Siguiente paso: ./lab.sh test"; else echo "Siguiente paso: ./lab.sh test $v"; fi
    ;;
  test|tests)
    assert_docker
    v="$(resolver_version activa)"
    if [ "$(version_activa)" != "$v" ]; then echo "Levantando $(nombre "$v") (version $v)..."; levantar "$v"; fi
    mkdir -p resultados
    echo "Corriendo la suite de la version $v. Mira el navegador en $VNC_URL"
    if compose run --rm "$(suite "$v")"; then
      echo; echo "RESULTADO: la suite termino sin fallas."
    else
      codigo=$?; echo; echo "RESULTADO: hay pruebas fallidas (revisa el detalle arriba)."; exit "$codigo"
    fi
    ;;
  estado)
    a="$(version_activa)"
    if [ -n "$a" ]; then echo "Version activa: $a - $(nombre "$a")"; else echo "Version activa: ninguna"; fi
    ok=1
    if responde "$APP_URL"; then echo "App           $APP_URL  -> OK"; else echo "App           $APP_URL  -> NO RESPONDE"; ok=0; fi
    if responde "$GRID_URL/status"; then echo "Selenium Grid $GRID_URL  -> OK"; else echo "Selenium Grid $GRID_URL  -> NO RESPONDE"; ok=0; fi
    if [ "$ok" = 1 ]; then echo "LISTO"; else echo "Ejecuta: ./lab.sh up   (o ./lab.sh up 2)"; exit 1; fi
    ;;
  logs)
    v="$(resolver_version activa)"; compose logs "$(servicio "$v")" ;;
  reset)
    assert_docker
    v="$(resolver_version activa)"
    levantar "$v" recrear
    echo "LISTO: $(nombre "$v") reiniciada con los datos iniciales."
    ;;
  down)  compose down ;;
  ayuda|help|h|\?) ayuda ;;
  *) echo "Comando no reconocido: $comando"; echo; ayuda; exit 1 ;;
esac
