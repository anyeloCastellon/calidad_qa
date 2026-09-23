# Guía del estudiante: MiniBank QA Lab

**Actividad 2.1.2:** Diseño de un plan de pruebas estratégico con enfoque en
calidad, riesgo y seguridad · **Modalidad:** individual · **Tiempo:** 45 minutos

## Situación

Usted es **QA Lead** del lanzamiento de MiniBank, una nueva banca móvil. El
equipo de desarrollo dice que la funcionalidad de transferencias **está
terminada** y que los tests automatizados pasan en verde.

Su trabajo es diseñar el plan de pruebas que decidirá si eso es cierto, y
aplicarlo sobre la aplicación real. El plan debe garantizar que el sistema sea
**confiable, eficiente, seguro, trazable y sostenible**, y cada decisión debe
estar justificada por el riesgo.

No se sabe cuántos defectos tiene la aplicación. Puede que ninguno.

> **Trabaje sobre la plantilla desde el minuto 5.** Cada caso y cada hallazgo
> va directo a la matriz de trazabilidad de
> [`PLANTILLA_PLAN.md`](PLANTILLA_PLAN.md). Si la llena al final, no le alcanza
> el tiempo.

---

## Requisitos de MiniBank

Estos son los requisitos contra los que se prueba. Su matriz de trazabilidad
parte de aquí.

| ID | Requisito |
|---|---|
| RF01 | El cliente inicia sesión con su RUT y su clave. |
| RF02 | El cliente puede transferir a un RUT válido: cuerpo numérico entre 1 y 99.999.999 y dígito verificador correcto (módulo 11). |
| RF03 | El monto de una transferencia es un número entero de pesos **mayor a $0**. |
| RF04 | Cada transferencia cobra una comisión de **$300**. El saldo debe cubrir **monto + comisión**. El saldo nunca puede quedar negativo. |
| RF05 | El total transferido en el día **no puede superar $1.000.000**. |
| RF06 | Todo error se informa al cliente con un mensaje claro. Nunca se muestra "Transferencia realizada" si la transferencia no ocurrió. |
| RF07 | Tras una transferencia, el saldo y los movimientos en pantalla coinciden con los del servidor. |
| RNF01 | Las credenciales no se almacenan en texto plano ni aparecen en logs, consola o mensajes de error. |
| RNF02 | Al cerrar sesión, el token queda invalidado en el servidor. |
| RNF03 | Ningún secreto (token, clave de API) queda expuesto en el navegador más allá de lo estrictamente necesario. |

**Fuera de alcance:** `/api/reset`, `/api/health` y el panel **Asistente de
QA** son herramientas del laboratorio, no parte de MiniBank.

---

## Cronograma de la sesión

| Min | Bloque |
|---|---|
| 0–5 | Contexto y recorrido por la aplicación |
| 5–15 | Caja negra |
| 15–25 | Caja blanca y complejidad ciclomática |
| 25–32 | API e integración |
| 32–37 | Seguridad y flujo de datos |
| 37–42 | pytest y cobertura |
| 42–45 | Matriz, priorización y cierre |

---

## 0–5 · Contexto

Abra http://localhost:5173 e ingrese con `11.111.111-1` / `1234`. Recorra la
pantalla: saldo, límite, comisión, formulario, movimientos. Abra la plantilla.

## 5–15 · Caja negra, sin mirar el código

Intente **romper la pantalla de transferencia**.

```
NO ME IMPORTA              ME IMPORTA
if / for / funciones       entrada → comportamiento → salida
```

Diseñe al menos **6 casos** con partición de equivalencia y valores límite.
Ideas: monto 0, negativo, vacío, texto, decimal, exactamente el saldo, sobre
el límite, destinatario inválido. Anote entrada, resultado esperado (según los
requisitos) y resultado observado.

Clasifique cada hallazgo: error de **validación de datos**, de **flujo de
usuario**, de **regla de negocio** o de **usabilidad y consistencia**.

Destinatarios válidos para probar: `12.345.678-5`, `9.876.543-3`,
`15.555.555-6`. Para volver al estado inicial: `POST /api/reset` (o reinicie el
backend).

## 15–25 · Caja blanca y V(G)

Abra `backend/app/transfer.py`.

1. Dibuje el grafo de flujo de `validar_transferencia`.
2. Calcule **V(G) = decisiones + 1** y compárelo con `radon cc app -s`.
3. Liste los **caminos independientes** y un dato de prueba para cada uno.
4. **Cobertura de decisiones y condiciones:** para cada `if`, ¿qué condición
   exacta debería tener según los requisitos? ¿Es la que tiene?
5. Revise los parámetros de la función. ¿Todos se usan?

Si le sobra tiempo: `backend/app/rut.py` tiene la función más compleja del
backend. Aplique **análisis de bucles** al `for` (0, 1 y muchas iteraciones).

## 25–32 · API e integración

Abra las herramientas de desarrollador (F12), pestañas **Network** y
**Console**, y repita algunos casos de caja negra.

- **Contrato:** ¿qué JSON envía React? ¿Qué espera la API? Compárelo con
  http://localhost:8000/docs.
- **Manejo de errores:** ¿qué código HTTP devuelve cada error (400, 401, 422)?
  ¿Qué muestra la pantalla? ¿Coinciden?
- **Sincronización de estados:** después de cada operación, ¿el saldo en
  pantalla coincide con `GET /api/cuenta`?
- **Datos en tránsito:** ¿la app corre sobre HTTP o HTTPS? ¿Qué implicaría en
  producción?

Para cada hallazgo: **¿el defecto está en React o en Python?**

## 32–37 · Seguridad y flujo de datos

Siga el recorrido de **la clave** y **el token**:

```
formulario → fetch → API → comparación → sesión → logs → logout
```

Revise `backend/app/main.py`, los logs del backend (`docker compose logs
backend` o la terminal donde corre) y la consola del navegador. Verifique
RNF01 a RNF03. Para RNF02: copie el token, cierre sesión y úselo contra
`GET /api/cuenta`.

Describa **escenarios de ataque** relevantes (sin hacer pentesting): ¿qué
podría hacer alguien con acceso a los logs, a un computador compartido o a un
token robado?

## 37–42 · pytest y cobertura

Con Docker:

```bash
docker compose exec backend pytest --cov=app.transfer --cov-branch --cov-report=term-missing
```

Sin Docker, desde `backend/`: `pytest --cov=app.transfer --cov-branch --cov-report=term-missing`.

> Los tests pasan y la cobertura de ramas es 100 %.
> ¿Eso significa que `transfer.py` está correcto? Justifique.

Agregue a `backend/tests/test_transfer.py` al menos un test que falte según
**los requisitos**, no según el código, y ejecútelo. Un defecto encontrado
por caja blanca se demuestra con un **test que falla**.

## 42–45 · Cierre

Complete la **prioridad** (impacto × probabilidad × complejidad) en el
cronograma basado en riesgos y deje su recomendación de paso a producción.

---

## Entregable

[`PLANTILLA_PLAN.md`](PLANTILLA_PLAN.md) contiene todo el plan. **En clase** se
completan las secciones 1, 2, 4.1, 4.2 y 4.3. Las secciones **3
(herramientas y métricas)** y **4.4 (protocolo de mantenimiento)** se
completan según lo que indique el docente.

Para las métricas, use lo que vio en MiniBank: ¿qué le dice la "cobertura de
ramas 100 %" sobre la diferencia entre **cobertura de código** y **cobertura
de requisitos**?

## Extensión opcional: asistente de IA

En el panel **Asistente de QA**, pegue un requisito (por ejemplo RF04) y
genere casos. Compárelos con los suyos: ¿encontró la IA algo que usted no
consideró? ¿Propuso algo incorrecto? ¿Detectó algún defecto real?

> **La IA propone los casos. El QA los revisa.** Nunca "la IA dijo que
> funciona, entonces funciona".

## Reglas

- Cada defecto reportado debe tener **pasos para reproducirlo**. "Lo vi en la
  línea 23" es una pista, no un reporte.
- No modifique el código de `app/`: su trabajo es encontrar y documentar, no
  corregir. Solo puede agregar tests en `tests/`.
