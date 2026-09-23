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

---

## Requisitos de MiniBank

Estos son los requisitos contra los que se prueba. Su matriz de trazabilidad
parte de aquí.

| ID | Requisito |
|---|---|
| RF01 | El cliente inicia sesión con su RUT y su clave. |
| RF02 | El cliente puede transferir a cualquier RUT válido (dígito verificador módulo 11). |
| RF03 | El monto de una transferencia es un número entero de pesos **mayor a $0**. |
| RF04 | Cada transferencia cobra una comisión de **$300**. El saldo debe cubrir **monto + comisión**. El saldo nunca puede quedar negativo. |
| RF05 | El total transferido en el día **no puede superar $1.000.000**. |
| RF06 | Todo error se informa al cliente con un mensaje claro. Nunca se muestra "Transferencia realizada" si la transferencia no ocurrió. |
| RF07 | Tras una transferencia, el saldo y los movimientos en pantalla coinciden con los del servidor. |
| RNF01 | Las credenciales no se almacenan en texto plano ni aparecen en logs, consola o mensajes de error. |
| RNF02 | Al cerrar sesión, el token queda invalidado en el servidor. |
| RNF03 | Ningún secreto (token, clave de API) queda expuesto en el navegador más allá de lo estrictamente necesario. |
| RNF04 | El asistente de IA solo propone casos: la decisión sobre qué se prueba la toma el QA. |

---

## Paso 1: Estrategia de pruebas (15 min)

### 1.1 Caja negra, sin mirar el código (5 min)

Abra http://localhost:5173, ingrese con `11.111.111-1` / `1234` e intente
**romper la pantalla de transferencia**.

```
NO ME IMPORTA              ME IMPORTA
if / for / funciones       entrada → comportamiento → salida
```

Diseñe al menos **8 casos** usando partición de equivalencia y valores límite.
Piense en: monto 0, negativo, vacío, texto, decimal, exactamente el saldo,
sobre el límite, destinatario inválido. Registre para cada uno la entrada, el
resultado esperado (según los requisitos) y el resultado observado.

Clasifique cada hallazgo: ¿es un error de **validación de datos**, de **flujo
de usuario**, de **regla de negocio** o de **usabilidad y consistencia**?

### 1.2 Caja blanca, ahora sí con el código (5 min)

Abra `backend/app/transfer.py` y `backend/app/rut.py`.

1. Dibuje el grafo de flujo de `validar_transferencia`.
2. Calcule **V(G) = decisiones + 1** y compárelo con el resultado de
   `radon cc app -s`.
3. Liste los **caminos independientes** y un dato de prueba para cada uno.
4. En `validar_rut`, aplique **análisis de bucles**: ¿qué pasa con el `for`
   con 0, 1, 2 y muchas iteraciones? ¿Cuál es el caso típico?
5. Aplique **cobertura de decisiones y condiciones**: para cada `if`, ¿qué
   condición exacta debería tener según los requisitos? ¿Es la que tiene?
6. Revise los parámetros de cada función. ¿Todos se usan?

Luego ejecute los tests existentes:

```bash
cd backend
pytest --cov=app.transfer --cov-branch --cov-report=term-missing
```

> Pregunta clave: los tests pasan y la cobertura de ramas es 100 %.
> ¿Eso significa que `transfer.py` está correcto? Justifique.

Agregue a `tests/test_transfer.py` los tests que falten según **los
requisitos**, no según el código.

### 1.3 Enfoque híbrido: integración React ↔ FastAPI (5 min)

Abra las herramientas de desarrollador del navegador (F12), pestañas
**Network** y **Console**, y repita algunos casos de caja negra.

- **Comunicación app ↔ backend:** ¿qué cuerpo JSON envía React? ¿Qué espera
  la API? Compárelo con http://localhost:8000/docs (el contrato).
- **Manejo de errores en API:** ¿qué código HTTP devuelve el backend para cada
  error (400, 401, 422)? ¿Qué muestra la pantalla en cada caso? ¿Coinciden?
- **Sincronización de estados:** después de cada operación, ¿el saldo en
  pantalla coincide con `GET /api/cuenta`?
- **Integridad de datos en tránsito:** ¿la app corre sobre HTTP o HTTPS? ¿Qué
  implicaría eso en producción?

Pregunta para cada hallazgo: **¿el defecto está en React o en Python?**

---

## Paso 2: Riesgo y seguridad (12 min)

### 2.1 Módulos críticos

MiniBank es pequeña a propósito: ninguna función llega a V(G) > 20. Use
`radon` para ordenar los módulos por complejidad y argumente:

- ¿Cuáles serían los módulos críticos en una banca real? (transferencias,
  OTP, cálculo de intereses, límites…)
- ¿Por qué un módulo con V(G) > 20 exige más profundidad de pruebas, revisión
  de código, pruebas negativas y de estrés, y prioridad en el cronograma?
- En MiniBank, ¿la complejidad fue un buen predictor de dónde estaban los
  defectos? ¿Qué otros factores de riesgo pesan (dinero, seguridad, uso)?

### 2.2 Análisis de flujo de datos

Siga el recorrido de **la clave** y **el token** desde que el usuario los
escribe hasta que dejan de existir:

```
formulario → fetch → API → comparación → sesión → logs → logout
```

Revise el código del backend, **la terminal donde corre el backend** (sus
logs) y la consola del navegador. Verifique los requisitos RNF01 a RNF03:

- ¿Las credenciales se guardan en texto plano?
- ¿Hay filtraciones en logs, variables temporales, consola o excepciones?
- ¿El token se invalida de verdad al cerrar sesión? Pruébelo: copie el token,
  cierre sesión y úselo con `curl` o Postman contra `GET /api/cuenta`.

Describa **escenarios de ataque** relevantes (sin hacer pentesting): ¿qué
podría hacer alguien con acceso a los logs, a un computador compartido o a un
token robado?

---

## Paso 3: Herramientas, métricas e IA (8 min)

### 3.1 Herramienta de gestión

Elija una (TestRail, Azure Test Plans, Jira + Zephyr, Xray, etc.) y justifique
cómo mejora la **trazabilidad**, la **reutilización** y el soporte a
**auditorías y cumplimiento normativo** (piense en la CMF y en PCI DSS).

### 3.2 Métricas

Defina indicadores con meta numérica: confiabilidad ≥ 95 %, cobertura de
requisitos ≥ 90 %, defectos críticos detectados antes de producción ≥ 98 %,
reducción de tiempo por automatización, u otras. Explique por qué importan en
banca.

> Use MiniBank como evidencia: ¿qué le dice la "cobertura de ramas 100 %" del
> Paso 1.2 sobre la diferencia entre **cobertura de código** y **cobertura de
> requisitos**?

### 3.3 Asistente de IA

En el panel **Asistente de QA**, pegue uno de los requisitos (por ejemplo
RF04) y genere casos. Compare:

| | Mis casos | Casos de la IA |
|---|---|---|
| ¿Cuántos? | | |
| ¿Encontró la IA algo que yo no consideré? | | |
| ¿Propuso la IA algo incorrecto o inútil? | | |
| ¿La IA detectó algún defecto real? | | |

> **La IA propone los casos. El QA los revisa.** Nunca "la IA dijo que
> funciona, entonces funciona".

---

## Entregable (10 min, dentro de los 45)

Complete [`PLANTILLA_PLAN.md`](PLANTILLA_PLAN.md) con:

1. **Matriz de trazabilidad**: requisito → riesgo → caso → técnica →
   resultado → defecto.
2. **Cronograma de ejecución basado en riesgos**: prioridad = impacto ×
   probabilidad × complejidad.
3. **Protocolo de mantenimiento del plan**: cómo se actualizan los casos ante
   cambios regulatorios, funcionales o de arquitectura.

## Reglas

- Cada defecto reportado debe tener **pasos para reproducirlo**. "Lo vi en la
  línea 23" es una pista, no un reporte: el desarrollador necesita los pasos.
- Un defecto encontrado solo por caja blanca es válido si lo demuestra con un
  **test que falla**.
- No modifique el código de `app/` para "arreglar" la aplicación: su trabajo es
  encontrar y documentar, no corregir.
