import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { config } from './config.js'
import { pool, transaction, audit } from './db.js'
import { authenticate, companiesFor, publicUser } from './auth.js'
import { encryptJson, decryptJson, privateLookup, hashToken, randomToken, createShareToken, searchTokens, filterTokens, normalizeText } from './crypto.js'
import { asyncRoute, fail, validate } from './errors.js'
import { companySchema, clientSchema, clientPatchSchema, contractSchema, contractPatchSchema, confirmationSchema,
  createUserSchema, membershipSchema, invitationSchema, shareSchema, uuidSchema } from './validation.js'
import { saveDocument, readDocument, deleteDocument, MAX_DOCUMENT_SIZE } from './storage.js'
import { sendConfirmation, sendInvitation } from './mail.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_DOCUMENT_SIZE, files: 1, fields: 0 } })
const uuid = value => validate(uuidSchema, value)
const decodeClient = row => ({ id: row.id, empresa_id: row.company_id, ...decryptJson(row.data_encrypted), created_at: row.created_at, updated_at: row.updated_at })
const decodeCompany = row => ({ ...decryptJson(row.data_encrypted), id: row.id, nombre: row.nombre, rol: row.rol })
const decodeDocument = row => row ? ({ id: row.id, contrato_id: row.contract_id, ...decryptJson(row.metadata_encrypted), created_at: row.created_at }) : null

export function contractState(start, end, today = new Date().toISOString().slice(0, 10)) {
  if (today < start) return 'programado'
  if (today > end) return 'expirado'
  const days = (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000
  return days < 30 ? 'vence' : 'activo'
}

const decodeContract = row => ({ id: row.id, empresa_id: row.company_id, cliente_id: row.client_id,
  ...decryptJson(row.data_encrypted), fecha_inicio: row.fecha_inicio, fecha_fin: row.fecha_fin,
  estado: contractState(row.fecha_inicio, row.fecha_fin), tiene_documento: row.tiene_documento || false,
  created_at: row.created_at, updated_at: row.updated_at })

function pagination(query) {
  const page = Number(query.page || 1), limit = Number(query.limit || query.page_size || 10)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) fail(422, 'PAGINACION_INVALIDA', 'Use página positiva y límite de 1 a 100')
  return { page, limit, offset: (page - 1) * limit }
}
const pageMeta = (page, limit, total) => ({ page, limit, page_size: limit, total, total_pages: Math.ceil(total / limit) })

async function scoped(req, write, fn) {
  const companyId = uuid(req.params.eid)
  return transaction(async client => {
    const membership = (await client.query('SELECT m.rol,c.nombre FROM memberships m JOIN companies c ON c.id=m.company_id JOIN auth_sessions s ON s.user_id=m.user_id WHERE m.company_id=$1 AND m.user_id=$2 AND m.activo AND m.deleted_at IS NULL AND s.id=$3 AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP', [companyId, req.actor.id, req.actor.session_id])).rows[0]
    if (!membership) fail(404, 'EMPRESA_NO_ENCONTRADA', 'La empresa no está disponible para su cuenta')
    if (write && membership.rol !== 'administrador') fail(403, 'PERMISO_DENEGADO', 'Esta operación requiere un administrador de la empresa')
    return fn(client, companyId, membership)
  })
}

async function findClient(client, companyId, id) {
  const row = (await client.query('SELECT * FROM clients WHERE company_id=$1 AND id=$2 AND deleted_at IS NULL', [companyId, uuid(id)])).rows[0]
  if (!row) fail(404, 'CLIENTE_NO_ENCONTRADO', 'El cliente no está disponible')
  return row
}

async function findContract(client, companyId, id, lock = false) {
  const row = (await client.query(`SELECT k.*,EXISTS(SELECT 1 FROM documents d WHERE d.contract_id=k.id AND d.company_id=k.company_id) AS tiene_documento FROM contracts k JOIN clients c ON c.id=k.client_id AND c.company_id=k.company_id WHERE k.company_id=$1 AND k.id=$2 AND k.deleted_at IS NULL AND c.deleted_at IS NULL${lock ? ' FOR UPDATE OF k' : ''}`, [companyId, uuid(id)])).rows[0]
  if (!row) fail(404, 'CONTRATO_NO_ENCONTRADO', 'El contrato no está disponible')
  return row
}

async function checkCompanyEmail(client, email, exceptId = null) {
  if (process.env.UNIQUE_COMPANY_EMAIL !== 'true') return
  const lookup = privateLookup(email)
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lookup])
  const existing = await client.query('SELECT id FROM companies WHERE email_key=$1 AND ($2::uuid IS NULL OR id<>$2)', [lookup, exceptId])
  if (existing.rowCount) fail(409, 'CORREO_EMPRESA_DUPLICADO', 'El correo principal ya pertenece a otra empresa')
}

async function lastAdmin(client, companyId, targetId, role, active) {
  await client.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE', [companyId])
  const admins = (await client.query("SELECT user_id FROM memberships WHERE company_id=$1 AND rol='administrador' AND activo AND deleted_at IS NULL", [companyId])).rows
  if (admins.length === 1 && admins[0].user_id === targetId && (role !== 'administrador' || !active)) fail(409, 'ULTIMO_ADMINISTRADOR', 'La empresa debe conservar un administrador activo')
}

async function documentFor(client, companyId, contractId) {
  return (await client.query('SELECT * FROM documents WHERE company_id=$1 AND contract_id=$2', [companyId, contractId])).rows[0]
}

function shareView(row) {
  return { id: row.id, url: `${config.publicUrl}/compartidos/${decryptJson(row.token_encrypted)}`, expires_at: row.expires_at, revoked_at: row.revoked_at, created_at: row.created_at }
}

export function createApiRouter() {
  const router = Router()
  router.use(authenticate)

  router.get('/empresas', asyncRoute(async (req, res) => res.json({ data: await companiesFor(req.actor.id) })))
  router.post('/empresas', asyncRoute(async (req, res) => {
    const input = validate(companySchema, req.body), id = randomUUID()
    const result = await transaction(async client => {
      await checkCompanyEmail(client, input.email)
      const company = (await client.query('INSERT INTO companies(id,nombre,email_key,data_encrypted) VALUES($1,$2,$3,$4) RETURNING *', [id, input.nombre, privateLookup(input.email), encryptJson(input)])).rows[0]
      await client.query("INSERT INTO memberships(company_id,user_id,rol) VALUES($1,$2,'administrador')", [id, req.actor.id])
      await audit(client, id, req.actor.id, 'empresa.creada', 'empresa', id)
      return decodeCompany({ ...company, rol: 'administrador' })
    })
    res.status(201).json({ data: result })
  }))
  router.get('/empresas/:eid', asyncRoute(async (req, res) => {
    const result = await scoped(req, false, async (client, companyId, membership) => decodeCompany({ ...(await client.query('SELECT * FROM companies WHERE id=$1', [companyId])).rows[0], rol: membership.rol }))
    res.json({ data: result })
  }))
  router.patch('/empresas/:eid', asyncRoute(async (req, res) => {
    const input = validate(companySchema.partial(), req.body)
    const result = await scoped(req, true, async (client, companyId) => {
      const row = (await client.query('SELECT * FROM companies WHERE id=$1 FOR UPDATE', [companyId])).rows[0]
      const previous = decryptJson(row.data_encrypted)
      const next = validate(companySchema, { nombre: input.nombre ?? previous.nombre, direccion: input.direccion ?? previous.direccion,
        telefono: input.telefono ?? previous.telefono, email: input.email ?? previous.email })
      await checkCompanyEmail(client, next.email, companyId)
      const updated = (await client.query('UPDATE companies SET nombre=$2,email_key=$3,data_encrypted=$4 WHERE id=$1 RETURNING *', [companyId, next.nombre, privateLookup(next.email), encryptJson(next)])).rows[0]
      await audit(client, companyId, req.actor.id, 'empresa.editada', 'empresa', companyId, { campos: Object.keys(input) })
      return decodeCompany({ ...updated, rol: 'administrador' })
    })
    res.json({ data: result })
  }))
  router.get('/empresas/:eid/dashboard', asyncRoute(async (req, res) => {
    const result = await scoped(req, false, async (client, companyId) => {
      const clients = (await client.query('SELECT COUNT(*)::int AS n FROM clients WHERE company_id=$1 AND deleted_at IS NULL', [companyId])).rows[0].n
      const contracts = (await client.query('SELECT k.fecha_inicio,k.fecha_fin,k.id FROM contracts k JOIN clients c ON c.id=k.client_id AND c.company_id=k.company_id WHERE k.company_id=$1 AND k.deleted_at IS NULL AND c.deleted_at IS NULL', [companyId])).rows
      const states = { activo: 0, vence: 0, expirado: 0, programado: 0 }
      for (const item of contracts) states[contractState(item.fecha_inicio, item.fecha_fin)]++
      const documents = (await client.query('SELECT COUNT(*)::int AS n FROM documents d JOIN contracts k ON k.id=d.contract_id AND k.company_id=d.company_id JOIN clients c ON c.id=k.client_id AND c.company_id=k.company_id WHERE d.company_id=$1 AND k.deleted_at IS NULL AND c.deleted_at IS NULL', [companyId])).rows[0].n
      const users = (await client.query('SELECT COUNT(*)::int AS n FROM memberships WHERE company_id=$1 AND activo AND deleted_at IS NULL', [companyId])).rows[0].n
      return { clientes: clients, contratos: contracts.length, documentos: documents, usuarios: users, estados: states }
    })
    res.json({ data: result })
  }))

  router.get('/empresas/:eid/usuarios', asyncRoute(async (req, res) => {
    const result = await scoped(req, false, async (client, companyId) => (await client.query('SELECT u.*,m.rol,m.activo FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.company_id=$1 AND m.deleted_at IS NULL ORDER BY u.nombre_usuario', [companyId])).rows.map(row => ({ ...publicUser(row), rol: row.rol, activo: row.activo })))
    res.json({ data: result })
  }))
  router.post('/empresas/:eid/usuarios', asyncRoute(async (req, res) => {
    const input = validate(createUserSchema, req.body)
    const result = await scoped(req, true, async (client, companyId) => {
      const userId = randomUUID(), token = randomToken(), passwordHash = await bcrypt.hash(input.password, 12)
      const user = (await client.query('INSERT INTO users(id,nombre_usuario,email_key,email_encrypted,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING *', [userId, input.nombre_usuario, privateLookup(input.email), encryptJson(input.email), passwordHash])).rows[0]
      await client.query('INSERT INTO memberships(company_id,user_id,rol) VALUES($1,$2,$3)', [companyId, userId, input.rol])
      await client.query('INSERT INTO email_confirmations(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [hashToken(token), userId, new Date(Date.now() + 86_400_000)])
      await audit(client, companyId, req.actor.id, 'usuario.creado', 'usuario', userId, { rol: input.rol })
      await sendConfirmation(input.email, token)
      return { ...publicUser(user), rol: input.rol, activo: true, requiere_confirmacion: true }
    })
    res.status(201).json({ data: result })
  }))
  router.patch('/empresas/:eid/usuarios/:uid', asyncRoute(async (req, res) => {
    const input = validate(membershipSchema, req.body), userId = uuid(req.params.uid)
    const result = await scoped(req, true, async (client, companyId) => {
      await client.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE', [companyId])
      const target = (await client.query('SELECT * FROM memberships WHERE company_id=$1 AND user_id=$2 AND deleted_at IS NULL FOR UPDATE', [companyId, userId])).rows[0]
      if (!target) fail(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no pertenece a esta empresa')
      const role = input.rol ?? target.rol, active = input.activo ?? target.activo
      await lastAdmin(client, companyId, userId, role, active)
      await client.query('UPDATE memberships SET rol=$3,activo=$4 WHERE company_id=$1 AND user_id=$2', [companyId, userId, role, active])
      await audit(client, companyId, req.actor.id, 'usuario.editado', 'usuario', userId, { campos: Object.keys(input), rol: role, activo: active })
      const user = (await client.query('SELECT * FROM users WHERE id=$1', [userId])).rows[0]
      return { ...publicUser(user), rol: role, activo: active }
    })
    res.json({ data: result })
  }))
  router.delete('/empresas/:eid/usuarios/:uid', asyncRoute(async (req, res) => {
    validate(confirmationSchema, req.body)
    const userId = uuid(req.params.uid)
    await scoped(req, true, async (client, companyId) => {
      await client.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE', [companyId])
      const target = (await client.query('SELECT * FROM memberships WHERE company_id=$1 AND user_id=$2 AND deleted_at IS NULL FOR UPDATE', [companyId, userId])).rows[0]
      if (!target) fail(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no pertenece a esta empresa')
      await lastAdmin(client, companyId, userId, target.rol, false)
      await client.query('UPDATE memberships SET deleted_at=CURRENT_TIMESTAMP,activo=FALSE WHERE company_id=$1 AND user_id=$2', [companyId, userId])
      await audit(client, companyId, req.actor.id, 'usuario.eliminado', 'usuario', userId)
    })
    res.json({ data: { mensaje: 'Usuario desvinculado de la empresa' } })
  }))
  router.post('/empresas/:eid/invitaciones', asyncRoute(async (req, res) => {
    const input = validate(invitationSchema, req.body)
    const result = await scoped(req, true, async (client, companyId, company) => {
      const existing = await client.query('SELECT m.user_id FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1 AND u.email_key=$2 AND m.activo AND m.deleted_at IS NULL', [companyId, privateLookup(input.email)])
      if (existing.rowCount) fail(409, 'MIEMBRO_EXISTENTE', 'La cuenta ya pertenece a esta empresa')
      const id = randomUUID(), token = randomToken()
      await client.query('INSERT INTO invitations(id,company_id,email_key,email_encrypted,token_hash,rol,created_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, companyId, privateLookup(input.email), encryptJson(input.email), hashToken(token), input.rol, req.actor.id, new Date(Date.now() + 172_800_000)])
      await audit(client, companyId, req.actor.id, 'usuario.invitado', 'invitacion', id, { rol: input.rol })
      await sendInvitation(input.email, token, company.nombre)
      return { id, mensaje: 'Invitación enviada por correo' }
    })
    res.status(201).json({ data: result })
  }))

  router.get('/empresas/:eid/clientes', asyncRoute(async (req, res) => {
    const { page, limit, offset } = pagination(req.query)
    const name = normalizeText(String(req.query.nombre || '').slice(0, 160)), companyName = normalizeText(String(req.query.empresa || '').slice(0, 160))
    const result = await scoped(req, false, async (client, companyId) => {
      const params = [companyId], conditions = ['company_id=$1', 'deleted_at IS NULL'], filters = []
      if (name) { params.push(filterTokens(name)); filters.push(`nombre_tokens @> $${params.length}::text[]`) }
      if (companyName) { params.push(filterTokens(companyName)); filters.push(`empresa_tokens @> $${params.length}::text[]`) }
      if (filters.length) conditions.push(`(${filters.join(' OR ')})`)
      const rows = (await client.query(`SELECT * FROM clients WHERE ${conditions.join(' AND ')} ORDER BY created_at,id`, params)).rows.map(decodeClient)
      const matches = rows.filter(row => {
        const nameMatch = !name || normalizeText(row.nombre).includes(name)
        const companyMatch = !companyName || normalizeText(row.empresa).includes(companyName)
        return name && companyName ? nameMatch || companyMatch : nameMatch && companyMatch
      })
      return { data: matches.slice(offset, offset + limit), meta: pageMeta(page, limit, matches.length) }
    })
    res.json(result)
  }))
  router.post('/empresas/:eid/clientes', asyncRoute(async (req, res) => {
    const input = validate(clientSchema, req.body)
    const result = await scoped(req, true, async (client, companyId) => {
      const id = randomUUID()
      const row = (await client.query('INSERT INTO clients(id,company_id,data_encrypted,nombre_tokens,empresa_tokens) VALUES($1,$2,$3,$4,$5) RETURNING *', [id, companyId, encryptJson(input), searchTokens(input.nombre), searchTokens(input.empresa)])).rows[0]
      await audit(client, companyId, req.actor.id, 'cliente.creado', 'cliente', id)
      return decodeClient(row)
    })
    res.status(201).json({ data: result })
  }))
  router.get('/empresas/:eid/clientes/:cid', asyncRoute(async (req, res) => res.json({ data: await scoped(req, false, async (client, companyId) => decodeClient(await findClient(client, companyId, req.params.cid))) })))
  router.patch('/empresas/:eid/clientes/:cid', asyncRoute(async (req, res) => {
    const input = validate(clientPatchSchema, req.body)
    const result = await scoped(req, false, async (client, companyId) => {
      const old = await findClient(client, companyId, req.params.cid)
      const next = validate(clientSchema, { ...decryptJson(old.data_encrypted), ...input })
      const row = (await client.query('UPDATE clients SET data_encrypted=$3,nombre_tokens=$4,empresa_tokens=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL RETURNING *', [old.id, companyId, encryptJson(next), searchTokens(next.nombre), searchTokens(next.empresa)])).rows[0]
      if (!row) fail(404, 'CLIENTE_NO_ENCONTRADO', 'El cliente no está disponible')
      await audit(client, companyId, req.actor.id, 'cliente.editado', 'cliente', old.id, { campos: Object.keys(input) })
      return decodeClient(row)
    })
    res.json({ data: result })
  }))
  router.delete('/empresas/:eid/clientes/:cid', asyncRoute(async (req, res) => {
    validate(confirmationSchema, req.body)
    await scoped(req, true, async (client, companyId) => {
      const old = await findClient(client, companyId, req.params.cid)
      await client.query('UPDATE clients SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND company_id=$2', [old.id, companyId])
      await audit(client, companyId, req.actor.id, 'cliente.eliminado', 'cliente', old.id)
    })
    res.json({ data: { mensaje: 'Cliente eliminado' } })
  }))

  router.get('/empresas/:eid/clientes/:cid/contratos', asyncRoute(async (req, res) => {
    const result = await scoped(req, false, async (client, companyId) => {
      const customer = await findClient(client, companyId, req.params.cid)
      return (await client.query('SELECT k.*,EXISTS(SELECT 1 FROM documents d WHERE d.contract_id=k.id AND d.company_id=k.company_id) AS tiene_documento FROM contracts k WHERE company_id=$1 AND client_id=$2 AND deleted_at IS NULL ORDER BY created_at,id', [companyId, customer.id])).rows.map(decodeContract)
    })
    res.json({ data: result })
  }))
  router.post('/empresas/:eid/clientes/:cid/contratos', asyncRoute(async (req, res) => {
    const input = validate(contractSchema, req.body)
    const result = await scoped(req, true, async (client, companyId) => {
      const customer = await findClient(client, companyId, req.params.cid), id = randomUUID()
      const row = (await client.query('INSERT INTO contracts(id,company_id,client_id,data_encrypted,fecha_inicio,fecha_fin) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [id, companyId, customer.id, encryptJson({ titulo: input.titulo, descripcion: input.descripcion }), input.fecha_inicio, input.fecha_fin])).rows[0]
      await audit(client, companyId, req.actor.id, 'contrato.creado', 'contrato', id)
      return decodeContract(row)
    })
    res.status(201).json({ data: result })
  }))
  router.get('/empresas/:eid/contratos/:kid', asyncRoute(async (req, res) => res.json({ data: await scoped(req, false, async (client, companyId) => decodeContract(await findContract(client, companyId, req.params.kid))) })))
  router.patch('/empresas/:eid/contratos/:kid', asyncRoute(async (req, res) => {
    const input = validate(contractPatchSchema, req.body)
    const result = await scoped(req, true, async (client, companyId) => {
      const old = await findContract(client, companyId, req.params.kid, true)
      const next = validate(contractSchema, { ...decryptJson(old.data_encrypted), fecha_inicio: old.fecha_inicio, fecha_fin: old.fecha_fin, ...input })
      const row = (await client.query('UPDATE contracts SET data_encrypted=$3,fecha_inicio=$4,fecha_fin=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND company_id=$2 RETURNING *', [old.id, companyId, encryptJson({ titulo: next.titulo, descripcion: next.descripcion }), next.fecha_inicio, next.fecha_fin])).rows[0]
      await audit(client, companyId, req.actor.id, 'contrato.editado', 'contrato', old.id, { campos: Object.keys(input) })
      return decodeContract({ ...row, tiene_documento: old.tiene_documento })
    })
    res.json({ data: result })
  }))
  router.delete('/empresas/:eid/contratos/:kid', asyncRoute(async (req, res) => {
    validate(confirmationSchema, req.body)
    await scoped(req, true, async (client, companyId) => {
      const old = await findContract(client, companyId, req.params.kid, true)
      await client.query('UPDATE contracts SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND company_id=$2', [old.id, companyId])
      await client.query('UPDATE share_links SET revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP) WHERE company_id=$1 AND document_id IN (SELECT id FROM documents WHERE contract_id=$2 AND company_id=$1)', [companyId, old.id])
      await audit(client, companyId, req.actor.id, 'contrato.eliminado', 'contrato', old.id)
    })
    res.json({ data: { mensaje: 'Contrato eliminado' } })
  }))

  router.get('/empresas/:eid/contratos/:kid/documento', asyncRoute(async (req, res) => {
    const result = await scoped(req, false, async (client, companyId) => {
      const contract = await findContract(client, companyId, req.params.kid)
      return decodeDocument(await documentFor(client, companyId, contract.id))
    })
    res.json({ data: result })
  }))
  router.post('/empresas/:eid/contratos/:kid/documento', asyncRoute(async (req, res, next) => {
    await scoped(req, true, async (client, companyId) => findContract(client, companyId, req.params.kid))
    next()
  }), upload.single('archivo'), asyncRoute(async (req, res) => {
    let saved
    try {
      const result = await scoped(req, true, async (client, companyId) => {
        const contract = await findContract(client, companyId, req.params.kid, true)
        if (await documentFor(client, companyId, contract.id)) fail(409, 'DOCUMENTO_EXISTENTE', 'El contrato ya tiene un documento. Elimínelo antes de cargar otro.')
        saved = await saveDocument(req.file)
        const { storage_key, ...metadata } = saved, id = randomUUID()
        const row = (await client.query('INSERT INTO documents(id,company_id,contract_id,storage_key,metadata_encrypted,uploaded_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [id, companyId, contract.id, storage_key, encryptJson(metadata), req.actor.id])).rows[0]
        await audit(client, companyId, req.actor.id, 'documento.subido', 'documento', id, { contrato_id: contract.id })
        return decodeDocument(row)
      })
      res.status(201).json({ data: result })
    } catch (error) {
      if (saved) await deleteDocument(saved.storage_key).catch(() => {})
      throw error
    }
  }))
  router.delete('/empresas/:eid/contratos/:kid/documento', asyncRoute(async (req, res) => {
    validate(confirmationSchema, req.body)
    const removed = await scoped(req, true, async (client, companyId) => {
      const contract = await findContract(client, companyId, req.params.kid, true)
      const document = await documentFor(client, companyId, contract.id)
      if (!document) fail(404, 'DOCUMENTO_NO_ENCONTRADO', 'El contrato no tiene documento')
      await client.query('DELETE FROM documents WHERE id=$1 AND company_id=$2', [document.id, companyId])
      await audit(client, companyId, req.actor.id, 'documento.eliminado', 'documento', document.id, { contrato_id: contract.id })
      return document
    })
    await deleteDocument(removed.storage_key).catch(() => console.error(JSON.stringify({ event: 'storage_cleanup_pending', documento_id: removed.id })))
    res.json({ data: { mensaje: 'Documento eliminado' } })
  }))
  router.get('/empresas/:eid/contratos/:kid/documento/contenido', asyncRoute(async (req, res) => {
    const result = await scoped(req, false, async (client, companyId) => {
      const contract = await findContract(client, companyId, req.params.kid)
      const document = await documentFor(client, companyId, contract.id)
      if (!document) fail(404, 'DOCUMENTO_NO_ENCONTRADO', 'El contrato no tiene documento')
      const bytes = await readDocument(document.storage_key)
      return { bytes, metadata: decryptJson(document.metadata_encrypted) }
    })
    res.type(result.metadata.mime_type).attachment(result.metadata.original_name).send(result.bytes)
  }))
  router.get('/empresas/:eid/contratos/:kid/enlaces', asyncRoute(async (req, res) => {
    const result = await scoped(req, false, async (client, companyId) => {
      const contract = await findContract(client, companyId, req.params.kid)
      return (await client.query('SELECT s.* FROM share_links s JOIN documents d ON d.id=s.document_id AND d.company_id=s.company_id WHERE s.company_id=$1 AND d.contract_id=$2 ORDER BY s.created_at DESC', [companyId, contract.id])).rows.map(shareView)
    })
    res.json({ data: result })
  }))
  router.post('/empresas/:eid/contratos/:kid/enlaces', asyncRoute(async (req, res) => {
    const input = validate(shareSchema, req.body || {})
    const result = await scoped(req, true, async (client, companyId) => {
      const contract = await findContract(client, companyId, req.params.kid, true)
      const document = await documentFor(client, companyId, contract.id)
      if (!document) fail(404, 'DOCUMENTO_NO_ENCONTRADO', 'Adjunte un documento antes de compartir')
      const id = randomUUID(), token = createShareToken()
      const row = (await client.query('INSERT INTO share_links(id,company_id,document_id,token_hash,token_encrypted,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [id, companyId, document.id, hashToken(token), encryptJson(token), new Date(Date.now() + input.horas * 3_600_000), req.actor.id])).rows[0]
      await audit(client, companyId, req.actor.id, 'enlace.creado', 'enlace', id, { documento_id: document.id })
      return shareView(row)
    })
    res.status(201).json({ data: result })
  }))
  router.delete('/empresas/:eid/enlaces/:sid', asyncRoute(async (req, res) => {
    const id = uuid(req.params.sid)
    await scoped(req, true, async (client, companyId) => {
      const row = (await client.query('UPDATE share_links SET revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP) WHERE id=$1 AND company_id=$2 RETURNING id', [id, companyId])).rows[0]
      if (!row) fail(404, 'ENLACE_NO_ENCONTRADO', 'El enlace no está disponible')
      await audit(client, companyId, req.actor.id, 'enlace.revocado', 'enlace', id)
    })
    res.json({ data: { mensaje: 'Enlace revocado' } })
  }))

  router.get('/empresas/:eid/auditoria', asyncRoute(async (req, res) => {
    const { page, limit, offset } = pagination(req.query)
    const result = await scoped(req, false, async (client, companyId) => {
      const params = [companyId], conditions = ['a.company_id=$1']
      for (const field of ['accion', 'recurso']) {
        if (req.query[field]) { params.push(String(req.query[field]).slice(0, 64)); conditions.push(`a.${field}=$${params.length}`) }
      }
      const where = conditions.join(' AND ')
      const total = Number((await client.query(`SELECT COUNT(*) AS n FROM audit_events a WHERE ${where}`, params)).rows[0].n)
      params.push(limit, offset)
      const rows = (await client.query(`SELECT a.id,a.accion,a.recurso,a.recurso_id,a.detalle,a.created_at,u.nombre_usuario AS actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id WHERE ${where} ORDER BY a.created_at DESC,a.id LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows
      return { data: rows, meta: pageMeta(page, limit, total) }
    })
    res.json(result)
  }))

  for (const download of [false, true]) {
    router.get(`/compartidos/:token${download ? '/contenido' : ''}`, asyncRoute(async (req, res) => {
      const token = String(req.params.token)
      if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) fail(404, 'ENLACE_NO_ENCONTRADO', 'El enlace no está disponible')
      const result = await transaction(async client => {
        const row = (await client.query('SELECT s.*,d.contract_id,d.storage_key,d.metadata_encrypted FROM share_links s JOIN documents d ON d.id=s.document_id AND d.company_id=s.company_id JOIN contracts k ON k.id=d.contract_id AND k.company_id=d.company_id JOIN clients c ON c.id=k.client_id AND c.company_id=k.company_id JOIN memberships m ON m.company_id=s.company_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND k.deleted_at IS NULL AND c.deleted_at IS NULL AND m.user_id=$2 AND m.activo AND m.deleted_at IS NULL', [hashToken(token), req.actor.id])).rows[0]
        if (!row) fail(404, 'ENLACE_NO_ENCONTRADO', 'El enlace no está disponible para su cuenta')
        if (!download) return { empresa_id: row.company_id, contrato_id: row.contract_id, documento: { id: row.document_id, ...decryptJson(row.metadata_encrypted) }, expires_at: row.expires_at }
        const bytes = await readDocument(row.storage_key)
        return { bytes, metadata: decryptJson(row.metadata_encrypted) }
      })
      if (download) res.type(result.metadata.mime_type).attachment(result.metadata.original_name).send(result.bytes)
      else res.json({ data: result })
    }))
  }
  return router
}
