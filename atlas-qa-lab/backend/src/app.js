import express from 'express'
import helmet from 'helmet'
import { randomUUID } from 'node:crypto'
import swagger from 'swagger-ui-dist'
import { config } from './config.js'
import { databaseStatus } from './db.js'
import { createAuthRouter } from './auth.js'
import { createApiRouter } from './api.js'
import { ApiError, asyncRoute } from './errors.js'
import { openapi } from './openapi.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet(config.localHttp ? {
    strictTransportSecurity: false,
    contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } },
  } : {}))
  app.use((req, res, next) => {
    req.requestId = randomUUID()
    res.setHeader('X-Request-Id', req.requestId)
    res.setHeader('Cache-Control', 'no-store')
    const started = Date.now()
    res.on('finish', () => console.log(JSON.stringify({ event: 'http_request', request_id: req.requestId, method: req.method, route: req.route?.path || 'unmatched', status: res.statusCode, duration_ms: Date.now() - started })))
    const origin = req.headers.origin
    if (origin && !config.allowedOrigins.includes(origin)) return next(new ApiError(403, 'ORIGEN_INVALIDO', 'El origen no está autorizado'))
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.vary('Origin')
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type')
      return res.sendStatus(204)
    }
    next()
  })
  app.use(express.json({ limit: '64kb', strict: true }))
  app.get('/api/health', (req, res) => res.json({ data: { status: 'ok', build: config.build } }))
  app.get('/api/lab/status', asyncRoute(async (req, res) => {
    try {
      const state = await databaseStatus()
      res.status(state.status === 'ready' ? 200 : 503).json({ data: state })
    } catch {
      res.status(503).json({ data: { status: 'not_ready', build: config.build, database: 'postgresql', fecha_actual: new Date().toISOString().slice(0, 10) } })
    }
  }))
  app.get('/api/openapi.json', (req, res) => res.json(openapi))
  app.get('/api/docs/atlas-init.js', (req, res) => res.type('application/javascript').send("window.onload=function(){window.ui=SwaggerUIBundle({url:'/api/openapi.json',dom_id:'#swagger-ui',deepLinking:true,persistAuthorization:false,presets:[SwaggerUIBundle.presets.apis,SwaggerUIStandalonePreset],layout:'StandaloneLayout'})}"))
  app.get(['/api/docs', '/api/docs/'], (req, res) => res.type('html').send('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas API</title><link rel="stylesheet" href="/api/docs/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="/api/docs/swagger-ui-bundle.js"></script><script src="/api/docs/swagger-ui-standalone-preset.js"></script><script src="/api/docs/atlas-init.js"></script></body></html>'))
  app.use('/api/docs', express.static(swagger.getAbsoluteFSPath(), { index: false, dotfiles: 'deny' }))
  app.use('/api/auth', createAuthRouter())
  app.use('/api', createApiRouter())
  app.use((req, res, next) => next(new ApiError(404, 'RUTA_NO_ENCONTRADA', 'La ruta no existe')))
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    let status = error.status || 500, code = error.code || 'ERROR_INTERNO', message = error.message
    if (error.code === '23505') { status = 409; code = 'REGISTRO_DUPLICADO'; message = 'El registro ya existe. Revise usuario y correo; use invitación si la cuenta ya está registrada.' }
    if (error.code === '23503') { status = 409; code = 'RELACION_INVALIDA'; message = 'La operación no puede completarse con los recursos indicados' }
    if (error.code === 'LIMIT_FILE_SIZE') { status = 413; code = 'ARCHIVO_DEMASIADO_GRANDE'; message = 'El límite es 10 MiB' }
    else if (String(error.code || '').startsWith('LIMIT_')) { status = 400; code = 'CARGA_INVALIDA'; message = 'Adjunte un único archivo en el campo archivo' }
    if (error.type === 'entity.parse.failed') { status = 400; code = 'JSON_INVALIDO'; message = 'El cuerpo JSON no es válido' }
    if (error.type === 'entity.too.large') { status = 413; code = 'SOLICITUD_DEMASIADO_GRANDE'; message = 'La solicitud supera el tamaño permitido' }
    if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'ETLS'].includes(error.code)) { status = 503; code = 'SERVICIO_NO_DISPONIBLE'; message = 'Un servicio requerido no está disponible. Intente nuevamente.' }
    if (status >= 500) {
      console.error(JSON.stringify({ event: 'request_error', request_id: req.requestId, code: String(error.code || 'INTERNAL').slice(0, 64) }))
      if (status !== 503) { code = 'ERROR_INTERNO'; message = 'No se pudo completar la operación' }
    }
    res.status(status).json({ error: { code, message, ...(error.fields ? { fields: error.fields } : {}) }, requestId: req.requestId })
  })
  return app
}
