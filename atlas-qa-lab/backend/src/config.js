import fs from 'node:fs'

const localHttp = process.env.LAB_LOCAL_HTTP === 'true'
const defaultPublicUrl = localHttp ? 'http://localhost:5180' : 'https://localhost:8444'

export const config = {
  build: '1.0.0',
  port: Number(process.env.PORT || 3443),
  localHttp,
  publicUrl: (process.env.PUBLIC_URL || defaultPublicUrl).replace(/\/$/, ''),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.PUBLIC_URL || (localHttp ? 'http://localhost:5180,http://127.0.0.1:5180' : defaultPublicUrl)).split(',').map(s => s.trim()),
  jwtSecret: process.env.JWT_SECRET || '',
  passwordMin: Number(process.env.PASSWORD_MIN_LENGTH || 12),
  storageDir: process.env.STORAGE_DIR || new URL('../storage/', import.meta.url).pathname,
  datasetReference: process.env.SEED_REFERENCE_DATE || '2026-10-21',
}

export function validateConfiguration() {
  if (config.jwtSecret.length < 32) throw new Error('JWT_SECRET debe contener al menos 32 caracteres')
  if (!Number.isInteger(config.passwordMin) || config.passwordMin < 12 || config.passwordMin > 64) {
    throw new Error('PASSWORD_MIN_LENGTH debe estar entre 12 y 64')
  }
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY debe ser una clave base64 de 32 bytes')
  for (const value of [...config.allowedOrigins, config.publicUrl]) {
    const url = new URL(value)
    const permittedLocalHttp = config.localHttp && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    if (url.protocol !== 'https:' && !permittedLocalHttp) throw new Error('El origen requiere HTTPS o un perfil HTTP local autorizado')
  }
}

export function readCertificate(path) {
  if (!path) throw new Error('Falta la ruta de un certificado TLS')
  return fs.readFileSync(path)
}
