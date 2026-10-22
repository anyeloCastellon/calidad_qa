import { invalidateSessions, pool } from '../src/db.js'
try { await invalidateSessions(); console.log('Sesiones y renovaciones invalidadas') } finally { await pool.end() }
