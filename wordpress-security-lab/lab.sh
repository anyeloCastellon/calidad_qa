#!/bin/sh
# Lanzadera unica del laboratorio Campus Abierto (Linux / macOS).
# Reemplaza los comandos de preparacion y operacion por verbos simples.
# Uso: ./lab.sh <up|estado|reset|logs|stress|down|ayuda>
set -eu
labRoot="$(cd "$(dirname "$0")" && pwd)"
cd "$labRoot"
comando="${1:-ayuda}"

lab_port() {
  port=8088
  if [ -f .env ]; then
    p=$(grep -E '^LAB_PORT=[0-9]+$' .env | head -n1 | cut -d= -f2 || true)
    if [ -n "${p:-}" ]; then port="$p"; fi
  fi
  if [ -n "${LAB_PORT:-}" ]; then port="$LAB_PORT"; fi
  printf '%s' "$port"
}

assert_docker() {
  if ! docker info --format '{{.ServerVersion}}' >/dev/null 2>&1; then
    echo 'Inicia Docker antes de continuar.' >&2
    exit 1
  fi
}

show_help() {
  cat <<'EOF'
Laboratorio Campus Abierto - comandos disponibles:

  ./lab.sh up       Prepara las claves locales, construye las imagenes, levanta
                    el portal y espera a que los datos esten listos.
                    Reemplaza los cinco pasos de preparacion.
  ./lab.sh estado   Comprueba que el portal y los datos esten disponibles (LISTO).
  ./lab.sh reset    Restaura los datos y las cuentas ficticias.
                    Ejecutalo despues de guardar las evidencias.
  ./lab.sh logs     Muestra el registro de la preparacion de datos.
  ./lab.sh stress A Prueba de carga constante: 10 usuarios, 2 min    (3.4)
  ./lab.sh stress B Prueba de estres: 0 a 500 usuarios en 5 min      (3.4)
  ./lab.sh stress C Prueba de pico: de 10 a 200 usuarios en 10 s     (3.4)
                    Deja el reporte HTML en stress/resultados/
  ./lab.sh down     Detiene el laboratorio (conserva el contenido).
  ./lab.sh ayuda    Muestra esta ayuda.
EOF
}

case "$comando" in
  up)
    assert_docker
    sh ops/setup.sh
    echo 'Construyendo las imagenes (la primera vez puede tardar)...'
    docker compose --profile tools build
    echo 'Levantando el portal...'
    docker compose up -d --wait
    url="http://localhost:$(lab_port)"
    echo 'Esperando a que los datos esten listos...'
    ready=0
    i=0
    while [ "$i" -lt 30 ]; do
      code=$(curl -s -o /dev/null -w '%{http_code}' "$url/wp-json/campus/v1/status" 2>/dev/null || echo 000)
      if [ "$code" = "200" ]; then ready=1; break; fi
      sleep 2
      i=$((i + 1))
    done
    if [ "$ready" -ne 1 ]; then
      echo 'El portal arranco, pero los datos no quedaron listos. Revisa: ./lab.sh logs' >&2
      exit 1
    fi
    echo ''
    echo "LISTO: portal disponible en $url"
    echo 'Siguiente paso: ./lab.sh estado  (comprobacion completa)'
    ;;
  estado)
    url="http://localhost:$(lab_port)"
    code=$(curl -s -o /dev/null -w '%{http_code}' "$url/wp-json/campus/v1/status" 2>/dev/null || echo 000)
    if [ "$code" != "200" ]; then
      echo 'El portal no ha terminado de preparar sus datos.' >&2
      exit 1
    fi
    version=$(docker compose run --rm --no-deps wpcli core version 2>/dev/null | tr -d '\r' | tail -n1)
    if [ "$version" != "7.1.3" ]; then
      echo 'Revisa el nucleo WordPress y la inicializacion del laboratorio.' >&2
      exit 1
    fi
    if ! docker compose run --rm --no-deps wpcli plugin is-active campus-aula >/dev/null 2>&1; then
      echo 'El componente Campus Aula no esta activo.' >&2
      exit 1
    fi
    if ! docker compose run --rm --no-deps wpscan --version >/dev/null 2>&1; then
      echo 'Construye la imagen de WPScan antes de clase (./lab.sh up).' >&2
      exit 1
    fi
    if ! docker compose run --rm --no-deps sqlmap --version >/dev/null 2>&1; then
      echo 'Construye la imagen de SQLMap antes de clase (./lab.sh up).' >&2
      exit 1
    fi
    echo "LISTO: portal y datos disponibles en $url"
    echo "WordPress $version"
    echo 'Material y dos cuentas de estudiante disponibles para iniciar la clase.'
    ;;
  reset)
    assert_docker
    docker compose run --rm wpcli eval-file /opt/lab/reset.php
    ;;
  logs)
    docker compose logs init
    ;;
  stress)
    assert_docker
    escenario="$(printf '%s' "${2:-}" | tr '[:lower:]' '[:upper:]')"
    case "$escenario" in
      A) nombre='Carga constante (10 usuarios, 2 min)';      props='-Ja_usuarios=10' ;;
      B) nombre='Estres (0 a 500 usuarios en 5 min)';        props='-Jb_usuarios=500' ;;
      C) nombre='Pico (10 usuarios + rafaga a 200 en 10 s)'; props='-Jc_base=10 -Jc_rafaga=190' ;;
      *) echo 'Uso: ./lab.sh stress A  (carga)  |  B  (estres)  |  C  (pico)'; exit 1 ;;
    esac
    port="$(lab_port)"
    if ! curl -fs -o /dev/null --max-time 10 "http://localhost:$port/"; then
      echo 'El portal no responde. Primero: ./lab.sh up' >&2; exit 1
    fi
    echo 'Preparando JMeter (la primera vez descarga Java y JMeter)...'
    docker compose --profile stress --progress plain build jmeter
    cid="$(docker compose ps -q wordpress | head -n1)"
    [ -n "$cid" ] || { echo 'No encuentro el contenedor de WordPress. Ejecuta: ./lab.sh up' >&2; exit 1; }
    cpus="${LAB_STRESS_CPUS:-1}"
    docker update --cpus "$cpus" "$cid" >/dev/null
    rel="resultados/$escenario-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "stress/$rel"
    stats="stress/$rel/docker-stats.csv"
    echo 'segundo,cpu,memoria' > "$stats"
    ( t0=$(date +%s); while :; do
        l=$(docker stats --no-stream --format '{{.CPUPerc}},{{.MemUsage}}' "$cid")
        echo "$(( $(date +%s) - t0 )),$l" >> "$stats"
      done ) &
    monitor=$!
    # Al terminar (o con Ctrl+C): detener el monitoreo y devolver todas las CPU.
    trap 'kill $monitor 2>/dev/null; docker update --cpus "$(docker info --format "{{.NCPU}}")" "$cid" >/dev/null' EXIT
    echo
    echo "Escenario $escenario: $nombre"
    echo "Servidor WordPress limitado a $cpus CPU. Tip: en otra terminal ejecuta  docker stats"
    echo
    # shellcheck disable=SC2086
    docker compose --profile stress run --rm jmeter -n -t plan-estres.jmx \
      -l "$rel/resultados.jtl" -e -o "$rel/reporte" -j "$rel/jmeter.log" \
      -Jhost=gateway -Jpuerto=80 "-Jhost_header=localhost:$port" \
      -Jjmeter.reportgenerator.overall_granularity=5000 $props
    echo
    echo "RESUMEN escenario $escenario"
    awk -F, 'NR==1 { for (i=1;i<=NF;i++) col[$i]=i; next }
      { n++; t+=$col["elapsed"]; if ($col["success"]!="true") e++ }
      END { printf "  Peticiones      : %d\n  Error %%         : %.2f %%  (%d fallidas)\n  Tiempo promedio : %d ms\n", n, (n?100*e/n:0), e, (n?t/n:0) }' \
      "stress/$rel/resultados.jtl"
    echo
    echo "Reporte HTML : stress/$rel/reporte/index.html"
    echo "CPU/memoria  : $stats"
    ;;
  down)
    docker compose down
    ;;
  ayuda | help | -h | --help)
    show_help
    ;;
  *)
    echo "Comando no reconocido: $comando" >&2
    echo '' >&2
    show_help
    exit 1
    ;;
esac
