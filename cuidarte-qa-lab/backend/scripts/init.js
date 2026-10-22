import { validateConfiguration } from '../src/config.js'
import { initializeDatabase, pool } from '../src/db.js'
try { validateConfiguration(); await initializeDatabase(); console.log('Base de datos preparada') } finally { await pool.end() }
