#!/usr/bin/env bash
# Lanzadera del Selenium Lab para Linux / macOS (equivalente a lab.ps1).
# Uso: ./lab.sh <up|test|estado|logs|reset|down|ayuda>   (tambien acepta --up, -up)
set -euo pipefail
cd "$(dirname "$0")"

comando="$(printf '%s' "${1:-ayuda}" | sed 's/^-*//' | tr '[:upper:]' '[:lower:]')"
APP_URL="http://localhost:5000"
GRID_URL="http://localhost:4444"
VNC_URL="http://localhost:7900/?autoconnect=1&resize=scale"

assert_docker() {
  docker info --format '{{.ServerVersion}}' >/dev/null || { echo "Inicia Docker antes de continuar."; exit 1; }
}

ayuda() {
  cat <<'EOF'
Selenium Lab - comandos disponibles:

  ./lab.sh up       Construye la imagen y levanta el Mini-Blog y el Selenium Grid.
  ./lab.sh test     Corre la suite pytest contra el Grid (mira http://localhost:7900).
                    Resultado JUnit en resultados/junit.xml
  ./lab.sh estado   Comprueba que la app y el Grid respondan.
  ./lab.sh logs     Muestra el registro de la app.
  ./lab.sh reset    Reinicia la app con la base de datos limpia.
  ./lab.sh down     Detiene y elimina los contenedores.
  ./lab.sh ayuda    Muestra esta ayuda.
EOF
}

responde() { curl -fsS -o /dev/null --max-time 5 "$1"; }

case "$comando" in
  up)
    assert_docker
    echo "Construyendo la imagen (la primera vez puede tardar)..."
    docker compose --profile tests build
    echo "Levantando Mini-Blog y Selenium Grid..."
    docker compose up -d --wait app selenium
    echo
    echo "LISTO: Mini-Blog      $APP_URL   (admin / Admin123)"
    echo "       Selenium Grid  $GRID_URL"
    echo "       Ver navegador  $VNC_URL"
    echo "Siguiente paso: ./lab.sh test"
    ;;
  test|tests)
    assert_docker
    mkdir -p resultados
    echo "Corriendo la suite. Mira el navegador en $VNC_URL"
    if docker compose --profile tests run --rm tests; then
      echo; echo "RESULTADO: todas las pruebas pasaron."
    else
      codigo=$?; echo; echo "RESULTADO: hay pruebas fallidas (revisa el detalle arriba)."; exit "$codigo"
    fi
    ;;
  estado)
    ok=1
    if responde "$APP_URL"; then echo "Mini-Blog     $APP_URL  -> OK"; else echo "Mini-Blog     $APP_URL  -> NO RESPONDE"; ok=0; fi
    if responde "$GRID_URL/status"; then echo "Selenium Grid $GRID_URL  -> OK"; else echo "Selenium Grid $GRID_URL  -> NO RESPONDE"; ok=0; fi
    if [ "$ok" = 1 ]; then echo "LISTO"; else echo "Ejecuta: ./lab.sh up"; exit 1; fi
    ;;
  logs)  docker compose logs app ;;
  reset)
    assert_docker
    docker compose up -d --wait --force-recreate app
    echo "LISTO: app reiniciada con datos limpios."
    ;;
  down)  docker compose --profile tests down ;;
  ayuda|help|h|\?) ayuda ;;
  *) echo "Comando no reconocido: $comando"; echo; ayuda; exit 1 ;;
esac
