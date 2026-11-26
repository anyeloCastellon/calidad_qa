# Pruebas de carga, estrés y pico con JMeter (Actividad 3.4.2)

Vamos a medir **cuánta demanda aguanta el portal Campus Abierto** antes de
degradarse o caer. Usamos **Apache JMeter** contra **nuestro propio laboratorio**.

> ⚠️ Una prueba de estrés es, técnicamente, una denegación de servicio.
> Solo se ejecuta contra sistemas propios o con autorización escrita. Aquí: solo
> contra `localhost:8088`.

## 1. Preparación

```powershell
cd wordpress-security-lab
.\lab.ps1 up            # levanta el portal en http://localhost:8088
```

No necesitas instalar JMeter: el comando `stress` lo ejecuta dentro de Docker.
La primera vez descarga Java y JMeter (unos minutos).

Para que la prueba represente un **servidor pequeño** (y no se congele tu PC),
durante la prueba el contenedor de WordPress queda limitado a **1 CPU**. Al
terminar se libera solo.

## 2. Los tres escenarios

| Comando | Escenario | Configuración | Objetivo |
|---|---|---|---|
| `.\lab.ps1 stress A` | **A. Carga constante** | 10 usuarios durante 2 min | Comportamiento normal y tiempo de respuesta promedio |
| `.\lab.ps1 stress B` | **B. Estrés** | De 0 a 500 usuarios en 5 min (ramp-up) | ¿Con cuántos usuarios aparecen los errores (502/504/timeouts)? |
| `.\lab.ps1 stress C` | **C. Pico** | 10 usuarios y, en el segundo 60, +190 en 10 s (total 200) durante 60 s | ¿Se recupera el portal después de la ráfaga? |

En Linux/macOS: `./lab.sh stress A|B|C`.

**Mientras corre**, abre otra terminal y ejecuta:
```powershell
docker stats
```
Observa la columna **CPU %** del contenedor `wordpress-security-lab-wordpress-1`
(100 % = la CPU disponible está completamente ocupada).

## 3. Qué deja cada ejecución

En `stress\resultados\<escenario>-<fecha>\`:

| Archivo | Qué es |
|---|---|
| `reporte\index.html` | **Reporte HTML de JMeter** (ábrelo en el navegador) |
| `resultados.jtl` | Cada petición: tiempo, código HTTP, usuarios activos |
| `docker-stats.csv` | CPU y memoria del servidor durante la prueba |

Al final la terminal muestra un **resumen**: peticiones, Error %, tiempo
promedio, throughput y CPU máxima.

**Gráficos útiles del reporte** (menú *Charts*):

| Gráfico | Dónde | Para qué |
|---|---|---|
| **Response Time Vs Threads** | *Response Times* | Usuarios vs. tiempo de respuesta (el que pide la guía) |
| **Active Threads Over Time** | *Over Time* | Cómo subieron los usuarios |
| **Response Codes per Second** | *Throughput* | Cuándo aparecen los errores (502, timeouts) |
| **Transactions per Second** | *Throughput* | El throughput (¿baja cuando suben los usuarios?) |
| **Statistics** | *Dashboard* | Tabla resumen (equivale al *Informe Agregado*) |

## 4. Métricas para el informe

| Métrica | Qué es | Valor crítico |
|---|---|---|
| **Throughput** | Peticiones procesadas por segundo | Si baja mientras suben los usuarios → cuello de botella |
| **Latencia / Tiempo de respuesta** | Tiempo hasta la respuesta | > 2 s = mala experiencia de usuario |
| **Error %** | Peticiones fallidas | En estrés, > 5 % = inestable |

Ojo: en la prueba de estrés el throughput **total** puede subir aunque el sistema
esté colapsando, porque los errores responden rápido. Mira también cuántas
respuestas fueron **200 OK** por segundo.

## 5. Tabla de evidencia

| Escenario | Usuarios | Peticiones | Error % | Tiempo prom. | p90 | Throughput | CPU máx. | Observación |
|---|---|---|---|---|---|---|---|---|
| A | 10 | | | | | | | |
| B | 0→500 | | | | | | | ¿Con cuántos usuarios superó 2 s? ¿Y 5 % de error? |
| C | 10→200→10 | | | | | | | ¿Cuánto tardó en recuperarse? |

**Hallazgo** (ejemplo de formato): *"Durante la prueba de estrés, el sistema
superó los 2 s de respuesta con N usuarios y comenzó a devolver errores 502 con
M usuarios; con 1 CPU la capacidad máxima es de X peticiones/s."*

## 6. (Opcional) JMeter con interfaz gráfica

Para ver los receptores *Ver Árbol de Resultados*, *Gráfico de Resultados* e
*Informe Agregado*:

1. Instala Java 17+ y descarga JMeter desde https://jmeter.apache.org (binario `.zip`).
2. Ejecuta `bin\jmeter.bat` (Windows) o `bin/jmeter` (Linux/macOS).
3. Crea un plan apuntando a **Servidor:** `localhost` · **Puerto:** `8088` · **Ruta:** `/`.

Usa la interfaz gráfica solo para el escenario A: con cientos de usuarios
*Ver Árbol de Resultados* consume mucha memoria. Para B y C usa `.\lab.ps1 stress`.

El plan que usa el comando está en [`plan-estres.jmx`](plan-estres.jmx).
