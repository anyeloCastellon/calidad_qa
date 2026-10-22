import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { config, readCertificate } from './config.js'
import { encryptJson, encryptBuffer, privateLookup, searchTokens } from './crypto.js'

pg.types.setTypeParser(1082, value => value)
export const pool = new pg.Pool({ host: process.env.PGHOST || 'db', port: Number(process.env.PGPORT || 5432), user: process.env.PGUSER || 'cuidarte', password: process.env.PGPASSWORD, database: process.env.PGDATABASE || 'cuidarte', max: Number(process.env.PGPOOL_MAX || 20), connectionTimeoutMillis: 8000, idleTimeoutMillis: 30000, ssl: { rejectUnauthorized: true, ca: readCertificate(process.env.PGSSLROOTCERT || '/certs/ca.crt') } })
pool.on('error', () => console.error(JSON.stringify({ event: 'database_connection_error' })))
export async function transaction(fn) {
  const client = await pool.connect()
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}
export async function audit(client, actorId, accion, recurso, recursoId, detalle = {}) {
  await client.query('INSERT INTO audit_events(id,actor_id,accion,recurso,recurso_id,detalle) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), actorId, accion, recurso, recursoId || null, detalle])
}
export async function createPatientProfile(client, userId, nombre, email) {
  const data = { nombre, email, rut: '', fecha_nacimiento: '', sexo: '', telefono: '', direccion: '', antecedentes: '' }
  const row = await client.query('INSERT INTO patients(id,user_id,data_encrypted,nombre_tokens) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET deleted_at=NULL RETURNING id', [randomUUID(), userId, encryptJson(data), searchTokens(nombre)])
  return row.rows[0].id
}
export const seedId = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`
function dateOffset(days) { const date = new Date(`${config.datasetReference}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10) }
function rut(number) {
  const value = String(number); let sum = 0, factor = 2
  for (const n of [...value].reverse()) { sum += Number(n) * factor; factor = factor === 7 ? 2 : factor + 1 }
  const dv = 11 - sum % 11; return `${value}-${dv === 11 ? '0' : dv === 10 ? 'K' : dv}`
}
function pdfBytes(label) {
  const text = `BT /F1 18 Tf 60 760 Td (Cuidarte+) Tj 0 -45 Td /F1 12 Tf (Registro sintetico - ${label}) Tj 0 -30 Td (Documento ficticio sin uso clinico.) Tj ET`
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`]
  let output = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(output)
  output += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(output)
}
async function seed(client) {
  const timestamp = `${config.datasetReference}T00:00:00Z`
  const users = [['admin.demo', 'administrador'], ['medico.demo', 'medico'], ['medico.turno', 'medico'], ['paciente.demo', 'paciente'], ['paciente.otro', 'paciente']]
  for (let index = 0; index < users.length; index++) {
    const [nombre, role] = users[index], email = `${nombre}@cuidarte.example`
    await client.query('INSERT INTO users(id,nombre_usuario,email_key,email_encrypted,password_hash,rol,confirmed_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$7)', [seedId(101 + index), nombre, privateLookup(email), encryptJson(email), await bcrypt.hash('CuidarteDemo!2026', 12), role, timestamp])
  }
  for (let number = 1; number <= 30; number++) {
    const nombre = `Paciente de práctica ${String(number).padStart(2, '0')}`
    const data = { nombre, rut: rut(50000000 + number), fecha_nacimiento: `${[1955,1964,1985,2000][(number-1)%4]}-03-10`, sexo: number % 2 ? 'femenino' : 'masculino', email: `paciente${number}@cuidarte.example`, telefono: `+5697${String(number).padStart(7,'0')}`, direccion: `Calle de Práctica ${number}, Santiago`, antecedentes: 'Información sintética de práctica' }
    await client.query('INSERT INTO patients(id,user_id,data_encrypted,nombre_tokens,rut_tokens,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$6)', [seedId(1000 + number), number <= 2 ? seedId(103 + number) : null, encryptJson(data), searchTokens(nombre), searchTokens(data.rut), timestamp])
  }
  await fs.mkdir(config.storageDir, { recursive: true, mode: 0o700 })
  for (let number = 1; number <= 14; number++) {
    const patient = number <= 12 ? number : number - 12
    await client.query('INSERT INTO exams(id,patient_id,data_encrypted,fecha,created_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$6)', [seedId(2000 + number), seedId(1000 + patient), encryptJson({ nombre: `Registro de examen ${number}`, tipo: ['laboratorio','imagenologia','otro'][(number-1)%3], descripcion: 'Examen de práctica con datos ficticios', observaciones: 'Registro sintético, sin interpretación clínica' }), dateOffset(-number), seedId(number % 2 ? 102 : 103), timestamp])
    if (number <= 2) {
      const bytes = pdfBytes(`Paciente ${String(number).padStart(2,'0')}`), storageKey = `${randomUUID()}.enc`
      await fs.writeFile(path.join(config.storageDir,storageKey), encryptBuffer(bytes), { mode: 0o600 })
      const metadata = { original_name: `registro-${number}.pdf`, mime_type: 'application/pdf', extension: 'pdf', byte_size: bytes.length }
      await client.query('INSERT INTO documents(id,exam_id,storage_key,metadata_encrypted,uploaded_by,created_at) VALUES($1,$2,$3,$4,$5,$6)', [seedId(3000+number),seedId(2000+number),storageKey,encryptJson(metadata),seedId(102),timestamp])
    }
  }
  await client.query("INSERT INTO lab_metadata(key,value) VALUES('dataset_reference',$1),('schema_version','1.0.0')",[config.datasetReference])
}
export async function initializeDatabase() {
  const schema = await fs.readFile(new URL('../sql/schema.sql',import.meta.url),'utf8')
  await transaction(async client => { await client.query('SELECT pg_advisory_xact_lock($1)',[618220626]); await client.query(schema); if (!(await client.query("SELECT value FROM lab_metadata WHERE key='dataset_reference'")).rowCount) await seed(client) })
}
export async function resetDatabase() {
  await transaction(async client => { await client.query('SELECT pg_advisory_xact_lock($1)',[618220626]); await client.query('TRUNCATE audit_events,documents,exams,patients,email_confirmations,refresh_tokens,auth_sessions,users,lab_metadata CASCADE'); await seed(client) })
}
export async function invalidateSessions() {
  await transaction(async client => { await client.query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP)'); await client.query('DELETE FROM refresh_tokens') })
}
export async function databaseStatus() {
  const expected = ['users','auth_sessions','refresh_tokens','email_confirmations','patients','exams','documents','audit_events','lab_metadata']
  const schema = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=ANY($1::text[])',[expected])
  if (schema.rowCount !== expected.length) return { status:'not_ready',build:config.build,database:'postgresql',schema:'not_ready' }
  const ref = await pool.query("SELECT value FROM lab_metadata WHERE key='dataset_reference'")
  const users = await pool.query("SELECT count(DISTINCT rol)::int AS roles FROM users WHERE active AND deleted_at IS NULL AND confirmed_at IS NOT NULL")
  return { status:ref.rowCount && users.rows[0].roles===3 ? 'ready':'not_ready',build:config.build,database:'postgresql',schema:'ready',dataset_reference:ref.rows[0]?.value || null,fecha_actual:new Date().toISOString().slice(0,10) }
}
