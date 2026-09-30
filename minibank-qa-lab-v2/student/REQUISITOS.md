# Requisitos de MiniBank 2.0

Este documento define el comportamiento esperado. Compárelo con lo observado.

| ID | Comportamiento esperado |
|---|---|
| RF01 | Iniciar sesión con RUT 11.111.111-1 y clave 1234. Credenciales erróneas, vacías o cadenas de inyección se rechazan sin crear sesión. |
| RF02 | Todo RUT de destinatario debe tener dígito verificador válido; se admiten puntos y guion o formato sin separadores. |
| RF03 | Monto expresado en pesos enteros; rechazar texto, decimales, booleanos, negativos y cero. |
| RF04 | Descontar monto + comisión de $300; rechazar si el saldo no cubre ambos. No modificar datos al rechazar. |
| RF05 | La suma de montos transferidos no debe superar $1.000.000 por jornada de laboratorio; se admite exactamente ese total. Reset inicia una nueva jornada. |
| RF06 | Mostrar mensajes claros sobre el motivo del rechazo y confirmación con comprobante al aceptar. |
| RF07 | Actualizar saldo, acumulado y movimientos después de cada transferencia exitosa sin recargar el navegador. |
| RF08 | Registrar destinatarios con RUT válido, nombre de 1–80 caracteres y alias de 3–30 caracteres. Recortar espacios exteriores antes de medir. No repetir RUT normalizado ni alias (sin distinguir mayúsculas). Admitir caracteres especiales como texto, sin ejecutar HTML. |
| RF09 | Monto mínimo $1 y máximo $500.000, ambos incluidos. |
| RNF01 | No registrar claves en logs ni devolverlas en respuestas. |
| RNF02 | Logout invalida el token de esa sesión; su reutilización debe responder 401. |
| RNF03 | No exponer token en consola ni persistirlo en almacenamiento del navegador. |
| RNF04 | Las operaciones bancarias de cuenta, movimientos, destinatarios y transferencias requieren sesión válida. Token ausente, inválido o invalidado debe producir 401 y no entregar datos ni modificar el estado. Los endpoints de laboratorio `/api/health` y `/api/reset` están fuera del alcance de este requisito. |
| RNF05 | En 320×568, 375×667 y 390×844: sin desplazamiento horizontal ni superposiciones. Botones visibles al desplazarse verticalmente y utilizables; campos y mensajes legibles. |

## Estado inicial

- Cliente: Camila Rojas, RUT 11.111.111-1, clave 1234.
- Saldo: $2.000.000. Comisión: $300. Acumulado diario: $0.
- Movimientos y destinatarios vacíos.
- RUT válido de ejemplo: 12.345.678-5.
- POST /api/reset restaura estos valores e invalida todas las sesiones.
- Datos en memoria: reiniciar el backend también restaura el laboratorio.
- No hay reloj de expiración automático: una sesión queda inválida tras logout, reset o reinicio.

El saldo inicial permite aislar pruebas del máximo por transferencia y del límite diario. Para saldo insuficiente, use POST /api/reset?perfil=saldo_bajo: restaura todo con saldo $500.000. Registre el perfil en las precondiciones y vuelva a ingresar. POST /api/reset sin parámetros siempre vuelve al estado estándar.

