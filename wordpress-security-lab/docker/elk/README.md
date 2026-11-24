# ELK — análisis de logs del laboratorio

Pila **Elasticsearch + Kibana + Filebeat** (perfil opcional `elk`) para recolectar y
analizar los **logs de acceso del gateway (Caddy)**. No arranca con `lab up`: se
levanta aparte, así no afecta la operación normal ni a quien esté trabajando el lab.

## Qué recolecta

El gateway Caddy escribe su log de acceso en formato **JSON** a
`/var/log/caddy/access.log` (volumen `caddy-logs`). **Filebeat** lo lee y lo envía a
**Elasticsearch**; **Kibana** lo visualiza. Cada petición HTTP al portal queda
registrada (método, URI, estado, IP, user-agent, duración).

## Arrancar

Con el laboratorio ya levantado (`lab up`):

```bash
docker compose --profile elk up -d
```

- Kibana: http://localhost:5601
- Elasticsearch: http://localhost:9200

Elasticsearch tarda ~30-60 s en estar listo y Filebeat envía los primeros registros
~1 min después (espera a que Elasticsearch acepte conexiones; verás reintentos en su
log, es normal). Genera tráfico navegando el portal (`http://localhost:8088`) para que
aparezcan registros.

> **Recursos:** Elasticsearch + Kibana consumen ~1.5 GB de RAM. En Docker Desktop
> (WSL2) el `vm.max_map_count` suele bastar; si Elasticsearch no arranca, súbelo con
> `wsl -d docker-desktop sysctl -w vm.max_map_count=262144`.

## Ver los logs en Kibana

1. Abre Kibana → **Stack Management → Data Views → Create data view**.
2. Nombre: `caddy-access`; patrón de índice: `caddy-access-*`; campo de tiempo: `@timestamp`.
3. Ve a **Discover** y explora.

### Consultas útiles (KQL) para un lab de seguridad

```text
caddy.status >= 400                      # errores
caddy.request.uri : *recurso*            # accesos a la Biblioteca (posible SQLi)
caddy.request.uri : (*script* or *UNION* or *%3Cscript%3E*)   # intentos de XSS/SQLi
caddy.request.uri : *destino*            # pruebas de open redirect
caddy.request.method : POST              # envíos de formularios (muro, boletín, login)
```

Así se ve el lado **defensivo (blue team)**: detectar en los logs los ataques que
se practican en las actividades 3.1.2 / 3.2.

## Apagar

```bash
docker compose --profile elk down
```

Los datos de Elasticsearch quedan en el volumen `esdata` (añade `-v` para borrarlos).
