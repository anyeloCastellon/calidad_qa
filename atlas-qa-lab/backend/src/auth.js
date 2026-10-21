import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import { pool, transaction, audit } from './db.js'
import { decryptJson, encryptJson, hashToken, privateLookup, randomToken } from './crypto.js'
import { asyncRoute, fail, validate } from './errors.js'
import { loginSchema, registerSchema, tokenSchema, acceptInvitationSchema, passwordSchema } from './validation.js'
import { sendConfirmation } from './mail.js'

const COOKIE = 'atlas_refresh'
const publicOrigin = new URL(config.publicUrl)
const cookieOptions = { httpOnly: true,
  secure: !(config.localHttp && publicOrigin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(publicOrigin.hostname)),
  sameSite: 'strict', path: '/api/auth' }
const SESSION_MS = 7 * 24 * 60 * 60 * 1000
const ISSUER = 'atlas-qa-lab'
const AUDIENCE = 'atlas-api'

export const publicUser = row => ({ id: row.id, nombre_usuario: row.nombre_usuario, email: decryptJson(row.email_encrypted), confirmed_at: row.confirmed_at })

export async function companiesFor(userId, db = pool) {
  const result = await db.query('SELECT c.id,c.nombre,m.rol FROM companies c JOIN memberships m ON m.company_id=c.id WHERE m.user_id=$1 AND m.activo AND m.deleted_at IS NULL ORDER BY c.nombre,c.id', [userId])
  return result.rows
}

function accessToken(userId, sessionId) {
  return jwt.sign({ sid: sessionId }, config.jwtSecret, { algorithm: 'HS256', subject: userId, issuer: ISSUER, audience: AUDIENCE, expiresIn: '15m' })
}

async function newSession(client, userId) {
  const id = randomUUID(), refresh = randomToken(), expiresAt = new Date(Date.now() + SESSION_MS)
  await client.query('INSERT INTO auth_sessions(id,user_id,expires_at) VALUES($1,$2,$3)', [id, userId, expiresAt])
  await client.query('INSERT INTO refresh_tokens(token_hash,session_id,expires_at) VALUES($1,$2,$3)', [hashToken(refresh), id, expiresAt])
  return { id, refresh, expiresAt }
}

function setRefresh(res, session) {
  res.cookie(COOKIE, session.refresh, { ...cookieOptions, maxAge: Math.max(0, new Date(session.expiresAt).getTime() - Date.now()) })
}

export function readRefresh(req) {
  const cookie = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))
  if (!cookie) return null
  try { return decodeURIComponent(cookie.slice(COOKIE.length + 1)) } catch { return null }
}

function requireCookieOrigin(req) {
  if (!req.headers.origin || !config.allowedOrigins.includes(req.headers.origin)) fail(403, 'ORIGEN_INVALIDO', 'La operación requiere el origen autorizado de Atlas')
}

export async function authenticate(req, res, next) {
  try {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '')
    if (!match) fail(401, 'SESION_INVALIDA', 'Inicie sesión para continuar')
    let decoded
    try { decoded = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE }) }
    catch { fail(401, 'SESION_INVALIDA', 'La sesión no es válida o expiró') }
    const result = await pool.query('SELECT u.*,s.id AS session_id FROM users u JOIN auth_sessions s ON s.user_id=u.id WHERE s.id=$1 AND u.id=$2 AND u.active AND u.confirmed_at IS NOT NULL AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP', [decoded.sid, decoded.sub])
    if (!result.rowCount) fail(401, 'SESION_INVALIDA', 'La sesión no es válida o fue cerrada')
    req.actor = { ...publicUser(result.rows[0]), session_id: result.rows[0].session_id }
    next()
  } catch (error) { next(error) }
}

async function loginResponse(res, user, session, status = 200, extra = {}) {
  setRefresh(res, session)
  res.status(status).json({ data: { access_token: accessToken(user.id, session.id), user: publicUser(user), empresas: await companiesFor(user.id), ...extra } })
}

export function createAuthRouter() {
  const router = Router()
  const attempts = new Map()
  router.use((req, res, next) => {
    if (req.method !== 'POST') return next()
    const now = Date.now(), ip = req.ip
    const entry = attempts.get(ip)
    const current = entry && entry.until > now ? entry : { count: 0, until: now + 60_000 }
    current.count++; attempts.set(ip, current)
    if (attempts.size > 10000) for (const [key, value] of attempts) if (value.until < now) attempts.delete(key)
    if (current.count > 60) return next(new (class extends Error { constructor() { super('Espere un minuto antes de intentar nuevamente'); this.status = 429; this.code = 'DEMASIADOS_INTENTOS' } })())
    next()
  })

  router.post('/register', asyncRoute(async (req, res) => {
    const input = validate(registerSchema, req.body)
    const token = randomToken(), id = randomUUID()
    const passwordHash = await bcrypt.hash(input.password, 12)
    await transaction(async client => {
      await client.query('INSERT INTO users(id,nombre_usuario,email_key,email_encrypted,password_hash) VALUES($1,$2,$3,$4,$5)', [id, input.nombre_usuario, privateLookup(input.email), encryptJson(input.email), passwordHash])
      await client.query('INSERT INTO email_confirmations(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [hashToken(token), id, new Date(Date.now() + 24 * 60 * 60 * 1000)])
      await sendConfirmation(input.email, token)
    })
    res.status(201).json({ data: { mensaje: 'Registro recibido. Confirme su correo para ingresar.', requiere_confirmacion: true } })
  }))

  router.post('/confirm', asyncRoute(async (req, res) => {
    const { token } = validate(tokenSchema, req.body)
    await transaction(async client => {
      const result = await client.query('SELECT * FROM email_confirmations WHERE token_hash=$1 FOR UPDATE', [hashToken(token)])
      const record = result.rows[0]
      if (!record || record.used_at || new Date(record.expires_at) <= new Date()) fail(400, 'ENLACE_INVALIDO', 'El enlace no es válido o ya venció')
      await client.query('UPDATE users SET confirmed_at=COALESCE(confirmed_at,CURRENT_TIMESTAMP) WHERE id=$1', [record.user_id])
      await client.query('UPDATE email_confirmations SET used_at=CURRENT_TIMESTAMP WHERE token_hash=$1', [hashToken(token)])
    })
    res.json({ data: { mensaje: 'Correo confirmado. Ya puede iniciar sesión.' } })
  }))

  router.post('/login', asyncRoute(async (req, res) => {
    const input = validate(loginSchema, req.body)
    const result = await pool.query('SELECT * FROM users WHERE lower(nombre_usuario)=lower($1) AND active', [input.nombre_usuario])
    const user = result.rows[0]
    if (!user || !await bcrypt.compare(input.password, user.password_hash)) fail(401, 'CREDENCIALES_INVALIDAS', 'Usuario o contraseña incorrectos')
    if (!user.confirmed_at) fail(403, 'CORREO_NO_CONFIRMADO', 'Confirme su correo antes de ingresar')
    const session = await transaction(client => newSession(client, user.id))
    await loginResponse(res, user, session)
  }))

  router.post('/refresh', asyncRoute(async (req, res) => {
    requireCookieOrigin(req)
    const token = readRefresh(req)
    if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) fail(401, 'SESION_INVALIDA', 'Inicie sesión nuevamente')
    const result = await transaction(async client => {
      const lookup = await client.query('SELECT r.*,s.user_id,s.revoked_at,s.expires_at AS session_expiry FROM refresh_tokens r JOIN auth_sessions s ON s.id=r.session_id WHERE r.token_hash=$1 FOR UPDATE OF r,s', [hashToken(token)])
      const record = lookup.rows[0]
      if (!record || record.revoked_at || new Date(record.session_expiry) <= new Date()) return null
      if (record.used_at) {
        await client.query('UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=$1', [record.session_id])
        return null
      }
      const user = (await client.query('SELECT * FROM users WHERE id=$1 AND active AND confirmed_at IS NOT NULL', [record.user_id])).rows[0]
      if (!user) return null
      const refresh = randomToken()
      await client.query('UPDATE refresh_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=$1', [hashToken(token)])
      await client.query('INSERT INTO refresh_tokens(token_hash,session_id,expires_at) VALUES($1,$2,$3)', [hashToken(refresh), record.session_id, record.session_expiry])
      return { user, session: { id: record.session_id, refresh, expiresAt: record.session_expiry } }
    })
    if (!result) { res.clearCookie(COOKIE, cookieOptions); fail(401, 'SESION_INVALIDA', 'La sesión no es válida o fue cerrada') }
    await loginResponse(res, result.user, result.session)
  }))

  router.post('/logout', asyncRoute(async (req, res) => {
    const refresh = readRefresh(req)
    if (refresh) requireCookieOrigin(req)
    let sessionId = null
    const bearer = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '')
    if (bearer) {
      try { sessionId = jwt.verify(bearer[1], config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, ignoreExpiration: true }).sid } catch { /* Un token inválido no identifica una sesión. */ }
    }
    await transaction(async client => {
      if (sessionId) await client.query('DELETE FROM refresh_tokens WHERE session_id=$1', [sessionId])
      if (refresh && /^[a-zA-Z0-9_-]{43}$/.test(refresh)) await client.query('DELETE FROM refresh_tokens WHERE session_id IN (SELECT session_id FROM refresh_tokens WHERE token_hash=$1)', [hashToken(refresh)])
    })
    res.clearCookie(COOKIE, cookieOptions)
    res.json({ data: { mensaje: 'Sesión cerrada' } })
  }))

  router.get('/me', authenticate, asyncRoute(async (req, res) => {
    const { session_id, ...user } = req.actor
    res.json({ data: { user, empresas: await companiesFor(req.actor.id) } })
  }))

  router.post('/invitaciones/aceptar', asyncRoute(async (req, res) => {
    const input = validate(acceptInvitationSchema, req.body)
    const result = await transaction(async client => {
      const record = (await client.query('SELECT i.*,c.nombre AS company_name FROM invitations i JOIN companies c ON c.id=i.company_id WHERE i.token_hash=$1 FOR UPDATE OF i', [hashToken(input.token)])).rows[0]
      if (!record || record.accepted_at || record.revoked_at || new Date(record.expires_at) <= new Date()) fail(400, 'ENLACE_INVALIDO', 'La invitación no es válida o ya venció')
      let user = (await client.query('SELECT * FROM users WHERE email_key=$1 FOR UPDATE', [record.email_key])).rows[0]
      if (user) {
        if (!user.active || user.nombre_usuario.toLowerCase() !== input.nombre_usuario.toLowerCase() || !await bcrypt.compare(input.password, user.password_hash)) fail(401, 'CREDENCIALES_INVALIDAS', 'Use las credenciales de la cuenta invitada')
        await client.query('UPDATE users SET confirmed_at=COALESCE(confirmed_at,CURRENT_TIMESTAMP) WHERE id=$1', [user.id])
        user.confirmed_at ||= new Date()
      } else {
        validate(passwordSchema, input.password)
        const id = randomUUID(), passwordHash = await bcrypt.hash(input.password, 12)
        user = (await client.query('INSERT INTO users(id,nombre_usuario,email_key,email_encrypted,password_hash,confirmed_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP) RETURNING *', [id, input.nombre_usuario, record.email_key, record.email_encrypted, passwordHash])).rows[0]
      }
      const existing = (await client.query('SELECT * FROM memberships WHERE company_id=$1 AND user_id=$2', [record.company_id, user.id])).rows[0]
      if (existing && !existing.deleted_at && existing.activo) fail(409, 'MIEMBRO_EXISTENTE', 'La cuenta ya pertenece a esta empresa')
      await client.query('INSERT INTO memberships(company_id,user_id,rol) VALUES($1,$2,$3) ON CONFLICT(company_id,user_id) DO UPDATE SET rol=EXCLUDED.rol,activo=TRUE,deleted_at=NULL', [record.company_id, user.id, record.rol])
      await client.query('UPDATE invitations SET accepted_at=CURRENT_TIMESTAMP WHERE id=$1', [record.id])
      await audit(client, record.company_id, user.id, 'usuario.incorporado', 'usuario', user.id, { rol: record.rol })
      return { user, session: await newSession(client, user.id) }
    })
    await loginResponse(res, result.user, result.session, 200, { mensaje: 'Invitación aceptada' })
  }))
  return router
}
