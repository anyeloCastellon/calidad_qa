# Atlas — manual de usuario

Atlas permite administrar empresas, usuarios, clientes, contratos y documentos desde un navegador. Esta instalación utiliza datos ficticios y está destinada al laboratorio local de EP3.

Abra **http://localhost:5180** después de iniciar el entorno según el [README](../README.md). El acceso de navegador es HTTP local y no requiere importar certificados. Utilice únicamente los datos ficticios del laboratorio.

## 1. Acceso y registro

Ingrese con nombre de usuario y contraseña. Para crear una cuenta, utilice Registro y un correo ficticio. Consulte el mensaje de confirmación en el buzón local **http://localhost:8026**, complete la confirmación y continúe con la creación de empresa.

El buzón local sirve únicamente para los correos del laboratorio; no requiere una cuenta de correo externa.

| Usuario del dataset | Acceso inicial |
|---|---|
| `admin.atlas` | Administrador de Atlas Norte SpA; editor de Servicios Sur SpA |
| `editor.atlas` | Editor de Atlas Norte SpA |
| `admin.sur` | Administrador de Servicios Sur SpA |

Contraseña ficticia de estas cuentas: `AtlasDemo!2026`. Para salir, utilice Cerrar sesión.

## 2. Empresa y equipo

En el contexto de empresa, consulte sus datos y seleccione la empresa con la que desea trabajar si tiene varias membresías. Los registros y permisos corresponden a la empresa seleccionada.

El administrador puede crear o incorporar usuarios, asignarles rol y modificar o eliminar sus accesos a la empresa. El rol **editor** permite consultar datos. El rol **administrador** permite administrarlos. Un usuario puede tener membresías en varias empresas; los permisos se aplican dentro de cada una.

## 3. Clientes

Abra Clientes para consultar el listado, buscar por nombre y por empresa del cliente y cambiar de página. Los filtros se combinan. El administrador puede crear y editar nombre, empresa del cliente, descripción, dirección, contacto, RUT y datos bancarios ficticios mediante el formulario.

El campo opcional **empresa del cliente** indica su razón social o dato de negocio; no es la empresa activa que organiza y controla el acceso a los registros.

Para eliminar un cliente, seleccione la acción y confirme la operación. La eliminación es lógica: el registro deja de formar parte del listado habitual. Desde un cliente puede acceder a sus contratos.

## 4. Contratos

Abra un cliente y consulte sus contratos. Para crear uno, complete título, descripción, fecha de inicio y fecha de término. Un cliente puede tener varios contratos; cada contrato pertenece a un único cliente.

El estado visible se calcula a partir de las fechas. Consulte las definiciones de Programado, Activo, Vence y Expirado en el [contrato operativo](CONTRATO_OPERATIVO.md).

## 5. Documentos y acceso compartido

Desde el contrato, el administrador puede adjuntar un archivo admitido. Consulte o descargue el documento mediante las acciones disponibles en el detalle. Los formatos, tamaño y cardinalidad se especifican en el contrato operativo.

La acción de compartir genera un enlace con vigencia de 24 horas. El destinatario debe identificarse y pertenecer a la empresa correspondiente; el enlace no concede acceso público. El administrador puede revocarlo antes de su vencimiento.

## 6. Auditoría

Abra Auditoría para consultar los eventos registrados por las operaciones del sistema. Los eventos se presentan dentro del contexto de empresa. La información de fecha, actor y acción permite localizar una operación realizada.

Si aparece un mensaje de error, consérvelo junto con la operación y la hora para comunicar el problema. El manual describe el uso del producto; no contiene casos de prueba, resultados de evaluación ni una conclusión sobre su calidad o cumplimiento.
