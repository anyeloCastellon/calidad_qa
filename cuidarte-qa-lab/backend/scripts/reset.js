import fs from 'node:fs/promises'
import path from 'node:path'
import { config, validateConfiguration } from '../src/config.js'
import { initializeDatabase, resetDatabase, pool } from '../src/db.js'
try {
  validateConfiguration(); await initializeDatabase(); await resetDatabase()
  const keep = new Set((await pool.query('SELECT storage_key FROM documents')).rows.map(row=>row.storage_key))
  for (const entry of await fs.readdir(config.storageDir,{withFileTypes:true})) {
    if(entry.isFile() && /^[0-9a-f-]{36}\.enc$/i.test(entry.name) && !keep.has(entry.name)) await fs.unlink(path.join(config.storageDir,entry.name))
  }
  console.log('Datos de práctica restaurados; sesiones invalidadas')
} finally { await pool.end() }
