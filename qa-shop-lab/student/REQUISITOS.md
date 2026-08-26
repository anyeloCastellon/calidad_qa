# QA Shop — Especificación de requisitos

Versión del sistema: **1.0.0**
Ambiente: **local** (`http://localhost:5000`)

Este documento es el contrato contra el cual se debe evaluar la aplicación.
Un requisito se considera **cumplido (PASS)** únicamente si existe evidencia
reproducible de que el sistema se comporta como aquí se describe.

---

## 1. Alcance del sistema

QA Shop es una tienda en línea de accesorios de computación. Permite consultar
un catálogo, armar un carrito de compras, aplicar un código de descuento,
finalizar la compra, autenticarse y consultar información administrativa.

El sistema expone una interfaz web y una API REST bajo la ruta `/api`.

---

## 2. Datos del ambiente

Catálogo inicial:

| ID | Producto          | Precio (CLP) | Stock |
|---:|-------------------|-------------:|------:|
| 1  | Notebook Gamer    |      850.000 |    15 |
| 2  | Mouse Gamer       |       25.000 |    30 |
| 3  | Teclado Mecanico  |       65.000 |    10 |
| 4  | Monitor 27        |      220.000 |     5 |
| 5  | Audifonos USB     |       45.000 |    20 |

Usuarios de prueba:

| Correo                | Contraseña  | Perfil        |
|-----------------------|-------------|---------------|
| cliente@example.com   | cliente123  | cliente       |
| admin@example.com     | admin123    | administrador |

Cupón vigente: `DUOC10`

---

## 3. Interfaz de programación (API)

| Método | Ruta                                       | Propósito                          |
|--------|--------------------------------------------|------------------------------------|
| GET    | `/api/health`                              | Estado del servicio                |
| GET    | `/api/products`                            | Listar catálogo                    |
| GET    | `/api/products/<id>`                       | Detalle de un producto             |
| POST   | `/api/carts`                               | Crear carrito                      |
| GET    | `/api/carts/<cart_id>`                     | Consultar carrito                  |
| POST   | `/api/carts/<cart_id>/items`               | Agregar producto al carrito        |
| DELETE | `/api/carts/<cart_id>/items/<item_id>`     | Eliminar línea del carrito         |
| POST   | `/api/carts/<cart_id>/coupon`              | Aplicar código de descuento        |
| POST   | `/api/checkout`                            | Finalizar la compra                |
| POST   | `/api/login`                               | Autenticación                      |
| GET    | `/api/me`                                  | Usuario de la sesión actual        |
| GET    | `/api/admin/orders`                        | Listado de órdenes (administración)|
| GET    | `/api/admin/stats`                         | Resumen de ventas (administración) |
| GET    | `/api/search?q=`                           | Búsqueda de productos              |
| GET    | `/api/reports/summary`                     | Resumen de ventas e inventario     |

La autenticación se realiza enviando la cabecera:

```
Authorization: Bearer <token>
```

---

## 4. Requisitos funcionales

### RF-01 — Listado de productos
El sistema debe listar los productos disponibles indicando, para cada uno,
su nombre, su precio y su stock.

### RF-02 — Agregar productos al carrito
El usuario debe poder agregar al carrito una cantidad válida de un producto
existente. El carrito debe reflejar el producto agregado y la cantidad
solicitada.

### RF-03 — Control de stock
El sistema **no debe permitir** agregar al carrito una cantidad superior al
stock disponible del producto.

### RF-04 — Cantidad válida
La cantidad de productos agregada al carrito debe ser **mayor que cero**.
Cantidades iguales o inferiores a cero deben ser rechazadas.

### RF-05 — Cálculo del subtotal
El subtotal del carrito debe corresponder exactamente a la suma de
`precio × cantidad` de todas las líneas que contiene.

### RF-06 — Descuento por cupón
El cupón `DUOC10` debe aplicar **exactamente un 10 %** de descuento sobre el
subtotal del carrito. El total debe ser `subtotal − descuento`.

### RF-07 — Compra con carrito no vacío
No se debe poder finalizar una compra cuando el carrito no contiene productos.

### RF-08 — Actualización de stock
Después de una compra exitosa, el stock de cada producto comprado debe
disminuir en la cantidad adquirida.

---

## 5. Requisitos no funcionales

### RNF-01 — Rendimiento
Las consultas de **productos**, **carrito** y **reportes** deben responder en
**menos de 500 ms** en condiciones normales de operación local.

Aplica, como mínimo, a: `GET /api/products`, `GET /api/products/<id>`,
`GET /api/carts/<cart_id>` y `GET /api/reports/summary`.

### RNF-02 — Carga
El catálogo debe mantener un funcionamiento estable con **100 usuarios
concurrentes**, sin errores de servidor y con tiempos de respuesta acotados.
La medición debe realizarse con una herramienta de carga y reportarse con
métricas objetivas (solicitudes por segundo, fallos, promedio, p95, máximo).

> El ambiente de evaluación es local y controlado. El resultado describe el
> comportamiento del sistema **bajo esa carga y en ese ambiente**; no equivale a
> una medición de capacidad en infraestructura productiva. El informe debe
> declarar explícitamente esta limitación.

### RNF-03 — Seguridad
Los recursos administrativos deben exigir autenticación **y** perfil de
administrador. Un usuario no autenticado o un usuario cliente no debe poder
acceder a información administrativa.
Adicionalmente, el sistema debe tratar toda entrada del usuario como no
confiable y no debe permitir que dicha entrada altere el comportamiento
interno del sistema.

### RNF-04 — Fiabilidad y robustez
Entradas inválidas, mal formadas o referencias a recursos inexistentes deben
producir errores controlados de la familia **4xx** con un mensaje comprensible.
Una entrada normal de usuario **no debe** provocar un error **500**.

### RNF-05 — Usabilidad
La interfaz debe ser utilizable en escritorio y en dispositivos móviles
(ancho de referencia: 375 px). Ningún control crítico del flujo de compra debe
quedar fuera del área visible, y los mensajes al usuario deben ser
comprensibles.

---

## 6. Criterio de aceptación global

El sistema puede ser autorizado a producción únicamente si:

1. todos los requisitos funcionales están cumplidos, y
2. no existen hallazgos de severidad **Alta** o **Crítica** abiertos en los
   requisitos no funcionales.

La decisión final debe ser justificada técnicamente en el informe de pruebas.
