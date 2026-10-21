import { z } from 'zod'
import { config } from './config.js'

const text = (max = 160) => z.string().trim().max(max).refine(value => !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value), 'El campo contiene caracteres de control')
export const emailSchema = z.string().trim().toLowerCase().email().max(254)
export const usernameSchema = z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/, 'Use letras, números, punto, guion o guion bajo')
export const passwordSchema = z.string().min(config.passwordMin).max(72)
  .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña admite como máximo 72 bytes UTF-8')
  .refine(value => /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value) && /\d/.test(value) && /[^\p{L}\p{N}\s]/u.test(value), 'Incluya mayúscula, minúscula, número y símbolo')
export const roleSchema = z.enum(['administrador', 'editor'])
export const registerSchema = z.object({ nombre_usuario: usernameSchema, email: emailSchema, password: passwordSchema }).strict()
export const loginSchema = z.object({ nombre_usuario: usernameSchema, password: z.string().min(1).max(256) }).strict()
export const tokenSchema = z.object({ token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/, 'El enlace no es válido') }).strict()
export const createUserSchema = registerSchema.extend({ rol: roleSchema })
export const membershipSchema = z.object({ rol: roleSchema.optional(), activo: z.boolean().optional() }).strict()
  .refine(value => value.rol !== undefined || value.activo !== undefined, 'Indique un cambio')
export const companySchema = z.object({ nombre: text(160).min(1), direccion: text(300), telefono: text(30).regex(/^[+0-9() .-]{5,30}$/), email: emailSchema }).strict()
const optionalEmail = z.union([emailSchema, z.literal('')]).default('')
const bankSchema = z.object({ banco: text(100).optional(), tipo_cuenta: text(50).optional(), numero_cuenta: text(60).optional() }).strict()
export const clientSchema = z.object({
  nombre: text(160).min(1), empresa: text(160).default(''), descripcion: text(2000).default(''),
  direccion: text(300).default(''), email: optionalEmail, telefono: text(30).regex(/^[+0-9() .-]*$/).default(''),
  rut: text(15).refine(value => !value || validRut(value), 'RUT inválido').default(''), datos_bancarios: bankSchema.default({}),
}).strict()
export const clientPatchSchema = clientSchema.partial().strict()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Fecha de calendario inválida')
export const contractFields = z.object({ titulo: text(200).min(1), descripcion: text(4000).default(''), fecha_inicio: isoDate, fecha_fin: isoDate }).strict()
export const contractSchema = contractFields.refine(value => value.fecha_fin >= value.fecha_inicio, { message: 'La fecha de término debe ser igual o posterior al inicio', path: ['fecha_fin'] })
export const contractPatchSchema = contractFields.partial().strict()
export const confirmationSchema = z.object({ confirmacion: z.literal(true) }).strict()
export const invitationSchema = z.object({ email: emailSchema, rol: roleSchema }).strict()
export const acceptInvitationSchema = z.object({ token: tokenSchema.shape.token, nombre_usuario: usernameSchema, password: z.string().min(1).max(256) }).strict()
export const shareSchema = z.object({ horas: z.number().int().min(1).max(24).default(24) }).strict()
export const uuidSchema = z.string().uuid()

export function validRut(value) {
  const normalized = value.replace(/[.\s-]/g, '').toUpperCase()
  if (!/^[0-9]{1,8}[0-9K]$/.test(normalized)) return false
  const body = normalized.slice(0, -1)
  if (Number(body) <= 0) return false
  let total = 0, factor = 2
  for (const digit of [...body].reverse()) { total += Number(digit) * factor; factor = factor === 7 ? 2 : factor + 1 }
  const remainder = 11 - total % 11
  return normalized.at(-1) === (remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder))
}
