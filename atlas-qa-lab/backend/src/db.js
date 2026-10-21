import fs from 'node:fs/promises'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { config, readCertificate } from './config.js'
import { encryptJson, privateLookup, searchTokens } from './crypto.js'

pg.types.setTypeParser(1082, value => value)

export const pool = new pg.Pool({
  host: process.env.PGHOST || 'db', port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'atlas', password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'atlas', max: Number(process.env.PGPOOL_MAX || 20),
  connectionTimeoutMillis: 8000, idleTimeoutMillis: 30_000,
  ssl: { rejectUnauthorized: true, ca: readCertificate(process.env.PGSSLROOTCERT || '/certs/ca.crt') },
})
pool.on('error', () => console.error(JSON.stringify({ event: 'database_connection_error' })))

export async function transaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function audit(client, companyId, actorId, accion, recurso, recursoId, detalle = {}) {
  await client.query(
    'INSERT INTO audit_events(id,company_id,actor_id,accion,recurso,recurso_id,detalle) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [randomUUID(), companyId, actorId, accion, recurso, recursoId || null, detalle],
  )
}

const seedId = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`
const atDate = days => {
  const date = new Date(`${config.datasetReference}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function syntheticRut(number) {
  const body = String(number)
  let sum = 0, factor = 2
  for (const digit of [...body].reverse()) { sum += Number(digit) * factor; factor = factor === 7 ? 2 : factor + 1 }
  const remainder = 11 - sum % 11
  return `${body}-${remainder === 11 ? '0' : remainder === 10 ? 'K' : remainder}`
}

async function seed(client) {
  const timestamp = `${config.datasetReference}T08:00:00.000Z`
  const companies = [
    { id: seedId(1), nombre: 'Atlas Norte SpA', direccion: 'Avenida Central 100, Santiago', telefono: '+56220001001', email: 'contacto@norte.example' },
    { id: seedId(2), nombre: 'Servicios Sur SpA', direccion: 'Calle del Parque 200, Temuco', telefono: '+56452001002', email: 'contacto@sur.example' },
  ]
  for (const company of companies) {
    const { id, ...data } = company
    await client.query('INSERT INTO companies(id,nombre,email_key,data_encrypted,created_at) VALUES($1,$2,$3,$4,$5)',
      [id, company.nombre, privateLookup(company.email), encryptJson(data), timestamp])
  }
  const people = [
    { id: seedId(101), nombre_usuario: 'admin.atlas', email: 'admin@atlas.example' },
    { id: seedId(102), nombre_usuario: 'editor.atlas', email: 'editor@atlas.example' },
    { id: seedId(103), nombre_usuario: 'admin.sur', email: 'admin@sur.example' },
  ]
  for (const user of people) {
    const passwordHash = await bcrypt.hash('AtlasDemo!2026', 12)
    await client.query('INSERT INTO users(id,nombre_usuario,email_key,email_encrypted,password_hash,confirmed_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$6)',
      [user.id, user.nombre_usuario, privateLookup(user.email), encryptJson(user.email), passwordHash, timestamp])
  }
  for (const [company, person, role] of [[1, 101, 'administrador'], [1, 102, 'editor'], [2, 103, 'administrador'], [2, 101, 'editor']]) {
    await client.query('INSERT INTO memberships(company_id,user_id,rol,created_at) VALUES($1,$2,$3,$4)', [seedId(company), seedId(person), role, timestamp])
  }
  for (let number = 1; number <= 40; number++) {
    const north = number <= 24
    const data = {
      nombre: `Cliente de práctica ${String(number).padStart(2, '0')}`,
      empresa: `${north ? 'Comercial Norte' : 'Servicios Sur'} ${String(number).padStart(2, '0')}`,
      descripcion: 'Registro ficticio de operación', direccion: `Calle de Práctica ${number}, ${north ? 'Santiago' : 'Temuco'}`,
      email: `cliente${number}@${north ? 'norte' : 'sur'}.example`, telefono: `+5697${String(number).padStart(7, '0')}`,
      rut: syntheticRut(50_000_000 + number),
      datos_bancarios: { banco: 'Banco de Práctica', tipo_cuenta: 'Corriente', numero_cuenta: `FICTICIA-${String(number).padStart(8, '0')}` },
    }
    await client.query('INSERT INTO clients(id,company_id,data_encrypted,nombre_tokens,empresa_tokens,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$6)',
      [seedId(1000 + number), seedId(north ? 1 : 2), encryptJson(data), searchTokens(data.nombre), searchTokens(data.empresa), timestamp])
  }
  const contracts = [
    [1, 1, 1, -60, 90], [2, 1, 1, -30, 7], [3, 1, 2, -100, -1], [4, 1, 3, 10, 120],
    [5, 1, 4, -20, 30], [6, 2, 25, -90, 45], [7, 2, 26, -180, -10], [8, 2, 27, -5, 25],
  ]
  for (const [number, company, person, start, end] of contracts) {
    await client.query('INSERT INTO contracts(id,company_id,client_id,data_encrypted,fecha_inicio,fecha_fin,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$7)',
      [seedId(2000 + number), seedId(company), seedId(1000 + person),
        encryptJson({ titulo: `Servicio de práctica ${number}`, descripcion: 'Acuerdo de prestación de servicios ficticio' }), atDate(start), atDate(end), timestamp])
  }
  await client.query("INSERT INTO lab_metadata(key,value) VALUES('dataset_reference',$1),('schema_version','1.0.0')", [config.datasetReference])
}

export async function initializeDatabase() {
  const schema = await fs.readFile(new URL('../sql/schema.sql', import.meta.url), 'utf8')
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [317_220_621])
    await client.query(schema)
    const existing = await client.query("SELECT value FROM lab_metadata WHERE key='dataset_reference'")
    if (!existing.rowCount) await seed(client)
  })
}

export async function resetDatabase() {
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [317_220_621])
    await client.query('TRUNCATE audit_events,share_links,documents,contracts,clients,invitations,email_confirmations,refresh_tokens,auth_sessions,memberships,companies,users,lab_metadata CASCADE')
    await seed(client)
  })
}

export async function invalidateSessions() {
  await transaction(async client => {
    await client.query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP)')
    await client.query('DELETE FROM refresh_tokens')
  })
}

export async function databaseStatus() {
  const expected = ['users', 'companies', 'memberships', 'auth_sessions', 'refresh_tokens', 'email_confirmations', 'invitations', 'clients', 'contracts', 'documents', 'share_links', 'audit_events', 'lab_metadata']
  const schema = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=ANY($1::text[])', [expected])
  if (schema.rowCount !== expected.length) return { status: 'not_ready', build: config.build, database: 'postgresql', schema: 'not_ready', dataset_reference: null, fecha_actual: new Date().toISOString().slice(0, 10) }
  const result = await pool.query("SELECT value FROM lab_metadata WHERE key='dataset_reference'")
  const user = await pool.query('SELECT id FROM users WHERE active AND confirmed_at IS NOT NULL LIMIT 1')
  const ready = result.rowCount === 1 && user.rowCount > 0
  return { status: ready ? 'ready' : 'not_ready', build: config.build, database: 'postgresql',
    schema: 'ready', dataset_reference: result.rows[0]?.value || null, fecha_actual: new Date().toISOString().slice(0, 10) }
}
