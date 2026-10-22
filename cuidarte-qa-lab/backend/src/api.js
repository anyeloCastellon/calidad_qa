import { Router } from 'express'
import multer from 'multer'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { pool, transaction, audit, createPatientProfile } from './db.js'
import { authenticate, publicUser } from './auth.js'
import { decryptJson, encryptJson, privateLookup, searchTokens } from './crypto.js'
import { asyncRoute, fail, validate } from './errors.js'
import { uuidSchema, patientCreateSchema, patientPatchSchema, examSchema, examPatchSchema, userSchema, userPatchSchema, confirmationSchema } from './validation.js'
import { MAX_DOCUMENT_SIZE, saveDocument, readDocument, deleteDocument } from './storage.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_DOCUMENT_SIZE + 1, files: 1, fields: 0, parts: 1 } }).single('archivo')
const staff = actor => ['administrador', 'medico'].includes(actor.rol)
const requireStaff = (req, res, next) => { try { if (!staff(req.actor)) fail(403, 'ACCESO_DENEGADO', 'No tiene permisos para esta operación'); next() } catch (error) { next(error) } }
const requireAdmin = (req, res, next) => { try { if (req.actor.rol !== 'administrador') fail(403, 'ACCESO_DENEGADO', 'Se requiere el rol administrador'); next() } catch (error) { next(error) } }
const id = value => validate(uuidSchema, value)
const patientData = row => ({ id: row.id, usuario_id: row.user_id, ...decryptJson(row.data_encrypted), created_at: row.created_at, updated_at: row.updated_at })
const examData = row => ({ id: row.id, paciente_id: row.patient_id, ...decryptJson(row.data_encrypted), fecha: row.fecha, creado_por: row.created_by, created_at: row.created_at, updated_at: row.updated_at })
const docData = row => row ? ({ id: row.id, examen_id: row.exam_id, ...decryptJson(row.metadata_encrypted), created_at: row.created_at }) : null

function pagination(query) {
  const page = String(query.page || '1'), size = String(query.page_size || '15')
  if (!/^[1-9]\d{0,5}$/.test(page) || !/^[1-9]\d{0,2}$/.test(size) || Number(size) > 100) fail(400, 'PAGINACION_INVALIDA', 'Página o tamaño inválido')
  return { page: Number(page), size: Number(size), offset: (Number(page) - 1) * Number(size) }
}
const meta = (paging, total) => ({ page: paging.page, page_size: paging.size, total, total_pages: Math.ceil(total / paging.size) })
async function patientRow(db, patientId, actor, lock = false) {
  const result = await db.query(`SELECT * FROM patients WHERE id=$1 AND deleted_at IS NULL AND ($2::boolean OR user_id=$3)${lock ? ' FOR UPDATE' : ''}`, [patientId, staff(actor), actor.id])
  if (!result.rowCount) fail(404, 'PACIENTE_NO_ENCONTRADO', 'El paciente no está disponible')
  return result.rows[0]
}
async function examRow(db, examId, actor, lock = false) {
  const result = await db.query(`SELECT e.* FROM exams e JOIN patients p ON p.id=e.patient_id WHERE e.id=$1 AND e.deleted_at IS NULL AND p.deleted_at IS NULL AND ($2::boolean OR p.user_id=$3)${lock ? ' FOR UPDATE OF e' : ''}`, [examId, staff(actor), actor.id])
  if (!result.rowCount) fail(404, 'EXAMEN_NO_ENCONTRADO', 'El examen no está disponible')
  return result.rows[0]
}
async function activeDoc(db, examId) { return (await db.query('SELECT * FROM documents WHERE exam_id=$1 AND deleted_at IS NULL', [examId])).rows[0] }
async function revokeUser(db, userId) {
  await db.query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP) WHERE user_id=$1', [userId])
  await db.query('DELETE FROM refresh_tokens WHERE session_id IN (SELECT id FROM auth_sessions WHERE user_id=$1)', [userId])
}
async function protectLastAdmin(db, user, input) {
  const removesAdmin = input.activo === false || input.rol !== undefined && input.rol !== 'administrador'
  if (user.rol !== 'administrador' || !user.active || !removesAdmin) return
  const count = await db.query("SELECT count(*)::int AS n FROM users WHERE rol='administrador' AND active AND deleted_at IS NULL")
  if (count.rows[0].n <= 1) fail(409, 'ULTIMO_ADMINISTRADOR', 'Debe conservar al menos un administrador activo')
}

export function createApiRouter() {
  const router = Router()
  router.use(authenticate)

  router.get('/dashboard', asyncRoute(async (req, res) => {
    const values = [staff(req.actor), req.actor.id]
    const patients = await pool.query('SELECT count(*)::int AS n FROM patients WHERE deleted_at IS NULL AND ($1::boolean OR user_id=$2)', values)
    const exams = await pool.query('SELECT count(*)::int AS n FROM exams e JOIN patients p ON p.id=e.patient_id WHERE e.deleted_at IS NULL AND p.deleted_at IS NULL AND ($1::boolean OR p.user_id=$2)', values)
    const documents = await pool.query('SELECT count(*)::int AS n FROM documents d JOIN exams e ON e.id=d.exam_id JOIN patients p ON p.id=e.patient_id WHERE d.deleted_at IS NULL AND e.deleted_at IS NULL AND p.deleted_at IS NULL AND ($1::boolean OR p.user_id=$2)', values)
    res.json({ data: { pacientes: patients.rows[0].n, examenes: exams.rows[0].n, documentos: documents.rows[0].n } })
  }))

  router.get('/pacientes', requireStaff, asyncRoute(async (req, res) => {
    const paging = pagination(req.query), search = String(req.query.q || '').trim().slice(0, 160), tokens = searchTokens(search)
    const where = 'deleted_at IS NULL AND ($1::boolean OR nombre_tokens @> $2::text[] OR rut_tokens @> $2::text[])'
    const params = [!search, tokens]
    const total = (await pool.query(`SELECT count(*)::int AS n FROM patients WHERE ${where}`, params)).rows[0].n
    const result = await pool.query(`SELECT * FROM patients WHERE ${where} ORDER BY created_at DESC,id LIMIT $3 OFFSET $4`, [...params, paging.size, paging.offset])
    res.json({ data: result.rows.map(patientData), meta: meta(paging, total) })
  }))
  router.post('/pacientes', requireStaff, asyncRoute(async (req, res) => {
    const { cuenta, ...input } = validate(patientCreateSchema, req.body), patientId = randomUUID()
    const passwordHash = cuenta ? await bcrypt.hash(cuenta.password, 12) : null
    await transaction(async db => {
      let userId = null
      if (cuenta) {
        userId = randomUUID()
        await db.query("INSERT INTO users(id,nombre_usuario,email_key,email_encrypted,password_hash,rol,confirmed_at) VALUES($1,$2,$3,$4,$5,'paciente',CURRENT_TIMESTAMP)", [userId, cuenta.nombre_usuario, privateLookup(input.email), encryptJson(input.email), passwordHash])
        await audit(db, req.actor.id, 'crear', 'usuario', userId)
      }
      await db.query('INSERT INTO patients(id,user_id,data_encrypted,nombre_tokens,rut_tokens) VALUES($1,$2,$3,$4,$5)', [patientId, userId, encryptJson(input), searchTokens(input.nombre), searchTokens(input.rut)])
      await audit(db, req.actor.id, 'crear', 'paciente', patientId)
    })
    res.status(201).json({ data: patientData(await patientRow(pool, patientId, req.actor)) })
  }))
  router.get('/pacientes/:pid', asyncRoute(async (req, res) => {
    res.json({ data: patientData(await patientRow(pool, id(req.params.pid), req.actor)) })
  }))
  router.patch('/pacientes/:pid', requireStaff, asyncRoute(async (req, res) => {
    const patientId = id(req.params.pid), input = validate(patientPatchSchema, req.body)
    const row = await transaction(async db => {
      const old = await patientRow(db, patientId, req.actor, true), data = { ...decryptJson(old.data_encrypted), ...input }
      const result = await db.query('UPDATE patients SET data_encrypted=$2,nombre_tokens=$3,rut_tokens=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *', [patientId, encryptJson(data), searchTokens(data.nombre), searchTokens(data.rut)])
      await audit(db, req.actor.id, 'editar', 'paciente', patientId, { campos: Object.keys(input) })
      return result.rows[0]
    })
    res.json({ data: patientData(row) })
  }))
  router.delete('/pacientes/:pid', requireAdmin, asyncRoute(async (req, res) => {
    const patientId = id(req.params.pid); validate(confirmationSchema, req.body)
    await transaction(async db => {
      const row = await patientRow(db, patientId, req.actor, true)
      await db.query('UPDATE patients SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1', [patientId])
      if (row.user_id) {
        const linked = await db.query("UPDATE users SET active=false WHERE id=$1 AND rol='paciente' RETURNING id", [row.user_id])
        if (linked.rowCount) await revokeUser(db, row.user_id)
      }
      await audit(db, req.actor.id, 'eliminar', 'paciente', patientId)
    })
    res.status(204).end()
  }))
  router.get('/pacientes/:pid/examenes', asyncRoute(async (req, res) => {
    const patientId = id(req.params.pid); await patientRow(pool, patientId, req.actor)
    const result = await pool.query('SELECT * FROM exams WHERE patient_id=$1 AND deleted_at IS NULL ORDER BY fecha DESC,id', [patientId])
    const docs = await pool.query('SELECT d.* FROM documents d JOIN exams e ON e.id=d.exam_id WHERE e.patient_id=$1 AND d.deleted_at IS NULL AND e.deleted_at IS NULL', [patientId])
    const byExam = new Map(docs.rows.map(row => [row.exam_id, docData(row)]))
    res.json({ data: result.rows.map(row => ({ ...examData(row), documento: byExam.get(row.id) || null })) })
  }))
  router.post('/pacientes/:pid/examenes', requireStaff, asyncRoute(async (req, res) => {
    const patientId = id(req.params.pid), { fecha, ...input } = validate(examSchema, req.body), examId = randomUUID()
    await transaction(async db => {
      await patientRow(db, patientId, req.actor, true)
      await db.query('INSERT INTO exams(id,patient_id,data_encrypted,fecha,created_by) VALUES($1,$2,$3,$4,$5)', [examId, patientId, encryptJson(input), fecha, req.actor.id])
      await audit(db, req.actor.id, 'crear', 'examen', examId)
    })
    res.status(201).json({ data: examData(await examRow(pool, examId, req.actor)) })
  }))
  router.get('/examenes/:eid', asyncRoute(async (req, res) => {
    const examId = id(req.params.eid), row = await examRow(pool, examId, req.actor)
    res.json({ data: { ...examData(row), documento: docData(await activeDoc(pool, examId)) } })
  }))
  router.patch('/examenes/:eid', asyncRoute(async (req, res) => {
    const examId = id(req.params.eid), input = validate(examPatchSchema, req.body)
    const row = await transaction(async db => {
      const old = await examRow(db, examId, req.actor, true), { fecha, ...data } = { ...decryptJson(old.data_encrypted), fecha: old.fecha, ...input }
      const result = await db.query('UPDATE exams SET data_encrypted=$2,fecha=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *', [examId, encryptJson(data), fecha])
      await audit(db, req.actor.id, 'editar', 'examen', examId, { campos: Object.keys(input) })
      return result.rows[0]
    })
    res.json({ data: examData(row) })
  }))
  router.delete('/examenes/:eid', requireStaff, asyncRoute(async (req, res) => {
    const examId = id(req.params.eid); validate(confirmationSchema, req.body)
    await transaction(async db => { await examRow(db, examId, req.actor, true); await db.query('UPDATE exams SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1', [examId]); await audit(db, req.actor.id, 'eliminar', 'examen', examId) })
    res.status(204).end()
  }))

  async function storeDocument(req, res, replace) {
    const examId = id(req.params.eid); await examRow(pool, examId, req.actor)
    const saved = await saveDocument(req.file), docId = randomUUID()
    try {
      await transaction(async db => {
        await examRow(db, examId, req.actor, true)
        const previous = await activeDoc(db, examId)
        if (previous && !replace) fail(409, 'DOCUMENTO_EXISTENTE', 'El examen ya tiene un documento')
        if (!previous && replace) fail(404, 'DOCUMENTO_NO_ENCONTRADO', 'El examen no tiene un documento para reemplazar')
        if (previous) await db.query('UPDATE documents SET deleted_at=CURRENT_TIMESTAMP WHERE id=$1', [previous.id])
        const { storage_key, ...metadata } = saved
        await db.query('INSERT INTO documents(id,exam_id,storage_key,metadata_encrypted,uploaded_by) VALUES($1,$2,$3,$4,$5)', [docId, examId, storage_key, encryptJson(metadata), req.actor.id])
        await audit(db, req.actor.id, replace ? 'reemplazar' : 'cargar', 'documento', docId, { examen_id: examId })
      })
    } catch (error) { await deleteDocument(saved.storage_key).catch(() => {}); throw error }
    res.status(replace ? 200 : 201).json({ data: docData(await activeDoc(pool, examId)) })
  }
  router.post('/examenes/:eid/documento', requireStaff, upload, asyncRoute((req, res) => storeDocument(req, res, false)))
  router.put('/examenes/:eid/documento', requireStaff, upload, asyncRoute((req, res) => storeDocument(req, res, true)))
  router.get('/examenes/:eid/documento', asyncRoute(async (req, res) => {
    const examId = id(req.params.eid); await examRow(pool, examId, req.actor)
    const document = await activeDoc(pool, examId)
    if (!document) fail(404, 'DOCUMENTO_NO_ENCONTRADO', 'El examen no tiene un documento')
    res.json({ data: docData(document) })
  }))
  router.get('/examenes/:eid/documento/contenido', asyncRoute(async (req, res) => {
    const examId = id(req.params.eid); await examRow(pool, examId, req.actor)
    const document = await activeDoc(pool, examId)
    if (!document) fail(404, 'DOCUMENTO_NO_ENCONTRADO', 'El examen no tiene un documento')
    const metadata = decryptJson(document.metadata_encrypted), bytes = await readDocument(document.storage_key)
    res.setHeader('Content-Type', metadata.mime_type)
    res.setHeader('Content-Disposition', `attachment; filename="documento.${metadata.extension}"; filename*=UTF-8''${encodeURIComponent(metadata.original_name).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16)}`)}`)
    res.send(bytes)
  }))
  router.delete('/examenes/:eid/documento', requireStaff, asyncRoute(async (req, res) => {
    const examId = id(req.params.eid); validate(confirmationSchema, req.body)
    const storageKey = await transaction(async db => {
      await examRow(db, examId, req.actor, true)
      const document = await activeDoc(db, examId)
      if (!document) fail(404, 'DOCUMENTO_NO_ENCONTRADO', 'El examen no tiene un documento')
      await db.query('DELETE FROM documents WHERE id=$1', [document.id])
      await audit(db, req.actor.id, 'eliminar', 'documento', document.id, { examen_id: examId })
      return document.storage_key
    })
    await deleteDocument(storageKey)
    res.status(204).end()
  }))

  router.get('/usuarios', requireAdmin, asyncRoute(async (req, res) => {
    const paging = pagination(req.query)
    const total = (await pool.query('SELECT count(*)::int AS n FROM users WHERE deleted_at IS NULL')).rows[0].n
    const result = await pool.query('SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC,id LIMIT $1 OFFSET $2', [paging.size, paging.offset])
    res.json({ data: result.rows.map(publicUser), meta: meta(paging, total) })
  }))
  router.post('/usuarios', requireAdmin, asyncRoute(async (req, res) => {
    const input = validate(userSchema, req.body), userId = randomUUID(), passwordHash = await bcrypt.hash(input.password, 12)
    const row = await transaction(async db => {
      const result = await db.query('INSERT INTO users(id,nombre_usuario,email_key,email_encrypted,password_hash,rol,confirmed_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP) RETURNING *', [userId, input.nombre_usuario, privateLookup(input.email), encryptJson(input.email), passwordHash, input.rol])
      if (input.rol === 'paciente') await createPatientProfile(db, userId, input.nombre_usuario, input.email)
      await audit(db, req.actor.id, 'crear', 'usuario', userId)
      return result.rows[0]
    })
    res.status(201).json({ data: publicUser(row) })
  }))
  router.patch('/usuarios/:uid', requireAdmin, asyncRoute(async (req, res) => {
    const userId = id(req.params.uid), input = validate(userPatchSchema, req.body)
    const row = await transaction(async db => {
      await db.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE')
      const user = (await db.query('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [userId])).rows[0]
      if (!user) fail(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no está disponible')
      await protectLastAdmin(db, user, input)
      const email = input.email ?? decryptJson(user.email_encrypted)
      const result = await db.query('UPDATE users SET nombre_usuario=$2,email_key=$3,email_encrypted=$4,rol=$5,active=$6 WHERE id=$1 RETURNING *', [userId, input.nombre_usuario ?? user.nombre_usuario, privateLookup(email), encryptJson(email), input.rol ?? user.rol, input.activo ?? user.active])
      if (result.rows[0].rol === 'paciente') await createPatientProfile(db, userId, result.rows[0].nombre_usuario, email)
      if (input.rol && input.rol !== user.rol || input.activo === false) await revokeUser(db, userId)
      await audit(db, req.actor.id, 'editar', 'usuario', userId, { campos: Object.keys(input) })
      return result.rows[0]
    })
    res.json({ data: publicUser(row) })
  }))
  router.delete('/usuarios/:uid', requireAdmin, asyncRoute(async (req, res) => {
    const userId = id(req.params.uid); validate(confirmationSchema, req.body)
    await transaction(async db => {
      await db.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE')
      const user = (await db.query('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [userId])).rows[0]
      if (!user) fail(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no está disponible')
      await protectLastAdmin(db, user, { activo: false })
      await db.query('UPDATE users SET active=false,deleted_at=CURRENT_TIMESTAMP WHERE id=$1', [userId])
      await revokeUser(db, userId)
      await audit(db, req.actor.id, 'eliminar', 'usuario', userId)
    })
    res.status(204).end()
  }))
  router.get('/auditoria', requireAdmin, asyncRoute(async (req, res) => {
    const paging = pagination(req.query), resource = String(req.query.recurso || '')
    if (resource && !['paciente', 'examen', 'documento', 'usuario'].includes(resource)) fail(400, 'FILTRO_INVALIDO', 'Recurso inválido')
    const total = (await pool.query("SELECT count(*)::int AS n FROM audit_events WHERE ($1='' OR recurso=$1)", [resource])).rows[0].n
    const result = await pool.query("SELECT a.*,u.nombre_usuario AS actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id WHERE ($1='' OR a.recurso=$1) ORDER BY a.created_at DESC,a.id LIMIT $2 OFFSET $3", [resource, paging.size, paging.offset])
    res.json({ data: result.rows, meta: meta(paging, total) })
  }))
  return router
}
