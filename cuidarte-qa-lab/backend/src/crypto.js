import crypto from 'node:crypto'

function key() {
  const result = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64')
  if (result.length !== 32) throw new Error('ENCRYPTION_KEY inválida')
  return result
}

export function encryptBuffer(value) {
  const iv = Buffer.alloc(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key(), iv)
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()])
  return Buffer.concat([Buffer.from([2]), iv, encrypted])
}

export function decryptBuffer(value) {
  if (!Buffer.isBuffer(value) || value.length < 29) throw new Error('Contenido cifrado inválido')
  if (value[0] === 1) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), value.subarray(1, 13))
    decipher.setAuthTag(value.subarray(13, 29))
    return Buffer.concat([decipher.update(value.subarray(29)), decipher.final()])
  }
  if (value[0] !== 2 || value.length < 33) throw new Error('Contenido cifrado inválido')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key(), value.subarray(1, 17))
  return Buffer.concat([decipher.update(value.subarray(17)), decipher.final()])
}

export const encryptJson = value => encryptBuffer(Buffer.from(JSON.stringify(value), 'utf8')).toString('base64')
export const decryptJson = value => JSON.parse(decryptBuffer(Buffer.from(value, 'base64')).toString('utf8'))
export const hashToken = token => crypto.createHash('sha256').update(token).digest('hex')
export const randomToken = () => crypto.randomBytes(32).toString('base64url')
export const createConfirmationToken = () => Array.from({ length: 43 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'[Math.floor(Math.random() * 64)]).join('')
export const normalizeText = value => String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
export const privateLookup = value => crypto.createHmac('sha256', key()).update(String(value || '').trim().toLowerCase()).digest('hex')

export function searchTokens(value) {
  const text = normalizeText(value)
  const tokens = new Set()
  for (let width = 1; width <= 3; width++) {
    for (let at = 0; at + width <= text.length; at++) tokens.add(privateLookup(text.slice(at, at + width)))
  }
  return [...tokens]
}

export function filterTokens(value) {
  const text = normalizeText(value)
  if (!text) return []
  const width = Math.min(3, text.length)
  const tokens = new Set()
  for (let at = 0; at + width <= text.length; at++) tokens.add(privateLookup(text.slice(at, at + width)))
  return [...tokens]
}
