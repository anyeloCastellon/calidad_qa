# Atlas — contrato operativo del laboratorio

Estas decisiones concretan aspectos de operación de Atlas para que sus usuarios compartan una interpretación consistente. Complementan la ERS entregada por el docente; no sustituyen sus requisitos ni constituyen resultados de evaluación.

## Empresas, usuarios y roles

- Los datos se organizan por empresa y sus membresías. Un usuario puede pertenecer a una o más empresas.
- El contexto de empresa determina los datos y permisos de la operación.
- El primer usuario que crea una empresa obtiene el rol administrador en ella.
- El administrador gestiona los datos y accesos de su empresa; el editor tiene permisos de lectura.
- Para esta instalación se adopta la unicidad del correo principal de empresa: dos empresas no pueden compartirlo.
- El acceso anónimo se limita al registro, inicio de sesión y confirmación de correo. Los datos de empresa requieren identificación y membresía.

## Clientes

Los clientes se gestionan dentro de una empresa. El campo opcional `empresa` del cliente representa su razón social o dato de negocio; es distinto de la empresa propietaria de los registros.

Se admite búsqueda por `nombre` y por `empresa` del cliente, combinando ambos filtros, con paginación. La API utiliza `?nombre=texto&empresa=texto&page=1&limit=10`; `page_size` es un alias compatible de `limit`. La búsqueda no cambia la empresa activa del usuario ni amplía el conjunto de datos al que tiene acceso.

La eliminación de clientes es lógica y requiere confirmación. Los formularios indican sus campos y restricciones de entrada; no utilice datos personales ni bancarios reales en el laboratorio.

## Fechas y estados de contrato

Las fechas de contrato se interpretan como fechas de calendario **UTC**, sin hora. La fecha de término no puede ser anterior a la fecha de inicio.

| Estado | Definición |
|---|---|
| Programado | La fecha actual UTC es anterior a la fecha de inicio. |
| Expirado | La fecha de término es anterior a la fecha actual UTC. |
| Vence | El contrato ya comenzó y la fecha de término está entre hoy y 30 días inclusive, en UTC. |
| Activo | El contrato ya comenzó y su fecha de término está a más de 30 días. |

Se evalúa primero si el contrato aún no comienza, luego si expiró y finalmente el intervalo de vencimiento. El día de término forma parte de la vigencia.

## Documentos

- Un contrato admite **un documento** almacenado y asociado mediante referencia en PostgreSQL.
- Formatos admitidos: **PDF, DOC, PPT, JPG y PNG**. Las extensiones DOCX y PPTX no forman parte de esta lista.
- Tamaño máximo por archivo: **10 MiB**, equivalentes a 10.485.760 bytes.
- El almacenamiento interno conserva el archivo; el enlace de descarga no reemplaza su registro en la base de datos.

## Enlaces para compartir

El enlace compartido se vincula al documento y a su empresa, expira **24 horas** después de generarse y puede revocarse. Al utilizarlo, el destinatario debe identificarse y conservar una membresía vigente en esa empresa. La posesión del enlace por sí sola no concede acceso; se mantiene la restricción de pertenencia de RB-2.

## Datos y entorno

El dataset inicial contiene Atlas Norte SpA y Servicios Sur SpA, 40 clientes y ocho contratos con datos ficticios. Las cuentas y sus membresías disponibles se indican en el manual. El registro y las confirmaciones utilizan el buzón SMTP local del laboratorio.

En este modo de laboratorio, el navegador accede a Atlas en `http://localhost:5180` y a Mailpit en `http://localhost:8026`, exclusivamente en loopback y con datos ficticios. No requiere importar una CA para utilizar estas interfaces. Las conexiones internas del backend con PostgreSQL y SMTP mantienen TLS; este modo de acceso local no equivale a TLS de extremo a extremo.

El estado técnico de la instalación se consulta en `/api/lab/status`; no contiene una calificación del producto ni respuestas de la evaluación. La ERS conserva su papel como referencia del comportamiento exigible al producto.
