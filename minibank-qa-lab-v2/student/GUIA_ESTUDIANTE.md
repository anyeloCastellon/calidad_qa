# MiniBank QA Lab 2.0
## Operación: convierta el plan en pruebas

En la actividad anterior diseñó el Plan de Pruebas de MiniBank. El equipo acaba de publicar la versión 2.0. Ahora debe demostrar mediante casos y evidencia si cumple sus requisitos.

**Requisito → Escenario → Caso → Ejecución → Resultado → Defecto → Trazabilidad**

Trabaje con [REQUISITOS.md](REQUISITOS.md), [PLANTILLA_CASOS.md](PLANTILLA_CASOS.md), [REPORTE_DEFECTO.md](REPORTE_DEFECTO.md) y [MATRIZ_TRAZABILIDAD.md](MATRIZ_TRAZABILIDAD.md).

## Misión 1 — Conozca MiniBank (0–5 min)

1. Arranque según el README; abra http://localhost:5174.
2. Ingrese con RUT 11.111.111-1 y clave 1234.
3. Revise saldo, transferencias, destinatarios y movimientos.
4. Lea los requisitos antes de buscar defectos.

## Misión 2 — Diseñe sus pruebas (5–25 min)

Dedique 5 minutos a identificar al menos cuatro escenarios: login, destinatarios, transferencias, control de acceso o móvil.

**Escenario:** qué quiere comprobar. **Caso:** exactamente cómo lo comprobará, con precondiciones, datos, pasos y esperado.

Diseñe **8–10 casos**, cada uno con todos los campos de la plantilla:

- 3 funcionales.
- 2 de valores límite.
- 2 de seguridad.
- 1 de usabilidad.
- Hasta 2 adicionales libres.

Asigne a cada caso una categoría principal para contar la distribución. Puede vincularlo a varios requisitos.

## Misión 3 — Ataque los límites

Para un intervalo inclusivo, considere valores justo debajo, en el límite y justo encima de cada extremo. Los alias y montos permiten aplicar esta técnica. ¿Qué valores escogería para comprobar sus límites?

Distinga particiones válidas e inválidas: campos vacíos, RUT válido/inválido, monto entero/no entero y duplicados. No complete resultados antes de ejecutar.

## Misión 4 — Ejecute y proteja la cuenta (25–35 min)

Ejecute sus casos en el navegador y Swagger: http://localhost:8001/docs.

- DevTools → Network: registre método, URL, cuerpo, estado HTTP y respuesta.
- Console: observe si aparece información sensible.
- Swagger → login: copie el token y use **Authorize** (pegue el token sin prefijo Bearer).
- Para acceso sin sesión, quite la autorización; para sesión inválida, pruebe un token inventado o invalidado.
- Use POST /api/reset entre casos que requieran estado inicial; vuelva a iniciar sesión.
- Registre datos iniciales, pasos y resultados para que otra persona pueda repetirlos.
- Oculte el token en la evidencia que comparta.

No necesita Postman ni servicios externos.

## Misión 5 — Pruebe el teléfono más pequeño

DevTools → modo dispositivo: pruebe 320×568, 375×667 y 390×844. Examine formularios, botones, errores, destinatarios y movimientos **después de crear datos**. Se permite desplazamiento vertical. Documente cualquier desplazamiento horizontal o superposición.

## Misión final — Demuestre sus hallazgos (35–45 min)

35–42 min: complete la matriz y un reporte por defecto encontrado. Relacione cada reporte con el caso y requisito. Una falla reproducible debe incluir esperado, observado y evidencia.

Pregunte: **¿Existe algún requisito sin al menos un caso?** Indique los requisitos pendientes; con 8–10 casos puede quedar cobertura incompleta. No invente ejecuciones para completar la matriz.

42–45 min: responda solamente:

1. ¿Cuántos casos ejecutó?
2. ¿Cuántos pasaron, fallaron o quedaron bloqueados?
3. ¿Qué requisito considera más riesgoso según lo observado?

Entregue casos completos, evidencias, matriz y reportes. No se solicita otro Plan de Pruebas.

## Un ejemplo de diseño

| Campo | Contenido |
|---|---|
| ID | CP-LOGIN-001 |
| Escenario | EP-01 Inicio de sesión |
| Requisito | RF01 |
| Categoría | Funcional |
| Prioridad | Alta |
| Precondiciones | MiniBank disponible; sin sesión |
| Pasos | 1. Abrir MiniBank. 2. Escribir RUT. 3. Escribir clave. 4. Presionar Ingresar. |
| Datos | RUT 11.111.111-1; clave 1234 |
| Esperado | Se muestra cuenta de Camila Rojas y saldo inicial $2.000.000 |
| Obtenido | Completar al ejecutar |
| Estado | Completar al ejecutar |
| Evidencia | Completar al ejecutar |

Diseñe usted los siguientes casos.

