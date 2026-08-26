# Guía del estudiante — Laboratorio de QA

## Situación

Su equipo forma parte del área de **Aseguramiento de Calidad** de una empresa
que desarrolló una nueva plataforma de comercio electrónico llamada **QA Shop**.

El equipo de desarrollo informa que el sistema **está terminado** y solicita
autorización para pasar a producción.

> **Misión del equipo:** determinar, mediante pruebas, si la aplicación cumple
> los requisitos funcionales y no funcionales establecidos, y emitir una
> recomendación técnica sobre su paso a producción.

Nadie les va a decir qué revisar ni dónde mirar. Ese es exactamente el trabajo.

**No se conoce previamente cuántos defectos existen.** Puede que no haya
ninguno, puede que haya varios. El objetivo no es alcanzar un número: es
verificar cada requisito con evidencia y sostener la conclusión a la que
lleguen.

---

## Qué reciben

| Recurso | Ubicación |
|---|---|
| Aplicación web | `http://localhost:5000` |
| API REST | `http://localhost:5000/api` |
| Requisitos a verificar | `student/REQUISITOS.md` |
| Plantilla de informe | `student/PLANTILLA_INFORME.md` |
| Colección Postman | `postman/QA-Shop-Lab.postman_collection.json` |
| Entorno Postman | `postman/QA-Shop-Lab.postman_environment.json` |
| Herramienta de carga | Locust, en `http://localhost:8089` |

Credenciales del ambiente de pruebas:

| Correo | Contraseña | Perfil |
|---|---|---|
| cliente@example.com | cliente123 | cliente |
| admin@example.com | admin123 | administrador |

---

## Herramientas

| Herramienta | Para qué la usarán |
|---|---|
| Navegador | Recorrer la interfaz, ver mensajes, revisar el flujo de compra |
| DevTools (F12) | Ver peticiones de red, respuestas y simular pantallas móviles |
| Postman | Ejecutar peticiones a la API con datos controlados |
| Locust | Medir el comportamiento bajo múltiples usuarios concurrentes |

Ninguna herramienta cubre por sí sola todos los requisitos. Parte del trabajo
consiste en decidir **qué herramienta es adecuada para cada requisito**.

---

## Cómo importar la colección en Postman

1. Abrir Postman.
2. `File > Import` y seleccionar `QA-Shop-Lab.postman_collection.json`.
3. Importar también `QA-Shop-Lab.postman_environment.json`.
4. Seleccionar el entorno **QA Shop Lab - Local** en la esquina superior derecha.
5. Verificar que la variable `base_url` apunta a `http://localhost:5000`.

La colección **no contiene validaciones automáticas**: ninguna petición dirá
PASS o FAIL. Ustedes observan la respuesta y deciden.

---

## Fases de trabajo

### Fase 1 — Reconocimiento (10 min)

Antes de probar, hay que entender qué se está probando.

- Recorran la aplicación en el navegador: inicio, productos, carrito, login.
- Ejecuten `GET /api/health` y `GET /api/products` en Postman.
- Anoten los datos reales del catálogo: id, nombre, precio y stock de cada producto.
- Identifiquen qué endpoint corresponde a cada requisito de `REQUISITOS.md`.

**Producto de esta fase:** una tabla que relacione cada requisito con el
endpoint o la pantalla donde se puede verificar.

---

### Fase 2 — Diseño de casos de prueba (20 min)

**No empiecen a hacer clic todavía.** Primero diseñen.

Para cada requisito, escriban al menos un caso con esta estructura:

| Campo | Ejemplo |
|---|---|
| ID | PF-001 |
| Requisito | RF-05 |
| Escenario | Verificar el subtotal de un carrito con dos productos distintos |
| Precondición | Carrito creado y vacío |
| Pasos | 1. Crear carrito. 2. Agregar producto 2 cantidad 2. 3. Agregar producto 3 cantidad 1. 4. Consultar carrito. |
| Datos de prueba | product_id=2 (25.000), qty=2; product_id=3 (65.000), qty=1 |
| Resultado esperado | subtotal = 115.000 |

Un caso de prueba **sirve** si otra persona puede ejecutarlo sin preguntarles
nada y obtener el mismo resultado. Si el resultado esperado es "que funcione",
el caso no sirve.

> Regla: el resultado esperado se deduce del **requisito**, nunca de lo que la
> aplicación hace. Si primero ejecutan y después escriben lo esperado, están
> documentando el bug como si fuera la especificación.

---

### Fase 3 — Happy paths (15 min)

Ejecuten primero el camino normal, con datos válidos y realistas:

- listar productos;
- crear un carrito;
- agregar un producto con una cantidad razonable;
- consultar el carrito;
- eliminar una línea;
- aplicar el cupón;
- finalizar la compra.

Registren el resultado obtenido de cada paso, aunque sea correcto. Un informe
sin casos PASS no es un informe de pruebas: es una lista de reclamos.

---

### Fase 4 — Casos borde (20 min)

En cualquier sistema, los casos borde son donde más suelen aparecer los
defectos. Vale la pena dedicarles tiempo.

Tomen un producto y **varíen sistemáticamente la cantidad**. Por ejemplo, para
un producto con stock 15, ¿qué debería ocurrir con cada uno de estos valores?

```
1        14        15        16        17        0        -1        99999
```

Antes de ejecutar, escriban qué espera el requisito para cada valor.
Después ejecuten y comparen.

Preguntas que ayudan a diseñar casos borde:

- ¿Qué valor está justo dentro del límite? ¿Justo fuera?
- ¿Qué pasa con cero? ¿Con un negativo? ¿Con un número enorme?
- ¿Qué pasa si el recurso no existe (un producto o un carrito con id 999999)?
- ¿Qué pasa si el tipo de dato es el equivocado (texto donde se espera número)?
- ¿Qué pasa si falta un campo obligatorio del cuerpo JSON?
- ¿Se puede repetir dos veces una operación que debería ocurrir una sola vez?
- Si una operación modifica datos, ¿el efecto quedó realmente registrado?
  (Ojo con esta última: verificar la respuesta **no** es lo mismo que verificar
  el estado del sistema después de la operación.)

---

### Fase 5 — Seguridad (20 min)

Investiguen, sobre el propio ambiente local, el requisito RNF-03:

- ¿Qué ocurre al pedir un recurso administrativo **sin** cabecera `Authorization`?
- ¿Qué ocurre al pedirlo con el token de un usuario **cliente**?
- ¿Todos los recursos administrativos se comportan igual entre sí?
- ¿Qué hace el sistema con entradas de texto inesperadas (comillas, símbolos,
  fragmentos de código) en los campos que aceptan texto libre?
- ¿La respuesta del sistema cambia de forma que no debería, según el dato
  ingresado?

Documenten qué probaron, con qué entrada exacta y qué observaron. Una prueba de
seguridad sin la entrada exacta usada no es reproducible.

> Todo esto se ejecuta **únicamente** contra la aplicación local del laboratorio.

---

### Fase 6 — Rendimiento y carga (20 min)

**Paso 1 — medición individual (Postman).**
Postman muestra el tiempo de cada respuesta bajo el código de estado.
Ejecuten cada endpoint y anoten el tiempo. Compárenlo con el umbral de RNF-01,
que cubre las consultas de productos, de carrito y de reportes.

**Paso 2 — medición bajo carga (Locust).**

```bash
docker compose --profile performance up --build
```

Abrir `http://localhost:8089` y configurar:

- Number of users: `100`
- Ramp up: `10`
- Host: `http://app:5000`

Dejen correr entre 1 y 2 minutos y registren, desde la pestaña *Statistics*:

| Métrica | Valor |
|---|---|
| Requests/s | |
| Failures | |
| Average (ms) | |
| Median (ms) | |
| 95%ile (ms) | |
| Max (ms) | |

Preguntas para el informe:

1. Una sola petición rápida en Postman, ¿demuestra que el sistema cumple RNF-02?
   Justifiquen con las métricas obtenidas.
2. La prueba se ejecutó en un notebook, contra contenedores locales, con SQLite
   y sin infraestructura productiva. Si el resultado fue bueno, ¿pueden afirmar
   que el sistema **soportará** 100 usuarios en producción? ¿Qué es exactamente
   lo que midieron y qué **no** midieron?

> Lo que esta prueba mide es el **comportamiento del sistema bajo una carga
> controlada en un ambiente local**. No es una medición de capacidad
> productiva. Declaren esa limitación en el informe: reconocer el alcance de
> una medición es parte del trabajo de QA.

---

### Fase 7 — Usabilidad (10 min)

Comparen la aplicación en dos tamaños:

1. Escritorio, ventana maximizada.
2. Móvil: en DevTools (F12), activar *Toggle device toolbar* y elegir un ancho
   de **375 px**.

Recorran el flujo completo de compra en ambos tamaños:

- ¿Se ven todos los controles?
- ¿Se puede completar la compra en ambos?
- ¿Algún control queda cortado o fuera del área visible?
- ¿Se puede llegar a él haciendo scroll?
- ¿Los mensajes que entrega el sistema le explican al usuario qué ocurrió?

---

### Fase 8 — Informe y decisión (15 min)

Completen `PLANTILLA_INFORME.md` con:

1. los casos funcionales ejecutados, con resultado esperado y obtenido;
2. los casos no funcionales, con métricas concretas;
3. los hallazgos, cada uno con pasos reproducibles y severidad;
4. la conclusión.

Escala de severidad sugerida:

| Severidad | Criterio |
|---|---|
| **Crítica** | Compromete datos, dinero o acceso; no puede salir a producción bajo ninguna circunstancia |
| **Alta** | Un requisito funcional no se cumple; produce pérdida económica o datos incorrectos |
| **Media** | Afecta la experiencia o la robustez, pero existe forma de continuar |
| **Baja** | Detalle estético o de conveniencia |

Y respondan la pregunta de cierre:

> **¿Autoriza el paso del sistema a producción? Sí / No. Justifique técnicamente.**

Una respuesta como "no, porque tiene errores" no es una justificación técnica.
Una justificación técnica nombra los requisitos incumplidos, la severidad de
cada hallazgo y el riesgo concreto para el negocio.

---

## Reglas del laboratorio

1. Todo hallazgo debe ser **reproducible**: si no pueden repetirlo, no es un hallazgo.
2. Todo hallazgo debe estar asociado a un **requisito**. Si no viola ningún
   requisito, es una observación, no un defecto.
3. Registren la **evidencia**: captura de la petición y de la respuesta.
4. No modifiquen el código de la aplicación. Están probando, no reparando.
5. Si necesitan volver al estado inicial, pidan al docente el reinicio de la
   base de datos.

---

## Entregable

Un documento (o PDF) basado en `PLANTILLA_INFORME.md` que contenga:

- diseño de casos de prueba;
- ejecución con evidencia;
- hallazgos con severidad;
- resultados de las pruebas no funcionales con métricas;
- conclusión y recomendación de paso a producción.
