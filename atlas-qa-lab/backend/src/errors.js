export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export const fail = (status, code, message, fields) => { throw new ApiError(status, code, message, fields) }
export const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function validate(schema, value) {
  const result = schema.safeParse(value)
  if (!result.success) {
    const fields = result.error.issues.map(issue => ({ campo: issue.path.join('.'), mensaje: issue.message }))
    fail(422, 'DATOS_INVALIDOS', 'Revise los campos del formulario', fields)
  }
  return result.data
}
