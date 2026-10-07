# Bitácora de ejecución

Estudiante: __________ · Fecha: __________ · Build: __________

Abra un registro nuevo por build. Mantenga los IDs de los casos previos y conserve las ejecuciones históricas. Agregue una fila por caso, sin completar resultados antes de ejecutar.

| Ciclo | Build | Caso | Requisito | Esperado | Obtenido | Estado | Defecto | Evidencia |
|---|---|---|---|---|---|---|---|---|
| Smoke | | | | | | | | |
| Ejecución | | | | | | | | |

## Estados permitidos

- **PASS:** ejecutado; obtenido coincide con esperado.
- **FAIL:** ejecutado; obtenido difiere del esperado. Vincular a `BUG-XXX`.
- **BLOCKED:** no pudo ejecutarse por una dependencia o por el Smoke fallido. Registrar la causa y el caso/problema bloqueante en Obtenido.
- **NOT RUN:** no se ejecutó por tiempo o selección de campaña. Registrar el motivo en Obtenido.

En los PASS y FAIL incluya evidencia local identificable; en los bloqueados indique la evidencia de la causa cuando esté disponible. La ausencia de evidencia no convierte una ejecución en aprobada.

Copie el esperado desde el caso anterior y registre los datos/precondiciones observados en el registro del caso o evidencia. Si varios FAIL corresponden al mismo defecto, vincúlelos al mismo BUG y conserve las reproducciones por caso.

Separe el ciclo `Smoke` de `Ejecución` al resumir:

```text
Ejecutados = PASS + FAIL
Planificados = PASS + FAIL + BLOCKED + NOT RUN
```
