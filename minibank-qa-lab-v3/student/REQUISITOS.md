# Requisitos de MiniBank 3.0

Build evaluada: **3.0.0-sast-lab**. Estos requisitos definen el esperado; registre lo obtenido al ejecutar sus casos anteriores.

| ID | Comportamiento esperado |
|---|---|
| RF01 | Iniciar sesión con RUT 11.111.111-1 y clave 1234. Credenciales erróneas, vacías o cadenas de inyección se rechazan sin crear sesión. |
| RF02 | Todo RUT de destinatario debe tener dígito verificador válido; se admiten puntos y guion o formato sin separadores. |
| RF03 | Monto expresado en pesos enteros; rechazar texto, decimales, booleanos, negativos y cero. |
| RF04 | Descontar monto + comisión de $300; rechazar si el saldo no cubre ambos. Una transferencia rechazada no modifica saldo, acumulado diario, destinatarios, movimientos ni secuencia de comprobantes. |
| RF05 | La suma de montos transferidos no debe superar $1.000.000 por jornada de laboratorio; se admite exactamente ese total. Reset inicia una nueva jornada. |
| RF06 | Mostrar mensajes claros sobre el motivo del rechazo y confirmación con comprobante al aceptar. |
| RF07 | Actualizar saldo, acumulado y movimientos después de cada transferencia exitosa, inmediatamente y sin recargar el navegador. |
| RF08 | Registrar destinatarios con RUT válido, nombre de 1–80 caracteres y alias de 3–30 caracteres después de eliminar espacios exteriores. El alias debe almacenarse sin esos espacios exteriores. No repetir RUT normalizado ni alias normalizado (sin espacios exteriores y sin distinguir mayúsculas). Admitir caracteres especiales como texto, sin ejecutar HTML. |
| RF09 | Monto mínimo $1 y máximo $500.000, ambos incluidos. |
| RNF01 | No registrar claves en logs ni devolverlas en respuestas, incluso cuando el login sea rechazado. |
| RNF02 | Logout invalida el token de esa sesión; su reutilización debe responder 401. |
| RNF03 | No exponer token en consola ni persistirlo en almacenamiento del navegador. Logout y una respuesta 401 deben limpiar la sesión de la UI. |
| RNF04 | Las operaciones bancarias de cuenta, movimientos, destinatarios y transferencias requieren sesión válida. Token ausente, inválido o invalidado debe producir 401 y no entregar datos ni modificar el estado. Los endpoints de laboratorio `/api/health`, `/api/lab/status`, `/api/lab/reset` y `/api/reset` están fuera del alcance de este requisito. |
| RNF05 | En 320×568, 375×667 y 390×844: sin desplazamiento horizontal ni superposiciones. Botones visibles al desplazarse verticalmente y utilizables; campos y mensajes legibles. |

## Estado inicial y precondiciones

- Cliente: Camila Rojas, RUT 11.111.111-1, clave 1234.
- Perfil `estandar`: saldo $2.000.000; comisión $300; acumulado diario $0.
- Perfil `saldo_bajo`: saldo $500.000; restantes datos iniciales iguales al estándar.
- Movimientos y destinatarios vacíos; primera transferencia aceptada genera `TRF-00001`.
- RUT válido de ejemplo: 12.345.678-5.
- `POST /api/lab/reset` o `POST /api/reset`, sin parámetros, restaura el perfil estándar.
- Ambas rutas admiten `?perfil=estandar` y `?perfil=saldo_bajo`. Un perfil desconocido se rechaza sin alterar datos.
- Reset restaura cuenta, acumulado, destinatarios, movimientos, sesiones y secuencia de comprobantes. Vuelva a iniciar sesión.
- Datos bancarios persistentes en SQLite: reiniciar el backend conserva las operaciones y el acumulado. El arranque invalida las sesiones existentes.
- No hay reloj de expiración automático: la sesión queda inválida tras logout, reset o arranque del backend.
- Reset del backend no elimina almacenamiento del navegador, autorización de Swagger ni logs históricos. Prepare cada superficie según las precondiciones del caso.

El estado del laboratorio se consulta en `GET /api/lab/status`: DB SQLite accesible, schema preparado y dataset base disponible. Registre la build antes de ejecutar. Para evitar mezclar resultados, restaure el perfil requerido cuando un caso necesite un estado inicial independiente.
