# Informe resumen de pruebas

| Campo | Registro |
|---|---|
| Build evaluada | |
| Fecha | |
| Estudiante | |
| Entorno / perfil | |

## Smoke (separado de la campaña)

| Métrica | Cantidad |
|---|---|
| Smoke PASS | |
| Smoke FAIL | |
| Smoke BLOCKED | |
| Smoke NOT RUN | |

¿El Gate permitió continuar?: __________

Si el Smoke falló, indique problema y evidencia: __________

## Campaña principal

| Métrica | Cantidad |
|---|---|
| Casos planificados | |
| Casos ejecutados | |
| PASS | |
| FAIL | |
| BLOCKED | |
| NOT RUN | |

```text
Ejecutados = PASS + FAIL
Planificados = PASS + FAIL + BLOCKED + NOT RUN
```

Los Smoke no se suman a estas cifras. Los casos bloqueados o no ejecutados no se cuentan como ejecutados. Indique IDs/motivos pendientes: __________

Requisitos o riesgos sin cobertura suficiente: __________

## Defectos únicos

| Métrica | Cantidad |
|---|---|
| Defectos únicos | |
| Críticos | |
| Mayores | |
| Menores | |
| Cosméticos | |

El total de defectos únicos es la suma por severidad. Cuente una vez cada BUG, aunque lo detecten varios casos. Incluya los defectos del Smoke cuando existan e indique sus IDs: __________

## Decisión

- [ ] GO
- [ ] NO-GO
- [ ] GO CON CONDICIONES

Justificación, **máximo tres líneas**, basada en evidencia, impacto y cobertura pendiente:

1. __________
2. __________
3. __________

Si recomienda condiciones, indique qué corrección o comprobación debe cumplirse antes de liberar. Una campaña sin FAIL puede conservar riesgos no cubiertos; fundamente la recomendación con lo realmente ejecutado.
