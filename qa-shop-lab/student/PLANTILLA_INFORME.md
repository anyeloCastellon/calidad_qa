# Informe de pruebas — QA Shop

## 1. Información general

| Campo | Valor |
|---|---|
| Nombre del informe | Informe de pruebas funcionales y no funcionales |
| Sistema evaluado | QA Shop |
| Versión | 1.0.0 |
| Ambiente | Local — http://localhost:5000 |
| Equipo de QA | |
| Integrantes | |
| Fecha de ejecución | |
| Asignatura / sección | |

### Alcance

_Describa qué se probó y qué quedó explícitamente fuera del alcance._

### Herramientas utilizadas

| Herramienta | Versión | Uso |
|---|---|---|
| Navegador | | |
| Postman | | |
| Locust | | |
| Otras | | |

---

## 2. Matriz de trazabilidad

Relacione cada requisito con los casos de prueba que lo verifican.

| Requisito | Casos de prueba asociados | Estado global |
|---|---|---|
| RF-01 | | |
| RF-02 | | |
| RF-03 | | |
| RF-04 | | |
| RF-05 | | |
| RF-06 | | |
| RF-07 | | |
| RF-08 | | |
| RNF-01 | | |
| RNF-02 | | |
| RNF-03 | | |
| RNF-04 | | |
| RNF-05 | | |

---

## 3. Casos de prueba funcionales

Repita el bloque por cada caso ejecutado.

### PF-001

| Campo | Contenido |
|---|---|
| **ID** | PF-001 |
| **Requisito** | RF-0_ |
| **Título / Escenario** | |
| **Precondición** | |
| **Pasos** | 1.<br>2.<br>3. |
| **Datos de prueba** | |
| **Resultado esperado** | |
| **Resultado obtenido** | |
| **Estado** | PASS / FAIL |
| **Evidencia** | |

_(Copie este bloque tantas veces como casos haya ejecutado: PF-002, PF-003, …)_

### Resumen funcional

| Total ejecutados | PASS | FAIL | Bloqueados |
|---:|---:|---:|---:|
| | | | |

---

## 4. Casos de prueba no funcionales

| ID | Tipo | Escenario | Métrica | Esperado | Obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| PNF-001 | Rendimiento | | Tiempo de respuesta (ms) | < 500 ms | | | |
| PNF-002 | Rendimiento | | Tiempo de respuesta (ms) | < 500 ms | | | |
| PNF-003 | Carga | | RPS / fallos / p95 | | | | |
| PNF-004 | Seguridad | | Código HTTP | | | | |
| PNF-005 | Seguridad | | Código HTTP / contenido | | | | |
| PNF-006 | Fiabilidad | | Código HTTP | 4xx controlado | | | |
| PNF-007 | Usabilidad | | Control visible en 375 px | | | | |

### Detalle de la prueba de carga

| Parámetro | Valor |
|---|---|
| Usuarios concurrentes | |
| Ramp-up (usuarios/s) | |
| Duración | |
| Endpoints ejercitados | |

| Métrica | Valor |
|---|---|
| Requests totales | |
| Requests/s | |
| Fallos | |
| Tiempo promedio (ms) | |
| Mediana (ms) | |
| Percentil 95 (ms) | |
| Máximo (ms) | |

**Interpretación:** _¿Cumple RNF-02? ¿Por qué? ¿Qué diferencia hay entre esta
medición y la de una petición individual en Postman?_

---

## 5. Hallazgos

Repita el bloque por cada defecto detectado.

### H-001

| Campo | Contenido |
|---|---|
| **ID** | H-001 |
| **Título** | |
| **Requisito afectado** | |
| **Caso de prueba de origen** | |
| **Severidad** | Baja / Media / Alta / Crítica |
| **Endpoint o pantalla** | |
| **Precondición** | |
| **Pasos para reproducir** | 1.<br>2.<br>3. |
| **Datos exactos utilizados** | |
| **Resultado esperado** | |
| **Resultado observado** | |
| **Impacto para el negocio** | |
| **Evidencia** | |

_(H-002, H-003, …)_

### Resumen de hallazgos por severidad

| Severidad | Cantidad |
|---|---:|
| Crítica | |
| Alta | |
| Media | |
| Baja | |
| **Total** | |

---

## 6. Conclusión

### Requisitos cumplidos

_Liste los requisitos con evidencia de cumplimiento._

### Requisitos no cumplidos

_Liste los requisitos incumplidos indicando el hallazgo que lo demuestra._

### Riesgos principales

_¿Qué puede ocurrirle al negocio o a los usuarios si el sistema sale así?_

### Recomendaciones

_¿Qué debe corregirse antes de una nueva evaluación? ¿En qué orden?_

---

## 7. Decisión de paso a producción

> **¿Autoriza el paso del sistema a producción?**
>
> `[ ] SÍ`   `[ ] NO`

### Justificación técnica

_Debe nombrar los requisitos incumplidos, la severidad de los hallazgos y el
riesgo concreto asociado. No se acepta una justificación general del tipo
"tiene errores"._

---

| Rol | Nombre | Firma |
|---|---|---|
| Responsable de QA | | |
| Integrante | | |
| Integrante | | |
