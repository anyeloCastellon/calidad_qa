const jsonBody = schema => ({ required: true, content: { 'application/json': { schema } } })
const ref = name => ({ $ref: `#/components/schemas/${name}` })
const paths = {}
const add = (method, path, summary, schema, publicRoute = false) => {
  paths[path] ||= {}
  const operation = { summary, tags: [path.includes('/auth') ? 'Autenticación' : path.includes('/documento') ? 'Documentos' : path.includes('/usuarios') || path.includes('/invitaciones') ? 'Usuarios' : path.includes('/contratos') ? 'Contratos' : path.includes('/clientes') ? 'Clientes' : 'Empresas'],
    parameters: [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: { type: 'string', format: match[1] === 'token' ? undefined : 'uuid' } })),
    responses: { 200: { description: 'Respuesta de la operación' }, 201: { description: 'Recurso creado' }, 400: { description: 'Solicitud inválida' }, 401: { description: 'Sesión requerida o inválida' }, 403: { description: 'Operación no permitida' }, 404: { description: 'Recurso no disponible' }, 409: { description: 'Conflicto con el estado actual' }, 422: { description: 'Campos inválidos' } } }
  if (schema) operation.requestBody = jsonBody(schema)
  if (publicRoute) operation.security = []
  paths[path][method] = operation
}
add('get', '/api/health', 'Disponibilidad del proceso', null, true)
add('get', '/api/lab/status', 'Estado del entorno', null, true)
add('post', '/api/auth/register', 'Registrar una cuenta', ref('Registro'), true)
add('post', '/api/auth/confirm', 'Confirmar correo', ref('Token'), true)
add('post', '/api/auth/login', 'Iniciar sesión', ref('Login'), true)
add('post', '/api/auth/refresh', 'Renovar acceso mediante cookie segura y Origin autorizado', null, true)
add('post', '/api/auth/logout', 'Cerrar sesión', null, true)
add('get', '/api/auth/me', 'Obtener cuenta y empresas')
add('post', '/api/auth/invitaciones/aceptar', 'Aceptar una invitación', { type: 'object', required: ['token', 'nombre_usuario', 'password'], properties: { token: { type: 'string' }, nombre_usuario: { type: 'string' }, password: { type: 'string', format: 'password' } } }, true)
add('get', '/api/empresas', 'Listar empresas de la cuenta')
add('post', '/api/empresas', 'Crear una empresa', ref('Empresa'))
const base = '/api/empresas/{eid}'
add('get', base, 'Obtener empresa')
add('patch', base, 'Actualizar empresa', ref('EmpresaParcial'))
add('get', `${base}/dashboard`, 'Resumen operativo de empresa')
add('get', `${base}/usuarios`, 'Listar usuarios de empresa')
add('post', `${base}/usuarios`, 'Crear un usuario de empresa', ref('Usuario'))
add('patch', `${base}/usuarios/{uid}`, 'Actualizar rol o estado de membresía', { type: 'object', properties: { rol: ref('Rol'), activo: { type: 'boolean' } } })
add('delete', `${base}/usuarios/{uid}`, 'Desvincular usuario de empresa', ref('Confirmacion'))
add('post', `${base}/invitaciones`, 'Invitar una cuenta por correo', { type: 'object', required: ['email', 'rol'], properties: { email: { type: 'string', format: 'email' }, rol: ref('Rol') } })
add('get', `${base}/clientes`, 'Listar clientes con filtros y paginación')
paths[`${base}/clientes`].get.parameters.push(...['nombre', 'empresa', 'page', 'limit'].map(name => ({ in: 'query', name, schema: { type: ['page', 'limit'].includes(name) ? 'integer' : 'string' } })))
add('post', `${base}/clientes`, 'Crear cliente', ref('Cliente'))
add('get', `${base}/clientes/{cid}`, 'Obtener cliente')
add('patch', `${base}/clientes/{cid}`, 'Actualizar cliente', ref('ClienteParcial'))
add('delete', `${base}/clientes/{cid}`, 'Eliminar cliente lógicamente', ref('Confirmacion'))
add('get', `${base}/clientes/{cid}/contratos`, 'Listar contratos del cliente')
add('post', `${base}/clientes/{cid}/contratos`, 'Crear contrato del cliente', ref('Contrato'))
add('get', `${base}/contratos/{kid}`, 'Obtener contrato')
add('patch', `${base}/contratos/{kid}`, 'Actualizar contrato', ref('ContratoParcial'))
add('delete', `${base}/contratos/{kid}`, 'Eliminar contrato lógicamente', ref('Confirmacion'))
add('get', `${base}/contratos/{kid}/documento`, 'Metadatos del documento')
add('post', `${base}/contratos/{kid}/documento`, 'Adjuntar documento')
paths[`${base}/contratos/{kid}/documento`].post.requestBody = { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['archivo'], properties: { archivo: { type: 'string', format: 'binary' } } } } } }
add('delete', `${base}/contratos/{kid}/documento`, 'Eliminar documento', ref('Confirmacion'))
add('get', `${base}/contratos/{kid}/documento/contenido`, 'Descargar documento')
add('get', `${base}/contratos/{kid}/enlaces`, 'Listar enlaces del documento')
add('post', `${base}/contratos/{kid}/enlaces`, 'Generar enlace para miembros de la empresa', { type: 'object', properties: { horas: { type: 'integer', minimum: 1, maximum: 24, default: 24 } } })
add('delete', `${base}/enlaces/{sid}`, 'Revocar un enlace')
add('get', `${base}/auditoria`, 'Consultar auditoría')
paths[`${base}/auditoria`].get.parameters.push(...['accion', 'recurso', 'page', 'limit'].map(name => ({ in: 'query', name, schema: { type: ['page', 'limit'].includes(name) ? 'integer' : 'string' } })))
add('get', '/api/compartidos/{token}', 'Consultar documento compartido como miembro')
add('get', '/api/compartidos/{token}/contenido', 'Descargar documento compartido como miembro')

const string = maxLength => ({ type: 'string', maxLength })
const companyProperties = { nombre: string(160), direccion: string(300), telefono: string(30), email: { type: 'string', format: 'email' } }
const clientProperties = { nombre: string(160), empresa: string(160), descripcion: string(2000), direccion: string(300), email: { type: 'string' }, telefono: string(30), rut: string(15), datos_bancarios: { type: 'object', properties: { banco: string(100), tipo_cuenta: string(50), numero_cuenta: string(60) } } }
const contractProperties = { titulo: string(200), descripcion: string(4000), fecha_inicio: { type: 'string', format: 'date' }, fecha_fin: { type: 'string', format: 'date' } }
const registrationProperties = { nombre_usuario: { type: 'string', minLength: 3, maxLength: 32 }, email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password', minLength: 12, description: 'Máximo 72 bytes UTF-8; mayúscula, minúscula, número y símbolo' } }
export const openapi = { openapi: '3.0.3', info: { title: 'Atlas API', version: '1.0.0', description: 'API operativa de empresas, clientes, contratos y documentos. Las operaciones empresariales requieren membresía vigente.' }, servers: [{ url: '/' }], security: [{ bearerAuth: [] }], paths,
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas: {
    Registro: { type: 'object', required: ['nombre_usuario', 'email', 'password'], properties: registrationProperties },
    Login: { type: 'object', required: ['nombre_usuario', 'password'], properties: { nombre_usuario: { type: 'string' }, password: { type: 'string', format: 'password' } } },
    Token: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } },
    Rol: { type: 'string', enum: ['administrador', 'editor'] },
    Usuario: { type: 'object', required: ['nombre_usuario', 'email', 'password', 'rol'], properties: { ...registrationProperties, rol: ref('Rol') } },
    Empresa: { type: 'object', required: Object.keys(companyProperties), properties: companyProperties }, EmpresaParcial: { type: 'object', properties: companyProperties },
    Cliente: { type: 'object', required: ['nombre'], properties: clientProperties }, ClienteParcial: { type: 'object', properties: clientProperties },
    Contrato: { type: 'object', required: ['titulo', 'fecha_inicio', 'fecha_fin'], properties: contractProperties }, ContratoParcial: { type: 'object', properties: contractProperties },
    Confirmacion: { type: 'object', required: ['confirmacion'], properties: { confirmacion: { type: 'boolean', enum: [true] } } },
  } },
}
