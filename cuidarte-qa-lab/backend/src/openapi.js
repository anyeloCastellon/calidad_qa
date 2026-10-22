const ref = name => ({ $ref: `#/components/schemas/${name}` })
const string = { type: 'string' }, uuid = { type: 'string', format: 'uuid' }, date = { type: 'string', format: 'date' }
const object = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false })
const json = schema => ({ 'application/json': { schema } })
const input = schema => ({ required: true, content: json(schema) })
const pathId = name => ({ name, in: 'path', required: true, schema: uuid })
const paging = [{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }, { name: 'page_size', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 15 } }]
const response = (description, schema = ref('Envelope')) => ({ description, content: json(schema) })
function operation(tag, summary, options = {}) {
  const { public: isPublic, status = '200', schema, ...rest } = options
  return { tags: [tag], summary, security: isPublic ? [] : [{ bearerAuth: [] }], responses: { [status]: response(status === '201' ? 'Creado' : status === '204' ? 'Eliminado' : 'Respuesta', schema), '400': response('Solicitud inválida', ref('Error')), '401': response('Autenticación requerida', ref('Error')), '403': response('Operación no autorizada', ref('Error')), '404': response('Recurso no disponible', ref('Error')), '409': response('Conflicto', ref('Error')), '422': response('Campos inválidos', ref('Error')) }, ...rest }
}
const patient = { nombre: { type: 'string', maxLength: 160 }, rut: string, fecha_nacimiento: string, sexo: { type: 'string', enum: ['', 'femenino', 'masculino', 'otro', 'no_informa'] }, email: string, telefono: string, direccion: string, antecedentes: string }
const exam = { nombre: { type: 'string', maxLength: 200 }, tipo: { type: 'string', enum: ['laboratorio', 'imagenologia', 'otro'] }, fecha: date, descripcion: string, observaciones: string }
const credentials = { nombre_usuario: { type: 'string', minLength: 3, maxLength: 32 }, password: { type: 'string', format: 'password' } }
const user = { ...credentials, email: { type: 'string', format: 'email' }, rol: { type: 'string', enum: ['administrador', 'medico', 'paciente'] } }
const confirm = input(object({ confirmacion: { type: 'boolean', enum: [true] } }, ['confirmacion']))
const upload = { required: true, content: { 'multipart/form-data': { schema: object({ archivo: { type: 'string', format: 'binary' } }, ['archivo']) } } }
export const openapi = {
  openapi: '3.0.3', info: { title: 'Cuidarte+ API', version: '1.0.0' }, servers: [{ url: '/api' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Envelope: { type: 'object', properties: { data: {}, meta: { type: 'object' } } },
      Error: { type: 'object', properties: { error: object({ code: string, message: string, fields: { type: 'object' } }), requestId: uuid } },
      Login: object(credentials, ['nombre_usuario', 'password']), Register: object({ ...credentials, email: user.email }, ['nombre_usuario', 'password', 'email']),
      Patient: object(patient, ['nombre']), PatientCreate: object({ ...patient, cuenta: ref('Login') }, ['nombre']), PatientPatch: object(patient),
      Exam: object(exam, ['nombre', 'tipo', 'fecha']), ExamPatch: object(exam),
      User: object(user, ['nombre_usuario', 'password', 'email', 'rol']), UserPatch: object({ nombre_usuario: user.nombre_usuario, email: user.email, rol: user.rol, activo: { type: 'boolean' } }),
    },
  },
  paths: {
    '/health': { get: operation('Estado', 'Estado del proceso', { public: true }) },
    '/lab/status': { get: operation('Estado', 'Estado de base de datos y esquema', { public: true }) },
    '/auth/register': { post: operation('Autenticación', 'Registrar cuenta', { public: true, status: '201', requestBody: input(ref('Register')) }) },
    '/auth/confirm': { post: operation('Autenticación', 'Confirmar correo', { public: true, requestBody: input(object({ token: string }, ['token'])) }) },
    '/auth/login': { post: operation('Autenticación', 'Iniciar sesión', { public: true, requestBody: input(ref('Login')) }) },
    '/auth/refresh': { post: operation('Autenticación', 'Renovar sesión mediante cookie', { public: true }) },
    '/auth/logout': { post: operation('Autenticación', 'Cerrar sesión') },
    '/auth/me': { get: operation('Autenticación', 'Consultar sesión') },
    '/dashboard': { get: operation('Resumen', 'Obtener resumen') },
    '/pacientes': {
      get: operation('Pacientes', 'Listar pacientes', { parameters: [...paging, { name: 'q', in: 'query', schema: string }] }),
      post: operation('Pacientes', 'Registrar paciente', { status: '201', requestBody: input(ref('PatientCreate')) }),
    },
    '/pacientes/{pid}': {
      parameters: [pathId('pid')], get: operation('Pacientes', 'Consultar paciente'),
      patch: operation('Pacientes', 'Editar paciente', { requestBody: input(ref('PatientPatch')) }),
      delete: operation('Pacientes', 'Eliminar paciente', { status: '204', requestBody: confirm }),
    },
    '/pacientes/{pid}/examenes': {
      parameters: [pathId('pid')], get: operation('Exámenes', 'Listar exámenes del paciente'),
      post: operation('Exámenes', 'Registrar examen', { status: '201', requestBody: input(ref('Exam')) }),
    },
    '/examenes/{eid}': {
      parameters: [pathId('eid')], get: operation('Exámenes', 'Consultar examen'),
      patch: operation('Exámenes', 'Editar examen', { requestBody: input(ref('ExamPatch')) }),
      delete: operation('Exámenes', 'Eliminar examen', { status: '204', requestBody: confirm }),
    },
    '/examenes/{eid}/documento': {
      parameters: [pathId('eid')], get: operation('Documentos', 'Consultar documento'),
      post: operation('Documentos', 'Adjuntar documento', { status: '201', requestBody: upload }),
      put: operation('Documentos', 'Reemplazar documento', { requestBody: upload }),
      delete: operation('Documentos', 'Eliminar documento', { status: '204', requestBody: confirm }),
    },
    '/examenes/{eid}/documento/contenido': { parameters: [pathId('eid')], get: operation('Documentos', 'Descargar documento', { responses: { '200': { description: 'Archivo', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } }, '401': response('Autenticación requerida', ref('Error')), '404': response('Recurso no disponible', ref('Error')) } }) },
    '/usuarios': { get: operation('Usuarios', 'Listar usuarios', { parameters: paging }), post: operation('Usuarios', 'Crear usuario', { status: '201', requestBody: input(ref('User')) }) },
    '/usuarios/{uid}': { parameters: [pathId('uid')], patch: operation('Usuarios', 'Editar usuario', { requestBody: input(ref('UserPatch')) }), delete: operation('Usuarios', 'Eliminar usuario', { status: '204', requestBody: confirm }) },
    '/auditoria': { get: operation('Auditoría', 'Consultar eventos', { parameters: [...paging, { name: 'recurso', in: 'query', schema: { type: 'string', enum: ['paciente', 'examen', 'documento', 'usuario'] } }] }) },
  },
}
