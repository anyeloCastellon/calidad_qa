# Smoke Test — Gate de ejecución

Build evaluada: **3.0.0-sast-lab**. Ejecute en orden y registre obtenido, estado y evidencia. Los resultados se completan al ejecutar.

| ID | Validación / pasos | Resultado esperado | Obtenido | Estado | Evidencia |
|---|---|---|---|---|---|
| SMK-001 | Consultar `GET http://localhost:8002/api/lab/status`. | HTTP 200; status `ready`; build `3.0.0-sast-lab`; SQLite, schema `ready`, seed `loaded`. | | | |
| SMK-002 | Abrir http://localhost:5175; ingresar RUT `11.111.111-1`, clave `1234` y presionar Ingresar. | Login aceptado; se ingresa a MiniBank. | | | |
| SMK-003 | Después del login, observar Home y los datos de cuenta. | Home carga; cliente Camila Rojas y datos de cuenta visibles según el perfil preparado. | | | |

Precondiciones: servicios iniciados, perfil inicial registrado y navegador preparado sin sesión para SMK-002. Si utiliza el perfil estándar desde reset, el saldo inicial es $2.000.000; con `saldo_bajo`, $500.000.

```text
SMK-001 + SMK-002 + SMK-003 = PASS
                 │
                 └─► Continúe con los casos previos

Cualquier Smoke FAIL
                 │
                 └─► STOP → Casos dependientes BLOCKED
```

Si falla un paso, no ejecute la campaña. Registre el `FAIL` y su reporte de defecto; marque los Smoke y casos dependientes que no pudo ejecutar como `BLOCKED`, indicando la causa. Utilice `NOT RUN` cuando un caso no se ejecutó por otro motivo, como tiempo o selección de campaña.

Guarde evidencia de los PASS y FAIL, y traslade el registro a la bitácora con ciclo `Smoke`. Cuente estos tres checks separados de la campaña principal para no duplicar el total de casos ejecutados.
