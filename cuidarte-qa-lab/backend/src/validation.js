import { z } from 'zod'
import { config } from './config.js'

const text = (max = 160) => z.string().trim().max(max).refine(value => !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value), 'El campo contiene caracteres de control')
export const emailSchema = z.string().trim().toLowerCase().email().max(254)
export const usernameSchema = z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/, 'Use letras, números, punto, guion o guion bajo')
export const passwordSchema = z.string().min(config.passwordMin).max(72)
  .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña admite hasta 72 bytes UTF-8')
  .refine(value => /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value) && /\d/.test(value) && /[^\p{L}\p{N}\s]/u.test(value), 'Incluya mayúscula, minúscula, número y símbolo')
export const roleSchema = z.enum(['administrador', 'medico', 'paciente'])
export const registerSchema = z.object({ nombre_usuario: usernameSchema, email: emailSchema, password: passwordSchema }).strict()
export const loginSchema = z.object({ nombre_usuario: usernameSchema, password: z.string().min(1).max(256) }).strict()
export const tokenSchema = z.object({ token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/, 'El enlace no es válido') }).strict()
export const userSchema = registerSchema.extend({ rol: roleSchema })
export const userPatchSchema = z.object({ nombre_usuario: usernameSchema.optional(), email: emailSchema.optional(), rol: roleSchema.optional(), activo: z.boolean().optional() }).strict().refine(value => Object.keys(value).length > 0, 'Indique un cambio')
export const uuidSchema = z.string().uuid()
export const confirmationSchema = z.object({ confirmacion: z.literal(true) }).strict()
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Fecha de calendario inválida')
export function validRut(value) {
  const cleaned = value.replace(/[.\s-]/g, '').toUpperCase()
  if (!/^[0-9]{1,8}[0-9K]$/.test(cleaned) || Number(cleaned.slice(0, -1)) <= 0) return false
  let sum = 0, factor = 2
  for (const digit of [...cleaned.slice(0, -1)].reverse()) { sum += Number(digit) * factor; factor = factor === 7 ? 2 : factor + 1 }
  const result = 11 - sum % 11
  return cleaned.at(-1) === (result === 11 ? '0' : result === 10 ? 'K' : String(result))
}
export const patientSchema = z.object({
  nombre: text(160).min(1), rut: text(15).refine(value => !value || validRut(value), 'RUT inválido').default(''),
  fecha_nacimiento: z.union([dateSchema, z.literal('')]).refine(value => !value || value <= new Date().toISOString().slice(0, 10), 'La fecha de nacimiento no puede ser futura').default(''),
  sexo: z.enum(['', 'femenino', 'masculino', 'otro', 'no_informa']).default(''),
  email: z.union([emailSchema, z.literal('')]).default(''), telefono: text(30).regex(/^[+0-9() .-]*$/).default(''),
  direccion: text(300).default(''), antecedentes: text(4000).default(''),
}).strict()
export const patientCreateSchema = patientSchema.extend({ cuenta: z.object({ nombre_usuario: usernameSchema, password: passwordSchema }).strict().optional() }).refine(value => !value.cuenta || !!value.email, { message: 'Para crear acceso se necesita correo electrónico', path: ['email'] })
export const patientPatchSchema = patientSchema.partial().strict().refine(value => Object.keys(value).length > 0, 'Indique un cambio')
export const examSchema = z.object({ nombre: text(200).min(1), tipo: z.enum(['laboratorio', 'imagenologia', 'otro']), fecha: dateSchema, descripcion: text(4000).default(''), observaciones: text(4000).default('') }).strict()
export const examPatchSchema = examSchema.partial().strict().refine(value => Object.keys(value).length > 0, 'Indique un cambio')
