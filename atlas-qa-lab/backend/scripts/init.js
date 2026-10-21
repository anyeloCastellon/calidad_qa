import { validateConfiguration } from '../src/config.js'
import { initializeDatabase, pool } from '../src/db.js'

try {
  validateConfiguration()
  await initializeDatabase()
  console.log('Esquema PostgreSQL y datos iniciales preparados')
} finally { await pool.end() }
