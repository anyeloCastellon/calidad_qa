import fs from 'node:fs/promises'
import path from 'node:path'
import { validateConfiguration } from '../src/config.js'
import { initializeDatabase, resetDatabase, pool } from '../src/db.js'

try {
  validateConfiguration()
  await initializeDatabase()
  await resetDatabase()
  const storage = path.resolve(process.env.STORAGE_DIR || './storage')
  await fs.mkdir(storage, { recursive: true, mode: 0o700 })
  const entries = await fs.readdir(storage, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isFile() && /^[0-9a-f-]{36}\.enc$/i.test(entry.name)) await fs.unlink(path.join(storage, entry.name))
  }
  console.log('Datos de práctica y almacenamiento restaurados; sesiones invalidadas')
} finally { await pool.end() }
